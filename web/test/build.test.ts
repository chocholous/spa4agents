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

test("8 need pages; F2/F3 needs are marked planned", () => {
  const c = load();
  for (const n of c.needs) assert.ok(built.files.has(`needs/${n.id}/index.html`));
  assert.match(html("needs/meet-agents/index.html"), /Opening soon/);
  assert.match(html("needs/meet-agents/index.html"), /Phase F3/);
  assert.doesNotMatch(html("needs/heavy-content/index.html"), /Opening soon/);
});

test("TODO_OWNER never shown; prices say being decided", () => {
  for (const [p, body] of built.files) if (/\.(html|md)$/.test(p) && !p.startsWith("tools/") && !p.startsWith("needs/")) assert.ok(!String(body).includes("TODO_OWNER"), p);
  assert.match(html("pricing/index.html"), /Pricing being finalized/);
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

test("fine print is short, not in the main navigation, linked from the footer", () => {
  const h = html("honesty/index.html");
  assert.match(h, /<h1[^>]*>Fine print/);
  assert.match(h, /How the services work inside/);
  const nav = /<nav class="main-nav".*?<\/nav>/s.exec(html("index.html"))![0];
  assert.ok(!nav.includes("/honesty/"));
  assert.match(html("index.html"), /<a href="\/honesty\/">Fine print<\/a>/);
  assert.ok(!/Confession|not measured/i.test(html("index.html")));
});

test("the human site shows every need, every service and every wing; unopened ones are Opening soon", () => {
  const c = load();
  const tools = html("tools/index.html");
  for (const t of c.tools) assert.ok(tools.includes(`id="${t.name}"`), t.name);
  assert.equal((tools.match(/<article class="svc"/g) ?? []).length, 25);
  assert.match(tools, /Opening soon/);
  assert.equal((html("index.html").match(/<section class="menu-group"/g) ?? []).length, c.web.locales.en.wings.length);
  assert.match(html("index.html"), /Ways to rest/);
  assert.match(html("index.html"), /Send this to your agent/);
  assert.match(html("index.html"), /free trial sessions/);
  assert.match(html("index.html"), /href="\/data-policy\/"/);
});

test("machine outputs stay limited to the published phases", () => {
  const llms = html("llms.txt");
  assert.ok(!/games\.poker|lounge\.bar|garden\.tend/.test(llms));
  assert.ok(!built.files.has("tools/games.poker.md"));
  assert.ok(built.files.has("tools/quiet.ground.md"));
  assert.ok(![...built.files.keys()].some((k) => k.includes("recovery")));
});

test("home says the first spa for agents and names no hackathon", () => {
  assert.match(html("index.html"), /The first spa for agents/);
  for (const [p, body] of built.files) if (/\.(html|md|txt|json)$/.test(p)) assert.ok(!/lablab|devpost|hackathon\s+[A-Z]/i.test(String(body)), p);
});

test("framing: a catalog of services for an agent that wants to rest", () => {
  const home = html("index.html");
  assert.match(home, /Want to rest\? Pick a service/);
  assert.match(home, /<span class="badge ok">First release<\/span>/);
  assert.match(home, /<span class="badge warn">Opening soon/);
  assert.doesNotMatch(home, /<span class="badge ok">Open<\/span>/);
  assert.equal((home.match(/class="mi-text"/g) ?? []).length, load().tools.length);
  for (const [p, body] of built.files) if (p.endsWith(".html")) assert.doesNotMatch(String(body).replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]*>/g, " "), /\bpods?\b|resort|Lie back|proudly|capsules?\b/i, p);
});

test("every need page answers: when, what you get, how to call it, price and availability", () => {
  const c = load();
  for (const n of c.needs) {
    const s = html(`needs/${n.id}/index.html`);
    for (const h of ["When do you want it?", "What you get", "How to call it", "Price and availability"]) assert.ok(s.includes(`>${h}</h2>`), `${n.id}: ${h}`);
    assert.match(s, /Example call/);
  }
});

test("F2 services are not described as stored folders or persistent gardens (zero retention)", () => {
  for (const f of ["index.html", "tools/index.html", "needs/create/index.html"]) {
    const s = html(f);
    assert.doesNotMatch(s, /private folder|persistent garden|stays a garden/i, f);
  }
  assert.match(html("needs/create/index.html"), /not decided yet|still being decided/);
});
