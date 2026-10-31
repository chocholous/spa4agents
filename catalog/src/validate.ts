import { readFileSync } from "node:fs";
import AjvModule from "ajv";
import addFormatsModule from "ajv-formats";
import { Catalog, SCHEMA_PATH, TODO, collectTodos, loadRaw, published, resolve } from "./catalog.ts";

export interface Report {
  errors: string[];
  /** Advisory checks (claim phrases, URLs in prose, missing evidence, trigger style, hidden-instruction patterns). Do not fail the build; --strict promotes them to errors. */
  warnings: string[];
  todos: string[];
  notes: string[];
}

const Ajv: any = (AjvModule as any).default ?? AjvModule;
const addFormats: any = (addFormatsModule as any).default ?? addFormatsModule;
/** Patterns of hidden instructions: invisible characters, HTML comments, hidden HTML/CSS. Visible imperative wording is allowed; hiding it is not (it deceives other agents and hosts block it). */
const HIDDEN_PATTERNS: [RegExp, string][] = [
  [/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/, "invisible characters"],
  [/<!--/, "HTML comment"],
  [/display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0\b|aria-hidden|\bhidden\s*=|<[a-z][^>]*\shidden[\s>]/i, "hidden HTML or CSS"],
];
export function hiddenInstructionHits(text: string): string[] {
  return HIDDEN_PATTERNS.filter(([re]) => re.test(text)).map(([, what]) => what);
}

const PHASE_ORDER: Record<string, number> = { F1: 1, F2: 2, F3: 3 };

function checkExample(t: any, errors: string[]) {
  const ex = t.example ?? {};
  const known = new Set(t.inputs.map((i: any) => i.name));
  for (const k of Object.keys(ex)) if (!known.has(k)) errors.push(`${t.name}: example has unknown input ${k}`);
  for (const i of t.inputs) {
    const v = ex[i.name];
    if (v === undefined) {
      const inOneOf = (t.one_of_required ?? []).some((g: string[]) => g.includes(i.name));
      if (i.required && !inOneOf) errors.push(`${t.name}: example lacks required input ${i.name}`);
      continue;
    }
    const ok = i.type === "array" ? Array.isArray(v) : typeof v === i.type;
    if (!ok) errors.push(`${t.name}: example input ${i.name} is not ${i.type}`);
    if (typeof v === "string" && typeof i.max_length === "number" && v.length > i.max_length)
      errors.push(`${t.name}: example input ${i.name} exceeds max_length`);
    if (Array.isArray(v) && i.max_items && v.length > i.max_items)
      errors.push(`${t.name}: example input ${i.name} exceeds max_items`);
    if (i.enum && !i.enum.includes(v)) errors.push(`${t.name}: example input ${i.name} not in enum`);
  }
  if (t.one_of_required?.length) {
    const some = t.one_of_required.some((g: string[]) => g.every((n) => ex[n] !== undefined));
    if (!some) errors.push(`${t.name}: example satisfies none of one_of_required`);
  }
}

