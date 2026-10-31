import { existsSync, readFileSync } from "node:fs";
import AjvModule from "ajv";
const Ajv = (AjvModule as any).default ?? AjvModule;
import { AgentStore } from "./agents.js";
import { priceText, type Catalog, type ToolDef } from "./catalog.js";
import type { Config } from "./config.js";
import { DailyGuard } from "./daily.js";
import { Economy, type FreeGrant, type Quote, type TrialRemaining } from "./economy.js";
import { buildEnvelope, type Envelope } from "./envelope.js";
import { defaultStub, handlers as defaultHandlers, menu, priceLabel, ToolError, type Handler } from "./handlers.js";
import type { LlmClient } from "./llm.js";
import { Metrics } from "./metrics.js";
import { fmtUsd } from "./money.js";
import { UnavailablePaymentGate, type PaymentDecision, type PaymentGate, type PaymentRequest } from "./payments.js";
import { SessionStore, type Session } from "./session.js";

export interface CallInput {
  tool: string;
  args: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
  transport?: "mcp" | "rest";
  mcpSessionId?: string;
  mcpMeta?: Record<string, unknown>;
  /** IP klienta: použije se jen k okamžitému výpočtu solného hashe (anti-farm), nikdy se neukládá. */
  ip?: string;
  /** Základní adresa pro výzvu REST (BASE_URL, jinak z hlavičky Host). */
  baseUrl?: string;
  /** Zrušení z klienta (MCP notifications/cancelled, zavření REST spojení). */
  signal?: AbortSignal;
}
export interface CallResult {
  envelope: Envelope;
  /** HTTP status pro REST. */
  status: number;
  /** Výzva k platbě (x402 PaymentRequired), pokud ji brána vrátila. */
  paymentChallenge?: unknown;
  /** Potvrzení o vypořádání (x402), pokud proběhlo. */
  receipt?: unknown;
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
  session_closed: 409,
  session_limit: 429,
  address_daily_limit: 429,
  payment_required: 402,
  payments_unavailable: 503,
  busy: 503,
  timeout: 504,
  cancelled: 499,
  unknown_code: 404,
  already_redeemed: 409,
  not_implemented: 501,
  internal_error: 500,
};

export class Gateway {
  readonly config: Config;
  readonly catalog: Catalog;
  readonly exposed: ToolDef[];
  readonly sessions: SessionStore;
  readonly agents: AgentStore;
  readonly guard: DailyGuard;
  readonly economy: Economy;
  readonly metrics = new Metrics();
  /** Volitelné: služba běží bez LLM (rozhodnutí vlastníka, 31. 10. 2026); žádný handler ho nevyžaduje. */
  private readonly llm?: LlmClient;
  private readonly payments: PaymentGate;
  private readonly handlers: Record<string, Handler>;
  private readonly now: () => number;
  private readonly ajv: any = new Ajv({ strict: false, allErrors: false });
  private readonly validators = new Map<string, ((d: unknown) => boolean) & { errors?: any[] | null }>();
  private lastPrune = 0;
  private timer: NodeJS.Timeout | undefined;

  constructor(d: GatewayDeps) {
    this.config = d.config;
    this.catalog = d.catalog;
    this.now = d.now ?? Date.now;
    this.exposed = d.catalog.tools.filter((t) => !t.phase || d.config.phases.includes(t.phase));
    this.guard = new DailyGuard(this.now);
    this.agents = new AgentStore(d.config, this.now);
    this.economy = new Economy(d.config, this.agents, this.guard, this.now);
    this.sessions = new SessionStore(d.config.session, this.now, d.config.maxLiveSessions);
    this.llm = d.llm;
    this.payments = d.payments ?? new UnavailablePaymentGate();
    this.handlers = { ...defaultHandlers, ...(d.handlers ?? {}) };
    for (const t of this.exposed) this.validators.set(t.name, this.ajv.compile(t.inputSchema));
  }

  /** Úklid nečinných relací a stavů (volá se pravidelně a líně při volání). */
  prune(): void {
    this.lastPrune = this.now();
    this.sessions.prune();
    this.agents.prune();
  }

