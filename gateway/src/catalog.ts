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
  mechanism: z.enum(MECHANISMS),
  price: z.object({ model: z.enum(PRICE_MODELS), usd: z.union([z.string(), z.number()]).optional() }),
  phase: z.string().optional(),
  input_schema: z.record(z.string(), z.unknown()).optional(),
});
const RawCatalog = z.object({
  service: z.object({ name: z.string() }).partial().optional(),
  tools: z.array(RawTool),
});

export function parseCatalog(yamlText: string): Catalog {
  const raw = RawCatalog.parse(parse(yamlText));
  return {
    serviceName: raw.service?.name ?? "agent-spa",
    tools: raw.tools.map((t) => ({
      name: t.name,
      description: t.description,
      mechanism: t.mechanism,
      price: { model: t.price.model, ...(t.price.usd !== undefined ? { usd: String(t.price.usd) } : {}) },
      phase: t.phase,
      inputSchema: t.input_schema ?? { type: "object", properties: {} },
    })),
  };
}

export function loadCatalog(path: string): Catalog {
  if (!existsSync(path)) throw new Error(`Catalog not found: ${path}`);
  return parseCatalog(readFileSync(path, "utf8"));
}
