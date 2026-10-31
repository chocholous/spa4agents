import { Catalog, TODO, isPaid } from "./catalog.ts";

/**
 * The one price model. Every output that shows a price (pricing.json, llms.txt, llms-full.txt, tools/*.md,
 * needs/*.md, mcp.json, openapi.json, server.json, initialize instructions, the web /pricing/ page) reads it from here.
 * pricing.json is this model serialised; nothing else computes or formats an amount.
 */
export type PriceStatus = "free" | "included" | "pending" | "set";

export interface PriceEntry {
  name: string;
  phase: string;
  mechanism: string;
  price_model: string;
  /** Amount in USD as written in the catalog, "0.00" when free or included, null when not decided yet. */
  amount_usd: string | null;
  status: PriceStatus;
  paid_with_x402: boolean;
  trial_eligible: boolean;
  /** Plain text: "Free", "Per call: 0.01", "Per call: Pricing being finalized". */
  price_text: string;
  /** Short text for tables: "Free", "0.01 USD", "Pricing being finalized". */
  price_short: string;
}

export function priceEntry(c: Catalog, t: any): PriceEntry {
  const model = t.price.model as string;
  const modelName = c.copy.price_model_names[model];
  const pendingText = c.copy.llms.price_pending as string;
  let status: PriceStatus;
  let amount: string | null = null;
  if (model === "free") { status = "free"; amount = "0.00"; }
  else if (model === "research_funded" || model === "included_in_entry") { status = "included"; amount = "0.00"; }
  else if (t.price.amount_usd === TODO || t.price.amount_usd === undefined || t.price.amount_usd === null) status = "pending";
  else { status = "set"; amount = String(t.price.amount_usd); }
  const price_text = status === "free" ? modelName
    : status === "included" ? modelName
    : status === "pending" ? `${modelName}: ${pendingText}`
    : `${modelName}: ${amount}`;
  const price_short = status === "free" ? modelName
    : status === "included" ? modelName
    : status === "pending" ? pendingText
    : `${amount} ${c.payments.asset}`;
  return {
    name: t.name, phase: t.phase, mechanism: t.mechanism, price_model: model, amount_usd: amount, status,
    paid_with_x402: isPaid(t), trial_eligible: !!t.trial_eligible, price_text, price_short,
  };
}

export function priceEntries(c: Catalog, tools: any[]): PriceEntry[] {
  return tools.map((t) => priceEntry(c, t));
}