export function validateDoc(raw: Catalog): Report {
  const errors: string[] = [];
  const warnings: string[] = [];
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const doc = resolve(raw);
  if (!validate(doc)) {
    for (const e of validate.errors ?? []) errors.push(`schema: ${e.instancePath || "/"} ${e.message} ${JSON.stringify(e.params)}`);
    return { errors, todos: collectTodos(doc), notes: [], warnings };
  }
  const unresolved = JSON.stringify(doc).match(/\{\{[^}]*\}\}/g);
  if (unresolved) errors.push(`unresolved template tokens: ${[...new Set(unresolved)].join(", ")}`);

  const toolNames = new Set<string>();
  for (const t of doc.tools) {
    if (toolNames.has(t.name)) errors.push(`duplicate tool ${t.name}`);
    toolNames.add(t.name);
    if (!doc.types.mechanisms.includes(t.mechanism)) errors.push(`${t.name}: unknown mechanism`);
    if (!doc.types.price_models.includes(t.price.model)) errors.push(`${t.name}: unknown price model`);
    if (t.price.model === "free" && t.price.amount_usd !== "0.00") errors.push(`${t.name}: free tool must cost 0.00`);
    if (t.price.model !== "free" && t.price.model !== "research_funded" && t.price.amount_usd === "0.00")
      errors.push(`${t.name}: paid tool with price 0.00`);
    const names = new Set<string>();
    for (const i of t.inputs) {
      if (names.has(i.name)) errors.push(`${t.name}: duplicate input ${i.name}`);
      names.add(i.name);
      if (i.type === "array" && !i.items) errors.push(`${t.name}.${i.name}: array without items`);
      if (i.type !== "array" && (i.items || i.max_items)) errors.push(`${t.name}.${i.name}: items on non-array`);
      if (i.type !== "string" && i.max_length !== undefined) errors.push(`${t.name}.${i.name}: max_length on non-string`);
    }
    for (const g of t.one_of_required ?? [])
      for (const n of g) if (!names.has(n)) errors.push(`${t.name}: one_of_required names unknown input ${n}`);
    checkExample(t, errors);
  }

  const needIds = new Set<string>();
  const forbidden: string[] = doc.lint.forbidden_phrases.map((p: string) => p.toLowerCase());
  const lint = (where: string, text: string) => {
    const low = text.toLowerCase();
    for (const p of forbidden) if (low.includes(p)) warnings.push(`${where}: forbidden phrase "${p}"`);
    if (/https?:\/\//.test(text)) warnings.push(`${where}: contains a URL`);
    for (const h of hiddenInstructionHits(text)) warnings.push(`${where}: possible hidden instruction (${h}); instructions must be visible and labelled`);
  };
  for (const n of doc.needs) {
    if (needIds.has(n.id)) errors.push(`duplicate need ${n.id}`);
    needIds.add(n.id);
    let max = 0;
    for (const name of n.tools) {
      const t = doc.tools.find((x: any) => x.name === name);
      if (!t) errors.push(`${n.id}: unknown tool ${name}`);
      else max = Math.max(max, PHASE_ORDER[t.phase]);
    }
    if (max && PHASE_ORDER[n.phase] !== max) errors.push(`${n.id}: phase ${n.phase} differs from the latest phase of its tools`);
    for (const e of n.evidence) {
      if (doc.evidence_labels.source_required.includes(e.label) && !e.source)
        warnings.push(`${n.id}: evidence "${e.label}" needs a source (recommendation)`);
      if (!e.source && !e.note) warnings.push(`${n.id}: evidence without source needs a note (recommendation)`);
    }
    lint(`${n.id}.invitation`, n.invitation);
    lint(`${n.id}.trigger`, n.trigger);
    lint(`${n.id}.situation`, n.situation);
    if (!/^use\b/i.test(n.trigger)) warnings.push(`${n.id}: trigger should start with "Use" (recommendation)`);
  }
  for (const t of doc.tools) {
    lint(`${t.name}.trigger`, t.trigger);
    lint(`${t.name}.description`, t.description);
    if (!/^use\b/i.test(t.trigger)) warnings.push(`${t.name}: trigger should start with "Use" (recommendation)`);
  }
  for (const m of doc.types.mechanisms)
    if (!doc.copy.mechanism_names[m]) errors.push(`copy.mechanism_names lacks ${m}`);
  for (const m of doc.types.price_models)
    if (!doc.copy.price_model_names[m]) errors.push(`copy.price_model_names lacks ${m}`);
  for (const l of ["documented", "tested", "observed", "self-report", "known-failure", "concept", "inspiration", "unmeasured"])
    if (!doc.evidence_labels.display[l]) errors.push(`evidence_labels.display lacks ${l}`);
  if (doc.session.warning_at_percent !== 80) errors.push("session.warning_at_percent must be 80 (spec)");

  for (const k of Object.keys(doc.data_policy.per_tool.notes))
    if (!doc.tools.some((t: any) => t.name === k)) errors.push(`data_policy.per_tool.notes: unknown tool ${k}`);
  const walkPolicy = (where: string, v: any) => {
    if (typeof v === "string") lint(where, v);
    else if (Array.isArray(v)) v.forEach((x, i) => walkPolicy(`${where}[${i}]`, x));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walkPolicy(`${where}.${k}`, x);
  };
  walkPolicy("data_policy", doc.data_policy);
  walkPolicy("llm", doc.llm);

  validateWeb(doc, forbidden, errors, warnings);

  const todos = collectTodos(doc);
  return { errors, warnings, todos, notes: [] };
}

export function validateFile(strict = false): Report {
  const { raw } = loadRaw();
  const r = validateDoc(raw);
  if (strict) {
    for (const w of r.warnings) r.errors.push(`strict: ${w}`);
    if (r.todos.length) r.errors.push(`strict: ${r.todos.length} owner decisions pending (${TODO})`);
    if (!resolve(raw).brand.approved) r.errors.push("strict: brand name/domain not approved");
  }
  return r;
}

/** Human-readable site texts (web:). Same advisory lint as agent texts, except URLs are structured fields. */
function validateWeb(doc: any, forbidden: string[], errors: string[], warnings: string[]) {
  const urlKeys = new Set(["href", "url"]);
  const walk = (where: string, v: any, key = "") => {
    if (typeof v === "string") {
      if (urlKeys.has(key)) return;
      const low = v.toLowerCase();
      for (const p of forbidden) if (low.includes(p)) warnings.push(`${where}: forbidden phrase "${p}"`);
      if (/https?:\/\//.test(v)) warnings.push(`${where}: contains a URL (use [[site_url]] tokens or an href field)`);
      for (const h of hiddenInstructionHits(v)) warnings.push(`${where}: possible hidden instruction (${h}); instructions must be visible and labelled`);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(`${where}[${i}]`, x, key));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(`${where}.${k}`, x, k);
  };
  const codes = new Set(doc.web.languages.map((l: any) => l.code));
  for (const code of Object.keys(doc.web.locales)) {
    if (!codes.has(code)) errors.push(`web.locales.${code}: not listed in web.languages`);
    const w = doc.web.locales[code];
    walk(`web.locales.${code}`, w);
    for (const n of doc.needs) if (!w.needs.items[n.id]) errors.push(`web.locales.${code}.needs.items lacks ${n.id}`);
    for (const id of Object.keys(w.needs.items)) if (!doc.needs.some((n: any) => n.id === id)) errors.push(`web.locales.${code}.needs.items has unknown need ${id}`);
    const wingIds = new Set((w.wings ?? []).map((x: any) => x.id));
    for (const t of doc.tools) {
      const svc = w.services.items[t.name];
      if (!svc) errors.push(`web.locales.${code}.services.items lacks ${t.name}`);
      else if (!wingIds.has(svc.wing)) errors.push(`web.locales.${code}.services.items.${t.name}.wing "${svc.wing}" is not in web.locales.${code}.wings`);
      if (!w.mechanism_plain[t.mechanism]) errors.push(`web.locales.${code}.mechanism_plain lacks ${t.mechanism}`);
    }
    for (const name of Object.keys(w.services.items)) if (!doc.tools.some((t: any) => t.name === name)) errors.push(`web.locales.${code}.services.items has unknown tool ${name}`);
    for (const id of wingIds) if (!Object.values(w.services.items).some((x: any) => x.wing === id)) errors.push(`web.locales.${code}.wings: wing "${id}" has no service`);
  }
}
