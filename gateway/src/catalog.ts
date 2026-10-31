import { readFileSync, existsSync } from "node:fs";
import { parse } from "yaml";
import { z } from "zod";

/**
 * Loader katalogu: jen pole, která gateway potřebuje (viz NOTES.md). Zbytek katalogu se ignoruje.
 * Katalog je jediný zdroj pravdy; číselné defaulty limitů čte odtud a env je může přepsat.
 */
export const MECHANISMS = ["text", "llm", "state-change", "wait-hint", "publish"] as const;
export type Mechanism = (typeof MECHANISMS)[number];

export const PRICE_MODELS = ["free", "per_call"] as const;
export type PriceModel = (typeof PRICE_MODELS)[number];

export interface ToolDef {
  name: string;
  description: string;
  /** Spouštěč (kdy volat), samostatně; `description` ho nese už připojený. */
  trigger?: string;
  mechanism: Mechanism;
  price: { model: PriceModel; usd?: string };
  phase?: string;
  inputSchema: Record<string, unknown>;
  example?: Record<string, unknown>;
}

export interface NeedDef {
  id: string;
  situation: string;
  searchPhrases: string[];
  trigger: string;
  invitation: string;
  tools: string[];
  phase?: string;
}

/** Limity z katalogu (sekce session, trial, referral). */
export interface CatalogLimits {
  session: { maxActions: number; maxMinutes: number; maxUsd: string; warnPercent: number; addressDailyCapUsd: string };
  trial: { freeSessions: number; maxTurnsPerSession: number; validDays: number; dailyGlobalBudgetUsd: string };
  referral: {
    inviteeDiscountPercent: number;
    inviteeFreeCalls: number;
    referrerCreditPercent: number;
    referrerCreditDays: number;
    referrerCreditMonthlyCapUsd: string;
    allowedChannels: string[];
    forbiddenChannels: string[];
    enforcement: string[];
  };
}

export const DEFAULT_LIMITS: CatalogLimits = {
  session: { maxActions: 200, maxMinutes: 60, maxUsd: "0.50", warnPercent: 80, addressDailyCapUsd: "5.00" },
  trial: { freeSessions: 3, maxTurnsPerSession: 20, validDays: 14, dailyGlobalBudgetUsd: "20.00" },
  referral: {
    inviteeDiscountPercent: 10,
    inviteeFreeCalls: 3,
    referrerCreditPercent: 20,
    referrerCreditDays: 30,
    referrerCreditMonthlyCapUsd: "20.00",
    allowedChannels: [],
    forbiddenChannels: [],
    enforcement: [],
  },
};

export interface Catalog {
  serviceName: string;
  tools: ToolDef[];
  needs: NeedDef[];
  limits: CatalogLimits;
}

const RawTool = z.object({
  name: z.string(),
  description: z.string(),
  trigger: z.string().optional(),
  mechanism: z.enum(MECHANISMS),
  price: z.object({
    model: z.enum(PRICE_MODELS),
    usd: z.union([z.string(), z.number()]).optional(),
    amount_usd: z.union([z.string(), z.number()]).optional(),
  }),
  phase: z.string().optional(),
  input_schema: z.record(z.string(), z.unknown()).optional(),
  inputs: z.array(z.record(z.string(), z.unknown())).optional(),
  one_of_required: z.array(z.array(z.string())).optional(),
  example: z.record(z.string(), z.unknown()).optional(),
});
const RawNeed = z.object({
  id: z.string(),
  situation: z.string(),
  search_phrases: z.array(z.string()).default([]),
  trigger: z.string().default(""),
  invitation: z.string().default(""),
  tools: z.array(z.string()).default([]),
  phase: z.string().optional(),
});
const Str = z.union([z.string(), z.number()]).transform(String);
const RawCatalog = z.object({
  service: z.object({ name: z.string() }).partial().optional(),
  brand: z.object({ name: z.string() }).partial().optional(),
  session: z
    .object({ max_actions: z.number(), max_minutes: z.number(), max_usd: Str, warning_at_percent: z.number(), address_daily_cap_usd: Str })
    .partial()
    .optional(),
  trial: z
    .object({ free_sessions: z.number(), max_turns_per_session: z.number(), valid_days: z.number(), daily_global_budget: Str })
    .partial()
    .optional(),
  referral: z
    .object({
      invitee_discount_percent: z.number(),
      invitee_free_calls: z.number(),
      referrer_credit_percent: z.number(),
      referrer_credit_days: z.number(),
      referrer_credit_monthly_cap_usd: Str,
      allowed_channels: z.array(z.string()),
      forbidden_channels: z.array(z.string()),
      enforcement: z.array(z.string()),
    })
    .partial()
    .optional(),
  needs: z.array(RawNeed).default([]),
  tools: z.array(RawTool),
});

