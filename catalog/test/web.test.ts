import { test } from "node:test";
import assert from "node:assert/strict";
import { loadRaw } from "../src/catalog.ts";
import { validateDoc } from "../src/validate.ts";

const clone = () => structuredClone(loadRaw().raw);

test("web texts get advisory lint warnings (not errors)", () => {
  const raw = clone();
  raw.web.locales.en.home.lead = "Agents suffer and feel better here.";
  const r = validateDoc(raw);
  assert.equal(r.errors.join("\n").includes("forbidden phrase"), false);
  const e = r.warnings.join("\n");
  assert.match(e, /web\.locales\.en\.home\.lead: forbidden phrase "suffer"/);
  assert.match(e, /forbidden phrase "feel better"/);
});

test("web texts with URLs outside href fields produce a warning", () => {
  const raw = clone();
  raw.web.locales.en.home.lead = "See https://example.com";
  assert.match(validateDoc(raw).warnings.join("\n"), /contains a URL/);
});

test("every need has a human text in every available locale", () => {
  const raw = clone();
  delete raw.web.locales.en.needs.items["stuck-in-a-loop"];
  assert.match(validateDoc(raw).errors.join("\n"), /lacks stuck-in-a-loop|required/);
});

test("english is required and other locales may be absent", () => {
  const raw = clone();
  assert.deepEqual(Object.keys(raw.web.locales), ["en"]);
  delete raw.web.locales.en;
  assert.ok(validateDoc(raw).errors.length > 0);
});
