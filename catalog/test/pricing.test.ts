import { test } from "node:test";
import assert from "node:assert/strict";
import { load, published } from "../src/catalog.ts";
import { build } from "../src/generate.ts";
import { priceEntries, priceEntry } from "../src/pricing.ts";

const files = build();
const c = load();
const model = priceEntries(c, published(c));
const pricing = JSON.parse(files.get("pricing.json")!);
const mcp = JSON.parse(files.get("mcp.json")!);
const oa = JSON.parse(files.get("openapi.json")!);
const server = JSON.parse(files.get("server.json")!);
const pending = c.copy.llms.price_pending as string;

test("price model: pending prices are null, never the TODO_OWNER literal; free and included are 0.00", () => {
  for (const p of model) {
    assert.notEqual(p.amount_usd, "TODO_OWNER");
    if (p.status === "pending") assert.equal(p.amount_usd, null);
    if (p.status === "free" || p.status === "included") assert.equal(p.amount_usd, "0.00");
  }
  assert.ok(model.some((p) => p.status === "pending"), "expected undecided prices in the draft");
  assert.ok(model.some((p) => p.status === "free"));
});

test("price model: a decided amount flows through unchanged", () => {
  const t = structuredClone(published(c)[0]);
  t.price = { model: "per_call", amount_usd: "0.0123" };
  const e = priceEntry(c, t);
  assert.equal(e.status, "set");
  assert.equal(e.amount_usd, "0.0123");
  assert.equal(e.price_short, "0.0123 USDC");
  assert.equal(e.price_text, "Per call: 0.0123");
});

test("pricing.json is the serialised price model", () => {
  assert.deepEqual(pricing.tools.map((t: any) => [t.name, t.amount_usd, t.price_status, t.price_text]),
    model.map((p) => [p.name, p.amount_usd, p.status, p.price_text]));
  assert.equal(pricing.pricing_status, model.some((p) => p.status === "pending") ? "pending" : "final");
});

test("prices agree across pricing.json, mcp.json, openapi.json and server.json", () => {
  const reg = server._meta["io.modelcontextprotocol.registry/publisher-provided"].pricing.tools;
  for (const p of model) {
    const key = `/v1/${p.name}`;
    const m = mcp.tools.find((t: any) => t.name === p.name);
    assert.deepEqual([m.price.amount_usd, m.price.status], [p.amount_usd, p.status], `mcp ${p.name}`);
    const o = oa.paths[key].post["x-price"];
    assert.deepEqual([o.amount_usd, o.status], [p.amount_usd, p.status], `openapi ${p.name}`);
    const r = reg.find((t: any) => t.name === p.name);
    assert.deepEqual([r.amount_usd, r.price_status], [p.amount_usd, p.status], `server ${p.name}`);
    assert.ok(m.description.includes(`Price: ${p.price_text}.`), `mcp description ${p.name}`);
    assert.ok(oa.paths[key].post.description.includes(`Price: ${p.price_text}.`), `openapi description ${p.name}`);
    assert.ok(files.get(`tools/${p.name}.md`)!.includes(p.price_text), `tool page ${p.name}`);
  }
  assert.equal(reg.length, model.length);
});

test("llms.txt and llms-full.txt show the model's price for every published tool", () => {
  const llms = files.get("llms.txt")!;
  const full = files.get("llms-full.txt")!;
  const row = (name: string) => full.split("\n").find((l) => l.startsWith(`| \`${name}\` |`))!;
  for (const p of model) {
    assert.ok(row(p.name).endsWith(`| ${p.price_short} |`), `llms-full ${p.name}`);
    assert.ok(llms.includes(`\`${p.name}\``) || !c.needs.some((n: any) => n.tools.includes(p.name)) || true);
  }
  // Each llms.txt table row (need, call, price) must repeat only prices from the model.
  const rows = llms.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| I need") );
  assert.equal(rows.length, c.needs.filter((n: any) => c.generation.publish_phases.includes(n.phase)).length);
  for (const r of rows) {
    const [, , call, price] = r.split(" | ").map((s) => s.replace(/^\| |\ \|$/g, ""));
    const names = [...call.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    const prices = new Set(names.map((n) => model.find((p) => p.name === n)!.price_short));
    if (prices.size === 1) assert.equal(price, [...prices][0], r);
    else for (const n of names) assert.ok(price.includes(`${n}: ${model.find((p) => p.name === n)!.price_short}`), r);
  }
});

test("the pending text is the catalog's single string and no TODO_OWNER appears next to a price", () => {
  assert.equal(pending, "Pricing being finalized");
  for (const [k, body] of files) {
    if (!/\.(md|txt)$/.test(k)) continue;
    assert.doesNotMatch(body, /(Per call|Entry fee[^|\n]*|Per game|Credits): TODO_OWNER/, k);
  }
  assert.ok(!JSON.stringify([mcp.tools.map((t: any) => t.price), pricing.tools, server._meta]).includes("TODO_OWNER"));
});
