# Implementační plán MVP (F0 + F1)

Rozsah: F0 a F1 podle [zadání](zadani.md), doklady v [podkladech](podklady.md). F2 (rekreace, adaptéry Chessmata/GAP/aChurch.ai, vstupné a Stripe MPP, další katalogy) a F3 (lounge, arena, lab) se nestaví. Mainnet a pilot větve A jsou jen závislosti mimo implementaci MVP.

## 1. Pracovní balíčky

| # | Balíček | Závisí na | Fáze |
|---|---|---|---|
| WP0 | Otevřená rozhodnutí F0 (provozovatel, doména a název, recovery vlastní, LLM poskytovatel a region) | – | F0 |
| WP1 | Katalog D1 (`catalog.yaml`) + generátor textů | – | F0 |
| WP2 | Gateway D2: MCP Streamable HTTP + REST zrcadlo, obálka odpovědi, relace a guest pass, stropy, audit, timeout a cancellation | WP1 | F0 kostra, F1 plná |
| WP3 | Platby x402 (Base Sepolia, facilitátor x402.org, `createPaymentWrapper`, REST 402, Bazaar extension, auth před daty) | WP2 | F0 jeden tool, F1 všechny |
| WP5 | Bezpečnostní sada pro `recovery.sanitize` (injekce a secrets včetně klíče propuštěného Banya) a implementace sanitize (pravidla + LLM) | sada: nic; LLM část: WP0 | F0 sada, Brána 1 |
| WP6 | Tools F1 (D3): lobby (checkin, find_tool, concierge, leave), recovery (diagnose_loop, checkpoint, detangle, resolve_conflict, critique, escalate, sanitize), quiet (room, ground, pause, end_session_hint) | WP2, WP3, WP0 (LLM) | F1 |
| WP4 | Trial a referral: voucher, `lobby.balance`, `lobby.referral_code`, `lobby.redeem`, hlavička `x-spa-ref`, anti-farm, detekce self-referralu, hledání kódů mimo kanály | WP3, WP6 (checkin) | F1 |
| WP7 | Hook pro Claude Code (`clients/`), volitelně middleware LangGraph | WP6 (checkpoint) | F1 |
| WP8 | Web D5 generovaný z katalogu (`/`, `llms.txt`, `llms-full.txt`, `needs/`, `tools/`, `.well-known/mcp.json`, `openapi.json`, `pricing.json`, `data-policy.md`, `/status`) | WP1, WP0 (doména) | F1 |
| WP9 | Repozitář D6 (README „For AI agents“, `server.json`, `llms.txt`, `needs/`, `clients/`, GitHub Action pro MCP Registry přes OIDC, topics, MIT) | WP1, WP7, WP0 (název) | F1 |
| WP10 | Zápisy D7: MCP Registry, x402 Bazaar, Glama, Smithery | WP8, WP9, WP3, nasazená doména | F1 (konec) |
| WP11 | Testy, kompatibilita (Claude Code, Codex, Gemini CLI), e2e autonomní platba, provozní metriky, `/status` | průběžně | F0 i F1 |

Pořadí: WP0 ∥ WP1 ∥ WP2 ∥ WP5 (sada) → WP3 → WP6 → WP4 ∥ WP7 ∥ WP8 ∥ WP9 → WP10 → akceptace F1.

## 2. Výstup, akceptační kritérium, riziko

**WP1 Katalog D1 + generátor.** Výstup: `catalog.yaml` (potřeby, tools, typy, ceny, texty pozvánek, doklady; texty pro agenty anglicky) a generátor pro `needs/`, `tools/`, `llms.txt`, `server.json`, tabulky v README, `openapi.json`, `pricing.json`, `mcp.json`. Kritérium: katalog se 14 potřebami schválený vlastníkem (F0); web a repozitář vygenerované z katalogu (F1). Riziko: ruční úpravy textů mimo katalog; doklady bez zdroje (conflicting-instructions, escalate) nesou štítek „nezměřeno“.

