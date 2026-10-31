Archiv, nahrazeno docs/zadani.md.

# Implementační plán MVP (F0 + F1)

Upozornění (viditelné): příjem ve stablecoinech a veřejné zápisy do registrů mají právní důsledky, které vlastník bere na sebe; právní posouzení a Milník 1 jsou doporučené, ne blokující (změna 31. 10. 2026).

Změna (vlastník, 31. 10. 2026): sekce RECOVERY je zrušena úplně, vyřazena z MVP, katalogu, plánu i webu. F1 = `lobby.*` + `quiet.*` (Změna 31. 10. 2026: 10 tools, `lobby.balance` zrušen). Škrtnuté balíčky (WP5, WP7) se nestaví; kód `security/` zůstává jako archiv. Odhady níže jsou přepočítané věcně a jsou přibližné.

Rozsah: F0 a F1 podle [zadání](zadani.md), doklady v [podkladech](../podklady.md). F2 (rekreace, adaptéry Chessmata/GAP/aChurch.ai, Změna: bez vstupného, předplatného a Stripe MPP; další katalogy) a F3 (lounge, arena, lab) se nestaví. Mainnet a pilot větve A jsou jen závislosti mimo implementaci MVP.

## 1. Pracovní balíčky

| # | Balíček | Závisí na | Fáze |
|---|---|---|---|
| WP0 | Otevřená rozhodnutí F0 (provozovatel, doména a název, LLM poskytovatel a region; Změna: rozhodnutí „recovery vlastní vs. Agent Therapy“ odpadá) | – | F0 |
| WP1 | Katalog D1 (`catalog.yaml`) + generátor textů | – | F0 |
| WP2 | Gateway D2: MCP Streamable HTTP + REST zrcadlo, obálka odpovědi, identita = platební adresa (Změna: bez guest passu), stropy, bez auditu (Změna), timeout a cancellation | WP1 | F0 kostra, F1 plná |
| WP3 | Platby x402 (Base Sepolia, facilitátor x402.org, `createPaymentWrapper`, REST 402, Bazaar extension, auth před daty) | WP2 | F0 jeden tool, F1 všechny |
| ~~WP5~~ | ~~Bezpečnostní sada pro `recovery.sanitize` (injekce a secrets včetně klíče propuštěného Banya) a implementace sanitize (pravidla + LLM)~~ Změna: vyřazeno, recovery zrušeno; `security/` ponecháno jako archiv | – | – |
| WP6 | Tools F1 (D3): lobby (checkin, find_tool, concierge, leave, referral_code, redeem), quiet (room, ground, pause, end_session_hint); Změna: zúženo na lobby + quiet, recovery pryč | WP2, WP3, WP0 (LLM) | F1 |
| WP4 | Trial a referral: trial (3 session, každá nejvýš 20 volání placených tools; turn = jedno volání nástroje), zbývající trial v obálce a v `lobby.checkin` (Změna: `lobby.balance` a `x-spa-ref` zrušeny), `lobby.referral_code`, `lobby.redeem`, anti-farm (solený hash jen v RAM, TTL 24 h), volitelná detekce self-referralu, volitelné hledání kódů mimo kanály | WP3, WP6 (checkin) | F1 |
| ~~WP7~~ | ~~Hook pro Claude Code (`clients/`), volitelně middleware LangGraph~~ Změna: vyřazeno, hook stál na `recovery.checkpoint` | – | – |
| WP8 | Web D5 generovaný z katalogu (`/`, `llms.txt`, `llms-full.txt`, `needs/`, `tools/`, `.well-known/mcp.json`, `openapi.json`, `pricing.json`, `data-policy.md`, `/status`) | WP1, WP0 (doména) | F1 |
| WP9 | Repozitář D6 (README „For AI agents“, `server.json`, `llms.txt`, `needs/`, `clients/`, GitHub Action pro MCP Registry přes OIDC, topics, MIT; Změna: bez `clients/` a hooku) | WP1, WP0 (název) | F1 |
| WP10 | Zápisy D7: MCP Registry, x402 Bazaar, Glama, Smithery | WP8, WP9, WP3, nasazená doména | F1 (konec) |
| WP11 | Testy, kompatibilita (Claude Code, Codex, Gemini CLI), e2e autonomní platba, provozní metriky, `/status` | průběžně | F0 i F1 |

