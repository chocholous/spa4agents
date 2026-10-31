import type { Mechanism } from "./catalog.js";
import type { TrialRemaining } from "./economy.js";
import type { Session } from "./session.js";

export type { TrialRemaining };

/** Společná obálka MCP i REST. */
export interface Envelope {
  ok: boolean;
  tool: string;
  mechanism: Mechanism | null;
  data: unknown;
  untrusted: boolean;
  cost: { usd: string; paid_with: string };
  session: { actions_left: number; minutes_left: number; usd_left: string } | null;
  /** Zbývající trial v každé odpovědi; `null` jen když není známa relace (neznámý nástroj). */
  trial: TrialRemaining | null;
  /** Viditelný, označený návrh dalšího kroku (prostý text), nebo null. */
  next: string | null;
  warning?: string;
  error?: { code: string; message: string };
}

export function buildEnvelope(p: {
  tool: string;
  mechanism: Mechanism | null;
  session: Session | null;
  ok: boolean;
  data?: unknown;
  untrusted?: boolean;
  cost?: { usd: string; paid_with: string };
  trial?: TrialRemaining | null;
  next?: string | null;
  warning?: string | null;
  error?: { code: string; message: string };
}): Envelope {
  const warnings = [p.session?.warning() ?? null, p.warning ?? null].filter(Boolean);
  return {
    ok: p.ok,
    tool: p.tool,
    mechanism: p.mechanism,
    data: p.data ?? null,
    untrusted: p.untrusted ?? false,
    cost: p.cost ?? { usd: "0.00", paid_with: "none" },
    session: p.session ? p.session.snapshot() : null,
    trial: p.trial ?? null,
    next: p.next ?? null,
    ...(warnings.length ? { warning: warnings.join(" ") } : {}),
    ...(p.error ? { error: p.error } : {}),
  };
}
