import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DIST, REPO_DIR, collectTodos, load, loadRaw } from "./catalog.ts";
import { renderMcp, renderOpenapi, renderPricing, renderServer } from "./render/machine.ts";
import { renderRepo } from "./render/repo.ts";
import { renderNeeds, renderTools } from "./render/pages.ts";
import { Files, json } from "./render/shared.ts";
import { renderInstructions, renderLlms, renderLlmsFull, renderReadmeTables } from "./render/text.ts";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export function build(): Files {
  const { text } = loadRaw();
  const c = load();
  const files: Files = new Map();
  renderNeeds(c, files);
  renderTools(c, files);
  renderLlms(c, files);
  renderLlmsFull(c, files);
  renderServer(c, files);
  renderPricing(c, files);
  renderMcp(c, files);
  renderOpenapi(c, files);
  renderReadmeTables(c, files);
  renderInstructions(c, files);
  const todos = collectTodos(c);
  const entries = [...files.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  files.set("MANIFEST.json", json({
    catalog_sha256: sha(text),
    draft: !c.launch.live,
    launch_live: c.launch.live,
    brand_approved: c.brand.approved,
    owner_decisions_pending: todos,
    files: entries.map(([p, body]) => ({ path: p, sha256: sha(body) })),
  }));
  return files;
}

export function write(files: Files, dir = DIST) {
  rmSync(dir, { recursive: true, force: true });
  for (const [p, body] of [...files.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const full = path.join(dir, p);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
}

export function readDist(p: string, dir = DIST): string {
  return readFileSync(path.join(dir, p), "utf8");
}

/** The public repository (public-repo/), generated from the catalog outputs of build(). */
export function buildRepo(): Files {
  return renderRepo(load(), build());
}

/** Replace the contents of the repository folder, keeping a .git directory if the folder has one. */
export function writeRepo(files: Files, dir = REPO_DIR) {
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) if (name !== ".git") rmSync(path.join(dir, name), { recursive: true, force: true });
  for (const [p, body] of [...files.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const full = path.join(dir, p);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
}
