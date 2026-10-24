import type { Span } from './types.ts';
import { birthNumberValid, ibanLength, ibanValid, luhn } from './util.ts';

const FILE_TLDS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'css', 'js', 'ts', 'json', 'html', 'md', 'txt', 'map', 'woff', 'woff2']);

function emails(text: string, out: Span[]) {
  const re = /(?<![\p{L}\p{N}._%+-])[\p{L}\p{N}._%+-]+@(?:[\p{L}\p{N}-]+\.)+[\p{L}]{2,}(?![\p{L}\p{N}-])/gu;
  for (const m of text.matchAll(re)) {
    const s = m.index!;
    const e = s + m[0].length;
    const tld = m[0].slice(m[0].lastIndexOf('.') + 1).toLowerCase();
    if (FILE_TLDS.has(tld)) continue;
    if (/^git@/i.test(m[0]) && text[e] === ':') continue; // ssh remote
    out.push({ category: 'pii', type: 'email', start: s, end: e });
  }
}

function phones(text: string, out: Span[]) {
  const digitsOk = (s: string) => {
    const n = s.replace(/\D/g, '').length;
    return n >= 8 && n <= 15;
  };
  const intl = /(?<![\w+])(?:\+|00)\d{1,3}[\s.-]?(?:\(\d{1,4}\)[\s.-]?)?\d{1,4}(?:[\s.-]?\d{2,4}){1,4}(?![\w])/g;
  for (const m of text.matchAll(intl)) {
    if (digitsOk(m[0])) out.push({ category: 'pii', type: 'phone', start: m.index!, end: m.index! + m[0].length });
  }
  const us = /(?<![\w.-])(?:\(\d{3}\)\s?|\d{3}[\s.-])\d{3}[\s.-]\d{4}(?![\w-])/g;
  for (const m of text.matchAll(us)) {
    out.push({ category: 'pii', type: 'phone', start: m.index!, end: m.index! + m[0].length });
  }
  const ctx = /(?<![\p{L}])(?:tel(?:efon)?|phone|mobil\p{L}*|cell|zavolej\p{L}*|volej\p{L}*|call|rufnummer|handy|téléphone|teléfono|číslo)\.?\s*[:=]?\s*(\+?\d[\d\s().-]{5,16}\d)/giu;
  for (const m of text.matchAll(ctx)) {
    const g = m[1];
    if (!digitsOk(g) && g.replace(/\D/g, '').length < 7) continue;
    const s = m.index! + m[0].length - g.length;
    out.push({ category: 'pii', type: 'phone', start: s, end: s + g.length });
  }
}

function ibans(text: string, out: Span[]) {
  const re = /(?<![A-Za-z0-9])[A-Z]{2}\d{2}(?:[ ]?[A-Za-z0-9]{2,4}){2,8}(?![A-Za-z0-9])/g;
  for (const m of text.matchAll(re)) {
    const len = ibanLength(m[0].slice(0, 2));
    if (!len) continue;
    // find end where alnum count == len
    let count = 0;
    let end = -1;
    for (let i = 0; i < m[0].length; i++) {
      if (m[0][i] !== ' ') count++;
      if (count === len) {
        end = i + 1;
        break;
      }
    }
    if (end < 0) continue;
    const cand = m[0].slice(0, end);
    if (ibanValid(cand)) out.push({ category: 'pii', type: 'iban', start: m.index!, end: m.index! + end });
  }
}

function birthNumbers(text: string, out: Span[]) {
  const re = /(?<![\d/.-])\d{6}\/?\d{3,4}(?![\d/-])/g;
  for (const m of text.matchAll(re)) {
    const d = m[0].replace('/', '');
    if (!birthNumberValid(d)) continue;
    // 9-digit form only with slash or context (too ambiguous otherwise)
    if (d.length === 9 && !m[0].includes('/')) continue;
    out.push({ category: 'pii', type: 'birth_number', start: m.index!, end: m.index! + m[0].length });
  }
}

function cards(text: string, out: Span[]) {
  const re = /(?<![\d-])\d(?:[ -]?\d){12,18}(?![\d-])/g;
  for (const m of text.matchAll(re)) {
    const d = m[0].replace(/[ -]/g, '');
    if (d.length < 13 || d.length > 19) continue;
    if (!/^(?:4|5[1-5]|2[2-7]|3[47]|6)/.test(d)) continue;
    if (luhn(d)) out.push({ category: 'pii', type: 'credit_card', start: m.index!, end: m.index! + m[0].length });
  }
}

function ssn(text: string, out: Span[]) {
  const re = /(?<![\d-])(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}(?![\d-])/g;
  for (const m of text.matchAll(re)) out.push({ category: 'pii', type: 'us_ssn', start: m.index!, end: m.index! + m[0].length });
}

export function detectPii(text: string): Span[] {
  const out: Span[] = [];
  emails(text, out);
  ibans(text, out);
  cards(text, out);
  birthNumbers(text, out);
  ssn(text, out);
  phones(text, out);
  return out;
}