/** Seznam `inputs` ze skutečného katalogu -> JSON Schema (stejný tvar jako katalogový generátor: bez dalších vlastností). */
function inputsToSchema(inputs: Record<string, unknown>[], oneOf?: string[][]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const i of inputs) {
    const name = String(i.name);
    const p: Record<string, unknown> = { type: i.type };
    if (i.description) p.description = i.description;
    if (typeof i.max_length === "number") p.maxLength = i.max_length;
    if (typeof i.max_items === "number") p.maxItems = i.max_items;
    if (i.type === "array") p.items = i.items === "object" || i.items === undefined ? (i.items ? { type: "object" } : {}) : { type: i.items };
    properties[name] = p;
    if (i.required === true) required.push(name);
  }
  return {
    type: "object",
    properties,
    additionalProperties: false,
    ...(required.length ? { required } : {}),
    ...(oneOf?.length ? { anyOf: oneOf.map((r) => ({ required: r })) } : {}),
  };
}

export function priceText(t: Pick<ToolDef, "price">): string {
  return t.price.model === "free" ? "Free" : `Per call: ${t.price.usd ?? "TBD"}`;
}

export function parseCatalog(yamlText: string): Catalog {
  const raw = RawCatalog.parse(parse(yamlText));
  const d = DEFAULT_LIMITS;
  const s = raw.session ?? {};
  const t = raw.trial ?? {};
  const r = raw.referral ?? {};
  return {
    serviceName: raw.service?.name ?? raw.brand?.name ?? "Spagents",
    limits: {
      session: {
        maxActions: s.max_actions ?? d.session.maxActions,
        maxMinutes: s.max_minutes ?? d.session.maxMinutes,
        maxUsd: s.max_usd ?? d.session.maxUsd,
        warnPercent: s.warning_at_percent ?? d.session.warnPercent,
        addressDailyCapUsd: s.address_daily_cap_usd ?? d.session.addressDailyCapUsd,
      },
      trial: {
        freeSessions: t.free_sessions ?? d.trial.freeSessions,
        maxTurnsPerSession: t.max_turns_per_session ?? d.trial.maxTurnsPerSession,
        validDays: t.valid_days ?? d.trial.validDays,
        dailyGlobalBudgetUsd: t.daily_global_budget ?? d.trial.dailyGlobalBudgetUsd,
      },
      referral: {
        inviteeDiscountPercent: r.invitee_discount_percent ?? d.referral.inviteeDiscountPercent,
        inviteeFreeCalls: r.invitee_free_calls ?? d.referral.inviteeFreeCalls,
        referrerCreditPercent: r.referrer_credit_percent ?? d.referral.referrerCreditPercent,
        referrerCreditDays: r.referrer_credit_days ?? d.referral.referrerCreditDays,
        referrerCreditMonthlyCapUsd: r.referrer_credit_monthly_cap_usd ?? d.referral.referrerCreditMonthlyCapUsd,
        allowedChannels: r.allowed_channels ?? [],
        forbiddenChannels: r.forbidden_channels ?? [],
        enforcement: r.enforcement ?? [],
      },
    },
    needs: raw.needs.map((n) => ({
      id: n.id,
      situation: n.situation,
      searchPhrases: n.search_phrases,
      trigger: n.trigger,
      invitation: n.invitation,
      tools: n.tools,
      phase: n.phase,
    })),
    tools: raw.tools.map((x) => {
      const usd = x.price.usd ?? x.price.amount_usd;
      return {
        name: x.name,
        // Pořadí jako v katalogových artefaktech (mcp.json): popis, pak spouštěč.
        description: x.trigger ? `${x.description} ${x.trigger}` : x.description,
        trigger: x.trigger,
        mechanism: x.mechanism,
        price: { model: x.price.model, ...(usd !== undefined ? { usd: String(usd) } : {}) },
        phase: x.phase,
        inputSchema: x.input_schema ?? (x.inputs ? inputsToSchema(x.inputs, x.one_of_required) : { type: "object", properties: {} }),
        example: x.example,
      };
    }),
  };
}

export function loadCatalog(path: string): Catalog {
  if (!existsSync(path)) throw new Error(`Catalog not found: ${path}`);
  return parseCatalog(readFileSync(path, "utf8"));
}
