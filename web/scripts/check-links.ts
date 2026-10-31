// Link check of the built site (web/dist) and of the Markdown files in the repository. External URLs are never requested.
// Usage: npm run build && npm run check:links
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { baseUrl, load } from "../../catalog/src/catalog.ts";
import { checkLinks, checkRepoMarkdown } from "../../catalog/src/links.ts";

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
if (!existsSync(dist)) { console.error("web/dist is missing; run npm run build first"); process.exit(2); }
const files = new Map<string, string | Buffer>();
const walk = (d: string) => {
  for (const n of readdirSync(d)) {
    const f = path.join(d, n);
    if (statSync(f).isDirectory()) walk(f);
    else files.set(path.relative(dist, f).split(path.sep).join("/"), /\.(html|md|txt|xml|json|css|js|svg)$/.test(n) ? readFileSync(f, "utf8") : readFileSync(f));
  }
};
walk(dist);
const problems = [...checkLinks(files, { origin: baseUrl(load()) }), ...checkRepoMarkdown()];
for (const p of problems) console.error(`BROKEN ${p}`);
console.log(problems.length ? `${problems.length} broken links` : `links ok (${files.size} files in dist, repository Markdown checked)`);
process.exit(problems.length ? 1 : 0);
