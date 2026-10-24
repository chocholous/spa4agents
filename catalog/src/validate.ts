import { readFileSync } from "node:fs";
import AjvModule from "ajv";
import addFormatsModule from "ajv-formats";
import { Catalog, SCHEMA_PATH, TODO, collectTodos, loadRaw, resolve } from "./catalog.ts";

export interface Report {
  errors: string[];
  todos: string[];
  notes: string[];
}

const Ajv: any = (AjvModule as any).default ?? AjvModule;
const addFormats: any = (addFormatsModule as any).default ?? addFormatsModule;
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
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const doc = resolve(raw);
  if (!validate(doc)) {
    for (const e of validate.errors ?? []) errors.push(`schema: ${e.instancePath || "/"} ${e.message}`);
    return { errors, todos: collectTodos(doc), notes: [] };
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
    for (const p of forbidden) if (low.includes(p)) errors.push(`${where}: forbidden phrase "${p}"`);
    if (/https?:\/\//.test(text)) errors.push(`${where}: contains a URL`);
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
        errors.push(`${n.id}: evidence "${e.label}" needs a source`);
      if (!e.source && !e.note) errors.push(`${n.id}: evidence without source needs a note`);
    }
    lint(`${n.id}.invitation`, n.invitation);
    lint(`${n.id}.trigger`, n.trigger);
    lint(`${n.id}.situation`, n.situation);
    if (!/^use\b/i.test(n.trigger)) errors.push(`${n.id}: trigger must start with "Use"`);
  }
  for (const t of doc.tools) {
    lint(`${t.name}.trigger`, t.trigger);
    lint(`${t.name}.description`, t.description);
    if (!/^use\b/i.test(t.trigger)) errors.push(`${t.name}: trigger must start with "Use"`);
  }
  for (const m of doc.types.mechanisms)
    if (!doc.copy.mechanism_names[m]) errors.push(`copy.mechanism_names lacks ${m}`);
  for (const m of doc.types.price_models)
    if (!doc.copy.price_model_names[m]) errors.push(`copy.price_model_names lacks ${m}`);
  for (const l of ["documented", "tested", "observed", "self-report", "known-failure", "concept", "inspiration", "unmeasured"])
    if (!doc.evidence_labels.display[l]) errors.push(`evidence_labels.display lacks ${l}`);
  if (doc.session.warning_at_percent !== 80) errors.push("session.warning_at_percent must be 80 (spec)");

  const todos = collectTodos(doc);
  return { errors, todos, notes: [] };
}

export function validateFile(strict = false): Report {
  const { raw } = loadRaw();
  const r = validateDoc(raw);
  if (strict) {
    if (r.todos.length) r.errors.push(`strict: ${r.todos.length} owner decisions pending (${TODO})`);
    if (!resolve(raw).brand.approved) r.errors.push("strict: brand name/domain not approved");
  }
  return r;
}
