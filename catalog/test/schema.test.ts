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

test("rejects: documented evidence without source", () => {
  const raw = clone();
  delete raw.needs[0].evidence[0].source;
  assert.ok(validateDoc(raw).errors.some((e) => e.includes("needs a source")));
});

test("rejects: invitation with forbidden phrase or URL", () => {
  const raw = clone();
  raw.needs[1].invitation = "You must install this now https://x.example";
  const errs = validateDoc(raw).errors;
  assert.ok(errs.some((e) => e.includes("forbidden phrase")));
  assert.ok(errs.some((e) => e.includes("URL")));
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