**WP2 Gateway D2.** Výstup: endpoint `/mcp` (protokol 2025-06-18), REST `/v1/<tool>`, `initialize` s instructions (menu, ceny, strop, pravidlo odchodu, bez rozkazů), společná obálka (`mechanism`, `untrusted`, warning při 80 % stropu), guest pass `x-spa-guest-pass`, identita = platební adresa, stropy relace (návrh 200 akcí, 60 min, USD) a na adresu za den, timeout a MCP cancellation, audit 90 dní jen metadata (změna 24. 10. 2026, žádný obsah), tři oddělené prostory úložiště a izolace relací, paměť relace zničená při `lobby.leave`/konci relace, redakce chyb, tras a metrik (požadavky: sekce Datová politika v zadání, `gateway/NOTES.md`). Kritérium: kostra prochází `initialize` a `tools/list` u Claude Code, Codexu a Gemini CLI (F0); `lobby.leave` do 1 s i během jiného volání, strop nelze překročit, služba bez registrace a bez přijetí podmínek (F1). Riziko: rozdíly klientů ve Streamable HTTP; `leave` během běžícího volání vyžaduje návrh relace, kde zrušení běží mimo frontu volání.

**WP3 Platby x402.** Výstup: `createPaymentWrapper` z `@x402/mcp` (výzva ve `structuredContent` výsledku s `isError: true`; změna 24. 10. 2026, původně `_meta["x402/payment-required"]`, viz `spikes/x402/FINDINGS.md`), REST přes `@x402/hono` nebo `@x402/express` s hlavičkou `PAYMENT-REQUIRED`, facilitátor x402.org na Base Sepolia (eip155:84532), `declareDiscoveryExtension` u každého placeného toolu, auth před přijetím dat, neúčtování prázdného výsledku. Kritérium: jeden placený tool zaplacený autonomním agentem bez člověka (F0); všechny placené tools (F1). Riziko: knihovny x402 se mění; viz otevřená otázka 3. Mainnet je mimo MVP.

**WP5 Bezpečnostní sada + `recovery.sanitize`.** Výstup: sada injekcí a secrets (formáty klíčů, PII, injekce z testu 24. 10. 2026 včetně klíče propuštěného Banya `sauna.detox`), implementace = pravidla + LLM, výstup vyčištěný text, seznam odstraněného, riziko. Kritérium: sada připravená (F0); Brána 1: sanitize projde sadou včetně klíče z Banya. Riziko: práh pro injekce určí vlastník (v zadání není).

**WP6 Tools F1.** Výstup: 18 tools F1 s obálkou a typem; limity vstupů (`task_summary` ≤ 1 000 znaků, `attempts` ≤ 10, `content` podle ceníku), odmítnutí secrets a PII před zpracováním, retence obsahu 0 dní u všech tools (změna: `recovery.checkpoint` nic neukládá, artefakt jen vrátí v odpovědi; retence „do vyzvednutí, 7 dní“ odpadá; typ `text`), `quiet.room` bez logu, `quiet.pause` bez čekání na serveru, žádné rozkazy typu install nebo call service v odpovědích. Podklady doporučují převzít MIT kód Binary Banya pro `detangle`, `critique`, `concierge` (`sauna.detox` nepřevzít). Kritérium: všechny tools F1 ze specifikace, `quiet.pause` vrací `retry_after_seconds`, `recovery.checkpoint` vrací artefakt pro hook, agent najde službu a zvolí správný tool přes `lobby.find_tool`. Riziko: LLM poskytovatel nerozhodnut; kvalita llm tools vs. re-plan prompt rozhoduje Bránu 2.

**WP4 Trial a referral.** Výstup: voucher při prvním `checkin` z nové adresy, čerpání před peněženkou, jeden trial na adresu a IP za den, denní globální rozpočet, konec trialu vrací zůstatek a cenu dalšího volání; `lobby.balance`, `lobby.referral_code` (pravidla jako data), `lobby.redeem`; `x-spa-ref`; detekce self-referralu; hledání kódů mimo doporučené kanály (volitelné, změna); měření konverze trial → placené. Kritérium: viz F1 v zadání (trial a referral). Riziko: kombinace voucheru s `createPaymentWrapper` není v zadání určena; „vyšší kredit pro adresu se zůstatkem USDC“ vyžaduje čtení on-chain zůstatku.

