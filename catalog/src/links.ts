import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import AjvModule from "ajv";
import addFormatsModule from "ajv-formats";
import { ROOT } from "./catalog.ts";

const Ajv: any = (AjvModule as any).default ?? AjvModule;
const addFormats: any = (addFormatsModule as any).default ?? addFormatsModule;

/** Validate data against a schema file in catalog/schema/. Returns the error list (empty = valid). */
export function schemaErrors(schemaFile: string, data: unknown): string[] {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(JSON.parse(readFileSync(path.join(ROOT, "schema", schemaFile), "utf8")));
  return validate(data) ? [] : (validate.errors ?? []).map((e: any) => `${e.instancePath || "/"} ${e.message}`);
}

/** Media types the site serves per extension (the same table as web/scripts/serve.mjs). */
export const MEDIA_TYPES: Record<string, string> = {
  ".html": "text/html", ".md": "text/markdown", ".txt": "text/plain", ".json": "application/json", ".xml": "application/xml",
};
export const mediaTypeOf = (file: string): string | undefined => MEDIA_TYPES[path.extname(file)];

/** A text/plain file must not be an HTML document or app shell. */
export function looksLikeHtml(body: string): boolean {
  return /^\s*<(!doctype|html|head|body|script|div|\?xml)/i.test(body) || /<(html|head|body)[\s>]/i.test(body);
}

export interface Link { from: string; target: string }

/** Links of one file. Markdown/text: inline links and bare autolinks; HTML: href/src; XML: <loc> and href. */
export function extractLinks(file: string, body: string): string[] {
  const out: string[] = [];
  if (file.endsWith(".html")) {
    for (const m of body.matchAll(/\b(?:href|src)="([^"]*)"/g)) out.push(m[1]);
  } else if (file.endsWith(".xml")) {
    for (const m of body.matchAll(/<loc>([^<]*)<\/loc>/g)) out.push(m[1]);
    for (const m of body.matchAll(/\bhref="([^"]*)"/g)) out.push(m[1]);
  } else if (file.endsWith(".md") || file.endsWith(".txt")) {
    const stripped = body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
    for (const m of stripped.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) out.push(m[1]);
  }
  return out.map((s) => s.replace(/&amp;/g, "&"));
}

export interface ResolveOpts {
  /** Origin of the site (https://example.com): absolute links to it are internal. */
  origin: string;
  /** Does a path (relative to the site root, no leading slash) exist? */
  exists: (p: string) => boolean;
  /** Paths served from elsewhere (alias -> file that exists). */
  aliases?: Record<string, string>;
  /** Paths known to be produced by another package (not checked here). */
  deferred?: string[];
}

export type Resolved = { kind: "external" | "skip" | "ok" | "missing"; path?: string; fragment?: string };

/** Resolve one link found in `from` (site-relative path) to a file. External URLs are never fetched. */
export function resolveLink(from: string, target: string, o: ResolveOpts): Resolved {
  if (target === "" ) return { kind: "skip" };
  if (/^(mailto:|tel:|data:|javascript:)/i.test(target)) return { kind: "skip" };
  let t = target;
  if (/^https?:\/\//i.test(t)) {
    if (!t.startsWith(o.origin + "/") && t !== o.origin) return { kind: "external" };
    t = t.slice(o.origin.length) || "/";
  } else if (t.startsWith("//")) return { kind: "external" };
  const hash = t.indexOf("#");
  const fragment = hash >= 0 ? t.slice(hash + 1) : undefined;
  if (hash >= 0) t = t.slice(0, hash);
  t = t.split("?")[0];
  let p: string;
  if (t === "") p = from;
  else if (t.startsWith("/")) p = t.slice(1);
  else p = path.posix.normalize(path.posix.join(path.posix.dirname(from), t));
  if (p === "" || p.endsWith("/")) p += "index.html";
  const candidates = [p, p + "/index.html"];
  for (const cand of candidates) {
    if (o.exists(cand)) return { kind: "ok", path: cand, fragment };
    const alias = o.aliases?.[cand];
    if (alias && o.exists(alias)) return { kind: "ok", path: alias, fragment };
  }
  if (o.deferred?.includes(p)) return { kind: "skip" };
  return { kind: "missing", path: p };
}

