import { test } from "node:test";
import assert from "node:assert/strict";
import { load, published } from "../src/catalog.ts";
import { build } from "../src/generate.ts";

const files = build();
const c = load();
const llms = files.get("llms.txt")!;

test("llms.txt stays under 8 KB (measured in bytes)", () => {
  const size = Buffer.byteLength(llms, "utf8");
  assert.ok(size < 8 * 1024, `llms.txt is ${size} bytes`);
});

test("llms.txt: connect line right after the summary, then the need/call/price table", () => {
  const lines = llms.split("\n");
  assert.equal(lines[0], `# ${c.brand.name}`);
  const connect = lines.findIndex((l) => l.startsWith(`${c.copy.llms.connect_label}: `));
  assert.ok(connect > 0 && connect < 6, `connect line at ${connect}`);
  assert.equal(lines[connect], `${c.copy.llms.connect_label}: \`${c.copy.install.claude}\``);
  assert.ok(llms.includes(`| ${c.copy.llms.table_need} | ${c.copy.llms.table_call} | ${c.copy.labels.price} |`));
  assert.ok(connect < llms.indexOf("| I need"));
});

test("llms.txt links llms-full.txt and carries no long per-tool detail", () => {
  assert.ok(llms.includes(`(https://${c.brand.domain}/llms-full.txt)`));
  assert.ok(!llms.includes("/tools/") && !llms.includes("/needs/"), "per-page links belong in llms-full.txt");
  assert.ok(!llms.includes("inputSchema") && !llms.includes("## Tools"));
});

test("llms.txt covers only F1 (published phases), llms-full.txt too", () => {
  const f1 = new Set(published(c).map((t: any) => t.name));
  for (const t of c.tools) {
    const inLlms = llms.includes(`\`${t.name}\``);
    if (!f1.has(t.name)) {
      assert.ok(!inLlms, t.name);
      assert.ok(!files.get("llms-full.txt")!.includes(`\`${t.name}\``), `llms-full mentions ${t.name}`);
    }
  }
  for (const n of c.needs.filter((n: any) => n.phase !== "F1")) assert.ok(!llms.includes(n.situation), n.id);
});

test("llms-full.txt carries the rest: all F1 needs and tools, pages and the price table", () => {
  const full = files.get("llms-full.txt")!;
  assert.ok(Buffer.byteLength(full) > Buffer.byteLength(llms));
  for (const t of published(c)) { assert.ok(full.includes(`(https://${c.brand.domain}/tools/${t.name}.md)`), t.name); assert.ok(full.includes(`# ${t.name}\n`), t.name); }
  for (const n of c.needs.filter((n: any) => n.phase === "F1")) assert.ok(full.includes(`# ${n.id}\n`), n.id);
  assert.ok(full.includes("## Pricing"));
});

test("data policy stays locked in the generated agent files", () => {
  assert.equal(c.data_policy.content_retention_days, 0);
  assert.equal(c.data_policy.checkpoint_stored, false);
  assert.ok(llms.includes("data-policy.md"));
});
