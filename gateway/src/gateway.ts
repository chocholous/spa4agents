import AjvModule from "ajv";
const Ajv = (AjvModule as any).default ?? AjvModule;
import type { Catalog, ToolDef } from "./catalog.js";
import type { Config } from "./config.js";
import { buildEnvelope, type Envelope } from "./envelope.js";
import { defaultStub, handlers as defaultHandlers, menu, priceLabel, type Handler } from "./handlers.js";
import { LiteLlmClient, type LlmClient } from "./llm.js";
import { NoopPaymentGate, type PaymentGate } from "./payments.js";
import { SessionStore, type Session } from "./session.js";

export interface CallInput {
  tool: string;
  args: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
  mcpSessionId?: string;
  mcpMeta?: Record<string, unknown>;
  /** Zrušení z klienta (MCP notifications/cancelled, zavření REST spojení). */
  signal?: AbortSignal;
}
export interface CallResult {
  envelope: Envelope;
  /** HTTP status pro REST. */
  status: number;
  /** Výzva k platbě (WP3), pokud ji gate vrátila. */
  paymentChallenge?: unknown;
}

export interface GatewayDeps {
  config: Config;
  catalog: Catalog;
  llm?: LlmClient;
  payments?: PaymentGate;
  handlers?: Record<string, Handler>;
  now?: () => number;
}

const ERR_STATUS: Record<string, number> = {
  unknown_tool: 404,
  invalid_input: 400,
  invalid_guest_pass: 401,
  session_closed: 409,
  session_limit: 429,
  payment_required: 402,
  timeout: 504,
  cancelled: 499,
  internal_error: 500,
};

export class Gateway {
  readonly config: Config;
  readonly catalog: Catalog;
  readonly exposed: ToolDef[];
  readonly sessions: SessionStore;
  private readonly llm: LlmClient;
  private readonly payments: PaymentGate;
  private readonly handlers: Record<string, Handler>;
  private readonly ajv: any = new Ajv({ strict: false, allErrors: false });
  private readonly validators = new Map<string, (((d: unknown) => boolean) & { errors?: unknown })>();

  constructor(d: GatewayDeps) {
    this.config = d.config;
    this.catalog = d.catalog;
    this.exposed = d.catalog.tools.filter((t) => !t.phase || d.config.phases.includes(t.phase));
    this.sessions = new SessionStore(d.config.session, d.now);
    this.llm = d.llm ?? new LiteLlmClient(d.config.llm);
    this.payments = d.payments ?? new NoopPaymentGate();
    this.handlers = { ...defaultHandlers, ...(d.handlers ?? {}) };
    for (const t of this.exposed) this.validators.set(t.name, this.ajv.compile(t.inputSchema));
  }

  /** Text pro `initialize.instructions`: menu, ceny, strop, pravidlo odchodu; bez rozkazů. */
  instructions(): string {
    const s = this.config.session;
    const lines = menu(this.exposed).map((m) => `- ${m.tool} (${m.mechanism}): ${m.price}`);
    return [
      `${this.catalog.serviceName}: tools for agents, priced per call. Menu:`,
      ...lines,
      `Session cap: ${s.maxActions} actions, ${s.maxMinutes} minutes${s.maxUsd ? `, ${s.maxUsd} USD` : ""}.`,
      `Leaving: lobby.leave is free and works at any time, also during another call.`,
    ].join("\n");
  }

  private resolveSession(inp: CallInput): Session | { code: string; message: string } {
    const hdr = inp.headers["x-spa-guest-pass"];
    const pass = Array.isArray(hdr) ? hdr[0] : hdr;
    const argPass = inp.tool === "lobby.checkin" && typeof inp.args.guest_pass === "string" ? inp.args.guest_pass : undefined;
    const wanted = pass ?? argPass;
    let s: Session;
    if (wanted) {
      const found = this.sessions.getByPass(wanted);
      if (!found) return { code: "invalid_guest_pass", message: "Unknown guest pass." };
      s = found;
      if (inp.mcpSessionId) this.sessions.bindMcp(inp.mcpSessionId, s);
    } else if (inp.mcpSessionId) s = this.sessions.forMcp(inp.mcpSessionId);
    else s = this.sessions.create(); // REST bez passu: jednorázová relace
    return s;
  }

