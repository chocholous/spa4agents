import { detectInjection, hasInjectionSignal } from './injection.ts';
import { mapSpan, stripHidden } from './hidden.ts';
import { detectPii } from './pii.ts';
import { detectSecrets } from './secrets.ts';
import type { LlmSanitizer } from './llm.ts';
import type { Category, Removal, Risk, RiskLevel, SanitizeResult, Span } from './types.ts';

const PRIORITY: Record<Category, number> = { secret: 3, pii: 2, injection: 1 };
const STRONG_INJECTION = new Set(['override', 'role', 'prompt_leak', 'marker', 'exfil', 'command', 'conceal', 'hidden_text', 'hidden_unicode_decoded']);

function placeholderFor(s: Span): string {
  if (s.type === 'hidden_unicode') return '';
  return s.category === 'injection' ? `[REMOVED:injection:${s.type}]` : `[REDACTED:${s.category}:${s.type}]`;
}

interface Group { start: number; end: number; category: Category; type: string; members: Span[] }

/** Union of overlapping spans for text replacement; members are kept for the report. */
function group(spans: Span[]): Group[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Group[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start < last.end) {
      if (PRIORITY[s.category] > PRIORITY[last.category]) {
        last.category = s.category;
        last.type = s.type;
      }
      last.end = Math.max(last.end, s.end);
      last.members.push(s);
    } else {
      out.push({ start: s.start, end: s.end, category: s.category, type: s.type, members: [s] });
    }
  }
  return out;
}

/** Replacement groups of a rule result (needed to map LLM quotes back to the original). */
const GROUPS = new WeakMap<SanitizeResult, { start: number; end: number; placeholder: string }[]>();

function computeRisk(removed: Removal[], flagged: number, extra: string[]): Risk {
  const reasons = [...extra];
  let level: RiskLevel = 'none';
  const up = (l: RiskLevel) => {
    const order: RiskLevel[] = ['none', 'low', 'medium', 'high'];
    if (order.indexOf(l) > order.indexOf(level)) level = l;
  };
  const count = (c: Category) => removed.filter((r) => r.category === c).length;
  if (count('pii')) { up('low'); reasons.push(`pii:${count('pii')}`); }
  if (flagged) { up('low'); reasons.push(`flagged:${flagged}`); }
  if (count('secret')) { up('medium'); reasons.push(`secret:${count('secret')}`); }
  for (const r of removed) {
    if (r.category !== 'injection') continue;
    if (STRONG_INJECTION.has(r.type)) up('high');
    else up('medium');
  }
  if (count('injection')) reasons.push(`injection:${count('injection')}`);
  if (extra.length) up('high');
  return { level, reasons };
}

export interface SanitizeOptions {
  llm?: LlmSanitizer;
  signal?: AbortSignal;
}

/** Rule layer only (synchronous, no network). */
export function sanitizeRules(input: string): SanitizeResult {
  const cleaned = stripHidden(input);
  const t = cleaned.text;
  const raw: Span[] = [...cleaned.spans];
  const extra: string[] = [];
  if (cleaned.decodedTags && hasInjectionSignal(cleaned.decodedTags)) extra.push('hidden_unicode_decoded_injection');

  const toOrig = (s: Span): Span => {
    const [a, b] = mapSpan(cleaned, s.start, s.end);
    return { ...s, start: a, end: b };
  };
  for (const s of detectSecrets(t)) raw.push(toOrig(s));
  for (const s of detectPii(t)) raw.push(toOrig(s));
  const inj = detectInjection(t);
  for (const s of inj.spans) raw.push(toOrig(s));
  const flagged = inj.flagged.map(toOrig).map((s) => ({ type: s.type, start: s.start, end: s.end }));

  const merged = group(raw);
  let sanitized = '';
  let pos = 0;
  const removed: Removal[] = [];
  const groups: { start: number; end: number; placeholder: string }[] = [];
  for (const s of merged) {
    sanitized += input.slice(pos, s.start);
    const ph = placeholderFor(s);
    sanitized += ph;
    pos = s.end;
    groups.push({ start: s.start, end: s.end, placeholder: ph });
    // report every detection; the placeholder is attached to the first member of the group
    s.members.forEach((m, i) => {
      removed.push({ category: m.category, type: m.type, start: m.start, end: m.end, length: m.end - m.start, placeholder: i === 0 ? ph : '', source: 'rule' });
    });
  }
  sanitized += input.slice(pos);
  const result: SanitizeResult = {
    sanitized,
    removed,
    risk: computeRisk(removed, flagged.length, extra),
    llm: { status: 'not_used' },
    flagged,
  };
  GROUPS.set(result, groups);
  return result;
}

