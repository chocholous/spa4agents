import { readFileSync, existsSync } from "node:fs";
import { parse } from "yaml";
import { z } from "zod";

/**
 * Malé rozhraní loaderu katalogu: jen pole, která gateway potřebuje.
 * Očekávaná pole viz gateway/NOTES.md. Zbytek katalogu se ignoruje.
 */
export const MECHANISMS = ["text", "llm", "state-change", "wait-hint", "publish"] as const;
export type Mechanism = (typeof MECHANISMS)[number];

export const PRICE_MODELS = ["free", "per_call", "entry", "per_game", "credits"] as const;
export type PriceModel = (typeof PRICE_MODELS)[number];

export interface ToolDef {
  name: string;
  description: string;
  mechanism: Mechanism;
  price: { model: PriceModel; usd?: string };
  phase?: string;
  inputSchema: Record<string, unknown>;
}

export interface Catalog {
  serviceName: string;
  tools: ToolDef[];
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
});
const RawCatalog = z.object({
  service: z.object({ name: z.string() }).partial().optional(),
  brand: z.object({ name: z.string() }).partial().optional(),
  tools: z.array(RawTool),
});

/** Seznam `inputs` ze skutečného katalogu -> JSON Schema. Nečíselné limity (TODO_OWNER) se ignorují. */
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
    ...(required.length ? { required } : {}),
    ...(oneOf?.length ? { anyOf: oneOf.map((r) => ({ required: r })) } : {}),
  };
}

export function parseCatalog(yamlText: string): Catalog {
  const raw = RawCatalog.parse(parse(yamlText));
  return {
    serviceName: raw.service?.name ?? raw.brand?.name ?? "agent-spa",
    tools: raw.tools.map((t) => {
      const usd = t.price.usd ?? t.price.amount_usd;
      return {
        name: t.name,
        description: t.trigger ? `${t.trigger} ${t.description}` : t.description,
        mechanism: t.mechanism,
        price: { model: t.price.model, ...(usd !== undefined ? { usd: String(usd) } : {}) },
        phase: t.phase,
        inputSchema: t.input_schema ?? (t.inputs ? inputsToSchema(t.inputs, t.one_of_required) : { type: "object", properties: {} }),
      };
    }),
  };
}

export function loadCatalog(path: string): Catalog {
  if (!existsSync(path)) throw new Error(`Catalog not found: ${path}`);
  return parseCatalog(readFileSync(path, "utf8"));
}
