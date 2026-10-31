import type { ToolDef } from "./catalog.js";

/**
 * Rozhraní platební brány. Tok volání: authorize (výzva, nebo ověření platby PŘED přijetím dat)
 * -> validace vstupu -> handler -> settle. Vypořádání proběhne vždy po úspěšné odpovědi handleru;
 * žádné pravidlo o „prázdném výsledku“ neexistuje (agent platí vždy hned za službu).
 */
export interface PaymentRequest {
  tool: ToolDef;
  transport: "mcp" | "rest";
  /** Hlavičky požadavku (REST: PAYMENT-SIGNATURE; MCP: hlavičky HTTP požadavku). */
  headers: Record<string, string | string[] | undefined>;
  /** MCP `params._meta` (platba v `x402/payment`). */
  mcpMeta?: Record<string, unknown>;
  /** Cena tohoto volání v mikro-USD (po slevě a kreditu). */
  priceMicro: number;
  /** Adresa zdroje pro výzvu: `mcp://tool/<name>` nebo plná adresa REST. */
  resourceUrl: string;
  /** Cesta REST, např. `/v1/quiet.room`. */
  restPath: string;
}

export type PaymentDecision =
  | {
      kind: "ok";
      cost: { usd: string; paid_with: string };
      /** Identita = platební adresa (z ověřené platby). */
      address?: string;
      /** Neprůhledná data pro `settle`. */
      token?: unknown;
    }
  | {
      kind: "required";
      /** Obsah výzvy (x402 PaymentRequired). */
      challenge: unknown;
      /** Důvod (např. neplatná platba); bez obsahu vstupu. */
      reason?: string;
    }
  | { kind: "unavailable" };

export interface SettleOutcome {
  ok: boolean;
  /** Potvrzení pro klienta (MCP `_meta["x402/payment-response"]`, REST `PAYMENT-RESPONSE`). */
  receipt?: unknown;
}

export interface PaymentGate {
  /** Nese požadavek platbu? (levná kontrola bez I/O) */
  hasPayment(req: PaymentRequest): boolean;
  authorize(req: PaymentRequest): Promise<PaymentDecision>;
  settle(decision: Extract<PaymentDecision, { kind: "ok" }>): Promise<SettleOutcome>;
}

/** Bezpečný default: bez nastavené brány jsou placené nástroje nedostupné (nikdy zdarma). */
export class UnavailablePaymentGate implements PaymentGate {
  hasPayment(): boolean {
    return false;
  }
  async authorize(): Promise<PaymentDecision> {
    return { kind: "unavailable" };
  }
  async settle(): Promise<SettleOutcome> {
    return { ok: false };
  }
}
