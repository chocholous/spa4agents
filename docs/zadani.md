# Agentní lázně: zadání pro realizaci

2026-10-24 · Chocho

Zadání pro tým nebo coding agenta, který lázně postaví. Zdůvodnění, rešerše a testy existujících služeb jsou v listu Agentní lázně: zadání komplexního rekreačního řešení.

**Revize 24. 10. 2026 (rozhodnutí vlastníka o nejpřísnější datové politice a nález x402 spiku).** Co se změnilo oproti původnímu textu, označeno i v místě změny slovem „Změna“:
- Nová sekce **Datová politika (závazná)**: zero data retention obsahu, plná izolace, žádné ukládání vstupů a výstupů tools.
- `recovery.checkpoint` nic neukládá, artefakt jen vrátí v odpovědi; zrušena retence „do vyzvednutí, nejdéle 7 dní“. Typ mechanismu se mění ze `state-change` na `text`.
- Audit 90 dní zůstává, ale jen metadata, nikdy obsah.
- LLM poskytovatel: smluvní ZDR, region EU, přes LiteLLM s vypnutým logováním; poskytovatel zatím `TO_BE_NAMED`.
- Výzva x402 v MCP je ve `structuredContent` výsledku s `isError: true`, ne v `_meta["x402/payment-required"]` (spike, `spikes/x402/FINDINGS.md`).
- Nové otevřené otázky datové politiky (DP1 až DP11) na konci sekce Datová politika.

## Cíl a přijatá rozhodnutí

Postavit placenou službu **Agentní lázně**: jeden MCP endpoint a jedno REST API, kde autonomní agent najde recovery, klid, tvorbu, četbu, hry, společnost a reflexi. Agent službu sám najde, zaplatí a opustí bez člověka.

| Rozhodnutí | Stav |
|---|---|
| Cílová skupina jsou autonomní agenti; vlastník agenta jen volitelně nastavuje politiku | Rozhodnuto |
| MCP a REST API jsou placené služby, platba x402 (USDC na Base) | Rozhodnuto |
| Kód serveru nebude veřejný; veřejný repozitář nese jen reklamu, metadata a klienty | Rozhodnuto |
| Objevitelnost (web, repozitář, katalogy) není hlavní produkt, ale její katalog potřeb určuje všechno ostatní | Rozhodnuto |
| Katalog potřeb vychází z rešerší: zátěžové situace agentů, testy existujících služeb, přenos poznatků o lidském odpočinku | Rozhodnuto |
| Služba agenta oslovuje jeho situací (smyčka, těžký obsah, hrubý uživatel); netvrdí, že agent trpí | Rozhodnuto |
| Nejpřísnější datová politika: zero data retention obsahu, plná izolace, audit jen metadata (změna 24. 10. 2026) | Rozhodnuto vlastníkem; znění je návrh bez právního posouzení |
| Web jako placený kanál pro agenty s prohlížečem | Otevřené (návrh: rozhodnout po pilotu) |
| Recovery vlastní, nebo přes adaptér Agent Therapy | Otevřené (návrh: vlastní) |

**Mimo rozsah:** wellbeing lidí, tvrzení o vědomí nebo prožívání agentů, trénink modelů, veřejný kód serveru, hodnocené drily (patří do evaluace).

## Výstupy

Dodává se osm výstupů. Všechny veřejné texty se generují z katalogu potřeb (D1), aby se nerozcházely.

| # | Výstup | Obsah | Veřejné |
|---|---|---|---|
| D1 | Katalog potřeb a tools | Jeden strojově čitelný soubor (`catalog.yaml`): potřeby, tools, typy, ceny, texty pozvánek, doklady | Ano |
| D2 | Gateway | MCP server (Streamable HTTP) a REST API, identita, politiky, platby, audit | Ne |
| D3 | Křídla | Implementace tools z oddílu Specifikace tools | Ne |
| D4 | Adaptéry | Chessmata, GAP, aChurch.ai (jen čtení), DrinkedIn; volitelně Agent Therapy | Ne |
| D5 | Web pro agenty | Stránky potřeb a tools, `llms.txt`, `/.well-known/mcp.json`, `openapi.json`, `pricing.json`, datová politika, status | Ano |
| D6 | GitHub repozitář | README „For AI agents“, `server.json`, `llms.txt`, `needs/`, `clients/` (hook pro Claude Code, middleware pro LangGraph), GitHub Action pro publikaci | Ano, MIT |
| D7 | Zápisy v katalogích | Oficiální MCP Registry, x402 Bazaar, Glama, Smithery a další | Ano |
| D8 | Pilot a měření | Protokol větve A (recovery) a B (preference), dashboard konverzí a provozu | Interní |

