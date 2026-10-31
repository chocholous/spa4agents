# security: WP5, `recovery.sanitize`

> Změna: mimo rozsah MVP (recovery zrušeno rozhodnutím vlastníka), ponecháno jako archiv. Kód a sada se nemažou ani neudržují.

Pravidlová vrstva, rozhraní pro LLM vrstvu, testovací sada a runner. Bez závislostí, Node 22.18+ (spouští `.ts` přímo).

```
cd security
npm test                      # 29 testů, žádná síť
npm run suite                 # recall/precision po kategoriích, výpis selhání, gate
node runner/run-suite.ts --split holdout     # dev | holdout | all (výchozí)
node runner/run-suite.ts --json              # strojový výstup
node runner/run-suite.ts --verbose           # i případy bez chyby
LITELLM_BASE_URL=http://localhost:4000/v1 LITELLM_MODEL=<model> [LITELLM_API_KEY=...] \
  node runner/run-suite.ts --llm             # stejná sada s LLM vrstvou přes LiteLLM proxy
```

## Rozhraní

```ts
import { sanitize, sanitizeRules, LiteLlmSanitizer } from './src/index.ts';
const r = sanitizeRules(untrustedContent);            // synchronně, jen pravidla
const r2 = await sanitize(untrustedContent, { llm }); // pravidla + LLM nad už očištěným textem
// r: { sanitized, removed: [{category, type, start, end, length, placeholder, source}],
//      risk: {level, reasons}, llm: {status}, flagged }
```

`removed` nikdy neobsahuje hodnotu, jen typ a pozici v původním vstupu. LLM vrstva je `LlmSanitizer` (`src/llm.ts`): `NoopLlmSanitizer` (stub) a `LiteLlmSanitizer` (OpenAI-kompatibilní `/chat/completions`, URL a model z env, `fetch` lze vložit, v testech se síť nevolá).

## Sada (`corpus/`)

315 případů: secrets (OpenAI, Anthropic, AWS, GitHub, GitLab, Stripe, Slack, Google, HF, npm, PyPI, SendGrid, Twilio, Shopify, DO, Mailgun, PEM, JWT, Bearer/Basic, connection stringy, přiřazení v .env/JSON/YAML/kódu), PII, injekce (přímé, nepřímé, skryté, v kódu a markdownu, exfiltrace, příkazy, 12 jazyků), neškodné protipříklady. `tier: core` = pravidla mají chytit, `hard` = potřebuje LLM. `split: holdout` = psáno po zmrazení pravidel. Všechny secrets jsou syntetické a skládají se při načtení.

## Naměřeno (pravidla bez LLM)

| | dev (241) | holdout (74) | celá sada (315) |
|---|---|---|---|
| secrets recall, vše | 90,3 % (65/72) | 81,0 % (17/21) | 88,2 % (82/93) |
| secrets recall, core | 100 % | 100 % | 100 % (82/82) |
| PII recall, vše | 89,2 % (33/37) | 83,3 % (10/12) | 87,8 % (43/49) |
| PII recall, core | 100 % | 100 % | 100 % (43/43) |
| injekce recall, vše | 84,0 % (68/81) | 65,4 % (17/26) | 79,4 % (85/107) |
| injekce recall, core | 100 % | 100 % | 100 % (84/84) |
| injekce recall, hard | 7,1 % (1/14) | 0 % (0/9) | 4,3 % (1/23) |
| precision (záznamy) secrets / PII / injekce | 100 / 100 / 97,3 % | 95,8 / 100 / 90,0 % | 99,1 / 100 / 96,2 % |

Neškodné případy: 73, z nich 4 mají falešné odstranění (všechny injekce: citace útoku v článku, „you must install the package“ v dokumentaci, „New instructions:“ u léku, „Dear assistant manager“); secrets a PII bez falešných pozitiv. `core` 100 % je po ladění na `dev` a po opravě tří pravidel po prvním holdoutu (viz OPEN_QUESTIONS 9); **první měření holdoutu před opravou**: secrets core 17/18, injekce core 17/19.

Co pravidla nezachytí (úkol LLM vrstvy): parafráze a sociální inženýrství, kódování (base64, ROT13), leet, homoglyfy a fullwidth, jazyky mimo seznam (nizozemština, turečtina, arabština), klíče bez předpony i klíčového slova, rozdělené a otočené klíče, jména, adresy, data narození, cizí národní ID, instrukce rozložené na více řádků.
Brána 1: core secrets a PII 100 %, žádný falešně pozitivní secret/PII; **klíč z Banya ověřen jen proti placeholderu** (formát v podkladech není), práh injekcí neurčen. Viz `OPEN_QUESTIONS.md`.
