import { test } from "node:test";
import assert from "node:assert/strict";
import { load, baseUrl, published } from "../../catalog/src/catalog.ts";
import { priceEntries, priceEntry } from "../../catalog/src/pricing.ts";
import { checkLinks, checkRepoMarkdown, looksLikeHtml, mediaTypeOf, schemaErrors, xmlProblems } from "../../catalog/src/links.ts";
import { priceLabel } from "../src/model.ts";
import { build as buildCatalog } from "../../catalog/src/generate.ts";
import { buildSite } from "../src/build.ts";

const built = buildSite(false);
const c = load();
const origin = baseUrl(c);
const text = (p: string) => String(built.files.get(p));

test("every served file has a known media type (the one serve.mjs sends), none is HTML by accident", () => {
  for (const p of built.files.keys()) {
    if (/\.(css|js|svg|png|woff2)$/.test(p)) continue;
    assert.ok(mediaTypeOf(p), `no media type for ${p}`);
  }
  for (const p of ["llms.txt", "llms-full.txt", "robots.txt"]) {
    assert.equal(mediaTypeOf(p), "text/plain", p);
    assert.ok(!looksLikeHtml(text(p)), `${p} looks like HTML`);
  }
  for (const [p] of built.files) if (p.endsWith(".md")) assert.ok(!looksLikeHtml(text(p)), `${p} looks like HTML`);
  assert.equal(mediaTypeOf("sitemap.xml"), "application/xml");
  assert.equal(mediaTypeOf("index.html"), "text/html");
});

test("every *.json in the site parses", () => {
  const js = [...built.files.keys()].filter((p) => p.endsWith(".json"));
  assert.ok(js.includes(".well-known/mcp.json") && js.includes("openapi.json") && js.includes("pricing.json"));
  for (const p of js) JSON.parse(text(p));
});

test(".well-known/mcp.json validates against the mcp schema; the registry server.json against its schema", () => {
  assert.deepEqual(schemaErrors("mcp.schema.json", JSON.parse(text(".well-known/mcp.json"))), []);
  // server.json is not part of the site; the catalog generates it and it is checked here against the same schema.
  assert.deepEqual(schemaErrors("server.schema.json", JSON.parse(buildCatalog().get("server.json")!)), []);
});

test("sitemap.xml is well-formed XML with absolute https locations that exist as pages", () => {
  const xml = text("sitemap.xml");
  assert.deepEqual(xmlProblems(xml), []);
  assert.match(xml, /<urlset [^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.length > 5);
  for (const l of locs) {
    assert.ok(l.startsWith(`${origin}/`), l);
    assert.ok(built.files.has(l.slice(origin.length + 1) + "index.html") || l === `${origin}/` , l);
  }
});

test("internal links in the built site resolve to files in the site (fragments to ids); external URLs are not requested", () => {
  // og.png is rendered only when Playwright is installed (see OPEN_QUESTIONS); build with it when possible.
  const withPng = buildSite(true);
  const skipped = withPng.warnings.some((w) => w.includes("og.png skipped"));
  const all = new Map<string, string | Buffer>(withPng.files);
  assert.deepEqual(checkLinks(all, { origin, deferred: skipped ? ["assets/og.png"] : [] }), []);
});

test("internal links in the repository Markdown files resolve to existing files", () => {
  assert.deepEqual(checkRepoMarkdown(), []);
});

test("the link checker catches a broken link and a missing fragment", () => {
  const bad = new Map<string, string | Buffer>([["index.html", '<a href="/nope/">x</a> <a href="/a/#zzz">y</a> <a href="https://example.org/x">z</a>'], ["a/index.html", '<h1 id="top">a</h1>']]);
  const p = checkLinks(bad, { origin });
  assert.equal(p.length, 2, p.join("\n"));
});

test("prices: /pricing/ page, llms-full.txt, pricing.json, mcp.json and openapi.json agree with the catalog price model", () => {
  const html = text("pricing/index.html");
  const md = text("pricing/index.md");
  const full = text("llms-full.txt");
  const pricing = JSON.parse(text("pricing.json"));
  const mcp = JSON.parse(text(".well-known/mcp.json"));
  const oa = JSON.parse(text("openapi.json"));
  const pending = c.copy.llms.price_pending;
  assert.equal(c.web.locales.en.ui.price_tbd, pending);
  for (const t of c.tools) {
    const e = priceEntry(c, t);
    if (e.status === "free" || e.status === "included") continue;
    const cell = e.status === "pending" ? pending : e.amount_usd!;
    const row = new RegExp(`<code>${t.name.replace(".", "\\.")}</code>.*?</tr>`, "s").exec(html)?.[0];
    assert.ok(row, `pricing page lacks ${t.name}`);
    assert.ok(row.includes(`<td>${cell}</td>`), `pricing page price for ${t.name}: ${row}`);
    assert.ok(md.split("\n").some((l) => l.includes(`\`${t.name}\``) && l.includes(`| ${cell} |`)), `pricing.md price for ${t.name}`);
  }
  for (const t of published(c)) {
    const e = priceEntry(c, t);
    const j = pricing.tools.find((x: any) => x.name === t.name);
    assert.deepEqual([j.amount_usd, j.price_status], [e.amount_usd, e.status], t.name);
    const m = mcp.tools.find((x: any) => x.name === t.name);
    assert.deepEqual([m.price.amount_usd, m.price.status], [e.amount_usd, e.status], t.name);
    assert.deepEqual([oa.paths[`/v1/${t.name}`].post["x-price"].amount_usd], [e.amount_usd], t.name);
    assert.ok(full.split("\n").some((l) => l.startsWith(`| \`${t.name}\` |`) && l.endsWith(`| ${e.price_short} |`)), `llms-full ${t.name}`);
    assert.equal(priceLabel({ c, L: c.web.locales.en } as any, t).includes("TODO_OWNER"), false);
  }
  assert.equal(priceEntries(c, published(c)).length, pricing.tools.length);
});

test("web price label turns a decided amount into the same amount", () => {
  const t = structuredClone(published(c)[0]);
  t.price = { model: "per_call", amount_usd: "0.0123" };
  assert.equal(priceLabel({ c, L: c.web.locales.en } as any, t), "Per call: 0.0123");
});

test("llms.txt in the site is the short one and links llms-full.txt, which exists", () => {
  assert.ok(Buffer.byteLength(text("llms.txt")) < 8 * 1024);
  assert.ok(text("llms.txt").includes(`${origin}/llms-full.txt`));
  assert.ok(built.files.has("llms-full.txt"));
  assert.ok(!/library\.read|games\.poker|lounge\.bar/.test(text("llms-full.txt")), "machine outputs stay F1-only");
});