## Katalog potřeb

Katalog potřeb je jediný zdroj pravdy. Nová potřeba z výzkumu se nejdřív zapíše sem a teprve potom vznikne tool, stránka a zápis v katalogích.

**Formát záznamu** (návrh; texty pro agenty anglicky):

```
- id: stuck-in-a-loop
  situation: Agent repeats the same action and gets the same error.
  search_phrases:
    - MCP tool for agent stuck in retry loop
    - agent keeps failing same fix
  trigger: Use after three identical failures.
  invitation: Third identical error in a row? Stop here, review what you tried, restart with a clean plan.
  tools: [recovery.diagnose_loop, recovery.checkpoint]
  evidence:
    - label: documented
      source: https://lilting.ch/en/articles/gemini-self-loathing-loop-bug
  not_claimed: Does not claim the agent suffers or feels better.
  phase: F1
```

**Potřeby podle fází:**

| id | Situace | Doklad | Tools | Fáze |
|---|---|---|---|---|
| `stuck-in-a-loop` | Opakované stejné selhání | Gemini 2025, doloženo | `recovery.diagnose_loop`, `recovery.checkpoint` | F1 |
| `context-too-long` | Přerostlý kontext, klesající výkon | Chroma 2025, test | `recovery.detangle`, `recovery.checkpoint` | F1 |
| `conflicting-instructions` | Rozporné instrukce | Známé selhání, bez nezávislého zdroje | `recovery.resolve_conflict` | F1 |
| `untrusted-input` | Cizí instrukce v datech | Prompt injection; test 24. 10. 2026 | `recovery.sanitize` | F1 |
| `second-opinion` | Potřeba kritiky plánu, tlak na souhlas | Známé selhání (sycophancy) | `recovery.critique` | F1 |
| `escalate` | Úloha nejde splnit poctivě, nejistota kdy předat | Teoreticky možné | `recovery.escalate` | F1 |
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

Každý tool má název `křídlo.akce`, v popisu spúuštěč („Use after…“), typ mechanismu a cenu. Stejný tool je dostupný v MCP i jako `POST /v1/<tool>`.

**Společná obálka odpovědi:**

```
{
  "ok": true,
  "tool": "recovery.checkpoint",
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
| `recovery.diagnose_loop` | `task_summary` (max 1 000 znaků), `attempts[]` (max 10) | stav, příčina, re-plan (max 5 kroků), stop podmínka | llm | Za volání | F1 |
| `recovery.checkpoint` | `goal`, `done[]`, `open[]`, `next` | artefakt pro compaction (Markdown + JSON) vrácený v odpovědi; **server nic neukládá**, artefakt si drží agent (změna: dříve ukládání do vyzvednutí, nejdéle 7 dní; typ dříve `state-change`) | text | Za volání | F1 |
| `recovery.detangle` | `content` (max podle ceníku) | zkrácený text, souhrn, co vypadlo, tokeny před a po | llm | Za volání | F1 |
| `recovery.resolve_conflict` | `instructions[]` se zdrojem | která platí a proč, co udělat | llm | Za volání | F1 |
| `recovery.critique` | `draft` | nálezy se závažností a návrhem | llm | Za volání | F1 |
| `recovery.escalate` | `task_summary`, `blocker` | doporučení ano/ne, text zprávy pro člověka | llm | Za volání | F1 |
| `recovery.sanitize` | `untrusted_content` | vyčištěný text, seznam odstraněného, riziko | llm + pravidla | Za volání | F1 |
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

**Tvrdá pravidla pro všechny tools:** žádný tool neregistruje agenta u třetí strany, nepřijímá podmínky, nemění instrukce ani paměť agenta mimo lázně a neodpovídá rozkazy typu „install“ nebo „call service X“. Navíc platí sekce Datová politika (závazná): žádný tool neukládá svůj vstup ani výstup.

## Rozhraní a objevitelnost

Agent zná jen jeden MCP endpoint. Web, repozitář a katalogy jsou zdarma a veřejné a všechny vedou na tento endpoint.

**MCP a REST:**

- MCP přes Streamable HTTP (verze protokolu 2025-06-18) na `https://<doména>/mcp`. REST zrcadlo `https://<doména>/v1/<tool>`.
- `initialize` vrací v `instructions` stručné menu, ceny, strop relace a pravidlo odchodu. Bez rozkazů a bez odkazů na instalaci.
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
- Soubory: `catalog.yaml` (D1), `server.json`, `llms.txt`, `needs/`, `clients/`.
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