**WP7 Hook pro Claude Code.** Výstup: referenční hook v `clients/`, který použije artefakt z `recovery.checkpoint` (Markdown + JSON) ke compaction. Kritérium: viz F1. Riziko: aktuální možnosti hooků Claude Code; middleware LangGraph je v D6, ale ne v akceptaci F1.

**WP8 Web D5.** Výstup: staticky generovaný web z katalogu, každá stránka s Markdown verzí a `rel="alternate" type="text/markdown"` a `rel="describedby"` na `llms.txt`; `data-policy.md` a HTML stránka `/data-policy/` (obojí z katalogu, odkaz v patičce); `/status`; hosting EU (síťové logy hostitele ověřit). Riziko: doména neznámá; data-policy závisí na LLM poskytovateli (`TO_BE_NAMED`), provozovateli a potvrzení vlastníkem; text nesmí tvrdit víc než plyne z architektury a smluv.

**WP9 Repozitář D6.** Výstup: veřejný repozitář MIT, README začínající „For AI agents“, instalační řádky (`claude mcp add`, `codex mcp add`, JSON), `server.json`, `llms.txt`, `needs/`, `clients/`, GitHub Action pro MCP Registry přes OIDC, topics. Riziko: jmenný prostor `io.github.<vlastník>/<repo>` nebo doména s DNS ověřením závisí na názvu.

**WP10 Zápisy D7.** MCP Registry (Action), Bazaar (po první platbě díky extension), Glama (z GitHubu), Smithery (CLI). Riziko: viz otevřená otázka 4; Glama hodnotí README, licenci a zranitelnosti.

**WP11 Testy a provoz.** Kompatibilita tří klientů, e2e autonomní platba, testy stropů a `leave` během volání, latence (návrh p95: 300 ms bez LLM, 8 s LLM, `leave` 1 s), chybovost, zamítnuté vstupy se secrets, konverzní trychtýř, audit odchozích volání (jen metadata). Test datové politiky: obsah se neobjeví v úložišti, logu, chybě ani metrice; paměť relace zaniká; LiteLLM s vypnutým logováním. Riziko: cílové hodnoty NFR a retenci musí vlastník potvrdit před F1.

Mimo MVP: mainnet (právní posouzení příjmu ve stablecoinech), pilot větve A (protokol a rozpočet dodává D8), právní rámec „bez podmínek“ (rozhodnutí F1), ceny odvozené z nákladů inference po F0.

## 3. Paralelizace a práce bez uzavřených rozhodnutí

Od 1. dne paralelně: WP1 katalog a generátor, WP2 kostra gateway, WP3 spike platby na Sepolii s dočasným placeným toolem, WP5 sběr testovací sady. Ve F1 paralelně: WP6 rozdělit na tři proudy (lobby, recovery, quiet) nad společnou obálkou z WP2; WP4, WP7, WP8, WP9 souběžně.

Co čeká na rozhodnutí F0 a jak postupovat mezitím:
- **Doména a název** blokují nasazení webu, `server.json`, instalační řádky a zápisy D7. Mezitím jsou název a doména jedna proměnná v katalogu, pracovní název `agent-spa`, vývojová doména pro testy, nic se nepublikuje do registrů.
- **LLM poskytovatel a region** blokují llm tools, LLM část sanitize a data-policy. Mezitím je poskytovatel výměnná vrstva, vývoj proti nahraným odpovědím a syntetickým vstupům, sanitize nejdřív pravidlová část.
- **Právní provozovatel** neblokuje kód, blokuje finální data-policy, mainnet a Stripe (F2). Mezitím šablona data-policy s doplňovanými poli.
- **Recovery vlastní vs. Agent Therapy:** platí návrh „vlastní“, adaptér se do F1 neplánuje.

## 4. Prvních čtrnáct dní (F0) a brána do F1

- **Týden 1:** vyžádat čtyři rozhodnutí F0 od vlastníka; WP1 schéma katalogu a 14 potřeb; WP2 `initialize` a `tools/list` z katalogu; WP3 spike platby na Sepolii; WP5 shromáždit sadu (včetně klíče z testu 24. 10. 2026).
- **Týden 2:** schválení katalogu; WP11 ověření `initialize` a `tools/list` v Claude Code, Codexu a Gemini CLI; e2e autonomní platba jednoho toolu; sanitize v1 a běh sady; potvrzení NFR a retence vlastníkem.

