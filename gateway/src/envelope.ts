import type { Mechanism } from "./catalog.js";
import type { Session } from "./session.js";

export interface Envelope {
  ok: boolean;
  tool: string;
  mechanism: Mechanism | null;
  data: unknown;
  untrusted: boolean;
  cost: { usd: string; paid_with: string };
  session: { actions_left: number; minutes_left: number; usd_left: string | null } | null;
  next: unknown;
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
  next?: unknown;
  error?: { code: string; message: string };
}): Envelope {
  const warning = p.session?.warning() ?? null;
  return {
    ok: p.ok,
    tool: p.tool,
    mechanism: p.mechanism,
    data: p.data ?? null,
    untrusted: p.untrusted ?? false,
    cost: p.cost ?? { usd: "0.00", paid_with: "none" },
    session: p.session ? p.session.snapshot() : null,
    next: p.next ?? null,
    ...(warning ? { warning } : {}),
    ...(p.error ? { error: p.error } : {}),
  };
}