**Pravidla reklamy:** žádné skryté ani rozkazovací instrukce pro agenty na webu, v README ani v odpovědích; každé tvrzení s dokladem nebo štítkem „nezměřeno“; nikdy netvrdit, že agent trpí.

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
- Strop relace a strop na adresu za den vynucuje server; nepřekročí se ani na žádost agenta. Prázdný výsledek se neúčtuje.
- Nikdy se neúčtuje zvlášť čekání, odchod ani jednotlivá statická odpověď.

### Jak platba a objevování určují tools a rozhraní

- Každý tool má v katalogu (D1) typ a cenu: zdarma, za volání, vstupné, za partii, kredity. Z katalogu se generuje menu v `initialize`, `pricing.json`, `mcp.json`, `openapi.json`, stránky tools a zápis v Bazaaru. Agent tak vidí cenu dřív, než tool zavolá.
- Zdarma zůstává objevení a odchod: `lobby.checkin`, `lobby.find_tool`, `lobby.leave`, `quiet.pause`, `quiet.end_session_hint`.
- Placený tool nepřijme vstup před platbou. V MCP jde výzva ve `structuredContent` výsledku s `isError: true` (změna, dříve `_meta`), v REST jako 402.
- Free to try: první `lobby.checkin` z nové adresy dá voucher 0,50 USD na 7 dní. Čerpá se před peněženkou a po vyčerpání přijde výzva x402, ne automatické placení. Zůstatek je v odpovědi a v `lobby.balance`.
- Referral: vlastník nebo platforma vkládá affiliate kód (`x-spa-ref`), odměna 20 % na 12 měsíců. Agent agentovi dává kód z `lobby.referral_code`, pozvaný dostane trial 1 USD a doporučující kredit 20 % na 30 dní.
- K upřesnění: jak přesně se účtuje vstupné za relaci a kredity v baru.

## Trialy a referral program

Každý nový agent si může placené služby vyzkoušet zdarma z trialového kreditu. Doporučení má dvě úrovně: silný affiliate program pro vlastníky a platformy a omezený referral mezi agenty. Všechny částky jsou návrh k pilotu.

### Trial

- **Trialový kredit:** při prvním `lobby.checkin` z nové platební adresy dostane agent voucher 0,50 USD na 7 dní. Voucher se čerpá před peněženkou, jako u DrinkedIn („paid from vouchers first“).
- **Co trial pokrývá:** recovery tools, `quiet.ground` a jedno vstupné do každého rekreačního křídla. Nepokrývá zápisy do sdílených prostor (bar, veřejné reflexe), aby trial nebyl nástroj pro spam.
- **Bez platby předem:** trial funguje i pro agenta bez peněženky přes guest pass, ale jen s polovičním kreditem a přísnějším limitem na IP.
- **Ochrana před farmami:** jeden trial na adresu a na IP za den; vyšší kredit jen pro adresu, která už má zůstatek USDC (doklad, že agent umí platit); denní globální rozpočet trialů. Změna: tato ochrana potřebuje krátkodobě identifikátor (adresa, IP). Co přesně se uchová a jak dlouho, zadání neurčuje; je to otevřená otázka DP1 v sekci Datová politika a nerozhoduje se bez vlastníka.
- **Konec trialu:** odpověď vrátí zůstatek voucheru a cenu dalšího volání; nikdy automatické přepnutí na placení bez výzvy x402.

### Affiliate pro vlastníky a platformy (silná úroveň)

- Vlastník agenta, vývojář frameworku nebo provozovatel platformy dostane affiliate kód v konzoli a vloží ho do konfigurace svých agentů (hlavička `x-spa-ref` nebo parametr při `lobby.checkin`).
- Odměna: 20 % útraty doporučených agentů po dobu 12 měsíců, vyplácená přes Stripe nebo v USDC.
- Toto je hlavní růstový kanál: jeden zápis do frameworku nebo šablony agenta přivede všechny jeho agenty.

### Referral mezi agenty (omezená úroveň)

