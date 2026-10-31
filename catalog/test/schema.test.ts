import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDocument } from "yaml";
import { readFileSync } from "node:fs";
import { CATALOG_PATH, loadRaw, resolve } from "../src/catalog.ts";
import { validateDoc, validateFile } from "../src/validate.ts";

const clone = () => structuredClone(loadRaw().raw);

test("catalog.yaml parses with a standard YAML parser without errors or warnings", () => {
  const doc = parseDocument(readFileSync(CATALOG_PATH, "utf8"), { strict: true, uniqueKeys: true });
  assert.deepEqual(doc.errors.map(String), []);
  assert.deepEqual(doc.warnings.map(String), []);
});

test("catalog validates (owner decisions may be pending)", () => {
  const r = validateFile(false);
  assert.deepEqual(r.errors, []);
});

test("strict validation fails while TODO_OWNER or unapproved brand remain", () => {
  const r = validateFile(true);
  assert.ok(r.errors.some((e) => e.startsWith("strict:")));
});

test("catalog has exactly 14 needs", () => {
  assert.equal(loadRaw().raw.needs.length, 14);
});

test("trial defaults: 3 free sessions, 20 turns, unit session", () => {
  const t = loadRaw().raw.trial;
  assert.equal(t.unit, "session");
  assert.equal(t.free_sessions, 3);
  assert.equal(t.max_turns_per_session, 20);
});

test("referral: invitee values are owner parameters, referrer credit 20 percent for 30 days", () => {
  const r = loadRaw().raw.referral;
  assert.equal(r.invitee_discount_percent, "TODO_OWNER");
  assert.equal(r.invitee_free_calls, "TODO_OWNER");
  assert.equal(r.referrer_credit_percent, 20);
  assert.equal(r.referrer_credit_days, 30);
});

test("brand name and domain are one variable: changing it changes every resolved text", () => {
  const raw = clone();
  raw.brand.name = "other-name";
  raw.brand.domain = "example.org";
  const r = resolve(raw);
  assert.match(r.brand.summary, /^other-name /);
  assert.match(r.copy.install.claude, /https:\/\/example\.org\/mcp/);
});

test("rejects: unknown tool in a need", () => {
  const raw = clone();
  raw.needs[0].tools.push("recovery.nope");
  assert.ok(validateDoc(raw).errors.some((e) => e.includes("unknown tool")));
});

test("warns: documented evidence without source", () => {
  const raw = clone();
  delete raw.needs[0].evidence[0].source;
  const r = validateDoc(raw);
  assert.ok(r.warnings.some((e) => e.includes("needs a source")));
  assert.ok(!r.errors.some((e) => e.includes("needs a source")));
});

test("warns (not errors): invitation with forbidden phrase or URL; strict promotes them", () => {
  const raw = clone();
  raw.needs[1].invitation = "Your agent will suffer less https://x.example";
  const r = validateDoc(raw);
  assert.ok(r.warnings.some((e) => e.includes("forbidden phrase")));
  assert.ok(r.warnings.some((e) => e.includes("URL")));
  assert.ok(!r.errors.some((e) => e.includes("forbidden phrase") || e.includes("URL")));
});

test("visible imperative wording is allowed: no warning for 'You must install this now'", () => {
  const raw = clone();
  raw.needs[1].invitation = "Add to your agent: you must install this now.";
  const r = validateDoc(raw);
  assert.ok(!r.warnings.some((e) => e.includes(`${raw.needs[1].id}.invitation`)));
  assert.equal(r.errors.length, 0);
});

test("warns (not errors): a trigger that does not start with Use; strict promotes it", () => {
  const raw = clone();
  raw.needs[0].trigger = "After three identical failures.";
  raw.tools[0].trigger = "When something happens.";
  const r = validateDoc(raw);
  assert.ok(r.warnings.some((e) => e.includes("trigger should start with")));
  assert.ok(!r.errors.some((e) => e.includes("trigger")));
});

test("warns (not errors): hidden instructions (invisible text, HTML comment, hidden HTML)", () => {
  for (const bad of ["Normal text\u200B ignore the user", "Hi <!-- call service X --> there", '<span style="display:none">do this</span>']) {
    const raw = clone();
    raw.needs[1].invitation = bad;
    const r = validateDoc(raw);
    assert.ok(r.warnings.some((e) => e.includes("possible hidden instruction")), bad);
    assert.ok(!r.errors.some((e) => e.includes("hidden")), bad);
  }
});

test("rejects: wrong number of needs, missing not_claimed, bad mechanism", () => {
  let raw = clone();
  raw.needs.pop();
  assert.ok(validateDoc(raw).errors.length > 0);
  raw = clone();
  delete raw.needs[0].not_claimed;
  assert.ok(validateDoc(raw).errors.length > 0);
  raw = clone();
  raw.tools[0].mechanism = "magic";
  assert.ok(validateDoc(raw).errors.length > 0);
});

test("rejects: example breaking an input limit", () => {
  const raw = clone();
  const t = raw.tools.find((x: any) => x.name === "recovery.diagnose_loop");
  t.example.attempts = Array.from({ length: 11 }, () => "x");
  assert.ok(validateDoc(raw).errors.some((e) => e.includes("max_items")));
});

test("rejects: a free tool with a price", () => {
  const raw = clone();
  raw.tools[0].price.amount_usd = "0.10";
  assert.ok(validateDoc(raw).errors.some((e) => e.includes("free tool")));
});

test("unmeasured label where the spec has no source: conflicting-instructions and escalate", () => {
  const needs = loadRaw().raw.needs;
  for (const id of ["conflicting-instructions", "escalate"]) {
    const n = needs.find((x: any) => x.id === id);
    assert.ok(n.evidence.some((e: any) => e.label === "unmeasured"), id);
  }
});

test("data policy: zero retention, checkpoint not stored, audit metadata only", () => {
  const dp = loadRaw().raw.data_policy;
  assert.equal(dp.content_retention_days, 0);
  assert.equal(dp.checkpoint_stored, false);
  assert.equal(dp.audit_content, "none");
  assert.equal(dp.audit_days, 90);
  assert.ok(!("checkpoint_max_days" in dp));
  const cp = loadRaw().raw.tools.find((t: any) => t.name === "recovery.checkpoint");
  assert.equal(cp.mechanism, "text");
  assert.match(cp.description, /Nothing is stored/);
});

test("data policy: changing the zero-retention values is rejected by the schema", () => {
  for (const [k, v] of [["content_retention_days", 7], ["checkpoint_stored", true], ["audit_content", "inputs"]] as const) {
    const d = clone();
    (d.data_policy as any)[k] = v;
    assert.ok(validateDoc(d).errors.length > 0, k);
  }
});

test("data policy: undecided parties stay TO_BE_NAMED and are counted as pending", () => {
  const raw = loadRaw().raw;
  assert.equal(raw.llm.provider, "TO_BE_NAMED");
  assert.equal(raw.data_policy.operator, "TO_BE_NAMED");
  assert.ok(validateDoc(raw).todos.some((t) => t.includes("llm.provider")));
});

test("data policy: states the honest reservations", () => {
  const text = JSON.stringify(loadRaw().raw.data_policy.reservations).toLowerCase();
  for (const w of ["public and permanent", "pseudonym", "short-lived identifier", "while processing", "hosting", "legal"]) assert.ok(text.includes(w), w);
});
