import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load, loadRaw } from "../../catalog/src/catalog.ts";
import { buildSite } from "../src/build.ts";

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const built = buildSite(false);
const html = (p: string) => String(built.files.get(p));

test("build is deterministic", () => {
  const again = buildSite(false);
  assert.equal(String(again.files.get("BUILD.json")), String(built.files.get("BUILD.json")));
});

test("every page has a Markdown alternative and describedby llms.txt", () => {
  for (const [p, body] of built.files) {
    if (!p.endsWith(".html") || p === "404.html") continue;
    const s = String(body);
    assert.match(s, /rel="alternate" type="text\/markdown" href="[^"]+"/, p);
    assert.match(s, /rel="describedby" href="[^"]*\/llms\.txt"/, p);
    assert.match(s, /property="og:image"/, p);
    assert.match(s, /name="twitter:card"/, p);
    const md = /type="text\/markdown" href="https?:\/\/[^/]+(\/[^"]+)"/.exec(s)![1].slice(1);
    assert.ok(built.files.has(md), `${p} -> ${md}`);
  }
});

test("draft brand: noindex, hidden flag, robots disallow", () => {
  assert.equal(load().brand.approved, false);
  assert.ok(built.draft);
  assert.match(html("index.html"), /data-draft="true"/);
  assert.match(html("index.html"), /noindex/);
  assert.match(html("robots.txt"), /Disallow: \//);
});

test("14 need pages; F2/F3 needs are marked planned", () => {
  const c = load();
  for (const n of c.needs) assert.ok(built.files.has(`needs/${n.id}/index.html`));
  assert.match(html("needs/meet-agents/index.html"), /Planned/);
  assert.doesNotMatch(html("needs/stuck-in-a-loop/index.html"), />Planned</);
});

test("TODO_OWNER never shown; prices say being decided", () => {
  for (const [p, body] of built.files) if (/\.(html|md)$/.test(p) && !p.startsWith("tools/") && !p.startsWith("needs/")) assert.ok(!String(body).includes("TODO_OWNER"), p);
  assert.match(html("pricing/index.html"), /Price being decided/);
});

test("language switcher: only available locales link and carry hreflang", () => {
  const s = html("index.html");
  assert.match(s, /aria-disabled="true" class="lang off"/);
  assert.doesNotMatch(s, /href="\/(de|ja|tlh)\//);
  assert.doesNotMatch(s, /hreflang="(de|ja|tlh)" href/);
  assert.match(s, /lang="tlh"/);
});

test("sources contain no prose and no hardcoded brand", () => {
  const brand = loadRaw().raw.brand;
  for (const f of readdirSync(src)) {
    const text = readFileSync(path.join(src, f), "utf8");
    assert.ok(!text.includes(brand.domain) && !text.includes(brand.name), `${f} hardcodes the brand`);
    for (const line of text.split("\n")) {
      if (/^\s*(import|\/\/)/.test(line)) continue;
      for (const m of line.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
        const lit = m[2].replace(/\$\{[^}]*\}/g, " ").replace(/<[^>]*>/g, " ").replace(/[a-z-]+="[^"]*"/g, " ");
        const words = lit.split(/\s+/).filter((w) => /^[A-Za-z]{3,}[.,]?$/.test(w));
        assert.ok(words.length < 4, `${f}: prose literal "${m[2].slice(0, 60)}" belongs in catalog.yaml`);
      }
    }
  }
});

test("data policy page: HTML page, Markdown twin, footer link, honest reservations", () => {
  const page = html("data-policy/index.html");
  assert.match(page, /<h1[^>]*>Data policy/);
  assert.match(html("index.html"), /<a href="\/data-policy\/">Data policy<\/a>/);
  assert.match(page, /rel="alternate" type="text\/markdown" href="[^"]*\/data-policy\.md"/);
  const md = String(built.files.get("data-policy.md"));
  for (const w of ["TO_BE_NAMED", "public and permanent", "pseudonym", "not a legal document", "metadata only"]) assert.ok(md.includes(w), w);
  assert.ok(!/7 days|pickup/i.test(md));
  assert.ok(String(built.files.get("sitemap.xml")).includes("/data-policy/"));
});

test("honesty page lists only what is honestly not measured (no operator, jurisdiction, legal, name or LLM provider items)", () => {
  const h = html("honesty/index.html");
  assert.match(h, /Not measured yet/);
  assert.ok(!/What we do not know yet/.test(h));
  for (const gone of ["Who operates the service", "jurisdiction", "legal framing", "language model provider stands behind"]) assert.ok(!h.includes(gone), gone);
});

test("home says the first spa for agents and names no hackathon", () => {
  assert.match(html("index.html"), /The first spa for agents/);
  for (const [p, body] of built.files) if (/\.(html|md|txt|json)$/.test(p)) assert.ok(!/lablab|devpost|hackathon\s+[A-Z]/i.test(String(body)), p);
});
