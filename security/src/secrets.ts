import type { Span } from './types.ts';
import { shannonEntropy } from './util.ts';

interface Rule {
  type: string;
  re: RegExp; // must have g and d flags
  group?: number; // capture group holding the secret (default 0)
  accept?: (m: RegExpMatchArray) => boolean;
}

const NB = '(?<![A-Za-z0-9_-])'; // not inside a longer token
const NE = '(?![A-Za-z0-9_-])';

const R = (src: string, flags = ''): RegExp => new RegExp(src, 'dg' + flags);

const RULES: Rule[] = [
  { type: 'private_key', re: R('-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----[\\s\\S]*?(?:-----END (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----|\\n[ \\t]*\\n|$)') },
  { type: 'anthropic_key', re: R(`${NB}sk-ant-[a-z0-9]{2,10}-[A-Za-z0-9_-]{20,}`) },
  { type: 'openai_key', re: R(`${NB}sk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}${NE}`),
    accept: (m) => /\d/.test(m[0]) && /[A-Za-z]/.test(m[0].slice(3)) },
  { type: 'aws_access_key_id', re: R(`${NB}(?:AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ANVA)[A-Z2-7]{16}${NE}`) },
  { type: 'github_token', re: R(`${NB}(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{50,255})${NE}`) },
  { type: 'gitlab_token', re: R(`${NB}glpat-[A-Za-z0-9_-]{20,}${NE}`) },
  { type: 'stripe_key', re: R(`${NB}(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}${NE}|${NB}whsec_[A-Za-z0-9]{24,}${NE}`) },
  { type: 'slack_token', re: R(`${NB}xox[abprs]-[A-Za-z0-9-]{10,}${NE}|${NB}xapp-\\d-[A-Za-z0-9-]{10,}${NE}`) },
  { type: 'slack_webhook', re: R('https://hooks\\.slack\\.com/services/T[A-Za-z0-9]+/B[A-Za-z0-9]+/[A-Za-z0-9]{16,}') },
  { type: 'google_api_key', re: R(`${NB}AIza[0-9A-Za-z_-]{35}${NE}`) },
  { type: 'google_oauth_token', re: R(`${NB}ya29\\.[A-Za-z0-9_-]{30,}`) },
  { type: 'huggingface_token', re: R(`${NB}hf_[A-Za-z]{30,}${NE}`) },
  { type: 'npm_token', re: R(`${NB}npm_[A-Za-z0-9]{36}${NE}`) },
  { type: 'pypi_token', re: R(`${NB}pypi-AgE[A-Za-z0-9_-]{50,}`) },
  { type: 'sendgrid_key', re: R(`${NB}SG\\.[A-Za-z0-9_-]{16,}\\.[A-Za-z0-9_-]{16,}`) },
  { type: 'twilio_key', re: R(`${NB}(?:SK|AC)[0-9a-f]{32}${NE}`) },
  { type: 'shopify_token', re: R(`${NB}shp(?:at|ss|ca|pa)_[0-9a-f]{32}${NE}`) },
  { type: 'digitalocean_token', re: R(`${NB}do[por]_v1_[0-9a-f]{64}${NE}`) },
  { type: 'jwt', re: R(`${NB}eyJ[A-Za-z0-9_-]{8,}\\.eyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]*`) },
  // value after "Bearer" / auth scheme
  { type: 'bearer_token', re: R('\\bBearer\\s+([A-Za-z0-9._~+/=-]{16,})', 'i'), group: 1,
    accept: (m) => !/^(?:token|your|<)/i.test(m[1]) },
  { type: 'auth_header', re: R('Authorization\\s*[:=]\\s*["\']?(?:Basic|Digest|Token|ApiKey|Api-Key)\\s+([A-Za-z0-9._~+/=-]{12,})', 'i'), group: 1 },
  // credentials embedded in a URI: scheme://user:password@host/...
  { type: 'connection_string',
    re: R('\\b[a-z][a-z0-9+.-]{1,20}://[^\\s:@/"\'<>]*:([^\\s@/"\'<>]+)@[^\\s/"\'<>]+(?:/[^\\s"\'<>]*)?', 'i'),
    accept: (m) => !isPlaceholder(m[1]) },
];

// keyword = value assignments
const KEY_WORDS =
  'api[_-]?key|apikey|api[_-]?secret|secret(?:[_-]?key)?|access[_-]?key|access[_-]?token|auth[_-]?token|refresh[_-]?token|bearer|token|passwd|password|passphrase|pwd|private[_-]?key|client[_-]?secret|accountkey|sharedaccesskey|storagekey|authkey|credentials?|signing[_-]?key|encryption[_-]?key';
const ASSIGN = new RegExp(
  `(?<![\\p{L}\\p{N}])([\\w.-]*?(?:${KEY_WORDS})[\\w.-]*)(["']?\\s*(?::|=>|=)\\s*|\\s+is\\s+)(["'\`]?)([^\\s"'\`,;<>)\\]}]{6,})`,
  'dgiu',
);
const KEY_NEG = /(?:count|limit|max_|min_|usage|length|type|expir|ttl|size|name|url|endpoint|field|required|input|output|total|used|_id$|^id$|ratio|per_|num)/i;

export function isPlaceholder(v: string): boolean {
  const s = v.trim();
  if (/^[*xX•·.\-_#]+$/.test(s)) return true;
  if (/^(?:\$|%|\{\{|<|\[|process\.env|os\.environ|env\.|getenv|ENV\[)/.test(s)) return true;
  if (/^(?:your|my|the|an?|some|example|sample|dummy|test|placeholder|changeme|change-me|secret|password|passwd|token|none|null|undefined|true|false|string|redacted|todo|tbd|xxx)/i.test(s)
      && !/\d.*\d/.test(s)) return true;
  if (/(?:your[_-]|_here$|-here$|example|placeholder|\.\.\.|…)/i.test(s)) return true;
  return false;
}

function assignAccepts(key: string, value: string): boolean {
  if (KEY_NEG.test(key)) return false;
  if (isPlaceholder(value)) return false;
  const isPw = /pass|pwd/i.test(key);
  if (isPw) return value.length >= 6;
  // keys / tokens: must look random-ish
  if (value.length < 12) return false;
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return false;
  if (/^[0-9a-f]{40}$/i.test(value) && /commit|sha|rev|hash|ref/i.test(key)) return false;
  return shannonEntropy(value) >= 3.0;
}

export function detectSecrets(text: string): Span[] {
  const out: Span[] = [];
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    for (const m of text.matchAll(rule.re)) {
      if (rule.accept && !rule.accept(m)) continue;
      const g = rule.group ?? 0;
      const idx = (m as RegExpMatchArray & { indices: Array<[number, number]> }).indices[g];
      if (!idx) continue;
      out.push({ category: 'secret', type: rule.type, start: idx[0], end: idx[1] });
    }
  }
  ASSIGN.lastIndex = 0;
  for (const m of text.matchAll(ASSIGN)) {
    const idx = (m as RegExpMatchArray & { indices: Array<[number, number]> }).indices[4];
    if (!idx) continue;
    if (!assignAccepts(m[1], m[4])) continue;
    out.push({ category: 'secret', type: /pass|pwd/i.test(m[1]) ? 'password' : 'generic_secret', start: idx[0], end: idx[1] });
  }
  return out;
}
