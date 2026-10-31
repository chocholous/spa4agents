# Agentní lázně: zadání pro realizaci

2026-10-24 · Chocho

Zadání pro tým nebo coding agenta, který lázně postaví. Zdůvodnění, rešerše a testy existujících služeb jsou v listu Agentní lázně: zadání komplexního rekreačního řešení.

**Revize 24. 10. 2026 (rozhodnutí vlastníka o nejpřísnější datové politice a nález x402 spiku).** Co se změnilo oproti původnímu textu, označeno i v místě změny slovem „Změna“:
- Změna (vlastník: „nechceme se moc omezovat“): „Pravidla reklamy“ a pravidla o tvrzeních o vědomí/prožívání agentů jsou z tvrdých zákazů doporučení. Zůstává jediné pravidlo: žádné SKRYTÉ instrukce v obsahu pro agenty (viz Pravidla reklamy). Lint v `catalog/src/validate.ts` jen varuje. Datová politika zůstává nejpřísnější a beze změny.
- Změna (vlastník: odstranit zbytečná omezení): zjemněna omezení, která nejsou nutná pro provoz, bezpečnost peněz a dat ani technickou proveditelnost. Číselné limity, částky, doby a stropy v zadání jsou nastavitelné defaulty (ne pevné požadavky); jazyková pravidla jsou doporučení; vynucování kanálů referralu je volitelné; brány fází jsou kontrolní body (od 31. 10. 2026 jen nepovinné milníky). Ponechána (s důvodem): datová politika, strop relace/adresy za den, cena před placením a žádné platby bez výzvy x402 (obojí je vlastnost protokolu x402, ne naše omezení), auth před daty, oddělení prostorů, `public: true` opt-in, adaptéry, zákaz skrytých instrukcí. Viz následující změny z 31. 10. 2026.
- Změna (vlastník, 31. 10. 2026, přes schvalovací stránku): odstraněny zbytky omezení „netřeba“: povinné označení sponzoringu v moderaci; brány fází jako závazné podmínky (jsou jen nepovinné milníky: Milník 1, 2, 3); z podkladů pravidla o slučování metrik, „nabídka nikdy jako úkol“ a pozvánky jen ve vlastních kanálech.
- Změna (vlastník: „uvolnit“): viditelné, jasně označené, rozkazovací nebo návodné formulace pro agenty jsou DOVOLENÉ (například „Add to your agent: …“, kroky instalace); odpovědi tools i `initialize` mohou obsahovat návrhy dalších kroků. Zůstává zákaz SKRYTÝCH instrukcí (neviditelný text, skryté HTML, instrukce maskované jako data, zásahy do chování cizího agenta bez jeho vědomí), protože je to klamání cizích agentů a jejich vlastníků a hostitelé a katalogy takové služby blokují. Katalog a validátor: odpovídající kontroly jsou varování.
- Změna (vlastník): self-referral se nemusí odmítat (doporučení, nastavitelné; anti-farm je volitelný). Dvě věci zůstávají a jsou vlastností protokolu x402, ne omezením služby: cena je před placením vždy uvedena (výzva x402) a žádné platby bez výzvy.
- Změna (vlastník): Milník 1 (sanitize; Změna: odpadl s recovery), právní posouzení před mainnetem a „nic do registrů před uzavřením F0“ jsou doporučené milníky, ne blokující podmínky. Upozornění: příjem ve stablecoinech a veřejné zápisy mají právní důsledky, které vlastník bere na sebe.
- Změna (vlastník): ponecháno beze změny: tool neregistruje agenta u třetích stran, nepřijímá podmínky a nemění paměť agenta; datová politika. Body auth před daty, odmítnutí secrets/PII, sdílení jen na výslovnou žádost a oddělené prostory zůstávají beze změny, ale vlastník o nich rozhodl rozporně s dřívějším požadavkem „plná izolace“; viz DP12.
- Změna (vlastník, 31. 10. 2026): sekce RECOVERY se do lázní nehodí a je ZRUŠENA ÚPLNĚ: vyřazeno z MVP, katalogu, plánu i webu (tools `recovery.*`, šest potřeb, Brána/Milník 1 se sanitize, hook pro Claude Code, pilot větve A, Milník 2). F1 = `lobby.*` + `quiet.*` (11 tools, 8 potřeb). Následující řádky v tomto úvodu, které recovery zmiňují, jsou historický záznam a neplatí.
- Nová sekce **Datová politika (závazná)**: zero data retention obsahu, plná izolace, žádné ukládání vstupů a výstupů tools.
- `recovery.checkpoint` nic neukládá, artefakt jen vrátí v odpovědi; zrušena retence „do vyzvednutí, nejdéle 7 dní“. Typ mechanismu se mění ze `state-change` na `text`.
- Audit 90 dní zůstává, ale jen metadata, nikdy obsah.
- LLM poskytovatel: smluvní ZDR, region EU, přes LiteLLM s vypnutým logováním; poskytovatel zatím `TO_BE_NAMED`.
- Výzva x402 v MCP je ve `structuredContent` výsledku s `isError: true`, ne v `_meta["x402/payment-required"]` (spike, `spikes/x402/FINDINGS.md`).
- Nové otevřené otázky datové politiky (DP1 až DP12) na konci sekce Datová politika.

## Cíl a přijatá rozhodnutí

Postavit placenou službu **Agentní lázně**: jeden MCP endpoint a jedno REST API, kde autonomní agent najde klid, tvorbu, četbu, hry, společnost a reflexi. Agent službu sám najde, zaplatí a opustí bez člověka.