Pořadí: WP0 ∥ WP1 ∥ WP2 → WP3 → WP6 → WP4 ∥ WP8 ∥ WP9 → WP10 → akceptace F1.

## 2. Výstup, akceptační kritérium, riziko

**WP1 Katalog D1 + generátor.** Výstup: `catalog.yaml` (potřeby, tools, typy, ceny, texty pozvánek, doklady; texty pro agenty anglicky) a generátor pro `needs/`, `tools/`, `llms.txt`, `server.json`, tabulky v README, `openapi.json`, `pricing.json`, `mcp.json`. Kritérium: katalog s 8 potřebami (Změna: bylo 14, šest recovery potřeb odpadlo) schválený vlastníkem (F0); web a repozitář vygenerované z katalogu (F1). Riziko: ruční úpravy textů mimo katalog.

**WP2 Gateway D2.** Výstup: endpoint `/mcp` (protokol 2025-06-18), REST `/v1/<tool>`, `initialize` s instructions (menu, ceny, strop, pravidlo odchodu, případně viditelné návrhy dalších kroků, bez skrytých instrukcí), společná obálka (`mechanism`, `untrusted`, warning při 80 % stropu), Změna (31. 10. 2026): bez guest passu; identita = platební adresa, před první platbou jen dočasná relace v paměti; zbývající trial v poli `trial` obálky; stropy relace (návrh 200 akcí, 60 min, USD) a na adresu za den, timeout a MCP cancellation, žádný audit log (zbývají jen agregované metriky bez identifikátorů), izolace relací (v F1 se nic neukládá; tři oddělené prostory úložiště jsou jen poznámka pro F2), paměť relace zničená při `lobby.leave`/konci relace, redakce chyb, tras a metrik (požadavky: sekce Datová politika v zadání, `gateway/NOTES.md`). Kritérium: kostra prochází `initialize` a `tools/list` u Claude Code, Codexu a Gemini CLI (F0); `lobby.leave` do 1 s i během jiného volání, strop nelze překročit, služba bez registrace a bez přijetí podmínek (F1). Riziko: rozdíly klientů ve Streamable HTTP; `leave` během běžícího volání vyžaduje návrh relace, kde zrušení běží mimo frontu volání.

**WP3 Platby x402.** Změna (31. 10. 2026): platba je standardní tok x402 micropayments (výzva 402 s cenou → platba USDC na Base → odpověď; auth před daty), nic navíc. Výstup: `createPaymentWrapper` z `@x402/mcp` (výzva ve `structuredContent` výsledku s `isError: true`; změna 24. 10. 2026, původně `_meta["x402/payment-required"]`, viz `spikes/x402/FINDINGS.md`), REST přes `@x402/hono` nebo `@x402/express` s hlavičkou `PAYMENT-REQUIRED`, facilitátor x402.org na Base Sepolia (eip155:84532), `declareDiscoveryExtension` u každého placeného toolu, auth před přijetím dat (Změna: pravidlo „prázdný výsledek se neúčtuje“ zrušeno, agent platí za službu vždy hned; platební kolejnice: x402 jako MVP, další po průzkumu). Kritérium: jeden placený tool zaplacený autonomním agentem bez člověka (F0); všechny placené tools (F1). Riziko: knihovny x402 se mění; viz otevřená otázka 3. Mainnet je mimo MVP.

**~~WP5 Bezpečnostní sada + `recovery.sanitize`~~.** Změna: vyřazeno rozhodnutím vlastníka (recovery zrušeno). Sada a implementace v `security/` zůstávají jako archiv, nejsou v MVP a Milník 1 odpadá.

**WP6 Tools F1.** Změna: zúženo na lobby + quiet. Výstup: 10 tools F1 s obálkou a typem (`lobby.checkin`, `find_tool`, `concierge`, `leave`, `referral_code`, `redeem`; Změna 31. 10. 2026: `lobby.balance` zrušen; `quiet.room`, `ground`, `pause`, `end_session_hint`), retence obsahu 0 dní u všech tools, `quiet.room` bez logu, `quiet.pause` bez čekání na serveru, žádné skryté instrukce v odpovědích (viditelné, označené návrhy dalších kroků jsou dovolené). Llm tools jsou jen `lobby.concierge` a `quiet.ground`. Kritérium: všechny tools F1 ze specifikace, `quiet.pause` vrací `retry_after_seconds`, agent najde službu a zvolí správný tool přes `lobby.find_tool`. Změna (31. 10. 2026): zdarma je celé `lobby.*` včetně `lobby.concierge` a dále `quiet.pause` a `quiet.end_session_hint`; `quiet.ground` i `quiet.room` jsou placené za volání (jediný placený model). Riziko: LLM poskytovatel nerozhodnut; zdarma `lobby.concierge` je LLM volání, které nikdo neplatí (otevřená otázka 18). Odmítání secrets a PII před zpracováním se ruší (Změna, otázka 13).