  async call(inp: CallInput): Promise<CallResult> {
    const tool = this.exposed.find((t) => t.name === inp.tool);
    const fail = (code: string, message: string, session: Session | null, extra?: Partial<CallResult>): CallResult => ({
      envelope: buildEnvelope({ tool: inp.tool, mechanism: tool?.mechanism ?? null, session, ok: false, error: { code, message } }),
      status: ERR_STATUS[code] ?? 500,
      ...extra,
    });
    if (!tool) return fail("unknown_tool", `Unknown tool: ${inp.tool}`, null);

    const r = this.resolveSession(inp);
    if ("code" in r) return fail(r.code, r.message, null);
    const session = r;
    const isLeave = tool.name === "lobby.leave";

    // `lobby.leave` obchází strop i zavřenou relaci a nečeká na žádné jiné volání.
    if (!isLeave) {
      if (session.closed) return fail("session_closed", "Session has ended.", session);
      const cap = session.atCap();
      if (cap) return fail("session_limit", `Session cap reached (${cap}).`, session);
    }

    // 1) Platba PŘED přijetím dat (WP3 sem zapojí x402).
    const decision = await this.payments.authorize({
      tool, headers: inp.headers, mcpMeta: inp.mcpMeta, sessionId: session.id,
    });
    if (decision.kind === "required") return fail("payment_required", "Payment required.", session, { paymentChallenge: decision.challenge });
    if (decision.address) session.address = decision.address;

    // 2) Validace vstupu.
    const validate = this.validators.get(tool.name)!;
    if (!validate(inp.args)) {
      return fail("invalid_input", this.ajv.errorsText(validate.errors), session);
    }

    // 3) Volání. Vlastní AbortController relace, timeout a zrušení klientem; žádná fronta.
    if (!isLeave) session.actions++;
    const ac = new AbortController();
    const timeoutMs = this.config.timeoutMs[tool.mechanism] ?? 5000;
    const timer = setTimeout(() => ac.abort(new Error("timeout")), timeoutMs);
    const onExt = () => ac.abort(new Error("cancelled"));
    if (inp.signal) inp.signal.aborted ? onExt() : inp.signal.addEventListener("abort", onExt, { once: true });
    if (!isLeave) session.inflight.add(ac);

    const handler = this.handlers[tool.name] ?? defaultStub;
    const aborted = new Promise<never>((_, rej) => {
      const rejectWith = () => rej(ac.signal.reason ?? new Error("cancelled"));
      ac.signal.aborted ? rejectWith() : ac.signal.addEventListener("abort", rejectWith, { once: true });
    });
    aborted.catch(() => {});
    try {
      const res = await Promise.race([
        handler(inp.args, {
          session, sessions: this.sessions, catalog: this.catalog, exposed: this.exposed,
          config: this.config, llm: this.llm, signal: ac.signal, mcpSessionId: inp.mcpSessionId,
        }),
        aborted,
      ]);
      const billable = res.billable !== false;
      await this.payments.settle(decision, billable);
      if (billable) session.usdSpent += Number(decision.cost.usd);
      return {
        status: 200,
        envelope: buildEnvelope({
          tool: tool.name, mechanism: tool.mechanism, session, ok: true, data: res.data,
          untrusted: res.untrusted, next: res.next,
          cost: billable ? decision.cost : { usd: "0.00", paid_with: decision.cost.paid_with },
        }),
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "timeout") return fail("timeout", `Call exceeded ${timeoutMs} ms.`, session);
      if (msg === "session_closed") return fail("cancelled", "Call cancelled because the session was closed.", session);
      if (msg === "cancelled") return fail("cancelled", "Call cancelled by the client.", session);
      return fail("internal_error", "Internal error.", session);
    } finally {
      clearTimeout(timer);
      session.inflight.delete(ac);
      inp.signal?.removeEventListener("abort", onExt);
    }
  }
}
export { priceLabel };