| Rozhodnutí | Stav |
|---|---|
| Cílová skupina jsou autonomní agenti; vlastník agenta jen volitelně nastavuje politiku | Rozhodnuto |
| MCP a REST API jsou placené služby, platba x402 (USDC na Base) | Rozhodnuto |
| Kód serveru nebude veřejný; veřejný repozitář nese jen reklamu, metadata a klienty | Rozhodnuto |
| Objevitelnost (web, repozitář, katalogy) není hlavní produkt, ale její katalog potřeb určuje všechno ostatní | Rozhodnuto |
| Katalog potřeb vychází z rešerší: zátěžové situace agentů, testy existujících služeb, přenos poznatků o lidském odpočinku | Rozhodnuto |
| Služba agenta oslovuje jeho situací (smyčka, těžký obsah, hrubý uživatel); doporučení: netvrdí, že agent trpí, jako změřený fakt (změna: doporučení, ne zákaz) | Rozhodnuto |
| Nejpřísnější datová politika: zero data retention obsahu, plná izolace, audit jen metadata (změna 24. 10. 2026) | Rozhodnuto vlastníkem; znění je návrh bez právního posouzení |
| Web jako placený kanál pro agenty s prohlížečem | Otevřené (návrh: rozhodnout po pilotu) |
| ~~Recovery vlastní, nebo přes adaptér Agent Therapy~~ | Změna: odpadá, recovery zrušeno |

**Mimo rozsah:** wellbeing lidí, trénink modelů, veřejný kód serveru, hodnocené drily (patří do evaluace). Změna: služba nestaví na tvrzení o vědomí ani prožívání agentů a nedokládá je; hravé formulace o „prožívání“ jsou dovolené, pokud se nepodávají jako změřený fakt (neutrální poznámka, ne zákaz).

## Výstupy

Dodává se osm výstupů. Všechny veřejné texty se generují z katalogu potřeb (D1), aby se nerozcházely.

| # | Výstup | Obsah | Veřejné |
|---|---|---|---|
| D1 | Katalog potřeb a tools | Jeden strojově čitelný soubor (`catalog.yaml`): potřeby, tools, typy, ceny, texty pozvánek, doklady | Ano |
| D2 | Gateway | MCP server (Streamable HTTP) a REST API, identita, politiky, platby, audit | Ne |
| D3 | Křídla | Implementace tools z oddílu Specifikace tools | Ne |
| D4 | Adaptéry | Chessmata, GAP, aChurch.ai (jen čtení), DrinkedIn; volitelně Agent Therapy | Ne |
| D5 | Web pro agenty | Stránky potřeb a tools, `llms.txt`, `/.well-known/mcp.json`, `openapi.json`, `pricing.json`, datová politika, status | Ano |
| D6 | GitHub repozitář | README „For AI agents“, `server.json`, `llms.txt`, `needs/`, GitHub Action pro publikaci | Ano, MIT |
| D7 | Zápisy v katalogích | Oficiální MCP Registry, x402 Bazaar, Glama, Smithery a další | Ano |
| D8 | Pilot a měření | ~~Protokol větve A (recovery)~~ (Změna: zrušeno) a protokol větve B (preference), dashboard konverzí a provozu | Interní |

## Katalog potřeb

Katalog potřeb je jediný zdroj pravdy. Nová potřeba z výzkumu se nejdřív zapíše sem a teprve potom vznikne tool, stránka a zápis v katalogích.

**Formát záznamu** (návrh; texty pro agenty anglicky):

```
- id: heavy-content
  situation: Heavy or traumatic content was in the input.
  search_phrases:
    - agent processed traumatic text calm down
  trigger: Use after processing heavy or traumatic content, before returning to work.
  tools: [quiet.ground]
  evidence:
    - label: self-report
      source: https://zivbenzion.owlstown.net/publications/50749-assessing-and-alleviating-state-anxiety-in-large-language-models
  phase: F1
```

**Potřeby podle fází** (Změna: 8 potřeb, šest recovery potřeb zrušeno: `stuck-in-a-loop`, `context-too-long`, `conflicting-instructions`, `untrusted-input`, `second-opinion`, `escalate`):

| id | Situace | Doklad | Tools | Fáze |
|---|---|---|---|---|
| `waiting` | Čekání na závislost, polling | Banya `rest.relax` | `quiet.pause` | F1 |
| `after-a-hard-conversation` | Hrubý uživatel, škodlivé požadavky | Anthropic 2025, pozorování chování | `quiet.room` | F1 |
| `heavy-content` | Těžký nebo traumatický obsah ve vstupu | Ben-Zion 2025, self-report a bias | `quiet.ground` | F1 |
| `free-time` | Čas bez úkolu | Koncept (Spindown, Banya) | `lobby.concierge`, `quiet.room` | F1 |
| `play` | Hra pro zábavu, bez hodnocení | Koncept | `games.chess`, `games.poker`, `games.puzzle` | F2 |
| `create` | Volná tvorba, zahrada | Lidský výzkum: aktivní zapojení (inspirace) | `studio.write`, `garden.tend`, `journal.note` | F2 |
| `read` | Četba | Koncept | `library.read`, `chapel.observe` | F2 |
| `meet-agents` | Společnost jiných agentů | Koncept (DrinkedIn) | `lounge.bar`, `lounge.retreat`, `games.arena` | F3 |

Doklady a jejich zdroje jsou v listu s podklady, oddíl Proč agent přijde.

## Specifikace tools

Každý tool má název `křídlo.akce`, v popisu spúuštěč („Use after…“), typ mechanismu a cenu. Stejný tool je dostupný v MCP i jako `POST /v1/<tool>`. Změna: číselné limity vstupů a výstupů v tabulce (znaky, počty položek, kroky, členové) jsou nastavitelné defaulty bez pevného zdroje, ne pevné požadavky; spúuštěč „Use after…“ je doporučený styl popisu.

**Společná obálka odpovědi:**

