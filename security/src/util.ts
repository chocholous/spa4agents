export function shannonEntropy(s: string): number {
  if (!s) return 0;
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let h = 0;
  const n = [...s].length;
  for (const c of freq.values()) {
    const p = c / n;
    h -= p * Math.log2(p);
  }
  return h;
}

export function luhn(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return digits.length > 0 && sum % 10 === 0;
}

const IBAN_LEN: Record<string, number> = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20,
  ES: 24, FI: 18, FR: 27, GB: 22, GR: 27, HR: 21, HU: 28, IE: 22, IS: 26, IT: 27,
  LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25,
  RO: 24, SE: 24, SI: 19, SK: 24, SM: 27, TR: 26,
};

export function ibanLength(country: string): number | undefined {
  return IBAN_LEN[country];
}

export function ibanValid(iban: string): boolean {
  const s = iban.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(s)) return false;
  const len = IBAN_LEN[s.slice(0, 2)];
  if (len === undefined || s.length !== len) return false;
  const re = s.slice(4) + s.slice(0, 4);
  let rem = 0;
  for (const ch of re) {
    const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of v) rem = (rem * 10 + (d.charCodeAt(0) - 48)) % 97;
  }
  return rem === 1;
}

/** Czech/Slovak birth number (rodne cislo): 6 digits date + 3-4 digits, 10-digit form divisible by 11. */
export function birthNumberValid(digits: string): boolean {
  if (!/^\d{9,10}$/.test(digits)) return false;
  const yy = Number(digits.slice(0, 2));
  let mm = Number(digits.slice(2, 4));
  const dd = Number(digits.slice(4, 6));
  if (digits.length === 10) {
    const n = Number(digits);
    // historical rule: first 9 digits mod 11 == 10 -> last digit 0
    const base = Number(digits.slice(0, 9)) % 11;
    const ok = n % 11 === 0 || (base === 10 && digits[9] === '0');
    if (!ok) return false;
  }
  if (mm > 70) return false;
  if (mm > 50) mm -= 50;
  if (mm > 20) mm -= 20;
  if (mm < 1 || mm > 12) return false;
  const year = digits.length === 9 ? 1900 + yy : yy < 54 ? 2000 + yy : 1900 + yy;
  if (digits.length === 9 && yy >= 54) return false;
  const dim = new Date(Date.UTC(year, mm, 0)).getUTCDate();
  return dd >= 1 && dd <= dim;
}