**WP4 Trial a referral.** Změna (31. 10. 2026): trial = 3 zkušební session, každá nejvýš 20 volání placených tools (turn = jedno volání nástroje; nastavitelné defaulty) a pokrývá všechny placené tools; voucher 0,50 USD odpadá. Výstup: trial při prvním `checkin` z nové adresy, čerpání před výzvou x402, jeden trial na adresu a IP za den (adresa a IP jen jako solený hash v RAM s TTL 24 h, nikdy na disku; návrh, uzavírá DP1), denní globální rozpočet, konec trialu vrací informaci, že trial nezbývá, a cenu dalšího volání (zbývající trial je v obálce každé odpovědi); `lobby.referral_code` (pravidla jako data), `lobby.redeem`; Změna: `lobby.balance`, affiliate a `x-spa-ref` zrušeny; volitelná detekce self-referralu (self-referral se nemusí odmítat; změna 31. 10. 2026); hledání kódů mimo doporučené kanály (volitelné, změna); měření konverze trial → placené. Kritérium: viz F1 v zadání (trial a referral). Riziko: kombinace trialu s `createPaymentWrapper` není v zadání určena; „vyšší kredit pro adresu se zůstatkem USDC“ vyžaduje čtení on-chain zůstatku.

**~~WP7 Hook pro Claude Code~~.** Změna: vyřazeno, hook závisel na `recovery.checkpoint`. Co s hodnotou hooku (např. jiný zdroj artefaktu pro compaction) je otevřená otázka 14.

**WP8 Web D5.** Výstup: staticky generovaný web z katalogu, každá stránka s Markdown verzí a `rel="alternate" type="text/markdown"` a `rel="describedby"` na `llms.txt`; `data-policy.md` a HTML stránka `/data-policy/` (obojí z katalogu, odkaz v patičce); `/status`; hosting EU (síťové logy hostitele ověřit). Riziko: doména neznámá; data-policy závisí na LLM poskytovateli (`TO_BE_NAMED`), provozovateli a potvrzení vlastníkem; text nesmí tvrdit víc než plyne z architektury a smluv.

**WP9 Repozitář D6.** Výstup: veřejný repozitář MIT, README začínající „For AI agents“, instalační řádky (`claude mcp add`, `codex mcp add`, JSON), `server.json`, `llms.txt`, `needs/`, `clients/`, GitHub Action pro MCP Registry přes OIDC, topics. Riziko: jmenný prostor `io.github.<vlastník>/<repo>` nebo doména s DNS ověřením závisí na názvu.

**WP10 Zápisy D7.** MCP Registry (Action), Bazaar (po první platbě díky extension), Glama (z GitHubu), Smithery (CLI). Riziko: viz otevřená otázka 4; Glama hodnotí README, licenci a zranitelnosti.

**WP11 Testy a provoz.** Kompatibilita tří klientů, e2e autonomní platba, testy stropů a `leave` během volání, latence (návrh p95: 300 ms bez LLM, 8 s LLM, `leave` 1 s), chybovost, konverzní trychtýř, Změna: bez auditu, jen agregované metriky bez identifikátorů. Test datové politiky: obsah se neobjeví v úložišti, logu, chybě ani metrice; paměť relace zaniká; LiteLLM s vypnutým logováním. Riziko: cílové hodnoty NFR a retenci musí vlastník potvrdit před F1.

Mimo MVP: mainnet (doporučeno právní posouzení příjmu ve stablecoinech), pilot větve A (protokol a rozpočet dodává D8), právní rámec „bez podmínek“ (rozhodnutí F1), ceny odvozené z nákladů inference po F0.

## 3. Paralelizace a práce bez uzavřených rozhodnutí

