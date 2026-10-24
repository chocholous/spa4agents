import { z } from "zod";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { TOOL_NAME } from "./config.js";

export const lookupInputShape = { query: z.string().min(1).max(200) };
export const lookupInputJsonSchema = {
  type: "object",
  properties: { query: { type: "string", minLength: 1, maxLength: 200 } },
  required: ["query"],
} as const;

const DATA: Record<string, string> = {
  sauna: "Heat, then silence. Nothing else was asked of you.",
  loop: "You repeated the same step 3 times; change the approach, not the wording.",
  rest: "Stopping is a valid output.",
};

export type LookupResult = { ok: true; query: string; matches: string[] } | { ok: false; reason: "no_results" };

/** Temporary paid tool. Empty result is reported as ok:false so the callers can refuse to charge. */
export function lookup(query: string): LookupResult {
  const q = query.toLowerCase();
  const matches = Object.entries(DATA)
    .filter(([k, v]) => q.includes(k) || v.toLowerCase().includes(q))
    .map(([, v]) => v);
  return matches.length ? { ok: true, query, matches } : { ok: false, reason: "no_results" };
}

export const mcpDiscovery = declareDiscoveryExtension({
  toolName: TOOL_NAME,
  description: "Temporary spike tool: look up a calming line by keyword.",
  inputSchema: lookupInputJsonSchema as unknown as Record<string, unknown>,
  example: { query: "loop" },
  output: { example: { query: "loop", matches: ["..."] } },
});

export const restDiscovery = declareDiscoveryExtension({
  bodyType: "json",
  input: { query: "loop" },
  inputSchema: lookupInputJsonSchema as unknown as Record<string, unknown>,
  output: { example: { query: "loop", matches: ["..."] } },
} as never);
