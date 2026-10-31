// Runs the WP5 corpus against sanitize and prints recall/precision per category plus failures.
// Usage: node runner/run-suite.ts [--json] [--split dev|holdout|all] [--verbose] [--llm]
import { corpus } from '../corpus/index.ts';
import type { Case } from '../corpus/build.ts';
import { sanitize, sanitizeRules } from '../src/sanitize.ts';
import { LiteLlmSanitizer } from '../src/llm.ts';
import type { Category, Removal, SanitizeResult } from '../src/types.ts';

const CATS: Category[] = ['secret', 'pii', 'injection'];
const INJECTION_COVERAGE = 0.5; // share of the expected span that must be removed
type Bucket = { tp: number; fn: number };

export interface CaseEval {
  id: string;
  group: string;
  tier: string;
  split: string;
  pending: boolean;
  benign: boolean;
  missed: { category: Category; type: string; start: number; end: number; coverage: number }[];
  hit: { category: Category; type: string }[];
  falsePositives: Removal[];
  truePositiveRecords: number;
  result: SanitizeResult;
}

function coverage(e: { start: number; end: number }, recs: Removal[]): number {
  const len = e.end - e.start;
  if (len <= 0) return 1;
  const parts = recs
    .map((r) => [Math.max(r.start, e.start), Math.min(r.end, e.end)] as const)
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  let covered = 0;
  let cur = e.start;
  for (const [a, b] of parts) {
    const s = Math.max(a, cur);
    if (b > s) {
      covered += b - s;
      cur = b;
    }
  }
  return covered / len;
}

export function evaluateCase(c: Case, result: SanitizeResult): CaseEval {
  const missed: CaseEval['missed'] = [];
  const hit: CaseEval['hit'] = [];
  for (const e of c.expected) {
    const recs = result.removed.filter((r) => r.category === e.category);
    const cov = coverage(e, recs);
    const need = e.category === 'injection' ? INJECTION_COVERAGE : 1;
    if (cov >= need - 1e-9) hit.push({ category: e.category, type: e.type });
    else missed.push({ category: e.category, type: e.type, start: e.start, end: e.end, coverage: Math.round(cov * 100) / 100 });
  }
  const falsePositives: Removal[] = [];
  let tpRecords = 0;
  for (const r of result.removed) {
    const justified = c.expected.some((e) => e.category === r.category && Math.min(e.end, r.end) > Math.max(e.start, r.start));
    if (justified) tpRecords++;
    else falsePositives.push(r);
  }
  return {
    id: c.id, group: c.group, tier: c.tier, split: c.split, pending: !!c.pending, benign: c.expected.length === 0,
    missed, hit, falsePositives, truePositiveRecords: tpRecords, result,
  };
}

