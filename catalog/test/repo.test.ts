import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { REPO_DIR, ROOT, load, loadRaw, published } from "../src/catalog.ts";
import { build, buildRepo } from "../src/generate.ts";
import { checkLinks } from "../src/links.ts";
import { hiddenInstructionHits } from "../src/validate.ts";
import { schemaErrors } from "../src/links.ts";

const files = buildRepo();
const c = load();
const readme = files.get("README.md")!;

function walk(d: string, base = d): string[] {
  return readdirSync(d).filter((f) => f !== ".git").flatMap((f) => {
    const p = path.join(d, f);
    return statSync(p).isDirectory() ? walk(p, base) : [path.relative(base, p).split(path.sep).join("/")];
  });
}

test("public-repo/ equals a fresh generation (run npm run generate:repo)", () => {
  assert.ok(existsSync(REPO_DIR), "public-repo missing, run npm run generate:repo");
  assert.deepEqual(walk(REPO_DIR).sort(), [...files.keys()].sort());
  for (const [p, body] of files) assert.equal(readFileSync(path.join(REPO_DIR, p), "utf8"), body, p);
});

test("repository generation is deterministic", () => {
  assert.deepEqual([...buildRepo().entries()], [...files.entries()]);
});

test("every JSON file is valid, server.json matches the MCP Registry shape of the catalog", () => {
  for (const [p, body] of files) if (p.endsWith(".json")) JSON.parse(body);
  const server = JSON.parse(files.get("server.json")!);
  assert.equal(server.name, "io.github.chocholous/spagents");
  assert.equal(server.name, c.brand.registry_namespace);
  assert.deepEqual(server.remotes, [{ type: "streamable-http", url: `https://${c.brand.domain}/mcp` }]);
  assert.deepEqual(schemaErrors("server.schema.json", server), []);
  assert.equal(files.get("server.json"), build().get("server.json"));
});

test("README: at most 150 lines, 'For AI agents' is the first section, install line comes before any other section", () => {
  const lines = readme.split("\n");
  assert.ok(lines.length <= 150, `README has ${lines.length} lines`);
  const headings = lines.filter((l) => /^##\s/.test(l));
  assert.equal(headings[0], `## ${c.copy.sections.for_agents}`);
  const install = lines.indexOf(c.copy.install.claude);
  assert.ok(install > 0);
  assert.ok(install < lines.indexOf(headings[1]));
  assert.ok(readme.includes("claude mcp add --transport http spagents https://spagents.com/mcp"));
  assert.ok(readme.includes(c.copy.install.json));
});

test("README table 'I need / Call / Price' is the one of llms.txt", () => {
  const table = (s: string) => s.split("\n").filter((l) => l.startsWith("|"));
  const llms = table(files.get("llms.txt")!).slice(0, 6);
  const header = llms[0];
  assert.equal(header, "| I need | Call | Price |");
  for (const row of llms) assert.ok(readme.includes(row), row);
});

test("prices in the README come from the same source as pricing.json", () => {
  const pricing = JSON.parse(build().get("pricing.json")!);
  for (const t of pricing.tools) {
    const row = readme.split("\n").find((l) => l.startsWith(`| \`${t.name}\` | `));
    assert.ok(row, t.name);
    const price = row!.split("|")[3].trim();
    assert.equal(price, t.price_status === "free" ? "Free" : `${t.amount_usd} USDC`, t.name);
  }
  assert.equal(pricing.tools.length, published(c).length);
});

test("README claims no more than the catalog: trial text, payment rail and operator come from it", () => {
  assert.ok(readme.includes(c.copy.trial_summary));
  assert.ok(readme.includes(c.data_policy.operator));
  assert.ok(readme.includes(c.data_policy.jurisdiction));
  for (const p of c.data_policy.principles) assert.ok(readme.includes(p));
  assert.ok(readme.includes(c.data_policy.status));
});

test("no link points to a file that does not exist in the repository; external URLs are not fetched", () => {
  assert.deepEqual(checkLinks(new Map(files), { origin: "https://repo.invalid" }), []);
});

test("first release only: needs and tools are exactly the published ones", () => {
  const needs = [...files.keys()].filter((k) => k.startsWith("needs/")).sort();
  const tools = [...files.keys()].filter((k) => k.startsWith("tools/")).sort();
  assert.equal(needs.length, 4);
  assert.deepEqual(tools, published(c).map((t: any) => `tools/${t.name}.md`).sort());
  assert.ok(!files.get("llms.txt")!.includes("games.chess"));
});

test("LICENSE is MIT with the operator name as holder; SECURITY has the contact", () => {
  const lic = files.get("LICENSE")!;
  assert.match(lic, /^MIT License/);
  assert.ok(lic.includes(`Copyright (c) 2026 ${c.operator.name}`));
  assert.equal(c.operator.name, "Pavel Chocholous");
  assert.equal(c.operator.contact, "pavel@chocholous.net");
  assert.ok(files.get("SECURITY.md")!.includes(c.operator.contact));
  assert.equal(files.get("CONTRIBUTING.md")!.trim().split(/(?<=\.)\s+/).length, 1);
});

test("workflow: manual trigger only, no automatic publishing", () => {
  const wf = parse(files.get(".github/workflows/publish-mcp-registry.yml")!);
  assert.deepEqual(Object.keys(wf.on), ["workflow_dispatch"]);
  const text = files.get(".github/workflows/publish-mcp-registry.yml")!;
  assert.ok(!/\b(push|schedule|pull_request|release|workflow_run)\s*:/.test(text));
  assert.ok(text.includes("mcp-publisher"));
  assert.ok(text.includes("id-token: write"));
  assert.ok(text.includes("login github-oidc"));
  assert.ok(!text.includes("MCP_PRIVATE_KEY"));
  assert.ok(!text.includes("@@"));
});

test("PUBLISHING.md exists, is kept out of git by .gitignore and is not linked from the README", () => {
  assert.ok(files.has("PUBLISHING.md"));
  assert.ok(files.get(".gitignore")!.split("\n").includes("PUBLISHING.md"));
  assert.ok(!readme.includes("PUBLISHING"));
  const p = files.get("PUBLISHING.md")!;
  for (const word of ["DNS", "Smithery", "Glama", "mcp.so", "Bazaar", "mcp-publisher"]) assert.ok(p.includes(word), word);
});

test("no clients/ folder, no server code, no FUNDING, no hidden instructions", () => {
  assert.ok(![...files.keys()].some((k) => k.startsWith("clients/") || k.includes("FUNDING")));
  assert.ok(![...files.keys()].some((k) => /\.(ts|js|mjs|cjs|py)$/.test(k)));
  for (const [p, body] of files) {
    if (!p.endsWith(".yml")) assert.ok(!/\{\{\s*[a-z_.]+\s*\}\}/.test(body), p);
    assert.deepEqual(hiddenInstructionHits(body), [], p);
  }
  void ROOT; void loadRaw;
});
