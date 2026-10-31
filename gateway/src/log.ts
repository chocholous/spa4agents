/**
 * Jediná funkce pro logování. Whitelist polí: jen veřejné konstanty (událost, kód chyby, název nástroje, číslo).
 * Žádný vstup, výstup, adresa, IP, klíč, hlavička ani text výjimky.
 */
const ALLOWED = new Set(["event", "code", "tool", "status", "count", "name"]);

export function log(fields: Record<string, string | number | boolean | undefined>): void {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (!ALLOWED.has(k) || v === undefined) continue;
    out[k] = typeof v === "string" ? v.slice(0, 80) : v;
  }
  process.stdout.write(JSON.stringify(out) + "\n");
}

/** Redigovaný popis chyby: jen typ a kód, nikdy `message` ani stack. */
export function errName(e: unknown): string {
  if (e && typeof e === "object") {
    const o = e as { name?: unknown; code?: unknown };
    return `${typeof o.name === "string" ? o.name : "Error"}${typeof o.code === "string" ? `:${o.code}` : ""}`.slice(0, 80);
  }
  return "Error";
}