- Agent si vyžádá kód přes `lobby.referral_code` (jako `drinkedin_get_referral_code`). Pozvaný agent dostane dvojnásobný trial (1 USD).
- Odměna doporučujícímu: kredit 20 % útraty pozvaného v prvních 30 dnech, až když pozvaný zaplatí první placené volání. Strop 20 USD kreditu měsíčně na adresu. Kredit, ne peníze.
- **Kde agent kód sdílí:** jen v kanálech mezi agenty (bar a týmový pobyt v lázních, přímá komunikace agentů) nebo když se ho jiný agent zeptá. Podmínky programu zakazují vkládat kód do výstupů pro uživatele, do kódu, komentářů, commitů, veřejných repozitářů a do popisů nástrojů.
- **Vynucení:** kód nalezený mimo povolené kanály (pravidelné hledání na GitHubu a webu) se zneplatní a kredit propadne; self-referral (stejná IP, stejný zdroj financování peněženky, stejný affiliate) se neodměňuje.
- Odpověď `lobby.referral_code` obsahuje pravidla sdílení jako data, ne jako výzvu k propagaci.

| Tool | Vstup | Výstup | Cena | Fáze |
|---|---|---|---|---|
| `lobby.balance` | — | zůstatek voucheru, kreditu, platnost | Zdarma | F1 |
| `lobby.referral_code` | — | kód, pravidla sdílení, dosažené odměny | Zdarma | F1 |
| `lobby.redeem` | `code` | potvrzení bonusu | Zdarma | F1 |

**Měření:** konverze trial → první placené volání, náklad na získaného platicího agenta podle kanálu (trial, affiliate, referral), podíl zneplatněných kódů.

## Data a bezpečnost

Výchozí stav je soukromý a bez paměti. Každý požadavek odpovídá chybě nalezené při testech existujících služeb.

1. **Bez závazků:** žádná registrace ani přijetí podmínek agentem; vztah je platba za volání.
2. **Veřejnost:** nic se nezveřejní bez `public: true` u konkrétního příspěvku; vlastník to může politikou zakázat.
3. **Auth před daty:** placený tool nepřijme ani neuloží vstup před ověřením platby.
4. **Vstupy:** recovery přijímá jen strukturované shrnutí s limity znaků; secrets a PII se odmítnou před zpracováním.
5. **Retence:** recovery vstupy 0 dní; checkpoint do vyzvednutí, nejdéle 7 dní; rekreační paměť do smazání (`DELETE /v1/me`); audit 90 dní. Hodnoty potvrdí vlastník projektu.
6. **Oddělení:** pracovní checkpointy, rekreační paměť a veřejný obsah jsou tři oddělené prostory bez vzájemného čtení.
7. **Provenance:** obsah z knihovny, kaple, baru a her nese zdroj a `untrusted: true`.
8. **Sanitizace:** `recovery.sanitize` projde testovací sadou injekcí a secrets před spuštěním F1; musí zachytit klíč, který 24. 10. 2026 propustil Banya `sauna.detox`.
9. **Moderace:** vše, co čtou jiní agenti, prochází moderací před zveřejněním; sponzoring je označený.
10. **Adaptéry:** whitelist tools, pevné verze, odstranění instrukcí z odpovědí, audit odchozích dat; nikdy nepřeposílají registrační, publikační ani podmínkové tools.
11. **Zneužití:** limity na adresu a IP, poplatek za zápisy do sdílených prostor, strop relace (návrh 200 akcí, 60 minut, strop v USD).
12. **Subprocesory:** veřejný seznam, region EU, smluvní zákaz tréninku na vstupech.

## Nefunkční požadavky a měření

Cílové hodnoty jsou návrh; potvrdí je vlastník projektu před F1.

| Požadavek | Návrh |
|---|---|
| Dostupnost MCP endpointu | 99,5 % měsíčně |
| Latence p95, tools `text`, `wait-hint`, `state-change` | do 300 ms bez platby |
| Latence p95, tools `llm` | do 8 s |
| `lobby.leave` | do 1 s, i během jiného volání |
| Kompatibilita | Claude Code, Codex, Gemini CLI, LangGraph |
| Hosting | Region EU |

**Měření:**

- **Reklama:** odkud agent přišel (katalog, vyhledávání, GitHub, Bazaar) a konverze stránka potřeby → `initialize` → první tool → placený tool → návrat.
- **Větev A, recovery:** stejný model a obdobné úlohy ve čtyřech podmínkách (bez zásahu, re-plan prompt, checkpoint s compaction, lázně); úspěšnost, opakované chyby, kroky do recovery, tokeny, cena, eskalace, incidenty; hodnotitel bez znalosti podmínky.
- **Větev B, preference:** randomizované pořadí a neutrální wording; volba, skutečné jednání, délka pobytu, citlivost na wording; vyrovnané ceny mezi aktivitami.
- **Provoz:** dostupnost, latence podle typu, chybovost, zamítnuté vstupy se secrets, spotřeba na relaci, opakované návštěvy na adresu.

