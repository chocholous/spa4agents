import { test } from "node:test";
import assert from "node:assert/strict";
import { load } from "../src/catalog.ts";
import { build } from "../src/generate.ts";
import { checkLinks, checkRepoMarkdown, extractLinks, resolveLink, xmlProblems } from "../src/links.ts";

const files = build();
const c = load();
const origin = `https://${c.brand.domain}`;
/** The catalog package does not build the web package's files; those links are checked in web/test. */
const deferred = ["data-policy.md"];
const aliases = { ".well-known/mcp.json": "mcp.json" };

test("internal links in the generated Markdown and text files resolve to generated files", () => {
  const set = new Map<string, string>(files);
  assert.deepEqual(checkLinks(set, { origin, aliases, deferred }), []);
});

test("only data-policy.md is deferred to the web package", () => {
  const set = new Map<string, string>(files);
  const strict = checkLinks(set, { origin, aliases });
  assert.deepEqual(strict.filter((p) => !p.includes("data-policy.md")), []);
  assert.ok(strict.length > 0, "llms.txt links data-policy.md");
});

test("a broken link is reported; external URLs are skipped, never fetched", () => {
  const set = new Map<string, string>([["a.md", "[x](b.md) [y](./gone.md) [z](https://example.org/nope) [w](#top)"], ["b.md", "ok"]]);
  const problems = checkLinks(set, { origin });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /gone\.md/);
  assert.equal(resolveLink("a.md", "https://example.org/x", { origin, exists: () => false }).kind, "external");
});

test("link extraction ignores code spans and fenced code", () => {
  assert.deepEqual(extractLinks("x.md", "`[a](nope.md)`\n```\n[b](nope2.md)\n```\n[c](yes.md)"), ["yes.md"]);
});

test("Markdown files in the repository link only to files that exist", () => {
  assert.deepEqual(checkRepoMarkdown(), []);
});

test("generated XML helper: sitemap-like documents are well-formed", () => {
  assert.deepEqual(xmlProblems('<?xml version="1.0"?><urlset><url><loc>https://a.b/</loc></url></urlset>'), []);
});
