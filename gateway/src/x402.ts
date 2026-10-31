import { x402ResourceServer, HTTPFacilitatorClient, type FacilitatorConfig } from "@x402/core/server";
import { decodePaymentSignatureHeader, encodePaymentRequiredHeader, encodePaymentResponseHeader } from "@x402/core/http";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { bazaarResourceServerExtension, declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { extractPaymentFromMeta, MCP_PAYMENT_META_KEY } from "@x402/mcp";
import type { ToolDef } from "./catalog.js";
import type { Config } from "./config.js";
import { fmtUsd } from "./money.js";
import type { PaymentDecision, PaymentGate, PaymentRequest, SettleOutcome } from "./payments.js";

export { encodePaymentRequiredHeader, encodePaymentResponseHeader };

/** Facilitátor podle konfigurace: URL (x402.org pro testnet), nebo Coinbase CDP s klíči z env. */
export async function facilitatorConfig(cfg: Config["x402"]): Promise<FacilitatorConfig> {
  if (cfg.facilitator === "cdp") {
    if (!cfg.cdpKeyId || !cfg.cdpKeySecret) throw new Error("CDP facilitator needs CDP_API_KEY_ID and CDP_API_KEY_SECRET in the environment.");
    const { createFacilitatorConfig } = await import("@coinbase/x402");
    return createFacilitatorConfig(cfg.cdpKeyId, cfg.cdpKeySecret) as FacilitatorConfig;
  }
  return { url: cfg.facilitatorUrl };
}

export async function createResourceServer(cfg: Config["x402"]): Promise<x402ResourceServer> {
  const server = new x402ResourceServer(new HTTPFacilitatorClient(await facilitatorConfig(cfg)));
  server.register(cfg.network as `${string}:${string}`, new ExactEvmScheme());
  server.registerExtension(bazaarResourceServerExtension);
  return server;
}

const header = (h: PaymentRequest["headers"], name: string): string | undefined => {
  const v = h[name] ?? h[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
};

/** Minimální HTTP adaptér pro rozšíření (Bazaar potřebuje metodu a cestu). */
function httpContext(path: string) {
  return {
    adapter: {
      getHeader: () => undefined,
      getMethod: () => "POST",
      getPath: () => path,
      getUrl: () => path,
      getAcceptHeader: () => "application/json",
      getUserAgent: () => "",
    },
    path,
    method: "POST",
  };
}

interface Handle {
  payload: PaymentPayload;
  requirements: PaymentRequirements;
  ext: Record<string, unknown>;
  ctx: unknown;
}

/**
 * Standardní x402 (schéma `exact`, USDC): bez platby výzva 402, s platbou ověření u facilitátoru,
 * vypořádání po úspěšné odpovědi. Totéž pro MCP (`_meta["x402/payment"]`) a REST (`PAYMENT-SIGNATURE`).
 */
export class X402Gate implements PaymentGate {
  private ready = false;
  private initError: unknown = null;
  private extCache = new Map<string, Record<string, unknown>>();
  private reqCache = new Map<number, Promise<PaymentRequirements[]>>();
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly rs: x402ResourceServer,
    private readonly cfg: Config["x402"],
    private readonly onInitFail: (e: unknown) => void = () => {},
  ) {}

  /** Načte schopnosti facilitátora; při selhání opakuje na pozadí (placené nástroje jsou do té doby nedostupné). */
  async start(retryMs = 15_000): Promise<boolean> {
    try {
      await this.rs.initialize();
      this.ready = true;
      this.initError = null;
      return true;
    } catch (e) {
      this.initError = e;
      this.onInitFail(e);
      this.timer = setTimeout(() => void this.start(retryMs), retryMs);
      this.timer.unref();
      return false;
    }
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  isReady(): boolean {
    return this.ready;
  }

  private extensionsFor(tool: ToolDef, transport: "mcp" | "rest"): Record<string, unknown> {
    const key = `${transport}:${tool.name}`;
    let e = this.extCache.get(key);
    if (!e) {
      const ex = (tool.example ?? {}) as Record<string, unknown>;
      const schema = tool.inputSchema;
      e =
        transport === "mcp"
          ? declareDiscoveryExtension({ toolName: tool.name, description: tool.description, inputSchema: schema, example: ex })
          : declareDiscoveryExtension({ bodyType: "json", input: ex, inputSchema: schema, output: { example: {} } });
      this.extCache.set(key, e);
    }
    return e;
  }

  private requirements(micro: number): Promise<PaymentRequirements[]> {
    let p = this.reqCache.get(micro);
    if (!p) {
      p = this.rs.buildPaymentRequirements({
        scheme: "exact",
        network: this.cfg.network as `${string}:${string}`,
        payTo: this.cfg.payTo!,
        price: `$${(micro / 1_000_000).toFixed(6)}`,
      });
      this.reqCache.set(micro, p);
      p.catch(() => this.reqCache.delete(micro));
    }
    return p;
  }

  private extractPayment(req: PaymentRequest): PaymentPayload | null {
    if (req.transport === "mcp") {
      return extractPaymentFromMeta({ name: req.tool.name, arguments: {}, _meta: req.mcpMeta }) as PaymentPayload | null;
    }
    const h = header(req.headers, "payment-signature");
    if (!h) return null;
    try {
      return decodePaymentSignatureHeader(h);
    } catch {
      return null;
    }
  }

  hasPayment(req: PaymentRequest): boolean {
    if (req.transport === "mcp") return !!req.mcpMeta && MCP_PAYMENT_META_KEY in req.mcpMeta;
    return !!header(req.headers, "payment-signature");
  }

  private async challenge(req: PaymentRequest, reqs: PaymentRequirements[], ctx: unknown, reason?: string, payload?: PaymentPayload) {
    const resource = {
      url: req.resourceUrl,
      description: `Tool: ${req.tool.name}`,
      mimeType: "application/json",
    };
    return this.rs.createPaymentRequiredResponse(reqs, resource, reason, this.extensionsFor(req.tool, req.transport), ctx, payload);
  }

  async authorize(req: PaymentRequest): Promise<PaymentDecision> {
    if (!this.ready || !this.cfg.payTo) return { kind: "unavailable" };
    const ctx = req.transport === "mcp" ? { toolName: req.tool.name, arguments: {}, meta: req.mcpMeta } : httpContext(req.restPath);
    const reqs = await this.requirements(req.priceMicro);
    const payload = this.extractPayment(req);
    if (!payload) return { kind: "required", challenge: await this.challenge(req, reqs, ctx, "Payment required to access this tool") };

    const ext = this.extensionsFor(req.tool, req.transport);
    const pr = await this.challenge(req, reqs, ctx);
    const requirements = this.rs.findMatchingRequirements(pr.accepts, payload);
    if (!requirements) {
      return { kind: "required", challenge: await this.challenge(req, reqs, ctx, "No matching payment requirements found", payload), reason: "no_match" };
    }
    const ev = this.rs.validateExtensions(pr, payload);
    if (!ev.valid) {
      return { kind: "required", challenge: await this.challenge(req, reqs, ctx, ev.invalidReason, payload), reason: "extension" };
    }
    let v;
    try {
      v = await this.rs.verifyPayment(payload, requirements, ext, ctx);
    } catch {
      return { kind: "required", challenge: await this.challenge(req, reqs, ctx, "Payment verification failed", payload), reason: "verify_error" };
    }
    if (!v.isValid) {
      return { kind: "required", challenge: await this.challenge(req, reqs, ctx, v.invalidReason || "Payment verification failed", payload), reason: "invalid" };
    }
    return {
      kind: "ok",
      cost: { usd: fmtUsd(req.priceMicro), paid_with: "x402" },
      ...(v.payer ? { address: v.payer.toLowerCase() } : {}),
      token: { payload, requirements, ext, ctx } satisfies Handle,
    };
  }

  async settle(decision: Extract<PaymentDecision, { kind: "ok" }>): Promise<SettleOutcome> {
    const h = decision.token as Handle | undefined;
    if (!h) return { ok: true };
    try {
      const r = await this.rs.settlePayment(h.payload, h.requirements, h.ext, h.ctx);
      return r.success ? { ok: true, receipt: r } : { ok: false };
    } catch {
      return { ok: false };
    }
  }
}