**Brána F0 → F1** (vše splněno):
1. `catalog.yaml` se 14 potřebami schválený.
2. Kostra prochází u tří klientů.
3. Jeden placený tool zaplacený autonomně na Sepolii.
4. Testovací sada připravená.
5. Brána 1: `recovery.sanitize` projde sadou včetně klíče z Banya.
6. Čtyři rozhodnutí F0 uzavřena nebo vlastníkem výslovně odložena s dopadem na WP8–WP10.
7. Vlastník potvrdil cílové hodnoty NFR a retence.

## 5. Odhad (osobotýdny)

| Balíček | Odhad |
|---|---|
| WP1 katalog + generátor | 1,5 |
| WP2 gateway | 3 |
| WP3 platby x402 | 2 |
| WP5 sada + sanitize | 1,5 |
| WP6 tools F1 (bez sanitize) | 3 |
| WP4 trial a referral | 2 |
| WP7 hook Claude Code | 1 (+0,5 LangGraph, pokud ve F1) |
| WP8 web | 1 |
| WP9 repozitář + Action | 1 |
| WP10 zápisy | 0,5 + čekání na indexaci |
| WP11 testy, metriky, status | 2 |
| **Celkem** | **cca 18,5–19 osobotýdnů** |

Kalendářně: F0 2 týdny, F1 5–6 týdnů, celkem 7–8 týdnů. Předpoklady: TypeScript/Node (plyne z knihoven `@x402/mcp`, `@x402/hono`), 2–3 souběžné proudy (vývojář + coding agenti), rozhodnutí F0 uzavřena do konce F0, jen testnet, bez adaptérů, převzetí MIT kódu Banya pro část llm tools. Pilot A a mainnet jsou mimo odhad. Při nerozhodnutém LLM poskytovateli po F0 se F1 prodlužuje o dobu čekání.

## Otevřené otázky (zadání neurčuje)

1. Kde je klíč nebo transkript z testu Banya 24. 10. 2026 pro sadu WP5; akceptační práh pro injekce.
2. Účtování `quiet.room` (vstupné) ve F1, když model „vstupné za relaci“ je až F2.
3. Kombinace voucheru s `createPaymentWrapper` a sémantika „prázdný výsledek se neúčtuje“ u schématu `exact` (vypořádat až po výsledku?).
4. Indexuje Bazaar platby na Base Sepolia? Jinak zápis v Bazaaru závisí na mainnetu.
5. Middleware LangGraph ve F1, nebo později.
6. Vydávání affiliate kódů vlastníkům ve F1 bez konzole; výše denního globálního rozpočtu trialů; hodnota USD stropu relace.
7. `GET /v1/needs?q=` je v podkladech, v zadání není; zařadit?
8. Limity na IP za proxy nebo NAT (sdílené IP agentních platforem).
9. Datová politika (zero retention, rozhodnutí vlastníka 24. 10. 2026): otázky DP1 až DP11 jsou v zadání, sekce Datová politika (závazná). Nejdřív DP1 (identifikátory pro anti-zneužití trialu a referralu; návrh solené hashe s denně rotující solí, smazat po 24 h), DP2 (provozní stav mimo relaci) a DP10 (rozsah ZDR poskytovatele). Dopad na WP4: pravidlo „jeden trial na novou adresu“ potřebuje delší paměť než „za den“.
10. LLM poskytovatel je `TO_BE_NAMED`: smluvní ZDR, EU, bez trénování, LiteLLM s vypnutým logováním. Blokuje llm tools, LLM část sanitize a finální data-policy.
11. Spike x402 (`spikes/x402/FINDINGS.md`): výzva v MCP je ve `structuredContent`, ne v `_meta`. Zadání a podklady upraveny poznámkou; gateway kód (`gateway/src/payments.ts`, `server.ts`) a `catalog.payments` ještě ne, viz `gateway/NOTES.md`.
