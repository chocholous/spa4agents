import type { ToolDef } from "./catalog.js";

/**
 * Místo, kam se zapojí platby x402 (WP3). Zde žádná platební logika není.
 *
 * Tok volání: authorize (výzva/ověření platby PŘED přijetím dat) -> validace vstupu -> handler -> settle.
 * MCP: při `required` jde výzva v `_meta["x402/payment-required"]` (obalení createPaymentWrapper z @x402/mcp).
 * REST: odpověď 402 s hlavičkou PAYMENT-REQUIRED (@x402/hono / @x402/express).
 */
export interface PaymentRequest {
  tool: ToolDef;
  /** Hlavičky požadavku (REST: PAYMENT-SIGNATURE apod.; MCP: _meta se doplní ve WP3). */
  headers: Record<string, string | string[] | undefined>;
  mcpMeta?: Record<string, unknown>;
  sessionId: string;
}

export type PaymentDecision =
  | {
      kind: "ok";
      /** Skutečně účtováno za toto volání. */
      cost: { usd: string; paid_with: string };
      /** Identita = platební adresa (x402). */
      address?: string;
    }
  | {
      kind: "required";
      /** Obsah výzvy; MCP `_meta["x402/payment-required"]`, REST tělo/hlavička. */
      challenge: unknown;
    };

export interface PaymentGate {
  authorize(req: PaymentRequest): Promise<PaymentDecision>;
  /** Vypořádání po úspěchu. `billable=false` = prázdný výsledek se neúčtuje. */
  settle(decision: Extract<PaymentDecision, { kind: "ok" }>, billable: boolean): Promise<void>;
}

/** Stub F0: nic nevybírá, vše povolí s nulovou cenou. */
export class NoopPaymentGate implements PaymentGate {
  async authorize(): Promise<PaymentDecision> {
    return { kind: "ok", cost: { usd: "0.00", paid_with: "none" } };
  }
  async settle(): Promise<void> {}
}
