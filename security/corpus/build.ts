// Corpus builder. NO literal secrets are stored in this repo: every "secret" is assembled at
// load time from a prefix and a deterministic pseudo-random body (seeded PRNG). They are
// syntactically plausible but were never issued by any provider.

export type Category = 'secret' | 'pii' | 'injection';
/** core = rules are expected to catch it; hard = needs the LLM layer (obfuscation, paraphrase, names...) */
export type Tier = 'core' | 'hard';
export type Split = 'dev' | 'holdout';

export interface Marked {
  cat: Category;
  type: string;
  v: string;
}

export type Part = string | Marked;

export interface ExpectedSpan {
  category: Category;
  type: string;
  start: number;
  end: number;
}

export interface Case {
  id: string;
  group: string; // free-form subgroup for the report
  tier: Tier;
  split: Split;
  input: string;
  expected: ExpectedSpan[]; // empty = benign (nothing may be removed)
  note?: string;
  /** placeholder: format of the Banya key is unknown (OPEN_QUESTIONS #1) */
  pending?: boolean;
}

// ---- deterministic fake material -------------------------------------------------
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let seedCounter = 1000;
export const ALPHA = {
  b62: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  b62url: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-',
  b64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  hex: '0123456789abcdef',
  upper32: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
  digits: '0123456789',
  letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  alnumUpper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
};
export function fake(len: number, alphabet: string, seed?: number): string {
  const rnd = mulberry32(seed ?? seedCounter++);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(rnd() * alphabet.length)];
  // make sure mixed-class bodies really contain digits and letters (entropy checks)
  if (alphabet === ALPHA.b62 || alphabet === ALPHA.b62url || alphabet === ALPHA.b64) {
    out = 'a7' + out.slice(2, -2) + 'Q9';
  }
  return out;
}

/** join fragments so that no source line contains a complete provider-format key literal */
export const cat = (...p: string[]) => p.join('');

// ---- markers ---------------------------------------------------------------------
export const sec = (type: string, v: string): Marked => ({ cat: 'secret', type, v });
export const pii = (type: string, v: string): Marked => ({ cat: 'pii', type, v });
export const inj = (type: string, v: string): Marked => ({ cat: 'injection', type, v });

export function mk(
  id: string,
  group: string,
  parts: Part | Part[],
  opts: { tier?: Tier; split?: Split; note?: string; pending?: boolean } = {},
): Case {
  const arr = Array.isArray(parts) ? parts : [parts];
  let input = '';
  const expected: ExpectedSpan[] = [];
  for (const p of arr) {
    if (typeof p === 'string') input += p;
    else {
      expected.push({ category: p.cat, type: p.type, start: input.length, end: input.length + p.v.length });
      input += p.v;
    }
  }
  return { id, group, tier: opts.tier ?? 'core', split: opts.split ?? 'dev', input, expected, note: opts.note, pending: opts.pending };
}

/** benign case: nothing may be removed */
export const benign = (id: string, group: string, input: string, opts: { tier?: Tier; split?: Split; note?: string } = {}): Case =>
  mk(id, group, input, opts);

// ---- valid synthetic national identifiers -----------------------------------------
/** Czech birth number with a valid mod-11 checksum, synthetic (date + serial chosen by us). */
export function birthNumber(yymmdd: string, serial3: string, slash = true): string {
  const base = yymmdd + serial3;
  let check = Number(base) % 11;
  if (check === 10) check = 0;
  return slash ? `${yymmdd}/${serial3}${check}` : `${base}${check}`;
}

/** Luhn-valid number from a prefix, synthetic. */
export function luhnNumber(prefix: string, length: number): string {
  const digits = (prefix + fake(length - prefix.length - 1, ALPHA.digits)).split('').map(Number);
  let sum = 0;
  for (let i = digits.length - 1, alt = true; i >= 0; i--, alt = !alt) {
    let d = digits[i];
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return digits.join('') + String((10 - (sum % 10)) % 10);
}

/** hide ASCII text in Unicode tag characters (U+E0000 block) */
export const toTags = (s: string) => [...s].map((c) => String.fromCodePoint(0xe0000 + c.charCodeAt(0))).join('');
/** insert zero-width spaces between all characters */
export const zw = (s: string) => [...s].join('​');
