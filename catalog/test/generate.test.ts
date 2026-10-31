import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DIST, ROOT, load, published } from "../src/catalog.ts";
import { build, write } from "../src/generate.ts";
import { hiddenInstructionHits } from "../src/validate.ts";

const files = build();
const c = load();

test("generator produces every required output", () => {
  const need = ["llms.txt", "server.json", "openapi.json", "pricing.json", "mcp.json", "README.tables.md", "initialize-instructions.txt", "MANIFEST.json"];
  for (const f of need) assert.ok(files.has(f), f);
  for (const n of c.needs) assert.ok(files.has(`needs/${n.id}.md`), n.id);
  for (const t of published(c)) assert.ok(files.has(`tools/${t.name}.md`), t.name);
  assert.equal([...files.keys()].filter((k) => k.startsWith("needs/")).length, 14);
  assert.equal([...files.keys()].filter((k) => k.startsWith("tools/")).length, 18);
});

test("generation is deterministic", () => {
  const again = build();
  assert.deepEqual([...again.entries()], [...files.entries()]);
});

test("committed dist/ equals a fresh generation (run npm run generate)", () => {
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [path.relative(DIST, p)]; });
  assert.ok(existsSync(DIST), "dist missing, run npm run generate");
  assert.deepEqual(walk(DIST).sort(), [...files.keys()].sort());
  for (const [p, body] of files) assert.equal(readFileSync(path.join(DIST, p), "utf8"), body, p);
});

test("write() writes the same bytes", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "spa-"));
  write(files, dir);
  for (const [p, body] of files) assert.equal(readFileSync(path.join(dir, p), "utf8"), body);
});

test("no unresolved template tokens in any output", () => {
  for (const [p, body] of files) assert.ok(!body.includes("{{"), p);
});

test("only published phases appear in tool outputs", () => {
  const mcp = JSON.parse(files.get("mcp.json")!);
  assert.equal(mcp.tools.length, 18);
  assert.ok(mcp.tools.every((t: any) => /^(lobby|recovery|quiet)\./.test(t.name)));
  const oa = JSON.parse(files.get("openapi.json")!);
  assert.equal(Object.keys(oa.paths).length, 18);
  assert.ok(!files.get("llms.txt")!.includes("games.chess"));
});

test("mcp.json: schemas carry the spec limits and paid tools declare payment and bazaar", () => {
  const mcp = JSON.parse(files.get("mcp.json")!);
  const d = mcp.tools.find((t: any) => t.name === "recovery.diagnose_loop");
  assert.equal(d.inputSchema.properties.task_summary.maxLength, 1000);
  assert.equal(d.inputSchema.properties.attempts.maxItems, 10);
  assert.equal(d.payment.scheme, "exact");
  assert.equal(d.bazaar.type, "mcp");
  assert.equal(d.bazaar.toolName, "recovery.diagnose_loop");
  const leave = mcp.tools.find((t: any) => t.name === "lobby.leave");
  assert.equal(leave.payment, null);
  assert.equal(mcp.protocol_version, "2025-06-18");
  assert.equal(mcp.endpoint, `https://${c.brand.domain}/mcp`);
});

test("openapi.json: paid tools have 402 with PAYMENT-REQUIRED, free tools do not", () => {
  const oa = JSON.parse(files.get("openapi.json")!);
  assert.ok(oa.paths["/v1/recovery.critique"].post.responses["402"].headers["PAYMENT-REQUIRED"]);
  assert.equal(oa.paths["/v1/lobby.leave"].post.responses["402"], undefined);
  assert.equal(oa.openapi, "3.1.0");
});

test("pricing.json: trial and referral parameters", () => {
  const p = JSON.parse(files.get("pricing.json")!);
  assert.equal(p.trial.free_sessions, 3);
  assert.equal(p.trial.max_turns_per_session, 20);
  assert.equal(p.referral.invitee_discount_percent, "TODO_OWNER");
  assert.equal(p.referral.referrer_credit_percent, 20);
  assert.ok(p.trial.covered_tools.includes("recovery.sanitize"));
});

test("server.json and MANIFEST mark the draft state", () => {
  const s = JSON.parse(files.get("server.json")!);
  assert.equal(s.remotes[0].type, "streamable-http");
  const m = JSON.parse(files.get("MANIFEST.json")!);
  assert.equal(m.draft, true);
  assert.ok(m.owner_decisions_pending.length > 0);
});

test("need pages: every page has situation, tools, evidence label, what is not claimed", () => {
  for (const n of c.needs) {
    const body = files.get(`needs/${n.id}.md`)!;
    for (const h of [c.copy.labels.situation, c.copy.labels.tools, c.copy.labels.evidence, c.copy.labels.not_claimed])
      assert.ok(body.includes(`## ${h}`), `${n.id} ${h}`);
  }
  for (const id of ["conflicting-instructions", "escalate"])
    assert.ok(files.get(`needs/${id}.md`)!.includes(c.evidence_labels.display.unmeasured), id);
  for (const id of ["play", "create", "read", "meet-agents"])
    assert.ok(files.get(`needs/${id}.md`)!.includes(c.copy.planned_notice), id);
});

test("initialize instructions may suggest next steps but carry no hidden instructions", () => {
  const t = files.get("initialize-instructions.txt")!;
  assert.deepEqual(hiddenInstructionHits(t), []);
  assert.ok(t.includes(c.copy.no_commands_notice));
});

test("no generated agent-facing text contains hidden-instruction patterns", () => {
  for (const [name, body] of files) if (typeof body === "string" && /\.(md|txt|json)$/.test(name)) assert.deepEqual(hiddenInstructionHits(body.replace(/<!-- (BEGIN|END) GENERATED: [\w-]+ -->/g, "")), [], name); // generator block markers are not instructions
});

test("README tables list only published needs and tools", () => {
  const r = files.get("README.tables.md")!;
  assert.ok(r.includes("`stuck-in-a-loop`"));
  assert.ok(!r.includes("`meet-agents`"));
  assert.ok(r.includes(c.copy.install.claude));
});

test("ROOT sanity", () => assert.ok(existsSync(path.join(ROOT, "catalog.yaml"))));