/** Check all internal links of a set of text files. Returns human-readable problems. */
export function checkLinks(files: Map<string, string | Buffer>, o: Omit<ResolveOpts, "exists">): string[] {
  const problems: string[] = [];
  const exists = (p: string) => files.has(p);
  const ids = new Map<string, Set<string>>();
  const idsOf = (p: string) => {
    if (!ids.has(p)) ids.set(p, new Set([...String(files.get(p)).matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])));
    return ids.get(p)!;
  };
  for (const [file, body] of files) {
    if (typeof body !== "string" || !/\.(html|md|txt|xml)$/.test(file)) continue;
    for (const link of extractLinks(file, body)) {
      const r = resolveLink(file, link, { ...o, exists });
      if (r.kind === "missing") problems.push(`${file}: ${link} -> ${r.path} does not exist`);
      else if (r.kind === "ok" && r.fragment && r.path!.endsWith(".html") && !idsOf(r.path!).has(r.fragment))
        problems.push(`${file}: ${link} -> no #${r.fragment} in ${r.path}`);
    }
  }
  return problems;
}

/** Markdown files of the repository (not node_modules, not generated dist/), keyed by repo-relative path. */
export function repoMarkdown(repoRoot = path.resolve(ROOT, "..")): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === "dist" || name === ".git") continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".md")) out.set(path.relative(repoRoot, full).split(path.sep).join("/"), readFileSync(full, "utf8"));
    }
  };
  walk(repoRoot);
  return out;
}

/** Internal links of repository Markdown files: relative paths and repo-absolute ones must exist on disk. */
export function checkRepoMarkdown(repoRoot = path.resolve(ROOT, "..")): string[] {
  const problems: string[] = [];
  for (const [file, body] of repoMarkdown(repoRoot)) {
    for (const link of extractLinks(file, body)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith("//") || link.startsWith("#")) continue;
      const rel = link.split("#")[0].split("?")[0];
      if (!rel) continue;
      const abs = rel.startsWith("/") ? path.join(repoRoot, rel) : path.join(repoRoot, path.dirname(file), rel);
      if (!existsSync(abs)) problems.push(`${file}: ${link} does not exist`);
    }
  }
  return problems;
}

/** Minimal XML well-formedness check (no DTD): one root, balanced tags, quoted attributes, known entities. Returns problems. */
export function xmlProblems(xml: string): string[] {
  const problems: string[] = [];
  let s = xml.replace(/^﻿/, "");
  s = s.replace(/^<\?xml[^>]*\?>\s*/, "");
  if (/<\?xml/.test(s)) problems.push("XML declaration not at the start");
  const stack: string[] = [];
  let roots = 0;
  const re = /<!--[\s\S]*?-->|<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[A-Za-z_][\w:.-]*\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>|([^<]+)|(<)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m[6]) { problems.push(`stray "<" at ${m.index}`); break; }
    if (m[5] !== undefined) {
      const text = m[5];
      if (stack.length === 0 && text.trim()) problems.push("text outside the root element");
      for (const e of text.matchAll(/&([^;\s]*);?/g)) if (!/^(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+)$/.test(e[1]) || !e[0].endsWith(";")) problems.push(`bad entity ${e[0]}`);
      continue;
    }
    if (m[2] === undefined) continue; // comment
    const [, close, name, attrs, self] = m;
    if (attrs) for (const e of attrs.matchAll(/="([^"]*)"|='([^']*)'/g)) for (const x of (e[1] ?? e[2]).matchAll(/&([^;\s]*);?/g)) if (!/^(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+)$/.test(x[1]) || !x[0].endsWith(";")) problems.push(`bad entity ${x[0]} in attribute`);
    if (close) {
      if (stack.pop() !== name) problems.push(`closing </${name}> does not match`);
    } else {
      if (stack.length === 0) roots++;
      if (!self) stack.push(name);
    }
  }
  if (stack.length) problems.push(`unclosed <${stack[stack.length - 1]}>`);
  if (roots !== 1) problems.push(`expected one root element, found ${roots}`);
  return problems;
}
