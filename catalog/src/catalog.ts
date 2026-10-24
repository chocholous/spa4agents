import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse } from "yaml";

export type Catalog = any;

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CATALOG_PATH = path.join(ROOT, "catalog.yaml");
export const SCHEMA_PATH = path.join(ROOT, "schema", "catalog.schema.json");
export const DIST = path.join(ROOT, "dist");
export const TODO = "TODO_OWNER";
/** Placeholder for a named party that is not chosen yet (operator, jurisdiction, LLM provider, hosting). */
export const TO_BE_NAMED = "TO_BE_NAMED";

export function loadRaw(file = CATALOG_PATH): { raw: Catalog; text: string } {
  const text = readFileSync(file, "utf8");
  return { raw: parse(text), text };
}

function lookup(ctx: any, key: string): unknown {
  return key.split(".").reduce((o: any, k) => (o == null ? undefined : o[k]), ctx);
}

function interpolate(value: any, ctx: any): any {
  if (typeof value === "string") {
    return value.replace(/\{\{\s*([a-z_.]+)\s*\}\}/g, (m, key) => {
      const v = lookup(ctx, key);
      return v === undefined || typeof v === "object" ? m : String(v);
    });
  }
  if (Array.isArray(value)) return value.map((v) => interpolate(v, ctx));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, interpolate(v, ctx)]));
  }
  return value;
}

/** Resolve {{tokens}} everywhere in the catalog (3 passes so tokens may reference tokens). */
export function resolve(raw: Catalog): Catalog {
  let doc = raw;
  for (let i = 0; i < 3; i++) {
    const ctx = { ...doc, endpoint: `https://${doc.brand.domain}/mcp` };
    doc = interpolate(doc, ctx);
  }
  return doc;
}

export function load(file = CATALOG_PATH): Catalog {
  return resolve(loadRaw(file).raw);
}

export function endpoint(c: Catalog): string {
  return `https://${c.brand.domain}/mcp`;
}

export function baseUrl(c: Catalog): string {
  return `https://${c.brand.domain}`;
}

export function published(c: Catalog): any[] {
  return c.tools.filter((t: any) => c.generation.publish_phases.includes(t.phase));
}

export function isPaid(t: any): boolean {
  return !["free", "research_funded", "included_in_entry"].includes(t.price.model);
}

export function findTools(c: Catalog, names: string[]): any[] {
  return names.map((n) => c.tools.find((t: any) => t.name === n));
}

export function collectTodos(value: any, p = "$"): string[] {
  if (value === TODO || value === TO_BE_NAMED) return [p];
  if (Array.isArray(value)) return value.flatMap((v, i) => collectTodos(v, `${p}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => collectTodos(v, `${p}.${k}`));
  }
  return [];
}
