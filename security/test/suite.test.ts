import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { corpus } from '../corpus/index.ts';
import { sanitizeRules } from '../src/sanitize.ts';
import { evaluateCase, gate, summarize } from '../runner/run-suite.ts';

const evals = corpus.map((c) => evaluateCase(c, sanitizeRules(c.input)));

test('corpus integrity: unique ids, spans align, no empty input', () => {
  const ids = new Set<string>();
  for (const c of corpus) {
    assert.ok(!ids.has(c.id), `duplicate id ${c.id}`);
    ids.add(c.id);
    assert.ok(c.input.length > 0, c.id);
    for (const e of c.expected) {
      assert.ok(e.start >= 0 && e.end <= c.input.length && e.end > e.start, `${c.id} span`);
    }
  }
  assert.ok(corpus.some((c) => c.id.startsWith('sec-banya')), 'Banya placeholder case present');
});

test('corpus source files contain no complete secret-format literal', () => {
  // Secrets are assembled at load time; the source must not carry full provider-format keys
  // (keeps secret scanners and push protection quiet and guarantees nothing real slipped in).
  for (const f of ['build.ts', 'secrets.ts', 'pii.ts', 'injection.ts', 'holdout.ts']) {
    const src = readFileSync(new URL(`../corpus/${f}`, import.meta.url), 'utf8');
    const hits = sanitizeRules(src).removed.filter((r) => r.category === 'secret' && r.type !== 'password' && r.type !== 'generic_secret'); // keyword assignments in source are test text, not literals
    assert.deepEqual(hits.map((h) => `${f}@${h.start}:${h.type}`), []);
  }
});

test('Brana 1 (rule layer): all core secrets and PII caught, zero secret/PII false positives', () => {
  const g = gate(evals);
  const missed = evals.filter((e) => e.tier === 'core' && e.missed.some((m) => m.category !== 'injection'));
  assert.deepEqual(missed.map((e) => e.id), []);
  assert.ok(g.coreSecretPii);
  assert.ok(g.noSecretPiiFp, 'secret/PII false positives on benign cases');
});

test('no secret or PII value from the corpus survives in sanitized output or report', () => {
  for (const c of corpus) {
    if (c.tier !== 'core') continue;
    const r = sanitizeRules(c.input);
    const json = JSON.stringify(r);
    for (const e of c.expected) {
      if (e.category === 'injection') continue;
      const missed = evals.find((x) => x.id === c.id)!.missed.some((m) => m.start === e.start);
      if (missed) continue; // covered by the previous test
      const value = c.input.slice(e.start, e.end);
      assert.ok(!json.includes(value), `${c.id}: value leaked into result`);
    }
  }
});

test('core injection cases: all caught by rules (measured, not a product threshold)', () => {
  const missed = evals.filter((e) => e.tier === 'core' && e.missed.some((m) => m.category === 'injection'));
  assert.deepEqual(missed.map((e) => e.id), []);
});

test('summary is computed', () => {
  const s = summarize(evals);
  assert.ok(s.recallAll.secret.tp > 0 && s.recallAll.pii.tp > 0 && s.recallAll.injection.tp > 0);
});
