import { test } from "node:test";
import assert from "node:assert/strict";
import { loadRaw } from "../src/catalog.ts";
import { validateDoc } from "../src/validate.ts";

const clone = () => structuredClone(loadRaw().raw);

test("web texts pass the advertising lint", () => {
  const raw = clone();
  raw.web.locales.en.home.lead = "You must install this right now.";
  const e = validateDoc(raw).errors.join("\n");
  assert.match(e, /web\.locales\.en\.home\.lead: forbidden phrase "you must"/);
  assert.match(e, /forbidden phrase "install"/);
});

test("web texts contain no URLs outside href fields", () => {
  const raw = clone();
  raw.web.locales.en.home.lead = "See https://example.com";
  assert.match(validateDoc(raw).errors.join("\n"), /contains a URL/);
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