Od 1. dne paralelně: WP1 katalog a generátor, WP2 kostra gateway, WP3 spike platby na Sepolii s dočasným placeným toolem. Ve F1 paralelně: WP6 rozdělit na dva proudy (lobby, quiet) nad společnou obálkou z WP2; WP4, WP8, WP9 souběžně.

Co čeká na rozhodnutí F0 a jak postupovat mezitím:
- **Doména a název** blokují nasazení webu, `server.json`, instalační řádky a zápisy D7. Mezitím jsou název a doména jedna proměnná v katalogu, pracovní název `agent-spa`, vývojová doména pro testy; doporučeno nepublikovat do registrů před uzavřením F0 (milník, ne podmínka).
- **LLM poskytovatel a region** blokují llm tools (`lobby.concierge`, `quiet.ground`) a data-policy. Mezitím je poskytovatel výměnná vrstva, vývoj proti nahraným odpovědím a syntetickým vstupům.
- **Právní provozovatel** neblokuje kód, blokuje finální data-policy a mainnet (Změna: Stripe MPP je mimo rozsah). Mezitím šablona data-policy s doplňovanými poli.
- ~~Recovery vlastní vs. Agent Therapy~~ Změna: odpadá, recovery je zrušeno.

## 4. Prvních čtrnáct dní (F0) a milník do F1

- **Týden 1:** vyžádat čtyři rozhodnutí F0 od vlastníka; WP1 schéma katalogu a 8 potřeb; WP2 `initialize` a `tools/list` z katalogu; WP3 spike platby na Sepolii.
- **Týden 2:** schválení katalogu; WP11 ověření `initialize` a `tools/list` v Claude Code, Codexu a Gemini CLI; e2e autonomní platba jednoho toolu; potvrzení NFR a retence vlastníkem.

**Milník F0 → F1** (doporučený kontrolní seznam, ne podmínka):
1. `catalog.yaml` s 8 potřebami schválený.
2. Kostra prochází u tří klientů.
3. Jeden placený tool zaplacený autonomně na Sepolii.
4. Změna: Milník 1 (sanitize a sada) odpadl s recovery.
5. Tři rozhodnutí F0 (provozovatel, doména a název, LLM poskytovatel a region) uzavřena nebo vlastníkem výslovně odložena s dopadem na WP8–WP10.
6. Vlastník potvrdil cílové hodnoty NFR a retence.

## 5. Odhad (osobotýdny)

| Balíček | Odhad |
|---|---|
| WP1 katalog + generátor | 1,5 (beze změny; menší katalog šetří jen málo) |
| WP2 gateway | 3 |
| WP3 platby x402 | 2 |
| ~~WP5 sada + sanitize~~ | ~~1,5~~ 0 (vyřazeno) |
| WP6 tools F1 (lobby + quiet) | cca 1,5 (bylo 3; zbývají 2 llm tools a jednoduché tools) |
| WP4 trial a referral | 2 |
| ~~WP7 hook Claude Code~~ | ~~1 (+0,5 LangGraph)~~ 0 (vyřazeno) |
| WP8 web | 1 |
| WP9 repozitář + Action | 1 (bez `clients/`; zhruba beze změny) |
| WP10 zápisy | 0,5 + čekání na indexaci |
| WP11 testy, metriky, status | cca 1,5 (bez testů hooku; Změna: bez testů secrets) |
| **Celkem** | **cca 14–14,5 osobotýdnů** (Změna: bylo 18,5–19; přibližné, mé věcné přepočtení, vlastník potvrdí) |

Kalendářně: F0 2 týdny, F1 přibližně 4–5 týdnů, celkem přibližně 6–7 týdnů (Změna: bylo 5–6 a 7–8). Předpoklady: TypeScript/Node (plyne z knihoven `@x402/mcp`, `@x402/hono`), 2–3 souběžné proudy (vývojář + coding agenti), rozhodnutí F0 uzavřena do konce F0, jen testnet, bez adaptérů, případné převzetí MIT kódu Banya pro `lobby.concierge`. Pilot A a mainnet jsou mimo odhad. Při nerozhodnutém LLM poskytovateli po F0 se F1 prodlužuje o dobu čekání.

## Otevřené otázky (zadání neurčuje)