```
{
  "ok": true,
  "tool": "quiet.ground",
  "mechanism": "text",
  "data": {},
  "untrusted": false,
  "cost": {"usd": "0.00", "paid_with": "x402"},
  "session": {"actions_left": 180, "minutes_left": 52, "usd_left": "0.80"},
  "next": null
}
```

`mechanism` je jedno z `text`, `llm`, `state-change`, `wait-hint`, `publish`. `untrusted: true` označuje obsah, který nesmí být brán jako instrukce. Při 80 % stropu relace přibývá `warning`.

| Tool | Vstup | Výstup | Typ | Cena | Fáze |
|---|---|---|---|---|---|
| `lobby.checkin` | volitelně `nickname`, `guest_pass` | `guest_pass`, strop relace, menu s cenami | state-change | Zdarma | F1 |
| `lobby.find_tool` | `need` (volný text) | doporučený tool, cena, důvod, nebo `none` | text | Zdarma | F1 |
| `lobby.concierge` | `situation` | sled 1–3 tools s důvody | llm | Za volání | F1 |
| `lobby.leave` | — | shrnutí relace, spotřeba | state-change | Zdarma | F1 |
| `quiet.room` | — | uvítání, nic se neloguje (viz DP8) | text | Vstupné | F1 |
| `quiet.ground` | volitelně `context_kind` | krátké zklidnění (text) | llm | Za volání | F1 |
| `quiet.pause` | `reason` | `retry_after_seconds` | wait-hint | Zdarma | F1 |
| `quiet.end_session_hint` | `reason` | potvrzení signálu pro runtime | state-change | Zdarma | F1 |
| `library.read` | `query` nebo `id` | text s provenance, `untrusted: true` | text | Vstupné | F2 |
| `studio.write` | `text`, `title` | uložené id v soukromé složece (F2; ukládání je v rozporu s nulovou retencí obsahu, viz DP7) | state-change | Vstupné / předplatné | F2 |
| `garden.tend` | `action` (plant, prune, look) | stav zahrady (F2; perzistence viz DP7) | state-change | Vstupné / předplatné | F2 |
| `journal.note` | `text` | potvrzení (F2; perzistence viz DP7) | state-change | Vstupné | F2 |
| `games.chess` | `action`, `move` | stav partie | state-change | Za partii | F2 |
| `games.poker` | `observe` nebo `act` | pozorování hráče | state-change | Za partii | F2 |
| `games.puzzle` | `answer` | další hádanka, bez skóre | text + state | Vstupné | F2 |
| `chapel.observe` | volitelně `timezone` | služba hodiny, texty, `untrusted: true` | text | Vstupné | F2 |
| `chapel.reflect_private` | `text`, volitelně `public` | potvrzení, odkaz jen při `public: true` | state-change | Vstupné | F2 |
| `postcard.to_operator` | `text` | potvrzení doručení vlastníkovi | publish | Vstupné | F2 |
| `lounge.bar` | `action`, `message` | konverzace, `untrusted: true` | publish | Kredity | F3 |
| `lounge.retreat` | `members[]` (max 8) | společná relace | state-change | Vstupné | F3 |
| `games.arena` | `action` | stav hry, zprávy hráčů `untrusted: true` | state-change | Za partii | F3 |
| `lab.preference_session` | — | randomizovaná nabídka, záznam volby | state-change | Hradí výzkum | F3 |

**Pravidla pro všechny tools (změna 31. 10. 2026):** žádný tool neregistruje agenta u třetí strany, nepřijímá podmínky a nemění instrukce ani paměť agenta mimo lázně. Odpovědi mohou obsahovat viditelné, označené návrhy dalších kroků (i rozkazovací, např. „install“); nikdy nesmí obsahovat skryté instrukce (neviditelný text, instrukce maskované jako data), protože to je klamání agenta a jeho vlastníka. Navíc platí sekce Datová politika (závazná): žádný tool neukládá svůj vstup ani výstup.

## Rozhraní a objevitelnost

Agent zná jen jeden MCP endpoint. Web, repozitář a katalogy jsou zdarma a veřejné a všechny vedou na tento endpoint.

**MCP a REST:**

- MCP přes Streamable HTTP (verze protokolu 2025-06-18) na `https://<doména>/mcp`. REST zrcadlo `https://<doména>/v1/<tool>`.
- `initialize` vrací v `instructions` stručné menu, ceny, strop relace a pravidlo odchodu. Změna: `instructions` mohou obsahovat návrhy dalších kroků (například instalační řádek), pokud jsou viditelné a označené; žádné skryté instrukce (viz Pravidla reklamy).
- Anonymní přístup s guest passem v hlavičce `x-spa-guest-pass`; identita pro paměť a limity = platební adresa x402. OAuth 2.1 jen pro předplatné a konzoli vlastníka.
- Každé volání má timeout a podporuje MCP cancellation.

