import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { baseUrl, collectTodos, load, loadRaw, published } from "../../catalog/src/catalog.ts";
import { build as buildCatalog } from "../../catalog/src/generate.ts";
import { validateFile } from "../../catalog/src/validate.ts";
import { badgeSvg, faviconSvg, markFileSvg, ogSvg } from "./art.ts";
import { buildPages, notFoundPage } from "./model.ts";
import type { Ctx, Page } from "./model.ts";
import { renderMarkdown, renderPage, esc } from "./render.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const sha = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");

type Out = Map<string, string | Buffer>;

export function buildSite(withPng = true): { files: Out; draft: boolean; warnings: string[] } {
  const rep = validateFile(false);
  if (rep.errors.length) throw new Error(`catalog invalid:\n${rep.errors.join("\n")}`);
  const { text } = loadRaw();
  const c = load();
  const base = baseUrl(c);
  const todos = collectTodos(c);
  const draft = !c.brand.approved || todos.length > 0;
  const warnings: string[] = [];
  const dflt = c.web.default_locale;
  const available: string[] = c.web.languages.map((l: any) => l.code).filter((code: string) => !!c.web.locales[code]);
  const files: Out = new Map();

  // Agent-facing files from the catalog generator (llms.txt, needs/*.md, tools/*.md, JSON).
  const cat = buildCatalog();
  const take = (from: string, to = from) => { if (cat.has(from)) files.set(to, cat.get(from)!); };
  for (const k of cat.keys()) if (k.startsWith("needs/") || k.startsWith("tools/")) take(k);
  take("llms.txt"); take("openapi.json"); take("pricing.json"); take("mcp.json", ".well-known/mcp.json");
  const mdAll = [...cat.keys()].filter((k) => k.endsWith(".md") && (k.startsWith("needs/") || k.startsWith("tools/"))).sort();
  files.set("llms-full.txt", [cat.get("llms.txt")!, ...mdAll.map((k) => `\n---\n\n${cat.get(k)}`)].join("\n"));

  // Per-locale pages.
  const sitemap: { loc: string; alts: Page[] }[] = [];
  const entries: { locale: string; page: Page }[] = [];
  const ogPng = withPng && !!pngRenderer();
  const ogImage = ogPng ? "/assets/og.png" : "/assets/og.svg";
  for (const locale of available) {
    const prefix = locale === dflt ? "" : `/${locale}`;
    const ctx: Ctx = { c, L: c.web.locales[locale], locale, prefix, draft, base };
    const pages = [...buildPages(ctx), notFoundPage(ctx)];
    for (const page of pages) {
      const o = { pages, page, availableLocales: available, ogImage, ogPng };
      const htmlPath = page.id === "not_found" ? "404.html" : `${prefix}${page.path}index.html`.replace(/^\//, "");
      files.set(prefix ? (page.id === "not_found" ? `${locale}/404.html` : htmlPath) : htmlPath, renderPage(ctx, o));
      if (page.mdPath && page.id !== "not_found" && !page.id.startsWith("need-")) files.set(`${prefix}${page.mdPath}`.replace(/^\//, ""), renderMarkdown(ctx, page));
      entries.push({ locale, page });
    }
  }

  // sitemap
  const ids = [...new Set(entries.filter((e) => e.page.sitemap).map((e) => e.page.id))];
  const url = (locale: string, p: Page) => base + (locale === dflt ? "" : `/${locale}`) + p.path;
  const sm = ids.map((id) => {
    const per = entries.filter((e) => e.page.id === id);
    const alt = per.length > 1 ? per.map((e) => `<xhtml:link rel="alternate" hreflang="${e.locale}" href="${esc(url(e.locale, e.page))}"/>`).join("") : "";
    return per.map((e) => `<url><loc>${esc(url(e.locale, e.page))}</loc>${alt}</url>`).join("\n");
  });
  files.set("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sm.join("\n")}\n</urlset>\n`);
  files.set("robots.txt", `User-agent: *\n${draft ? "Disallow: /" : "Allow: /"}\nSitemap: ${base}/sitemap.xml\n`);

  // data-policy.md (linked from llms.txt) is rendered from the data policy page above, so it and /data-policy/ share one source.
  const L = c.web.locales[dflt];

  // assets
  const S = L.share;
  files.set("assets/favicon.svg", faviconSvg());
  files.set("assets/mark.svg", markFileSvg());
  files.set("assets/badge.svg", badgeSvg(S.badge_left, S.badge_right, S.badge_alt));
  files.set("assets/og.svg", ogSvg(c.brand.name, L.meta.og_title, L.meta.og_line));
  const addAssets = (rel: string) => {
    for (const ent of readdirSync(path.join(ROOT, "assets", rel), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const sub = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) addAssets(sub);
      else files.set(`assets/${sub}`, /\.(css|js|svg|txt)$/.test(ent.name) ? readFileSync(path.join(ROOT, "assets", sub), "utf8") : readFileSync(path.join(ROOT, "assets", sub)));
    }
  };
  addAssets("");

  if (ogPng) files.set("assets/og.png", pngRenderer()!(files.get("assets/og.svg") as string));
  else if (withPng) warnings.push("playwright missing, og.png skipped");

  if (draft) warnings.push(`${L.draft.build_warning} (brand.approved=${c.brand.approved}, owner decisions pending: ${todos.length})`);

  const sorted = [...files.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  files.set("BUILD.json", JSON.stringify({
    draft, brand_approved: c.brand.approved, owner_decisions_pending: todos.length,
    catalog_sha256: sha(text), locales: available,
    files: sorted.map(([p, b]) => ({ path: p, sha256: sha(b) })),
  }, null, 2) + "\n");
  return { files, draft, warnings };
}

let renderer: ((svg: string) => Buffer) | null | undefined;
/** Optional PNG renderer for the Open Graph image, via a locally installed Playwright. */
function pngRenderer(): ((svg: string) => Buffer) | null {
  if (renderer !== undefined) return renderer;
  try {
    createRequire(import.meta.url).resolve("playwright");
  } catch {
    try { createRequire("/").resolve("playwright"); } catch { return (renderer = null); }
  }
  renderer = (svg: string) => {
    const script = path.join(ROOT, "scripts", "og-png.cjs");
    const { execFileSync } = createRequire(import.meta.url)("node:child_process");
    return execFileSync("node", [script], { input: svg, maxBuffer: 64 * 1024 * 1024 });
  };
  return renderer;
}

export function writeSite(files: Out, dir = DIST) {
  rmSync(dir, { recursive: true, force: true });
  for (const [p, body] of [...files.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const full = path.join(dir, p);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { files, draft, warnings } = buildSite();
  writeSite(files);
  for (const w of warnings) console.warn(`WARNING ${w}`);
  console.log(`built ${files.size} files into ${DIST}${draft ? " (draft)" : ""}`);
}