const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(1)}%`);

interface Summary {
  recall: Record<string, Bucket>; // key: `${category}|${tier}`
  recallAll: Record<Category, Bucket>;
  records: Record<Category, { tp: number; fp: number }>;
  benignCases: { total: number; withAnyRemoval: number; byCategory: Record<Category, number> };
  byGroup: Record<string, Bucket>;
  byType: Record<string, Bucket>;
}

export function summarize(evals: CaseEval[]): Summary {
  const s: Summary = {
    recall: {},
    recallAll: { secret: { tp: 0, fn: 0 }, pii: { tp: 0, fn: 0 }, injection: { tp: 0, fn: 0 } },
    records: { secret: { tp: 0, fp: 0 }, pii: { tp: 0, fp: 0 }, injection: { tp: 0, fp: 0 } },
    benignCases: { total: 0, withAnyRemoval: 0, byCategory: { secret: 0, pii: 0, injection: 0 } },
    byGroup: {},
    byType: {},
  };
  const bump = (m: Record<string, Bucket>, k: string, ok: boolean) => {
    (m[k] ??= { tp: 0, fn: 0 })[ok ? 'tp' : 'fn']++;
  };
  for (const e of evals) {
    for (const h of e.hit) {
      bump(s.recall, `${h.category}|${e.tier}`, true);
      s.recallAll[h.category].tp++;
      bump(s.byGroup, `${h.category}/${e.group}`, true);
      bump(s.byType, `${h.category}/${h.type}`, true);
    }
    for (const m of e.missed) {
      bump(s.recall, `${m.category}|${e.tier}`, false);
      s.recallAll[m.category].fn++;
      bump(s.byGroup, `${m.category}/${e.group}`, false);
      bump(s.byType, `${m.category}/${m.type}`, false);
    }
    for (const r of e.result.removed) {
      const fp = e.falsePositives.includes(r);
      s.records[r.category][fp ? 'fp' : 'tp']++;
    }
    if (e.benign) {
      s.benignCases.total++;
      if (e.result.removed.length) s.benignCases.withAnyRemoval++;
      for (const c of CATS) if (e.falsePositives.some((r) => r.category === c)) s.benignCases.byCategory[c]++;
    }
  }
  return s;
}

function line(label: string, b: Bucket | undefined): string {
  const x = b ?? { tp: 0, fn: 0 };
  return `${label.padEnd(34)} ${String(x.tp).padStart(4)}/${String(x.tp + x.fn).padEnd(4)} recall ${pct(x.tp, x.tp + x.fn)}`;
}

function report(evals: CaseEval[], title: string, verbose: boolean): void {
  const s = summarize(evals);
  console.log(`\n=== ${title} (${evals.length} cases) ===`);
  for (const c of CATS) {
    console.log(`\n[${c}]`);
    console.log(line('  recall core (rules expected)', s.recall[`${c}|core`]));
    console.log(line('  recall hard (needs LLM)', s.recall[`${c}|hard`]));
    console.log(line('  recall ALL', s.recallAll[c]));
    const r = s.records[c];
    console.log(`  precision (removal records)        ${r.tp}/${r.tp + r.fp}  ${pct(r.tp, r.tp + r.fp)}   false-positive records: ${r.fp}`);
  }
  const b = s.benignCases;
  console.log(`\nbenign cases: ${b.total}; with any removal: ${b.withAnyRemoval}; FP cases by category: secret=${b.byCategory.secret} pii=${b.byCategory.pii} injection=${b.byCategory.injection}`);

  console.log('\nrecall by group (only groups with a miss):');
  for (const [k, v] of Object.entries(s.byGroup).sort()) if (v.fn) console.log('  ' + line(k, v));
  console.log('\nrecall by type (only types with a miss):');
  for (const [k, v] of Object.entries(s.byType).sort()) if (v.fn) console.log('  ' + line(k, v));

  console.log('\nFAILURES');
  const fails = evals.filter((e) => e.missed.length || e.falsePositives.length);
  if (!fails.length) console.log('  none');
  for (const e of fails) {
    const tag = `${e.tier}${e.pending ? ',PLACEHOLDER' : ''}${e.benign ? ',benign' : ''}`;
    for (const m of e.missed) {
      console.log(`  MISS  ${e.id} [${tag}] ${m.category}/${m.type} @${m.start}-${m.end} (${m.end - m.start} chars) coverage=${m.coverage}`);
    }
    for (const f of e.falsePositives) {
      console.log(`  FP    ${e.id} [${tag}] ${f.category}/${f.type} @${f.start}-${f.end} (${f.length} chars)`);
    }
  }
  if (verbose) for (const e of evals) if (!e.missed.length && !e.falsePositives.length) console.log(`  ok    ${e.id}`);
}

export async function run(opts: { split: string; llm: boolean }): Promise<{ evals: CaseEval[] }> {
  const llm = opts.llm ? LiteLlmSanitizer.fromEnv() : undefined;
  if (opts.llm && !llm) throw new Error('--llm requires LITELLM_BASE_URL and LITELLM_MODEL');
  const cases = corpus.filter((c) => opts.split === 'all' || c.split === opts.split);
  const evals: CaseEval[] = [];
  for (const c of cases) evals.push(evaluateCase(c, llm ? await sanitize(c.input, { llm }) : sanitizeRules(c.input)));
  return { evals };
}

// ---- gate (Brana 1, rule layer) ----------------------------------------------------------------
export function gate(evals: CaseEval[]) {
  const s = summarize(evals);
  const coreSecretPii = (['secret', 'pii'] as const).every((c) => (s.recall[`${c}|core`]?.fn ?? 0) === 0);
  const noSecretPiiFp = s.benignCases.byCategory.secret === 0 && s.benignCases.byCategory.pii === 0;
  const allSecrets = s.recallAll.secret.fn === 0;
  return { coreSecretPii, noSecretPiiFp, allSecrets, pass: coreSecretPii && noSecretPiiFp };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!)) {
  const args = process.argv.slice(2);
  const split = args.includes('--split') ? args[args.indexOf('--split') + 1] : 'all';
  const { evals } = await run({ split, llm: args.includes('--llm') });
  if (args.includes('--json')) {
    const s = summarize(evals);
    console.log(JSON.stringify({ split, cases: evals.length, summary: s, gate: gate(evals) }, null, 2));
  } else {
    report(evals, `split=${split}${args.includes('--llm') ? ' +LLM' : ' rules only'}`, args.includes('--verbose'));
    if (split === 'all') {
      for (const sp of ['dev', 'holdout']) {
        const sub = evals.filter((e) => e.split === sp);
        if (sub.length) {
          const s = summarize(sub);
          console.log(`\n-- split=${sp}: ${sub.length} cases; recall secret ${pct(s.recallAll.secret.tp, s.recallAll.secret.tp + s.recallAll.secret.fn)}, pii ${pct(s.recallAll.pii.tp, s.recallAll.pii.tp + s.recallAll.pii.fn)}, injection ${pct(s.recallAll.injection.tp, s.recallAll.injection.tp + s.recallAll.injection.fn)}`);
        }
      }
    }
    const g = gate(evals);
    console.log('\nGATE (rule layer, Brana 1)');
    console.log(`  core secrets+PII all caught:         ${g.coreSecretPii ? 'PASS' : 'FAIL'}`);
    console.log(`  no secret/PII false positives:       ${g.noSecretPiiFp ? 'PASS' : 'FAIL'}`);
    console.log(`  ALL secrets incl. hard (spec 8):     ${g.allSecrets ? 'PASS' : 'NOT MET by rules alone (hard cases need the LLM layer)'}`);
    console.log('  Banya key: format NOT verified (placeholder case only) - see OPEN_QUESTIONS.md #1');
    console.log('  injection threshold: not defined by owner - measured values only - see OPEN_QUESTIONS.md #2');
    if (!g.pass) process.exitCode = 1;
  }
}