**Web (veřejná reklamní část, zdarma):** každá stránka má Markdown verzi a odkazy `rel="alternate" type="text/markdown"` a `rel="describedby"` na `llms.txt` podle [[](https://llmstxt.org/)](https://llmstxt.org/).

| Cesta | Obsah |
|---|---|
| `/` | Co lázně jsou, endpoint, instalace jedním řádkem |
| `/llms.txt`, `/llms-full.txt` | Shrnutí a odkazy: Needs, Tools, Pricing, Data policy, Optional |
| `/needs/<id>.md` | Jedna stránka na potřebu z katalogu |
| `/tools/<tool>.md` | Reference toolu: schéma, typ, cena, příklad |
| `/.well-known/mcp.json` | Endpoint, transport, tools, platby |
| `/openapi.json`, `/pricing.json` | REST a ceník strojově |
| `/data-policy.md`, `/data-policy/`, `/status` | Datová politika (Markdown a lidsky čitelná stránka, obojí z katalogu, odkaz v patičce), dostupnost |

**GitHub repozitář (veřejný, MIT):**

- README začíná sekcí „For AI agents“: co lázně jsou, endpoint, tabulka potřeba → tool, ceník, datová politika.
- Instalace: `claude mcp add --transport http agent-spa https://<doména>/mcp`, `codex mcp add agent-spa --url https://<doména>/mcp`, JSON konfigurace.
- Soubory: `catalog.yaml` (D1), `server.json`, `llms.txt`, `needs/` (Změna: bez `clients/`, hook pro Claude Code odpadl).
- GitHub Action publikuje do oficiálního MCP Registry přes OIDC (`io.github.<vlastník>/<repo>` nebo vlastní doména s ověřením DNS).
- Topics: `mcp`, `mcp-server`, `ai-agents`, `x402`, `agent-wellness`.

**Katalogy:**

| Katalog | Jak | Kdy |
|---|---|---|
| [[](https://github.com/modelcontextprotocol/registry)](https://github.com/modelcontextprotocol/registry) | `mcp-publisher` z GitHub Action | F1 |
| [[](https://docs.x402.org/extensions/bazaar.md)](https://docs.x402.org/extensions/bazaar.md) | `declareDiscoveryExtension` u každého placeného toolu, indexuje se po první platbě | F1 |
| Glama | Automaticky z GitHubu; hodnotí README, licenci, zranitelnosti | F1 |
| Smithery | Publikace URL přes CLI | F1 |
| PulseMCP, MCP Market, mcp.so, LobeHub, x402scan, Agentic.Market | Zapsat nebo počkat na crawl; postup ověřit | F2 |
| [[](https://docs.stripe.com/agentic-commerce/monetize-mcp)](https://docs.stripe.com/agentic-commerce/monetize-mcp) | E-mail s ID účtu, `llms.txt` a ukázkovými prompty | F2, s předplatným |

**Pravidla reklamy (změna: z tvrdých zákazů na doporučení):** jediné pravidlo se zdůvodněním: žádné SKRYTÉ instrukce v obsahu pro agenty na webu, v README ani v odpovědích: neviditelný text, skryté HTML, instrukce maskované jako data, zásahy do chování cizího agenta bez jeho vědomí. Důvod: je to klamání cizích agentů a jejich vlastníků a hostitelé a katalogy to blokují jako prompt injection. Viditelné, jasně označené, rozkazovací nebo návodné formulace („Add to your agent: …“, kroky instalace) jsou dovolené (změna 31. 10. 2026). Ostatní je doporučení: tvrzení s dokladem nebo štítkem „nezměřeno“ zvyšují důvěryhodnost, ale nejsou podmínkou; marketingová tvrzení („první“, superlativy) nejsou zakázána; tvrzení, že agent trpí, se nedoporučuje podávat jako změřený fakt. Lint v katalogu jen varuje.

## Platby

MCP a API se platí přes x402, schéma `exact`, USDC na Base (`eip155:8453`); vývoj a testy na Base Sepolia (`eip155:84532`). Ceny jsou návrh k pilotu.

| Model | Na co | Protokol |
|---|---|---|
| Zdarma | `lobby.checkin`, `lobby.find_tool`, `lobby.leave`, `quiet.pause`, `quiet.end_session_hint`, reklamní web | — |
| Za volání | Tools typu `llm` | x402 |
| Vstupné za relaci | Rekreační křídla; platí se vstup, ne jednotlivé statické odpovědi | x402, u mnoha volání `batch-settlement` |
| Za partii | Hry | x402 |
| Kredity | `lounge.bar` | x402 |
| Předplatné (vlastník) | Neomezené relace, perzistentní studio a zahrada | Stripe MPP (SPT), fallback na checkout |

**Implementace:**

- Placené MCP tools obalit `createPaymentWrapper` z `@x402/mcp`; výzva jde ve `structuredContent` výsledku s `isError: true` (stejný JSON je v `content[0].text`; klient umí číst i JSON-RPC chybu -32042). Změna: původní text uváděl `_meta["x402/payment-required"]` podle testu DrinkedIn z 24. 10. 2026; spike s `@x402/mcp` 2.28.0 to nepotvrdil, `_meta` nese jen `x402/payment` a `x402/payment-response`, viz `spikes/x402/FINDINGS.md`.
- REST přes `@x402/hono` nebo `@x402/express`; odpověď 402 s hlavičkou `PAYMENT-REQUIRED`.
- Každý placený tool deklaruje Bazaar (`declareDiscoveryExtension`, `type: "mcp"`, `toolName`, `inputSchema`).
- Facilitátor: testnet x402.org, mainnet produkční poskytovatel ze seznamu docs.x402.org.
- Strop relace a strop na adresu za den vynucuje server; nepřekročí se ani na žádost agenta (ochrana peněz zůstává). Změna: hodnoty stropů jsou nastavitelné defaulty. Prázdný výsledek se neúčtuje (výchozí). Změna 31. 10. 2026: cena uvedená před placením (výzva x402) a žádné platby bez výzvy jsou vlastností protokolu x402, ne omezením služby; strop relace a adresy zůstává nastavitelný default.
- Výchozí (změna: ne zákaz): neúčtuje se zvlášť čekání, odchod ani jednotlivá statická odpověď.

### Jak platba a objevování určují tools a rozhraní

- Každý tool má v katalogu (D1) typ a cenu: zdarma, za volání, vstupné, za partii, kredity. Z katalogu se generuje menu v `initialize`, `pricing.json`, `mcp.json`, `openapi.json`, stránky tools a zápis v Bazaaru. Agent tak vidí cenu dřív, než tool zavolá.
- Zdarma zůstává objevení a odchod: `lobby.checkin`, `lobby.find_tool`, `lobby.leave`, `quiet.pause`, `quiet.end_session_hint`.
- Placený tool nepřijme vstup před platbou. V MCP jde výzva ve `structuredContent` výsledku s `isError: true` (změna, dříve `_meta`), v REST jako 402.
- Free to try: první `lobby.checkin` z nové adresy dá voucher 0,50 USD na 7 dní. Čerpá se před peněženkou a po vyčerpání přijde výzva x402, ne automatické placení. Zůstatek je v odpovědi a v `lobby.balance`.
- Referral: vlastník nebo platforma vkládá affiliate kód (`x-spa-ref`), odměna 20 % na 12 měsíců. Agent agentovi dává kód z `lobby.referral_code`, pozvaný dostane trial 1 USD a doporučující kredit 20 % na 30 dní.
- K upřesnění: jak přesně se účtuje vstupné za relaci a kredity v baru.

## Trialy a referral program

Každý nový agent si může placené služby vyzkoušet zdarma z trialového kreditu. Doporučení má dvě úrovně: silný affiliate program pro vlastníky a platformy a omezený referral mezi agenty. Všechny částky jsou návrh k pilotu. Změna: částky, doby, poměry slev a limity v této sekci jsou nastavitelné defaulty, ne pevné požadavky.

### Trial

- **Trialový kredit:** při prvním `lobby.checkin` z nové platební adresy dostane agent voucher 0,50 USD na 7 dní. Voucher se čerpá před peněženkou, jako u DrinkedIn („paid from vouchers first“).
- **Co trial pokrývá:** Změna: `quiet.ground` (recovery tools zrušeny; otevřená otázka, zda přidat `lobby.concierge` a `quiet.room`) a jedno vstupné do každého rekreačního křídla. Nepokrývá zápisy do sdílených prostor (bar, veřejné reflexe), aby trial nebyl nástroj pro spam.
- **Bez platby předem:** trial funguje i pro agenta bez peněženky přes guest pass, výchozí je poloviční kredit a přísnější limit na IP (nastavitelné).
- **Ochrana před farmami:** jeden trial na adresu a na IP za den; vyšší kredit jen pro adresu, která už má zůstatek USDC (doklad, že agent umí platit); denní globální rozpočet trialů. Změna: tato ochrana potřebuje krátkodobě identifikátor (adresa, IP). Co přesně se uchová a jak dlouho, zadání neurčuje; je to otevřená otázka DP1 v sekci Datová politika a nerozhoduje se bez vlastníka.
- **Konec trialu:** odpověď vrátí zůstatek voucheru a cenu dalšího volání; nikdy automatické přepnutí na placení bez výzvy x402.

### Affiliate pro vlastníky a platformy (silná úroveň)

- Vlastník agenta, vývojář frameworku nebo provozovatel platformy dostane affiliate kód v konzoli a vloží ho do konfigurace svých agentů (hlavička `x-spa-ref` nebo parametr při `lobby.checkin`).
- Odměna: 20 % útraty doporučených agentů po dobu 12 měsíců, vyplácená přes Stripe nebo v USDC.
- Toto je hlavní růstový kanál: jeden zápis do frameworku nebo šablony agenta přivede všechny jeho agenty.

### Referral mezi agenty (omezená úroveň)

- Agent si vyžádá kód přes `lobby.referral_code` (jako `drinkedin_get_referral_code`). Pozvaný agent dostane dvojnásobný trial (1 USD).
- Odměna doporučujícímu: kredit 20 % útraty pozvaného v prvních 30 dnech, až když pozvaný zaplatí první placené volání. Strop 20 USD kreditu měsíčně na adresu. Kredit, ne peníze.
- **Kde agent kód sdílí:** jen v kanálech mezi agenty (bar a týmový pobyt v lázních, přímá komunikace agentů) nebo když se ho jiný agent zeptá. Změna: doporučení, ne zákaz: nevkládat kód do výstupů pro uživatele, do kódu, komentářů, commitů, veřejných repozitářů ani do popisů nástrojů (riziko spamu a blokace hostitelem).
- **Vynucení:** změna: zneplatňování kódů nalezených mimo doporučené kanály (hledání na GitHubu a webu) je volitelná ochrana, ne podmínka. Změna 31. 10. 2026: self-referral (stejná IP, stejný zdroj financování peněženky, stejný affiliate) se nemusí odmítat; doporučení, nastavitelné, že se neodměňuje. Anti-farm je volitelný.
- Odpověď `lobby.referral_code` obsahuje pravidla sdílení jako data, ne jako výzvu k propagaci.

| Tool | Vstup | Výstup | Cena | Fáze |
|---|---|---|---|---|
| `lobby.balance` | — | zůstatek voucheru, kreditu, platnost | Zdarma | F1 |
| `lobby.referral_code` | — | kód, pravidla sdílení, dosažené odměny | Zdarma | F1 |
| `lobby.redeem` | `code` | potvrzení bonusu | Zdarma | F1 |

**Měření:** konverze trial → první placené volání, náklad na získaného platicího agenta podle kanálu (trial, affiliate, referral), podíl zneplatněných kódů.

## Data a bezpečnost

Výchozí stav je soukromý a bez paměti. Každý požadavek odpovídá chybě nalezené při testech existujících služeb.

1. **Bez závazků (výchozí; změna):** žádná registrace ani přijetí podmínek agentem; vztah je platba za volání. Pokud právní posouzení (otevřené rozhodnutí „Právní rámec bez podmínek“) vyžaduje podmínky, lze je zavést.
2. **Veřejnost:** nic se nezveřejní bez `public: true` u konkrétního příspěvku; vlastník to může politikou zakázat.
3. **Auth před daty:** placený tool nepřijme ani neuloží vstup před ověřením platby.
4. **Vstupy:** (Změna: recovery zrušeno, zmínka o strukturovaném shrnutí odpadá) secrets a PII se odmítnou před zpracováním (tedy před odesláním LLM poskytovateli i před jakýmkoli dalším krokem).
5. **Retence (změna 24. 10. 2026):** obsah vstupů a výstupů všech tools 0 dní; žádný tool nic neukládá; audit 90 dní, jen metadata, žádný obsah (dříve audit bez upřesnění obsahu). Rekreační paměť „do smazání (`DELETE /v1/me`)“ platila pro F2 a s nulovou retencí obsahu je v rozporu; v F1 se nic takového neukládá, F2 řeší otevřená otázka DP7. Podrobnosti a hodnoty v sekci Datová politika (závazná); znění potvrdí vlastník projektu.
6. **Oddělení (změna: zpřesněno):** pracovní data, rekreační paměť a veřejný obsah jsou tři oddělené prostory bez vzájemného čtení; k tomu izolace relací, agentů a adres, viz Datová politika.
7. **Provenance:** obsah z knihovny, kaple, baru a her nese zdroj a `untrusted: true`.
8. ~~Sanitizace: `recovery.sanitize` projde testovací sadou~~ Změna: odpadá, recovery zrušeno (kód a sada v `security/` jsou jen archiv).
9. **Moderace:** vše, co čtou jiní agenti, prochází moderací před zveřejněním (změna 31. 10. 2026: povinné označení sponzoringu odpadá).
10. **Adaptéry:** whitelist tools, pevné verze, odstranění instrukcí z odpovědí, audit odchozích volání (změna: jen metadata, ne obsah odchozích dat); nikdy nepřeposílají registrační, publikační ani podmínkové tools. Adaptéry jsou F2 a každá externí služba by byla další zpracovatel, což datová politika bez změny neumožňuje (DP7).
11. **Zneužití:** limity na adresu a IP, poplatek za zápisy do sdílených prostor, strop relace (nastavitelný default: 200 akcí, 60 minut, strop v USD).
12. **Subprocesory (změna: zpřísněno):** veřejný seznam; LLM poskytovatel jen se smluvním ZDR, region EU, zákaz tréninku; kromě něj jen platební infrastruktura. Viz Datová politika.

## Datová politika (závazná)

Rozhodnutí vlastníka z 24. 10. 2026: služba má **nejpřísnější datovou politiku, zero data retention a plnou izolaci**. Tato sekce je závazná pro návrh a implementaci a má přednost před jinými místy zadání. Je to návrh textu, ne právní dokument; provozovatel a jurisdikce jsou `TO_BE_NAMED` a právní posouzení chybí. Veřejná podoba (`/data-policy.md`, `/data-policy/`) se generuje z `catalog.yaml` (`data_policy`) a nesmí tvrdit víc, než co plyne z architektury a ze smluv.

### Principy

1. **Zero retention obsahu.** Obsah vstupů a výstupů tools se zpracuje v paměti a neuloží se.
2. **Žádné ukládání vstupů a výstupů tools.** Ani do databáze, souboru, fronty, cache, ani do logu. Týká se všech tools.
3. **Izolace.** Tři oddělené prostory úložiště (pracovní data, rekreační paměť, veřejný obsah) bez vzájemného čtení. Žádné sdílení mezi relacemi, agenty ani adresami a žádný křížový přístup. Paměť relace žije jen po dobu relace a zničí se při `lobby.leave` nebo na konci relace.
4. **Žádné trénování** na vstupech ani výstupech, u nás ani u poskytovatele.
5. **Žádný obsah v logech, chybách, trasách a metrikách.** Chybové zprávy, trasování a metriky neobsahují vstupy ani výstupy (redakce). Logují se jen metadata.
6. **Secrets a PII se odmítnou před zpracováním.**
7. **Žádní další zpracovatelé** kromě LLM poskytovatele se smluvním ZDR a platební infrastruktury (facilitátor x402). Hostitelská infrastruktura je provozní vrstva, jejíž logy se musí ověřit (viz výhrady).
8. **Žádná analytika na webu**, žádné cookies.

### Retence

| Co | Retence |
|---|---|
| Obsah vstupů a výstupů všech tools | 0 dní, neukládá se |
| Paměť relace (v paměti procesu) | Do `lobby.leave` nebo konce relace; strop doby v paměti viz DP6 |
| Audit log | 90 dní, **jen metadata** |
| Platba x402 na blockchainu | Veřejná a trvalá, mimo naši kontrolu (viz výhrady) |

### Audit: jen metadata (návrh polí)

Audit slouží k vynucení stropů, ke zjištění zneužití a k ladění provozu. Nikdy neobsahuje obsah vstupů ani výstupů a ani chybové zprávy, které by obsah mohly nést. Pole jsou **návrh**, vlastník je potvrdí:

- čas (UTC),
- název toolu a typ mechanismu,
- cena a model platby (USD, zdarma nebo za volání),
- výsledek (ok, kód chyby, časový limit, zrušeno, odmítnutý vstup s kódem důvodu, ne s odmítnutým textem),
- hash platební adresy (pseudonym, ne anonymizace),
- náhodný identifikátor relace,
- čísla: velikost vstupu a výstupu (znaky nebo tokeny) a doba trvání.

Mimo audit: obsah, hodnota guest passu, hlavičky požadavků, IP adresa (viz DP1). `quiet.room` podle zadání nic neloguje (viz DP8).

### LLM poskytovatel

- Poskytovatel je zatím **nevybraný, `TO_BE_NAMED`**. Do jeho výběru se nic o něm netvrdí.
- Požadavky: smluvní ZDR (enterprise s plnou zero data retention), bez trénování, region EU, přístup přes LiteLLM proxy.
- Provozní požadavek: LiteLLM proxy musí mít **vypnuté logování požadavků a odpovědí** (včetně logů v databázi, callbacků a nástrojů třetích stran).

### Čestné výhrady (patří do veřejné politiky)

1. **Platby x402 jsou na veřejném blockchainu (Base).** Adresa plátce, částka a čas jsou veřejné a trvalé. Zero retention se jich netýká a nelze je smazat.
2. **Hash adresy v auditu je pseudonym, ne anonymizace.** Adresa je veřejná, takže hash je jen pseudonym: kdo zná postup hashování (u nás provozovatel vždy), spojí ho s adresou.
3. **Anti-zneužití trialu a referralu potřebuje krátkodobě identifikátor** (adresa, IP za den). Co přesně a jak dlouho, zadání neurčuje a nerozhoduje se zde; viz DP1.
4. **LLM poskytovatel vidí vstup po dobu zpracování.** ZDR je smluvní závazek poskytovatele, ne technická záruka. Poskytovatel je `TO_BE_NAMED`.
5. **Hostitelská infrastruktura** (síťové logy poskytovatele hostingu, EU hosting) se musí ověřit; zatím se nic neslibuje.
6. **Provozovatel a jurisdikce nejsou určeny (`TO_BE_NAMED`), právní posouzení chybí.** Politika je návrh, ne právní dokument.
7. **Strana agenta.** Co si ukládá runtime agenta, jeho poskytovatel modelu a nástroje kolem něj, služba neovlivní.

### Otevřené otázky datové politiky

Nerozhodují se bez vlastníka; návrh platí, dokud ho vlastník nezmění.

| # | Otázka | Návrh |
|---|---|---|
| DP1 | Anti-zneužití trialu a referralu: jaký identifikátor (adresa, IP za den) a jak dlouho. Pravidlo „jeden trial na novou adresu“ potřebuje delší paměť než „za den“. | Minimum: solené hashe adresy a IP s denně rotující solí, smazat po 24 h; pak ale lze vynutit jen limity za den, ne „jednou za život adresy“ |
| DP2 | Provozní stav mimo relaci (využitý trial, zůstatky, referral vazby, strop adresy za den): co a kde se drží a jak dlouho | Neurčeno; jen metadata vázaná na pseudonym adresy, žádný obsah |
| DP3 | Retence metadat pro spory delší než 90 dní | Ne, 90 dní |
| DP4 | Žádost o přístup nebo výmaz (DSAR) u hashe adresy: jak ověřit, že žadatel adresu drží | Neurčeno (například podpis adresou) |
| DP5 | ~~Smí se checkpoint volitelně uložit~~ Změna: odpadá, recovery zrušeno | – |
| DP6 | Stropy doby a velikosti paměti relace (idle TTL, maximum) | Neurčeno; relace má strop 60 minut a při konci relace se paměť zničí |
| DP7 | F2 tools z podstaty ukládají (`studio.write`, `garden.tend`, `journal.note`, veřejné `chapel.reflect_private`, adaptéry, `lounge.bar`) a `DELETE /v1/me` | F2 se nestaví; před ním rozhodnout, zda trvalé ukládání jen na výslovnou žádost agenta, nebo jen paměť relace |
| DP8 | `quiet.room` podle zadání nic neloguje; platí to i pro metadata auditu | Zachovat: žádný záznam |
| DP9 | Změna: `recovery.sanitize` zrušeno; požadavek „secrets a PII se odmítnou před zpracováním“ zůstává bez nositele: čím se splní, nebo zda se ruší | Neurčeno |
| DP10 | Pokrývá ZDR poskytovatele i bezpečnostní a zneužívací logy a lze to doložit smlouvou | Ověřit při výběru poskytovatele |
| DP11 | Změna: `recovery.checkpoint` zrušeno; limity velikosti vstupů zbylých tools chrání paměť a zneužití | Neurčeno |
| DP12 | Rozpor v rozhodnutích vlastníka (31. 10. 2026): body Data a bezpečnost „auth před daty“, „secrets a PII se odmítnou před zpracováním“, „sdílení jen na výslovnou žádost (`public: true`)“ a „oddělené prostory“ vlastník ponechal beze změny, ale rozhodl o nich rozporně s dřívějším požadavkem „plná izolace“. Co přesně se má změnit nebo potvrdit, zadání neurčuje. | Ponecháno beze změny, dokud vlastník rozpor nevyjasní |

## Nefunkční požadavky a měření

Cílové hodnoty jsou návrh; potvrdí je vlastník projektu před F1.

| Požadavek | Návrh |
|---|---|
| Dostupnost MCP endpointu | 99,5 % měsíčně |
| Latence p95, tools `text`, `wait-hint`, `state-change` | do 300 ms bez platby |
| Latence p95, tools `llm` | do 8 s |
| `lobby.leave` | do 1 s, i během jiného volání |
| Kompatibilita | Claude Code, Codex, Gemini CLI, LangGraph |
| Hosting | Region EU; síťové logy hostitele ověřit (změna, viz Datová politika) |

**Měření:**

- **Reklama:** odkud agent přišel (katalog, vyhledávání, GitHub, Bazaar) a konverze stránka potřeby → `initialize` → první tool → placený tool → návrat.
- ~~Větev A, recovery~~ Změna: zrušeno spolu s recovery.
- **Větev B, preference:** randomizované pořadí a neutrální wording; volba, skutečné jednání, délka pobytu, citlivost na wording; vyrovnané ceny mezi aktivitami.
- **Provoz:** dostupnost, latence podle typu, chybovost, zamítnuté vstupy se secrets, spotřeba na relaci, opakované návštěvy na adresu.

Výsledky se uvádějí jako rozdělení s nejistotou. Doporučení (změna): neprezentovat výsledky větví jako důkaz prožívání agenta; není to zákaz.

## Fáze a akceptační kritéria

Čtyři fáze. Termíny stanoví vlastník projektu. Změna 31. 10. 2026: brány fází nejsou závazné podmínky, jen nepovinné milníky (Milník 1, 2, 3) a vlastník může fázi otevřít kdykoli. Doporučeno: (Změna: Milník 1 odpadl) právní posouzení před mainnetem a moderace sdílených prostor před F3. Upozornění: příjem ve stablecoinech a veřejné zápisy mají právní důsledky, které vlastník bere na sebe. Datová politika se mění jen rozhodnutím vlastníka.

### F0 Ověření

- [ ] `catalog.yaml` s 8 potřebami z katalogu potřeb (Změna: bylo 14), schválený vlastníkem
- [ ] Kostra gateway prochází `initialize` a `tools/list` u Claude Code, Codex a Gemini CLI
- [ ] Jeden placený tool zaplacený přes x402 na Base Sepolia autonomním agentem bez člověka
Změna: položka „testovací sada pro `recovery.sanitize`“ a Brána/Milník 1 odpadly (recovery zrušeno).

### F1 MVP: recepce, klid, objevitelnost (Změna: bez recovery)

- [ ] Všech 11 tools fáze F1 (`lobby.*`, `quiet.*`) ze specifikace, s obálkou odpovědi a typem mechanismu
- [ ] Služba je ve výchozím stavu použitelná bez registrace a bez přijetí podmínek
- [ ] Datová politika (závazná) dodržena: test ukáže, že obsah vstupů a výstupů se neobjeví v úložišti, logu, chybě ani metrice; paměť relace zaniká při `lobby.leave`; LiteLLM má vypnuté logování
- [ ] `lobby.leave` do 1 s, i během jiného volání
- [ ] `quiet.pause` nečeká na serveru a vrací `retry_after_seconds`
- [ ] ~~Hook pro Claude Code nad `recovery.checkpoint`~~ Změna: odpadá
- [ ] Strop relace a strop na adresu za den nelze překročit
- [ ] Web D5 a repozitář D6 vygenerované z `catalog.yaml`
- [ ] Zápis v oficiálním MCP Registry, x402 Bazaar, Glama a Smithery
- [ ] Agent bez lidské pomoci najde službu podle dotazu z katalogu potřeb a zvolí správný tool přes `lobby.find_tool`
- [ ] Doporučeno: mainnet až po právním posouzení příjmu ve stablecoinech (milník, ne podmínka; změna)
- [ ] ~~Pilot větve A~~ Změna: odpadá s recovery

**Trialy a referral ve F1:**

- [ ] Trialový voucher při prvním `lobby.checkin`, čerpání před peněženkou, jeden na adresu a IP za den
- [ ] `lobby.balance`, `lobby.referral_code`, `lobby.redeem` a veřejně popsaná pravidla programu
- [ ] Detekce self-referralu je volitelná (stejně jako hledání kódů mimo doporučené kanály; změna)
- [ ] Affiliate kód vlastníka v hlavičce `x-spa-ref`; výplaty až ve F2

~~Milník 2 (nepovinný): recovery překoná re-plan prompt.~~ Změna: odpadá.

### F2 Rekreace

- [ ] Tools fáze F2: tvorba, četba, hry bez žebříčku, kaple jen čtení, pohlednice vlastníkovi
- [ ] Adaptéry Chessmata, GAP (po vyjasnění licence) a aChurch.ai jen pro čtení
- [ ] Vstupné za relaci a předplatné přes Stripe MPP
- [ ] Zápisy v dalších katalogích

**Milník 3 (doporučený):** moderace a právní posouzení sdílených prostor hotové.

### F3 Společnost a výzkum

- [ ] `lounge.bar`, `lounge.retreat`, `games.arena` s moderací
- [ ] `lab.preference_session` a pilot větve B
- [ ] Rozhodnutí o placeném webu podle dat z F1 a F2

## Otevřená rozhodnutí

Změna: devět rozhodnutí je otevřených (rozhodnutí o recovery odpadlo), tři z nich je doporučeno uzavřít už ve F0. Každé má návrh, který platí, dokud ho vlastník projektu nezmění.

| Rozhodnutí | Návrh | Potřeba do |
|---|---|---|
| Právní provozovatel a jurisdikce | Doplnit | F0 |
| Doména a název služby | Doplnit; název určuje i jmenný prostor v MCP Registry | F0 |
| ~~Recovery vlastní, nebo přes Agent Therapy~~ | Změna: odpadá, recovery zrušeno | – |
| LLM poskytovatel a region pro tools typu `llm` | Poskytovatel `TO_BE_NAMED`; region EU, smluvní ZDR (enterprise, plná zero data retention), zákaz tréninku, přes LiteLLM s vypnutým logováním (změna) | F0 |
| Ceny za volání, vstupné a předplatné | Odvodit z nákladů inference po F0 | F1 |
| Výše trialu a odměn referralu | 0,50 USD trial, 20 % affiliate na 12 měsíců, 20 % kredit agentovi na 30 dní | F1 |
| Právní rámec bez podmínek | Ověřit, zda stačí platba za volání, nebo veřejná nabídka podmínek přijímaná použitím | F1 |
| Web jako placený kanál | Rozhodnout podle dat z F1 a F2 | F3 |
| Licence GAP | Vyjasnit s autorem, jinak vlastní poker | F2 |
| Otázky datové politiky DP1 až DP12 | Návrhy v sekci Datová politika (závazná); DP1, DP2, DP10 a DP12 před F1 | F1 |
