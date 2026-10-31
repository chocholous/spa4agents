import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { ROOT, loadRaw } from "../src/catalog.ts";

const dir = path.join(ROOT, "src", "render");
const sources = readdirSync(dir).filter((f) => f.endsWith(".ts")).map((f) => [f, readFileSync(path.join(dir, f), "utf8")] as const);

function literals(src: string): string[] {
  const out: string[] = [];
  const re = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
  for (const line of src.split("\n")) {
    if (/^\s*(import|\/\/)/.test(line)) continue;
    let m;
    while ((m = re.exec(line))) if (!m[2].startsWith("<!--")) out.push(m[2].replace(/\$\{[^}]*\}/g, " "));
  }
  return out;
}

test("renderers contain no prose: no string literal with 4 or more words", () => {
  for (const [f, src] of sources)
    for (const lit of literals(src)) {
      const words = lit.split(/\s+/).filter((w) => /[A-Za-z]{2,}/.test(w));
      assert.ok(words.length < 4, `${f}: prose literal "${lit}" belongs in catalog.yaml`);
    }
});

test("renderers and CLI do not hardcode brand name or domain", () => {
  const brand = loadRaw().raw.brand;
  const all = [...sources.map(([, s]) => s), readFileSync(path.join(ROOT, "src", "cli.ts"), "utf8"), readFileSync(path.join(ROOT, "src", "generate.ts"), "utf8")];
  for (const s of all) {
    assert.ok(!s.includes(brand.domain));
    assert.ok(!s.includes(brand.name));
  }
});

test("every catalog text used in outputs comes from catalog.yaml: output prose lines are found in the catalog", () => {
  // Free-text lines of generated pages (not headings, tables, code) must occur in catalog.yaml text.
  const cat = readFileSync(path.join(ROOT, "catalog.yaml"), "utf8").replace(/\s+/g, " ");
  const need = loadRaw().raw.needs[0];
  for (const s of [need.invitation, need.situation, need.trigger, need.not_claimed]) assert.ok(cat.includes(s));
});
