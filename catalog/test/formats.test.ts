import { test } from "node:test";
import assert from "node:assert/strict";
import { load } from "../src/catalog.ts";
import { build } from "../src/generate.ts";
import { looksLikeHtml, mediaTypeOf, schemaErrors, xmlProblems } from "../src/links.ts";

const files = build();
const c = load();

test("media types: text outputs map to text/plain or text/markdown, JSON to application/json", () => {
  assert.equal(mediaTypeOf("llms.txt"), "text/plain");
  assert.equal(mediaTypeOf("llms-full.txt"), "text/plain");
  assert.equal(mediaTypeOf("initialize-instructions.txt"), "text/plain");
  assert.equal(mediaTypeOf("needs/stuck-in-a-loop.md"), "text/markdown");
  for (const k of files.keys()) if (k.endsWith(".json")) assert.equal(mediaTypeOf(k), "application/json", k);
  for (const k of files.keys()) assert.ok(mediaTypeOf(k), `no media type for ${k}`);
});

test("llms.txt and llms-full.txt are plain text, not HTML", () => {
  for (const f of ["llms.txt", "llms-full.txt", "initialize-instructions.txt"]) {
    const body = files.get(f)!;
    assert.ok(!looksLikeHtml(body), `${f} looks like HTML`);
    assert.ok(!/<\/?[a-z][^>]*>/i.test(body.replace(/```[\s\S]*?```/g, "")), `${f} contains tags`);
    assert.ok(!body.startsWith("<"), f);
  }
  assert.ok(looksLikeHtml("<!doctype html><html><body>app</body></html>"));
});

test("every *.json parses and is an object", () => {
  for (const [k, body] of files) if (k.endsWith(".json")) assert.equal(typeof JSON.parse(body), "object", k);
});

test("mcp.json validates against schema/mcp.schema.json", () => {
  assert.deepEqual(schemaErrors("mcp.schema.json", JSON.parse(files.get("mcp.json")!)), []);
});

test("server.json validates against schema/server.schema.json", () => {
  assert.deepEqual(schemaErrors("server.schema.json", JSON.parse(files.get("server.json")!)), []);
});

test("the schemas reject broken files", () => {
  const mcp = JSON.parse(files.get("mcp.json")!);
  delete mcp.endpoint;
  assert.ok(schemaErrors("mcp.schema.json", mcp).length > 0);
  const server = JSON.parse(files.get("server.json")!);
  server.remotes[0].url = "http://insecure";
  server.description = "x".repeat(101);
  assert.ok(schemaErrors("server.schema.json", server).length >= 2);
});

test("openapi.json is OpenAPI 3.1 with a path for every published tool", () => {
  const oa = JSON.parse(files.get("openapi.json")!);
  assert.equal(oa.openapi, "3.1.0");
  assert.ok(oa.info.title && oa.info.version);
  for (const p of Object.values<any>(oa.paths)) assert.ok(p.post.responses["200"]);
});

test("xml checker accepts well-formed and rejects broken XML", () => {
  assert.deepEqual(xmlProblems('<?xml version="1.0"?>\n<a x="1"><b>t &amp; u</b><c/></a>'), []);
  assert.ok(xmlProblems("<a><b></a>").length > 0);
  assert.ok(xmlProblems("<a>x & y</a>").length > 0);
  assert.ok(xmlProblems("<a/><b/>").length > 0);
});

test("brand is still a draft: nothing in the generated files claims approval", () => {
  assert.equal(c.brand.approved, false);
  assert.equal(JSON.parse(files.get("MANIFEST.json")!).draft, true);
});