  startMaintenance(everyMs = 60_000): void {
    this.timer = setInterval(() => this.prune(), everyMs);
    this.timer.unref();
  }

  stopMaintenance(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Konec MCP session (zavření transportu): zničí paměť relace. */
  endMcp(mcpSessionId: string): void {
    this.sessions.endMcp(mcpSessionId);
  }

  /** Agregované počty bez identifikátorů (pro /status). */
  status() {
    return this.metrics.snapshot({
      sessions: this.sessions.sizes(),
      agents_in_memory: this.agents.size(),
      daily: { ...this.guard.sizes(), trial_budget_used_usd: fmtUsd(this.guard.budgetUsedToday()) },
    });
  }

  /** Text pro `initialize.instructions`: z katalogu (vygenerovaný soubor), jinak sestavený z katalogu. */
  instructions(): string {
    const p = this.config.instructionsPath;
    if (p && existsSync(p)) {
      const text = readFileSync(p, "utf8").trim();
      if (text) return text;
    }
    const s = this.config.session;
    const lines = menu(this.exposed).map((m) => `- ${m.tool} [${m.mechanism}; ${m.price}]`);
    return [
      `${this.catalog.serviceName}: tools for agents, paid per call with x402. Menu with prices:`,
      ...lines,
      `Session cap: ${s.maxActions} actions, ${s.maxMinutes} minutes, ${fmtUsd(s.maxUsdMicro)} USD.`,
      `Leaving: lobby.leave is free and works at any time, also during another call.`,
    ].join("\n");
  }

  /** Popis nástroje v tools/list: popis a spouštěč z katalogu, mechanismus a cena (jako katalogový mcp.json). */
  toolDescription(t: ToolDef): string {
    return `${t.description} Mechanism: ${t.mechanism}. Price: ${priceText(t)}.`;
  }

  private trialFor(session: Session, ipKey: string | null, tool: ToolDef | undefined): TrialRemaining {
    const addrDay = session.addrDay && session.addrDay.day === this.guard.dayId() ? session.addrDay.key : null;
    const paid = tool && this.economy.isPaid(tool) ? [tool] : this.exposed.filter((t) => this.economy.isPaid(t));
    const next = paid.length ? Math.min(...paid.map((t) => this.economy.quote(session.agent, t).micro)) : 0;
    return this.economy.trialSummary(session, ipKey, addrDay, next);
  }

  async call(inp: CallInput): Promise<CallResult> {
    const t0 = performance.now();
    let r: CallResult;
    try {
      r = await this.callInner(inp);
    } catch {
      r = { status: 500, envelope: buildEnvelope({ tool: inp.tool, mechanism: null, session: null, ok: false, error: { code: "internal_error", message: "Internal error." } }) };
    }
    this.metrics.observe(this.exposed.some((t) => t.name === inp.tool) ? inp.tool : "unknown", r.envelope.ok, r.envelope.error?.code, performance.now() - t0);
    return r;
  }

  private async callInner(inp: CallInput): Promise<CallResult> {
    if (this.now() - this.lastPrune > 30_000) this.prune();
    const tool = this.exposed.find((t) => t.name === inp.tool);
    const transport = inp.transport ?? (inp.mcpSessionId ? "mcp" : "rest");
    const ipKey = inp.ip ? this.guard.ipKey(inp.ip) : null;
    let grant: FreeGrant | null = null;

    const fail = (code: string, message: string, session: Session | null, extra?: Partial<CallResult>): CallResult => {
      grant?.release();
      grant = null;
      return {
        envelope: buildEnvelope({
          tool: inp.tool,
          mechanism: tool?.mechanism ?? null,
          session,
          ok: false,
          trial: session ? this.trialFor(session, ipKey, tool) : null,
          error: { code, message },
        }),
        status: ERR_STATUS[code] ?? 500,
        ...extra,
      };
    };
    if (!tool) return fail("unknown_tool", "Unknown tool.", null);
    const isLeave = tool.name === "lobby.leave";
    const isCheckin = tool.name === "lobby.checkin";

    // Dočasná relace: svázaná s MCP session, jinak (REST) jednorázová. Jen v paměti.
    let session: Session;
    if (inp.mcpSessionId) {
      const f = this.sessions.forMcp(inp.mcpSessionId, () => this.agents.createProvisional(), isCheckin);
      if (!f) return fail("busy", "The service is at capacity. Try again later.", null);
      session = f.session;
    } else {
      session = this.sessions.ephemeral(this.agents.createProvisional());
    }
    session.touch();

    // `lobby.leave` obchází strop i zavřenou relaci a nečeká na žádné jiné volání.
    const limit = (s: Session): CallResult | null => {
      if (isLeave) return null;
      if (s.closed) return fail("session_closed", "Session has ended. Call lobby.checkin to start a new one.", s);
      const cap = s.atCap();
      return cap ? fail("session_limit", `Session cap reached (${cap}).`, s) : null;
    };
    const early = limit(session);
    if (early) return early;

    const paid = this.economy.isPaid(tool);
    let pay: Extract<PaymentDecision, { kind: "ok" }> | null = null;
    let quote: Quote | null = null;
    const base = inp.baseUrl ?? this.config.baseUrl ?? "";
    const mkReq = (q: Quote, withPayment: boolean): PaymentRequest => ({
      tool,
      transport,
      headers: withPayment ? inp.headers : {},
      mcpMeta: withPayment ? inp.mcpMeta : undefined,
      priceMicro: q.micro,
      resourceUrl: transport === "mcp" ? `mcp://tool/${tool.name}` : `${base}/v1/${tool.name}`,
      restPath: `/v1/${tool.name}`,
    });
    const challenge = async (q: Quote, s: Session): Promise<CallResult> => {
      const d = await this.payments.authorize(mkReq(q, false));
      if (d.kind === "unavailable") return fail("payments_unavailable", "Payments are not available right now.", s);
      this.metrics.inc("challenges_issued");
      const reason = d.kind === "required" ? d.reason : undefined;
      void reason;
      return fail("payment_required", "Payment required.", s, { paymentChallenge: d.kind === "required" ? d.challenge : undefined });
    };

    // 1) Platba PŘED přijetím dat: bez platby zkušební/bonusové volání, jinak výzva; s platbou ověření.
    if (paid) {
      quote = this.economy.quote(session.agent, tool);
      const req = mkReq(quote, true);
      if (quote.micro === 0) {
        // plně pokryto kreditem: žádná platba
      } else if (!this.payments.hasPayment(req)) {
        const addrDay = session.addrDay && session.addrDay.day === this.guard.dayId() ? session.addrDay.key : null;
        grant = this.economy.tryFree(session, quote, ipKey, addrDay);
        if (!grant) return challenge(quote, session);
      } else {
        if (!session.fitsBudget(quote.micro)) return fail("session_limit", "Session spend cap reached (usd).", session);
        const d = await this.payments.authorize(req);
        if (d.kind === "unavailable") return fail("payments_unavailable", "Payments are not available right now.", session);
        if (d.kind === "required") {
          this.metrics.inc("challenges_issued");
          return fail("payment_required", "Payment required.", session, { paymentChallenge: d.challenge });
        }
        pay = d;
        this.metrics.inc("payments_verified");
      }
    }

    // 2) Identita = platební adresa (z ověřené platby): relace se přepne na relaci adresy.
    if (pay?.address) {
      const key = this.agents.addrKey(pay.address);
      if (this.sessions.isAddrClosed(key) && !isCheckin && !this.sessions.getByAddr(key)) {
        return fail("session_closed", "Session has ended. Call lobby.checkin to start a new one.", session);
      }
      const agent = this.agents.bindAddress(pay.address, session.agent);
      let s = this.sessions.getByAddr(key);
      if (!s) s = session;
      else if (s !== session) this.sessions.drop(session);
      s.agent = agent;
      this.sessions.bind(s, key, inp.mcpSessionId);
      s.addrDay = { day: this.guard.dayId(), key: this.guard.addrKey(pay.address) };
      s.touch();
      session = s;
      const late = limit(session);
      if (late) return late;
      if (quote && this.guard.addrSpent(s.addrDay.key) + quote.micro > this.config.addressDaily.maxUsdMicro) {
        return fail("address_daily_limit", "Daily spend cap of this address reached.", session);
      }
      if (quote && !session.fitsBudget(quote.micro)) return fail("session_limit", "Session spend cap reached (usd).", session);
    }

    // 3) Validace vstupu. Zpráva nikdy nenese hodnoty ani názvy z vstupu.
    const validate = this.validators.get(tool.name)!;
    if (!validate(inp.args)) {
      const e = validate.errors?.[0];
      const where = e?.keyword === "additionalProperties" ? "/" : e?.instancePath || "/";
      const what = e?.keyword === "additionalProperties" ? "unexpected property" : (e?.keyword ?? "schema");
      return fail("invalid_input", `Input does not match the tool schema (${what} at ${where}).`, session);
    }

    // 4) Volání. Vlastní AbortController relace, timeout a zrušení klientem; žádná fronta.
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
    const sess = session;
    try {
      const res = await Promise.race([
        handler(inp.args, {
          session: sess,
          sessions: this.sessions,
          catalog: this.catalog,
          exposed: this.exposed,
          config: this.config,
          economy: this.economy,
          trial: () => this.trialFor(sess, ipKey, tool),
          llm: this.llm,
          signal: ac.signal,
          mcpSessionId: inp.mcpSessionId,
        }),
        aborted,
      ]);

      // 5) Vypořádání VŽDY až po úspěšné odpovědi handleru.
      let receipt: unknown;
      let cost = { usd: "0.00", paid_with: "none" };
      if (pay && quote) {
        const so = await this.payments.settle(pay);
        if (!so.ok) {
          this.metrics.inc("payments_settle_failed");
          return await challenge(quote, session).then((r) => ({ ...r, envelope: { ...r.envelope, error: { code: "payment_required", message: "Payment settlement failed; nothing was delivered." } } }));
        }
        this.metrics.inc("payments_settled");
        receipt = so.receipt;
        session.spent += quote.micro;
        if (session.addrDay) this.guard.addAddrSpent(session.addrDay.key, quote.micro);
        this.economy.onPaid(session, quote);
        cost = { usd: fmtUsd(quote.micro), paid_with: "x402" };
      } else if (grant) {
        this.metrics.inc(grant.kind === "trial" ? "free_trial_calls" : "free_referral_calls");
        cost = { usd: "0.00", paid_with: grant.kind === "trial" ? "trial" : "referral" };
        grant = null;
      } else if (paid && quote && quote.micro === 0) {
        this.economy.onPaid(session, quote);
        cost = { usd: "0.00", paid_with: "credit" };
      }
      if (isCheckin) this.metrics.inc("sessions_started");
      if (isLeave) this.metrics.inc("sessions_left");
      return {
        status: 200,
        ...(receipt !== undefined ? { receipt } : {}),
        envelope: buildEnvelope({
          tool: tool.name,
          mechanism: tool.mechanism,
          session,
          ok: true,
          data: res.data,
          untrusted: res.untrusted,
          next: res.next ?? null,
          cost,
          warning: this.addressWarning(session),
          trial: this.trialFor(session, ipKey, tool),
        }),
      };
    } catch (e) {
      if (e instanceof ToolError) return fail(e.code, e.message, session);
      const msg = e instanceof Error ? e.message : "";
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

  private addressWarning(s: Session): string | null {
    if (!s.addrDay || s.addrDay.day !== this.guard.dayId()) return null;
    const cap = this.config.addressDaily.maxUsdMicro;
    return this.guard.addrSpent(s.addrDay.key) >= this.config.session.warnAt * cap
      ? `This address has used ${Math.round(this.config.session.warnAt * 100)}% or more of its daily cap.`
      : null;
  }
}
export { priceLabel };