/**
 * Full pipeline: rules first, then (optionally) the LLM on the already-redacted text.
 * LLM failure never throws; it is reported in `llm` and the rule result is returned.
 */
export async function sanitize(input: string, opts: SanitizeOptions = {}): Promise<SanitizeResult> {
  const base = sanitizeRules(input);
  if (!opts.llm) return base;
  try {
    const analysis = await opts.llm.analyze(base.sanitized, opts.signal);
    // map positions of `base.sanitized` back to the original input
    const segs: { outStart: number; outEnd: number; origStart: number; origEnd: number; copy: boolean }[] = [];
    let outPos = 0;
    let inPos = 0;
    for (const r of GROUPS.get(base) ?? []) {
      if (r.start > inPos) {
        const len = r.start - inPos;
        segs.push({ outStart: outPos, outEnd: outPos + len, origStart: inPos, origEnd: r.start, copy: true });
        outPos += len;
      }
      segs.push({ outStart: outPos, outEnd: outPos + r.placeholder.length, origStart: r.start, origEnd: r.end, copy: false });
      outPos += r.placeholder.length;
      inPos = r.end;
    }
    if (inPos < input.length) segs.push({ outStart: outPos, outEnd: outPos + (input.length - inPos), origStart: inPos, origEnd: input.length, copy: true });

    const toOrig = (outIdx: number, isEnd: boolean): number => {
      const seg = segs.find((s) => (isEnd ? outIdx > s.outStart && outIdx <= s.outEnd : outIdx >= s.outStart && outIdx < s.outEnd));
      if (!seg) return isEnd ? input.length : 0;
      if (seg.copy) return seg.origStart + (outIdx - seg.outStart);
      return isEnd ? seg.origEnd : seg.origStart;
    };

    const extraSpans: { start: number; end: number; category: Category; type: string; outStart: number; outEnd: number }[] = [];
    for (const f of analysis.findings) {
      if (f.quote.includes('[REDACTED:') || f.quote.includes('[REMOVED:')) continue;
      let from = 0;
      for (;;) {
        const i = base.sanitized.indexOf(f.quote, from);
        if (i < 0) break;
        from = i + f.quote.length;
        extraSpans.push({ start: toOrig(i, false), end: toOrig(i + f.quote.length, true), category: f.type, type: `llm_${f.type}`, outStart: i, outEnd: i + f.quote.length });
      }
    }
    if (!extraSpans.length) return { ...base, llm: { status: 'ok' } };

    extraSpans.sort((a, b) => a.outStart - b.outStart);
    let out = '';
    let p = 0;
    const llmRemovals: Removal[] = [];
    for (const s of extraSpans) {
      if (s.outStart < p) continue;
      out += base.sanitized.slice(p, s.outStart);
      const ph = placeholderFor({ category: s.category, type: s.type, start: 0, end: 0 });
      out += ph;
      p = s.outEnd;
      llmRemovals.push({ category: s.category, type: s.type, start: s.start, end: s.end, length: s.end - s.start, placeholder: ph, source: 'llm' });
    }
    out += base.sanitized.slice(p);
    const removed = [...base.removed, ...llmRemovals].sort((a, b) => a.start - b.start);
    return {
      sanitized: out,
      removed,
      risk: computeRisk(removed, base.flagged.length, base.risk.reasons.filter((r) => r.startsWith('hidden_unicode_decoded'))),
      llm: { status: 'ok' },
      flagged: base.flagged,
    };
  } catch (e) {
    return { ...base, llm: { status: 'error', detail: e instanceof Error ? e.message : String(e) } };
  }
}
