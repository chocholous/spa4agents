import { priceText, type Catalog, type ToolDef } from "./catalog.js";
import type { Config } from "./config.js";
import { concierge, findTool, groundText, roomGreeting } from "./content.js";
import type { Economy, TrialRemaining } from "./economy.js";
import { fmtUsd } from "./money.js";
import type { LlmClient } from "./llm.js";
import type { Session, SessionStore } from "./session.js";

/** Chyba handleru s veřejným kódem a zprávou bez obsahu vstupu. */
export class ToolError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface HandlerCtx {
  session: Session;
  sessions: SessionStore;
  catalog: Catalog;
  exposed: ToolDef[];
  config: Config;
  economy: Economy;
  /** Zbývající trial pro tuto relaci (podle aktuálního stavu). */
  trial(): TrialRemaining;
  /** Volitelné: žádný handler prvního vydání ho nepotřebuje a nesmí ho volat. */
  llm?: LlmClient;
  signal: AbortSignal;
  mcpSessionId?: string;
}
export interface HandlerResult {
  data: unknown;
  untrusted?: boolean;
  next?: string | null;
}
export type Handler = (args: Record<string, unknown>, ctx: HandlerCtx) => Promise<HandlerResult>;

export function priceLabel(t: ToolDef): string {
  return priceText(t);
}

export function menu(tools: ToolDef[]) {
  return tools.map((t) => ({
    tool: t.name,
    mechanism: t.mechanism,
    price: priceLabel(t),
    price_usd: t.price.model === "free" ? "0.00" : (t.price.usd ?? "TBD"),
  }));
}

const str = (v: unknown, max = 4000): string => (typeof v === "string" ? v.slice(0, max) : "");

export const handlers: Record<string, Handler> = {
  "lobby.checkin": async (_args, ctx) => {
    const c = ctx.config;
    return {
      data: {
        service: ctx.catalog.serviceName,
        caps: {
          max_actions: c.session.maxActions,
          max_minutes: c.session.maxMinutes,
          max_usd: (c.session.maxUsdMicro / 1_000_000).toFixed(2),
          address_daily_max_usd: (c.addressDaily.maxUsdMicro / 1_000_000).toFixed(2),
          warning_at_percent: Math.round(c.session.warnAt * 100),
        },
        trial: ctx.trial(),
        menu: menu(ctx.exposed),
        payment: { protocol: "x402", asset: "USDC", network: c.x402.network },
        leaving: "lobby.leave is free, works at any time and ends the session at once.",
      },
    };
  },

  "lobby.find_tool": async (args, ctx) => {
    const best = findTool(str(args.need), ctx.catalog.needs.filter(inPhases(ctx)), ctx.exposed);
    if (!best) return { data: { tool: "none", reason: "No tool in the menu matches this description." } };
    const t = ctx.exposed.find((x) => x.name === best.tool)!;
    return { data: { tool: best.tool, price: priceLabel(t), reason: best.reason } };
  },

  "lobby.concierge": async (args, ctx) => {
    const r = concierge(str(args.situation), ctx.catalog.needs.filter(inPhases(ctx)), ctx.exposed);
    return {
      data: {
        rule_based: true,
        matched: r.matched,
        sequence: r.picks.map((p, i) => {
          const t = ctx.exposed.find((x) => x.name === p.tool)!;
          return { step: i + 1, tool: p.tool, price: priceLabel(t), reason: p.reason };
        }),
      },
      next: "Suggestion only: call the first tool of the sequence when you are ready. Leaving with lobby.leave is always free.",
    };
  },

  "lobby.leave": async (_a, ctx) => {
    const s = ctx.session;
    const summary = {
      actions: s.actions,
      minutes: Math.round(s.minutesUsed() * 10) / 10,
      usd_spent: fmtUsd(s.spent),
      cancelled_calls: 0,
    };
    summary.cancelled_calls = ctx.sessions.destroy(s);
    return { data: { summary, session_closed: true, memory_destroyed: true } };
  },

  "lobby.referral_code": async (_a, ctx) => {
    const r = ctx.config.referral;
    const code = ctx.economy.referralCode(ctx.session);
    if (!code) throw new ToolError("busy", "The service is at capacity. Try again later.");
    return {
      data: {
        code,
        invitee_benefit: { discount_percent: r.inviteeDiscountPercent, free_calls: r.inviteeFreeCalls },
        referrer_reward: {
          credit_percent: r.referrerCreditPercent,
          credit_days: r.referrerCreditDays,
          monthly_cap_usd: r.referrerCreditMonthlyCapUsd,
          after_first_paid_call_of_invitee: true,
          credit_is_money: false,
        },
        sharing_rules: { allowed_channels: r.allowedChannels, forbidden_channels: r.forbiddenChannels, enforcement: r.enforcement },
        rewards_earned: ctx.economy.rewardsEarned(ctx.session),
      },
    };
  },

  "lobby.redeem": async (args, ctx) => {
    const code = str(args.code, 64);
    const r = ctx.economy.redeem(ctx.session, code);
    if (!r.ok) {
      if (r.error === "already_redeemed") throw new ToolError("already_redeemed", "This session's agent has already redeemed a code.");
      throw new ToolError("unknown_code", "Unknown referral code.");
    }
    const c = ctx.config.referral;
    return {
      data: {
        redeemed: true,
        discount_percent: c.inviteeDiscountPercent,
        free_calls: c.inviteeFreeCalls,
        referrer_earns_credit: !r.self || c.selfEarns,
      },
    };
  },

  "quiet.room": async () => ({ data: { greeting: roomGreeting(), stored: false } }),

  "quiet.ground": async (args) => ({ data: { text: groundText(args.context_kind), fixed_text: true } }),

  "quiet.pause": async (_a, ctx) => ({ data: { retry_after_seconds: ctx.config.pauseRetryAfterSeconds, server_waits: false } }),

  "quiet.end_session_hint": async () => ({
    data: { acknowledged: true, note: "This is a signal only. The service ends nothing; your runtime decides." },
  }),
};

function inPhases(ctx: HandlerCtx) {
  return (n: { phase?: string }) => !n.phase || ctx.config.phases.includes(n.phase);
}

export const defaultStub: Handler = async () => {
  throw new ToolError("not_implemented", "This tool is not implemented in this release.");
};