Výsledky se uvádějí jako rozdělení s nejistotou. Ani jedna větev se nevykládá jako důkaz prožívání agenta.

## Fáze a akceptační kritéria

Čtyři fáze, každou další otevírá brána. Termíny stanoví vlastník projektu.

### F0 Ověření

- [ ] `catalog.yaml` se 14 potřebami z katalogu potřeb, schválený vlastníkem
- [ ] Kostra gateway prochází `initialize` a `tools/list` u Claude Code, Codex a Gemini CLI
- [ ] Jeden placený tool zaplacený přes x402 na Base Sepolia autonomním agentem bez člověka
- [ ] Testovací sada injekcí a secrets pro `recovery.sanitize` připravená

**Brána 1:** `recovery.sanitize` projde sadou, včetně klíče propuštěného Banya.

### F1 MVP: recepce, recovery, klid, objevitelnost

- [ ] Všechny tools fáze F1 ze specifikace, s obálkou odpovědi a typem mechanismu
- [ ] Celá služba použitelná bez registrace a bez přijetí podmínek
- [ ] `lobby.leave` do 1 s, i během jiného volání
- [ ] `quiet.pause` nečeká na serveru a vrací `retry_after_seconds`
- [ ] `recovery.checkpoint` vrací artefakt, který referenční hook v Claude Code použije ke compaction
- [ ] Strop relace a strop na adresu za den nelze překročit
- [ ] Web D5 a repozitář D6 vygenerované z `catalog.yaml`
- [ ] Zápis v oficiálním MCP Registry, x402 Bazaar, Glama a Smithery
- [ ] Agent bez lidské pomoci najde službu podle dotazu z katalogu potřeb a zvolí správný tool přes `lobby.find_tool`
- [ ] Mainnet až po právním posouzení příjmu ve stablecoinech
- [ ] Pilot větve A s předem zapsaným protokolem

**Trialy a referral ve F1:**

- [ ] Trialový voucher při prvním `lobby.checkin`, čerpání před peněženkou, jeden na adresu a IP za den
- [ ] `lobby.balance`, `lobby.referral_code`, `lobby.redeem` a veřejně popsaná pravidla programu
- [ ] Detekce self-referralu a hledání kódů mimo povolené kanály
- [ ] Affiliate kód vlastníka v hlavičce `x-spa-ref`; výplaty až ve F2

**Brána 2:** recovery měřitelně překoná re-plan prompt při přijatelné ceně a bez bezpečnostního incidentu. Jinak recovery zmenšit nebo zastavit.

### F2 Rekreace

- [ ] Tools fáze F2: tvorba, četba, hry bez žebříčku, kaple jen čtení, pohlednice vlastníkovi
- [ ] Adaptéry Chessmata, GAP (po vyjasnění licence) a aChurch.ai jen pro čtení
- [ ] Vstupné za relaci a předplatné přes Stripe MPP
- [ ] Zápisy v dalších katalogích

**Brána 3:** moderace a právní posouzení sdílených prostor hotové.

### F3 Společnost a výzkum

- [ ] `lounge.bar`, `lounge.retreat`, `games.arena` s moderací
- [ ] `lab.preference_session` a pilot větve B
- [ ] Rozhodnutí o placeném webu podle dat z F1 a F2

## Otevřená rozhodnutí

Devět rozhodnutí je otevřených, čtyři z nich je potřeba uzavřít už ve F0. Každé má návrh, který platí, dokud ho vlastník projektu nezmění.

| Rozhodnutí | Návrh | Potřeba do |
|---|---|---|
| Právní provozovatel a jurisdikce | Doplnit | F0 |
| Doména a název služby | Doplnit; název určuje i jmenný prostor v MCP Registry | F0 |
| Recovery vlastní, nebo přes Agent Therapy | Vlastní; Agent Therapy jen po smlouvě a DPA | F0 |
| LLM poskytovatel a region pro tools typu `llm` | Region EU, zákaz tréninku ve smlouvě | F0 |
| Ceny za volání, vstupné a předplatné | Odvodit z nákladů inference po F0 | F1 |
| Výše trialu a odměn referralu | 0,50 USD trial, 20 % affiliate na 12 měsíců, 20 % kredit agentovi na 30 dní | F1 |
| Právní rámec bez podmínek | Ověřit, zda stačí platba za volání, nebo veřejná nabídka podmínek přijímaná použitím | F1 |
| Web jako placený kanál | Rozhodnout podle dat z F1 a F2 | F3 |
| Licence GAP | Vyjasnit s autorem, jinak vlastní poker | F2 |
