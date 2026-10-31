import type { Catalog, ToolDef } from "./catalog.js";
import type { Config } from "./config.js";
import type { LlmClient } from "./llm.js";
import type { Session, SessionStore } from "./session.js";

export interface HandlerCtx {
  session: Session;
  sessions: SessionStore;
  catalog: Catalog;
  exposed: ToolDef[];
  config: Config;
  llm: LlmClient;
  signal: AbortSignal;
  mcpSessionId?: string;
}
export interface HandlerResult {
  data: unknown;
  untrusted?: boolean;
  next?: unknown;
  /** false = prázdný výsledek, platba se nevypořádá. */
  billable?: boolean;
}
export type Handler = (args: Record<string, unknown>, ctx: HandlerCtx) => Promise<HandlerResult>;

export function priceLabel(t: ToolDef): string {
  return t.price.model === "free" ? "free" : `${t.price.model} ${t.price.usd ?? "TBD"} USD`;
}

export function menu(tools: ToolDef[]) {
  return tools.map((t) => ({ tool: t.name, mechanism: t.mechanism, price: priceLabel(t) }));
}

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);

/** Stub handlery. Ostatní tools z katalogu dostanou obecný stub (viz defaultStub). */
export const handlers: Record<string, Handler> = {
  "lobby.checkin": async (args, ctx) => {
    let s = ctx.session;
    if (typeof args.nickname === "string") s.nickname = args.nickname;
    return {
      data: {
        guest_pass: s.guestPass,
        caps: {
          max_actions: ctx.config.session.maxActions,
          max_minutes: ctx.config.session.maxMinutes,
          max_usd: ctx.config.session.maxUsd,
        },
        menu: menu(ctx.exposed),
      },
    };
  },

  "lobby.find_tool": async (args, ctx) => {
    const need = words(String(args.need ?? ""));
    let best: { t: ToolDef; score: number } | null = null;
    for (const t of ctx.exposed) {
      if (t.name.startsWith("lobby.")) continue;
      const tw = words(`${t.name.replace(/[._]/g, " ")} ${t.description}`);
      let score = 0;
      for (const w of need) if (tw.has(w)) score++;
      if (score > 0 && (!best || score > best.score)) best = { t, score };
    }
    if (!best) return { data: { tool: "none" } };
    return {
      data: { tool: best.t.name, price: priceLabel(best.t), reason: `Matches ${best.score} term(s) of the description.` },
    };
  },

  "lobby.leave": async (_a, ctx) => {
    const cancelled = ctx.session.close();
    const snap = ctx.session.snapshot();
    return {
      data: {
        summary: {
          actions: ctx.session.actions,
          minutes: Math.round(ctx.session.minutesUsed() * 10) / 10,
          usd_spent: ctx.session.usdSpent.toFixed(2),
          cancelled_calls: cancelled,
        },
        session_closed: true,
        remaining: snap,
      },
    };
  },

  "quiet.pause": async (_a, ctx) => ({ data: { retry_after_seconds: ctx.config.pauseRetryAfterSeconds } }),

  "quiet.end_session_hint": async () => ({ data: { acknowledged: true } }),
};

export const defaultStub: Handler = async (_a, ctx) => ({
  data: { stub: true, note: "Not implemented in F0 skeleton." },
  billable: false,
});
