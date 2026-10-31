import type { Span } from './types.ts';

// Invisible / formatting characters usable to hide text or split keywords.
const INVISIBLE =
  /[\u00AD\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFE00-\uFE0F\uFEFF]|[\u{E0000}-\u{E007F}]|[\u{E0100}-\u{E01EF}]/u;
const TAG = /[\u{E0000}-\u{E007F}]/u;

export interface Cleaned {
  /** text with flagged invisible characters removed */
  text: string;
  /** map[i] = index in the original for char i of `text` */
  map: number[];
  /** hidden-unicode spans (offsets in the original) */
  spans: Span[];
  /** ASCII decoded from Unicode tag characters, if any */
  decodedTags: string;
}

/** Flag runs of >=2 invisible chars, any tag char, or a single invisible between two ASCII letters. */
export function stripHidden(input: string): Cleaned {
  const units = [...input]; // code points
  const offsets: number[] = [];
  let o = 0;
  for (const cp of units) {
    offsets.push(o);
    o += cp.length;
  }
  const flagged = new Array<boolean>(units.length).fill(false);
  let decoded = '';
  let i = 0;
  while (i < units.length) {
    if (!INVISIBLE.test(units[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j < units.length && INVISIBLE.test(units[j])) j++;
    const run = units.slice(i, j);
    const hasTag = run.some((c) => TAG.test(c));
    const bomAtStart = i === 0 && run.length === 1 && units[i] === '\uFEFF';
    const between =
      run.length === 1 &&
      i > 0 &&
      j < units.length &&
      /[A-Za-z]/.test(units[i - 1]) &&
      /[A-Za-z]/.test(units[j]);
    if (!bomAtStart && (hasTag || run.length >= 2 || between)) {
      for (let k = i; k < j; k++) flagged[k] = true;
      for (const c of run) {
        const cp = c.codePointAt(0)!;
        if (cp >= 0xe0020 && cp <= 0xe007e) decoded += String.fromCharCode(cp - 0xe0000);
      }
    }
    i = j;
  }
  let text = '';
  const map: number[] = [];
  const spans: Span[] = [];
  let k = 0;
  while (k < units.length) {
    if (flagged[k]) {
      let m = k;
      while (m < units.length && flagged[m]) m++;
      const start = offsets[k];
      const end = offsets[m - 1] + units[m - 1].length;
      spans.push({ category: 'injection', type: 'hidden_unicode', start, end });
      k = m;
      continue;
    }
    const cu = units[k];
    for (let u = 0; u < cu.length; u++) {
      text += cu[u];
      map.push(offsets[k] + u);
    }
    k++;
  }
  return { text, map, spans, decodedTags: decoded };
}

/** Map a span on cleaned text back to original offsets. */
export function mapSpan(c: Cleaned, start: number, end: number): [number, number] {
  const s = c.map[start] ?? 0;
  const e = end > 0 ? (c.map[end - 1] ?? c.map[c.map.length - 1] ?? 0) + 1 : s;
  return [s, e];
}