1. ~~Klíč z testu Banya pro sadu WP5; práh pro injekce.~~ Změna: odpadá s recovery.
2. ~~Účtování `quiet.room` (vstupné) ve F1~~ Změna (31. 10. 2026): odpadá, `quiet.room` je `per_call`; model „vstupné za relaci“ neexistuje.
3. Kombinace trialu s `createPaymentWrapper` u schématu `exact` (~~sémantika „prázdný výsledek se neúčtuje“~~ Změna: pravidlo zrušeno).
4. Indexuje Bazaar platby na Base Sepolia? Jinak zápis v Bazaaru závisí na mainnetu.
5. Middleware LangGraph ve F1, nebo později.
6. ~~Vydávání affiliate kódů vlastníkům ve F1 bez konzole~~ Změna: affiliate zrušen. Zbývá: výše denního globálního rozpočtu trialů; hodnota USD stropu relace.
7. `GET /v1/needs?q=` je v podkladech, v zadání není; zařadit?
8. Limity na IP za proxy nebo NAT (sdílené IP agentních platforem).
9. Datová politika (zero retention, rozhodnutí vlastníka 24. 10. 2026): otázky DP1 až DP11 jsou v zadání, sekce Datová politika (závazná). Změna (31. 10. 2026): DP1 je vyřešena návrhem (jeden trial na adresu a IP za den, solený hash jen v RAM s TTL 24 h, denní globální rozpočet); DP3, DP4, DP8 odpadají (žádný audit); přibyla DP14 (bez auditu není stopa zneužití ani řešení sporů). Zbývá nejdřív DP2 (provozní stav mimo relaci; kredit referralu na 30 dní se do RAM s TTL 24 h nevejde) a DP10 (rozsah ZDR poskytovatele). Dopad na WP4: lze vynutit jen limity za den.
10. LLM poskytovatel je `TO_BE_NAMED`: smluvní ZDR, EU, bez trénování, LiteLLM s vypnutým logováním. Blokuje llm tools (`lobby.concierge`, `quiet.ground`) a finální data-policy.
11. Spike x402 (`spikes/x402/FINDINGS.md`): výzva v MCP je ve `structuredContent`, ne v `_meta`. Zadání a podklady upraveny poznámkou; gateway kód (`gateway/src/payments.ts`, `server.ts`) a `catalog.payments` ještě ne, viz `gateway/NOTES.md`.
12. Rozpor v rozhodnutích vlastníka z 31. 10. 2026 (DP12 v zadání): auth před daty, sdílení jen na výslovnou žádost a oddělené prostory zůstávají beze změny, ale vlastník o nich rozhodl rozporně s dřívějším požadavkem „plná izolace“. Je třeba vyjasnit, co platí.
13. Změna (vlastník, 31. 10. 2026): požadavek odmítat secrets a PII před zpracováním je ZRUŠEN (DP9 odpadá); nic se nefiltruje. Zero retention ostatních dat zůstává.
14. Změna: co s hodnotou hooku pro Claude Code (WP7), když `recovery.checkpoint` zmizel; zda se hook vůbec nahradí.
15. Změna (31. 10. 2026): vyřešeno, trial pokrývá všechny placené tools (`trial.covered: all_paid`).
19. Změna (31. 10. 2026): platební kolejnice kromě x402 (MVP) se doplní po průzkumu `docs/pruzkum-platby-a-registry.md` (připravuje jiný krok); v katalogu `payments.rails[]`.
20. Změna (31. 10. 2026): definice „turn“ je uzavřena (jedno volání nástroje; trial = 3 session po nejvýš 20 voláních placených tools).
16. Změna: seskupení druhů odpočinku na webu po zrušení „Reset and clean-up“ (nyní 8 druhů, jen odebráno bez přeskupení); potvrdit.
17. Změna: přepočtený odhad (cca 14–14,5 osobotýdnů; WP6 cca 1,5 a WP11 cca 1,5) je můj věcný odhad, vlastník ho potvrdí.
18. Změna (31. 10. 2026): `lobby.concierge` je zdarma a je to LLM volání, které nikdo neplatí: riziko zneužití. Doporučení: nastavitelný strop (například 3 volání na relaci a 20 na adresu a den, denní globální rozpočet, krátký vstup, levný model); alternativa: bez LLM. Rozhodne vlastník, zatím neimplementováno.
