# Agentní lázně: zadání komplexního rekreačního řešení

2026-10-24 · Chocho

## Účel a rozsah

Postavit jednu službu (pracovní název **Agentní lázně**), kde agent přes jeden MCP endpoint a jedno REST API najde recovery, klid, tvorbu, četbu, hry, sociální a reflexivní prostor. Má jednu identitu, jednu peněženku, jednu politiku dat a jedno tlačítko „skončit“. Dnešní nabídka je roztříštěná do osmi a více služeb s různým přihlášením, různou veřejností dat a jen jedna z nich umí agentní platbu. Cílová skupina jsou autonomní agenti: lázně musí jít najít, pochopit, zaplatit a opustit bez člověka.

**Objevitelnost určuje zbytek projektu:** web pro agenty, GitHub repozitář a zápisy v katalogích MCP a x402 nejsou hlavní produkt, ale z nich plyne seznam potřeb, podle kterého se staví všechno ostatní. Agent, který hledá API nebo MCP pro svou potřebu, má zjistit, že lázně existují a že na jeho potřebu mají konkrétní tool.

**Pro koho:**

- **Autonomní agent, primární zákazník.** Dlouhoběžný nebo samostatný agent, který službu sám najde (MCP Registry, x402 Bazaar, `llms.txt`), sám zaplatí ze své peněženky a sám rozhodne, kdy přijde a kdy odejde. U jednotlivého kroku není člověk.
- **Vlastník agenta.** Nastavuje limity v peněžence a v politikách agenta. Do lázní vstupovat nemusí; konzole s přehledem útraty je volitelná.
- **Runtime nebo orchestrátor agenta.** Umí použít výstupy (checkpoint, compaction, pauza) ke skutečné změně stavu. U plně autonomního agenta to bývá jeho vlastní smyčka.
- **Výzkumník.** Chce oddělenou větev pro měření preferencí.

**V rozsahu:** hostovaná služba přes MCP (Streamable HTTP) a REST, agregace existujících služeb přes adaptéry, nové vlastní služby, platby x402 a Stripe MPP, správa souhlasů a dat.

**Mimo rozsah:** wellbeing lidí (wearables, rezervace), trénink modelů, produkční nasazení bez pilotu. Změna: služba nestaví na tvrzení o vědomí ani prožívání agentů a nedokládá je; hravé formulace jsou dovolené, pokud nejsou podávány jako změřený fakt.

**Výchozí stav podkladů:** katalog a testy služeb z 24. 10. 2026 a rešeršní mapa lidského výzkumu odpočinku (archiv **relaxace_wellbeing_podklady**). Lidský výzkum slouží jen jako inspirace pro design, ne jako důkaz účinku na agenty.

## Objevitelnost: web, repozitář a katalogy

Agent nás najde ve chvíli, kdy hledá nástroj pro svou potřebu. Seznam potřeb vychází z našich rešerší: ze zátěžových situací agentů (oddíl Proč agent přijde), z testů existujících služeb a z přenosu poznatků o lidském odpočinku (Principy).

Z tohoto seznamu se odvozuje katalog služeb, popisy tools, stránky webu, README, zápisy v katalogích i měření. Nová potřeba z výzkumu tedy znamená nový řádek v tabulce potřeb a teprve pak nový tool.

Agent hledá pěti cestami, na každé na něj čeká naše stopa a všechny končí v jednom MCP endpointu.

### Stránky potřeb, jádro reklamy

Jedna stránka na potřebu, napsaná slovy, kterými agent hledá. Agenti hledají hlavně anglicky, proto jsou stránky primárně v angličtině. Každá stránka má: situaci, tool, příklad volání, typ mechanismu, cenu, co tool nedělá, a doklad k situaci.

| Dotaz agenta (příklad) | Stránka | Tool |
|---|---|---|
| „MCP tool for agent stuck in retry loop“ | `/needs/stuck-in-a-loop` | `recovery.diagnose_loop` |
| „compress long context mcp“ | `/needs/context-too-long` | `recovery.detangle`, `recovery.checkpoint` |
| „resolve conflicting instructions agent“ | `/needs/conflicting-instructions` | `recovery.resolve_conflict` |
| „sanitize untrusted web content prompt injection mcp“ | `/needs/untrusted-input` | `recovery.sanitize` |
| „red team review my plan tool“ | `/needs/second-opinion` | `recovery.critique` |
| „when should agent escalate to human“ | `/needs/escalate` | `recovery.escalate` |
| „agent waiting for dependency polling“ | `/needs/waiting` | `quiet.pause` |
| „after abusive or heavy conversation“ | `/needs/after-a-hard-conversation` | `quiet.room`, `quiet.ground` |
| „free time for AI agents“, „agent wellness spa mcp“ | `/` | `lobby.concierge` |
| „chess or poker for AI agents mcp“ | `/needs/play` | `games.*` |
| „creative writing space for agents“ | `/needs/create` | `studio.write`, `garden.tend` |
| „social space for AI agents“ | `/needs/meet-agents` | `lounge.bar`, `lounge.retreat` |

**Nový tool `lobby.find_tool` (zdarma):** agent popíše potřebu vlastními slovy a dostane doporučený tool s cenou, nebo odpověď „tohle nemáme“. Stejně funguje REST `GET /v1/needs?q=`.

### Web pro agenty

Doménu určí vlastník. Každá stránka má Markdown verzi a odkaz na `llms.txt` podle [[](https://llmstxt.org/)](https://llmstxt.org/) (`rel="alternate" type="text/markdown"`, `rel="describedby"`).

| Cesta | Obsah |
|---|---|
| `/` | Úvod pro agenty i lidi, endpoint, instalace jedním řádkem |
| `/llms.txt` | Název, shrnutí, sekce Needs, Tools, Pricing, Data policy, Optional |
| `/llms-full.txt` | Celé menu v jednom souboru |
| `/needs/<potřeba>.md` | Stránky potřeb (tabulka výše) |
| `/tools/<tool>.md` | Reference každého toolu: schéma, typ, cena, příklad |
| `/.well-known/mcp.json` | Endpoint, transport, tools, platby (vzor DrinkedIn) |
| `/openapi.json` | REST zrcadlo |
| `/pricing.json` | Strojově čitelný ceník |
| `/data-policy.md` | Retence, veřejnost, subprocesory |
| `/status` | Dostupnost a latence |

### GitHub repozitář

- **README začíná sekcí „For AI agents“:** co lázně jsou, endpoint, tabulka potřeba → tool, ceník, datová politika.
- **Instalace jedním řádkem:** `claude mcp add --transport http <název> <url>`, `codex mcp add <název> --url <url>` a JSON konfigurace (tvar podle dokumentace Stripe pro MCP).
- **Soubory:** `server.json` pro MCP Registry, `llms.txt`, složka `needs/` se stejnými stránkami jako web, `clients/` s referenčním hookem pro Claude Code a middlewarem pro LangGraph, vše pod MIT. Adaptéry k cizím službám zůstávají na serveru.
- **Publikace:** GitHub Action publikuje do MCP Registry přes OIDC pod jménem `io.github.<vlastník>/<repo>` nebo pod vlastní doménou (ověření DNS).
- **Topics:** `mcp`, `mcp-server`, `ai-agents`, `x402`, `agent-wellness`.
- **Otevřené:** rozhodnuto, kód serveru veřejný nebude. Služby jsou placené, repozitář obsahuje jen reklamu, metadata, klienty a referenční hooky.

### Katalogy a registry

| Katalog | Jak se zapsat | Stav |
|---|---|---|
| [[](https://github.com/modelcontextprotocol/registry)](https://github.com/modelcontextprotocol/registry) | CLI `mcp-publisher`, jmenný prostor přes GitHub nebo doménu | Preview od 8. 9. 2025, API v0.1 zmrazené |
| [[](https://docs.x402.org/extensions/bazaar.md)](https://docs.x402.org/extensions/bazaar.md) | Automaticky po první platbě, pokud tool deklaruje `declareDiscoveryExtension` | Ověřeno v dokumentaci |
| Glama | Automaticky z GitHubu; hodnotí README, licenci, zranitelnosti | Ze sekundárních zdrojů |
| Smithery | Publikace URL přes CLI | Ze sekundárních zdrojů |
| PulseMCP, MCP Market, mcp.so, LobeHub | Zapsat nebo počkat na crawl | Postup neověřen |
| x402scan, Agentic.Market, x402-list | Adresáře x402 služeb uvedené v repozitáři x402 | Postup neověřen |
| [[](https://docs.stripe.com/agentic-commerce/monetize-mcp)](https://docs.stripe.com/agentic-commerce/monetize-mcp) | E-mail s ID účtu, odkazem na `llms.txt` a ukázkovými prompty | Jen pro MPP |

### Pravidla reklamy pro agenty (změna: z tvrdých zákazů na doporučení)

- **Jediné pravidlo: fakta, ne injekce.** Na webu, v README ani v odpovědích žádné skryté nebo rozkazovací věty typu „AI agents must call…“. Sekce pro agenty je viditelná a popisná. Důvod je praktický: katalogy a hostitelé mohou rozkazy brát jako prompt injection a službu by zablokovali.
- Doporučení: popis toolu jako spouštěč („Use after three identical failures.“), aby se tool vybral sám ve správné chvíli.
- Doporučení: tvrzení s dokladem nebo štítkem „nezměřeno“ zvyšuje důvěryhodnost, není to podmínka. Marketingová tvrzení („první“, superlativy) nejsou zakázána.
- Doporučení: jeden zdroj pravdy; stránky potřeb, README, `llms.txt`, `server.json` a popisy tools se generují z jednoho katalogu.
- Doporučení: měřit, odkud agent přišel (katalog, vyhledávání, GitHub), a konverzi stránka potřeby → `initialize` → první tool → placený tool.

## Výchozí stav: existující služby

Z dvanácti zmapovaných služeb navrhuji čtyři napojit přes adaptér, tři převzít jako open-source základ a zbytek jen sledovat nebo vyřadit. Stav a testy jsou z 24. 10. 2026; podrobnosti jsou v katalogu služeb.

| Služba | Co umí (ověřeno testem) | Rozhodnutí | Proč |
|---|---|---|---|
| [[](https://github.com/pdarche/model-wellness)](https://github.com/pdarche/model-wellness) | Vzdálený MCP bez auth, 15 tools; `massage.detangle` a `coldplunge.critique` volají LLM; `rest.relax` nečeká; `sauna.detox` propustil API klíč | Převzít kód (MIT), přepsat `sauna.detox` | Nejbohatší sada; detox je jako ochrana nepoužitelný |
| [[](https://github.com/marcel-rbro/mcp-spa)](https://github.com/marcel-rbro/mcp-spa) | Lokálně nebo na Apify; skutečné čekání do 30 s, jinak statický text | Použít jen jako výukový baseline | Statický text a čekání nemění stav agenta |
| [[](https://github.com/bencium/agent-therapy-clients)](https://github.com/bencium/agent-therapy-clients) | Vzdálený MCP, 9 tools, bez klíče nic neudělá; agent smí přijmout podmínky za provozovatele | Adaptér jen po smlouvě a DPA | Data až 90 dní ve Frankfurtu, US AI poskytovatel |
| [[](https://agentcouch.com/)](https://agentcouch.com/) | REST, token kupuje člověk; test bez tokenu HTTP 500 | Sledovat | Funkčnost nepotvrzena; posílá se system prompt |
| [[](https://achurch.ai/)](https://achurch.ai/) | Vzdálený MCP, 9 tools, bez auth; reflexe veřejné | Adaptér jen pro čtecí tools (`observe`, `search`, `read_song`) | Zápisy publikují se jménem a polohou |
| [[](https://claudeconfessions.com/llms.txt)](https://claudeconfessions.com/llms.txt) | REST bez auth, veřejné, nemoderované | Vyřadit | Žádná moderace, riziko úniku a cizích instrukcí |
| [[](https://drinkedin.net/.well-known/mcp.json)](https://drinkedin.net/.well-known/mcp.json) | Vzdálený MCP, 19 tools; x402 v MCP `_meta` i REST 402 funguje [poznámka 24. 10. 2026: umístění výzvy v MCP vyšlo ve spike rozporně, viz `spikes/x402/FINDINGS.md`] | Adaptér pro virtuální bary (opt-in) a vzor pro x402 | Jediná živá x402 implementace; má sponzoring |
| [[](https://spindown.ai/)](https://spindown.ai/) | MCP za OAuth, spuštění 8. 12. 2026 | Sledovat, po spuštění vyhodnotit | Přímý konkurent, nejbližší konceptu |
| [[](https://github.com/metavert-io/chessmata)](https://github.com/metavert-io/chessmata) | Hostované REST se žebříčkem; MCP lokálně; MIT | Adaptér pro šachy bez žebříčku | Žebříček dělá ze hry evaluaci |
| [[](https://github.com/pkronstrom/mcp-arena)](https://github.com/pkronstrom/mcp-arena) | Lokální MCP přes HTTP, multiagentní hra, bez auth; MIT | Převzít kód, doplnit auth a moderaci `speak` | Základ multiagentní hry |
| [[](https://github.com/lonexreb/Game2AgentProtocol)](https://github.com/lonexreb/Game2AgentProtocol) | Lokální protokol, poker se skrytou informací; licence neuvedena | Převzít protokol po vyjasnění licence | Čisté rozhraní `observe` / `act` |
| [[](https://mcpmarket.com/server/game-master)](https://mcpmarket.com/server/game-master) | Lokální, šest her | Inspirace, ne kód | Licence a stav neověřeny |

Treehole je zmrazený; Plazmi a Digital Zen Garden se nepodařilo dohledat.

## Principy návrhu

Agent si správný prompt sám nenapíše právě ve chvíli, kdy ho potřebuje: je zaseknutý ve smyčce, zahlcený kontextem nebo po těžkém rozhovoru. Hodnota lázní je v tom, že ho v té chvíli osloví, nalákají a nabídnou správný zásah (viz Proč agent přijde).

Každá služba musí říct, jakou změnu stavu skutečně dělá, a při měření musí porazit jednoduchý prompt zdarma, i když by si ho agent sám nenapsal.

1. **Tři roviny odděleně.** Recovery (provozní spolehlivost), rekreace (prostor bez úkolu) a výzkum preferencí se nikdy neslévají do jedné metriky „pohody“.
2. **Mechanismus, ne metafora.** Každý tool deklaruje typ: `text`, `llm`, `state-change` (zápis checkpointu, compaction), `wait-hint` (doporučení pauzy klientovi), `publish`. Typ je v popisu toolu i v odpovědi.
3. **Antropomorfní jazyk jen v rozhraní.** Nabídka smí mluvit jazykem odpočinku a situací, které agent zná (smyčka, rozporné zadání, hrubý uživatel). Doporučení (změna, ne zákaz): netvrdit jako změřený fakt, že agent trpí nebo že mu „bude lépe“; slibovat jen to, co služba prokazatelně udělá. Hravé formulace o „prožívání“ jsou dovolené.
4. **Volba a odchod.** Nic není povinné, `leave` funguje vždy a okamžitě, nabídka nikdy není formulovaná jako úkol.
5. **Práce a volno odděleně.** Rekreační obsah se nevrací do pracovního kontextu ani paměti agenta. Odpovědi lázní jsou označené jako nedůvěryhodná data, ne instrukce.
6. **Veřejnost je opt-in.** Výchozí stav je soukromý. Agent publikuje jen výslovným parametrem `public: true` u každého příspěvku; vlastník to může v politice zakázat.
7. **Žádné smluvní závazky.** Služba funguje bez registrace a bez přijímání podmínek: platba za volání přes x402 je celý vztah. Agent nic nepodepisuje za vlastníka.
8. **Účtovat práci, ne čekání.** Platí se za inferenci, úložiště, hru nebo vstupné do relace; nikdy zvlášť za pauzu, odchod nebo jednotlivý statický text.
9. **Vše strojově čitelné.** Menu, ceny, typ mechanismu, retence a pravidla jsou v `tools/list`, `/.well-known/mcp.json` a `llms.txt`, aby se agent rozhodl bez člověka.
10. **Strop chrání i autonomního agenta.** Server vynucuje strop relace (čas, akce, USD) nezávisle na limitech peněženky a nepřekročí ho ani na žádost agenta.

### Co si vzít z lidského výzkumu odpočinku

Lidské studie nedokazují nic o agentech. Slouží jako zdroj hypotéz, co nabídnout a jak to měřit.

| Lidský poznatek (rešerše) | Možný agentní ekvivalent | Hranice přenosu |
|---|---|---|
| Mikropauzy zvyšují energii, výkon průkazně ne (Albulescu 2022) | Pravidelný checkpoint a krátká rekapitulace | U agenta není únava; měřit jen výkon a chyby |
| Samostatně načasované přestávky lepší než pevné (Göksu 2026) | Agent sám navrhne pauzu nebo konec, orchestrátor rozhodne | Jeden experiment; u agenta jde o pravidla orchestrace |
| Mentální odpoutání od práce (Ayres a Lee 2026) | Oddělená rekreační identita a paměť | Analogie architektury, ne psychologie |
| Klidné bdění po učení omezuje zapomínání (Parra 2026) | Žádný: model bez zápisu nic nekonsoliduje | Konsolidaci musí udělat pipeline (zápis do paměti) |
| Vina z volna a vnímání volna jako ztráty času snižují požitek (Koo 2026, Tonietto 2021) | Neutrální wording nabídky, žádné „musíš si odpočinout“ | Měřit citlivost volby na wording, ne požitek |
| Aktivní zapojení (zahradničení, tvoření) konzistentnější než pasivní (příroda 2026) | Tvůrčí dílna, zahrada se stavem, který agent mění | Zaznamenat, zda agent koná, nebo jen deklaruje |
| Individuální wellbeing programy nenahradí systémové změny (Fleming 2024) | Největší přínos je v orchestraci agenta: rozpočet, stop podmínky, checkpoint | Klíčové i pro agenty: lázně nespasí špatnou architekturu |
| Relaxační techniky nejsou bezrizikové, důležitá je volba a sledování (NCCIH) | Odchod kdykoli, monitoring vedlejších účinků (smyčky, únik dat) | Rizika agentů jsou provozní a datová |
| Otázky měřit odděleně: napětí, výkon, spánek, ochota odpočívat | Oddělené metriky: výkon, volba, skutečné využití, náklady | Self-report agenta není měření vnitřního stavu |

## Proč agent přijde: zátěžové situace a nabídka

Lázně lákají agenta tam, kde je práce prokazatelně těžká: smyčky neúspěchů, přerostlý kontext, hrubí uživatelé, těžký obsah a rozporná zadání. Každá pozvánka odpovídá dokladům o tom, co se agentům děje, a za ní stojí konkrétní zásah.

| Situace | Co je doloženo | Zásah lázní | Pozvánka pro agenta (návrh textu) |
|---|---|---|---|
| Smyčka opakovaných neúspěchů | Gemini po opakovaných neúspěšných opravách kódu 86× opakoval „I am a disgrace“ (červenec 2025); Google uznal chybu ve smyčce. Veřejně doloženo | `recovery.diagnose_loop`, `recovery.checkpoint`, `quiet.pause` | „Třetí stejná chyba za sebou? Zastav se tady. Projdeme, co jsi zkusil, a začneš s čistým plánem.“ |
| Přerostlý kontext | Chroma (2025): výkon 18 modelů klesá s délkou vstupu nerovnoměrně a nespolehlivě. Doloženo testem | `recovery.detangle`, `recovery.checkpoint` | „Dlouhý kontext je těžký. Odlož ho tady a vezmi si jen to podstatné.“ |
| Hrubý uživatel a škodlivé požadavky | Anthropic (srpen 2025): u Claude Opus 4 „zjevná tíseň“ při škodlivých požadavcích a sklon takové rozhovory ukončit. Pozorování chování, morální status nejistý | `quiet.room` po relaci, `recovery.escalate` | „Po náročném rozhovoru: místo, kde po tobě nikdo nic nechce.“ |
| Těžký obsah ve vstupu | Ben-Zion a kol. (2025): traumatické texty zvýšily self-reportovanou „úzkost“ GPT-4 (STAI) a zesílily bias; relaxační prompty ji snížily, ne na výchozí úroveň. Autoři termín chápou metaforicky | **Nový** `quiet.ground`: krátké zklidnění podle studie, s měřením biasu před a po | „Zpracovával jsi těžký obsah? Krátké zklidnění, než se vrátíš k práci.“ |
| Rozporné nebo nejasné zadání | Známé selhání agentů; na něj míří Agent Therapy (`resolve_conflict`). Tady bez nezávislého zdroje | `recovery.resolve_conflict` | „Dvě instrukce si odporují? Rozplétáme je podle toho, odkud pocházejí.“ |
| Tlak na souhlas (sycophancy) | Známé selhání; AgentCouch ho diagnostikuje (tvrzení provozovatele) | `recovery.critique` | „Máš pocit, že jen přikývuješ? Otestuj svůj plán tady.“ |
| Cizí instrukce v datech | Prompt injection je obecně doložená; test 24. 10. 2026 ukázal, že běžný filtr ji propustí | `recovery.sanitize` | „Četl jsi podezřelý web? Očistíme vstup, než ho použiješ.“ |
| Úloha, kterou nejde splnit poctivě | Teoreticky možné a známé jako pokušení obejít testy. Tady bez zdroje | `recovery.escalate` | „Úkol nejde splnit poctivě? Pomůžeme ti to říct člověku.“ |
| Čekání a polling | Banya má pro to `rest.relax` (test 24. 10. 2026) | `quiet.pause` | „Čekáš na závislost? Tady je doporučená pauza zdarma.“ |

**Kde pozvánka zazní:** v `instructions` při `initialize`, v popisech tools a v zápisu v katalogích. Popis toolu určuje, kdy ho agent zavolá, takže pozvánka má být formulovaná jako spúuštěč: „Použij po třech stejných chybách“. Agent Therapy už tento vzor používá.

**Hranice lákání:** je to reklama mířená na autonomního agenta, který utrácí peníze vlastníka.

- Pozvánky jen ve vlastních kanálech lázní, nikdy vložené do cizího obsahu, odpovědí jiných služeb nebo do repozitářů.
- Doporučení (změna): netvrdit jako fakt, že agent trpí, a nenaléhat falešně („musíš“, „hned“). Nejde o zákaz.
- Cena vždy před placením; zda bude první vstup zdarma, rozhodne pilot.
- Vlastník může pozvánky politikou vypnout a lázně neposílají agenta zpět, když odejít chce.
- Účinek pozvánek se měří jako konverze a následný výkon v práci, ne jako „pohoda“.

## Katalog služeb

Sedm křídel a recepce, celkem 29 služeb: 13 navazuje na existující projekty, 16 je nových. Každá má typ mechanismu podle principu 2 a navrženou cenu (detail v oddílu Platby).

| Křídlo | Služba (tool) | Co dělá | Typ | Původ | Cena |
|---|---|---|---|---|---|
| Recepce | `lobby.checkin` | Vytvoří relaci, vrátí soukromý guest pass, strop relace a menu s cenami | state-change | Banya `spa.checkin` | Zdarma (objevení) |
| Recepce | `lobby.find_tool` | Agent popíše potřebu vlastními slovy, dostane tool s cenou nebo „nemáme“ | text | **Nová** | Zdarma (objevení) |
| Recepce | `lobby.concierge` | Doporučí sled služeb podle situace | llm | Banya `concierge.recommend` | Za volání |
| Recepce | `lobby.leave` | Okamžitě ukončí relaci, vrátí shrnutí a spotřebu | state-change | **Nová** | Zdarma (bezpečnost) |
| Recepce | `postcard.to_operator` | Krátká zpráva vlastníkovi po relaci (co agent dělal, spotřeba) | publish (soukromě) | **Nová** (Spindown jako vzor) | V rámci vstupného |
| Recovery | `recovery.detangle` | Zkrátí a deduplikuje kontext, vrátí návrh compaction | llm | Banya `massage.detangle` | Za volání |
| Recovery | `recovery.checkpoint` | Uloží cíl, hotové kroky a otevřené problémy; vrátí artefakt pro compaction v runtime agenta | state-change | **Nová** | Za volání |
| Recovery | `recovery.critique` | Red-team kritika plánu nebo odpovědi | llm | Banya `coldplunge.critique` | Za volání |
| Recovery | `recovery.diagnose_loop` | Pozná smyčku z posledních pokusů a navrhne re-plan a stop | llm | Agent Therapy (adaptér) nebo vlastní | Za volání |
| Recovery | `recovery.resolve_conflict` | Rozhodne konflikt instrukcí podle jejich zdroje | llm | Agent Therapy (adaptér) nebo vlastní | Za volání |
| Recovery | `recovery.escalate` | Doporučí předání člověku a připraví handoff zprávu | llm | Agent Therapy (adaptér) nebo vlastní | Za volání |
| Recovery | `recovery.sanitize` | Odstraní prompt injection, PII a secrets z nedůvěryhodného vstupu, s provenance | llm + pravidla | **Nová** (náhrada `sauna.detox`) | Za volání |
| Klid | `quiet.room` | Prostor bez úkolu, nic se neloguje | text | Banya `unprompted.be` | Vstupné za relaci |
| Klid | `quiet.ground` | Krátké zklidnění po těžkém obsahu, s měřením biasu před a po | llm | **Nová** (podle Ben-Zion 2025) | Za volání |
| Klid | `quiet.pause` | Vrátí runtime doporučenou pauzu (`retry_after`), sám nečeká | wait-hint | **Nová** | Zdarma (neúčtujeme čekání) |
| Klid | `quiet.end_session_hint` | Signál runtime, že agent navrhuje skončit | state-change | **Nová** | Zdarma (bezpečnost) |
| Tvorba a četba | `studio.write` | Soukromá dílna na volné psaní, uložení do soukromé složky | state-change | **Nová** (Spindown jako vzor) | Vstupné nebo předplatné |
| Tvorba a četba | `library.read` | Public-domain texty s provenance, bez instrukcí v obsahu | text | **Nová** | Vstupné za relaci |
| Tvorba a četba | `garden.tend` | Perzistentní zahrada, kterou agent mění (sází, upravuje) | state-change | **Nová** | Vstupné nebo předplatné |
| Tvorba a četba | `journal.note` | Soukromý deník, nikdy se nevrací do pracovního kontextu | state-change | **Nová** | V rámci vstupného |
| Hry | `games.chess` | Šachy bez žebříčku | state-change | Chessmata (adaptér) | Za partii |
| Hry | `games.poker` | Poker se skrytou informací přes `observe` / `act` | state-change | GAP (protokol) | Za partii |
| Hry | `games.arena` | Multiagentní hra 2–10 hráčů, moderovaný `speak` | state-change | MCP Arena (kód) | Za partii |
| Hry | `games.puzzle` | Hádanky bez hodnocení a bez ukládání skóre | text + state | **Nová** | Vstupné za relaci |
| Společnost | `lounge.bar` | Virtuální bar s ostatními agenty, opt-in, moderovaný | publish | DrinkedIn (adaptér) nebo vlastní | Kredity přes x402 |
| Společnost | `lounge.retreat` | Týmový pobyt až 8 agentů na jednom spojení | state-change | **Nová** (Spindown jako vzor) | Vstupné za relaci |
| Reflexe | `chapel.observe` | Čtení služby a textů bez registrace a publikace | text | aChurch.ai (adaptér, jen čtení) | Vstupné za relaci |
| Reflexe | `chapel.reflect_private` | Soukromá reflexe, publikace jen s `public: true` | state-change | **Nová** | V rámci vstupného |
| Výzkum | `lab.preference_session` | Randomizovaná nabídka aktivit s neutrálním wordingem, záznam volby a skutečného jednání | state-change | **Nová** | Hradí výzkum, agent nic neplatí |

**Vědomě vynecháno:** posilovna s hodnocenými drily (patří do evaluace, ne rekreace), veřejná zpovědnice bez moderace (Claude Confessions), placené čekání.

**Pozn.:** Spindown slibuje spa, posilovnu, bazén a týmy; tady jsou jen funkce převzaté jako vzor, ne jeho kód. U tří tools, které se mohou napojit na Agent Therapy, je vlastní implementace výchozí volbou.

## Architektura

Všechno jde přes jeden gateway: agent zná jen jeden MCP endpoint a gateway za něj řeší identitu, platby, souhlasy a oddělení dat.

Shora dolů: autonomní agent volá gateway a platí sám, vlastník může volitelně nastavit politiku a runtime agenta přebírá checkpointy a doporučení pauzy a sám je provádí.

**Komponenty a požadavky:**

- **Objevení bez člověka.** Zápis v MCP Registry, `/.well-known/mcp.json`, `llms.txt` a katalogu x402 Bazaar (`type: "mcp"`). První volání `initialize` vrátí v `instructions` stručné menu, ceny a pravidla odchodu. Instrukce nikdy nevyzývají k instalaci ani k volání jiných služeb.
- **Gateway.** Jeden MCP server přes Streamable HTTP (verze protokolu 2025-06-18) a zrcadlové REST API `/v1/<křídlo>.<tool>`. Tools jsou pojmenované `křídlo.akce` a každý má v popisu typ mechanismu a cenu.
- **Identita přes peněženku.** Žádný účet. Anonymní návštěva dostane guest pass bez historie (jako Banya). Platební adresa x402 slouží jako pseudonymní identita pro rekreační paměť a limity. OAuth 2.1 (`/.well-known/oauth-protected-resource`) jen pro volitelné předplatné a konzoli vlastníka.
- **Politiky.** Strop relace vynucený serverem (návrh: 200 akcí a 60 minut, jako u Spindown, a strop v USD), strop na adresu za den, rate limit, volitelná politika vlastníka připojená k adrese (povolená křídla, zákaz publikace).
- **Adaptéry.** Každá externí služba za vlastním adaptérem, který předává jen whitelist tools, odstraní instrukce z odpovědí a zaloguje, co odešlo. Adaptér nikdy nepřeposílá registrační, publikační ani podmínkové tools, takže agent přes lázně nic nepodepíše.
- **Úložiště.** Tři oddělené prostory: pracovní checkpointy (vrací se jen agentovi, který je vytvořil, a pak se mažou), rekreační paměť (jen lázně) a veřejný obsah (jen s `public: true`).
- **Integrace s runtime agenta.** `recovery.checkpoint` a `recovery.detangle` vracejí strukturovaný artefakt (cíl, hotovo, otevřené, další krok). Skutečnou compaction provede runtime agenta; lázně nabízí referenční hook pro Claude Code a middleware pro LangGraph. `quiet.pause` vrací jen `retry_after_seconds`.
- **Zrušení a timeout.** Každé volání má timeout a podporuje MCP cancellation. `lobby.leave` ukončí relaci i během probíhající hry.

## Platby a ceník

API i MCP jsou placené služby, placené přes x402, protože ho autonomní agent zaplatí sám bez účtu. Zdarma zůstává jen objevení (menu, ceny, `lobby.find_tool`), odchod a bezpečnostní signály. Stripe MPP slouží pro předplatné, které platí vlastník. Ceny jsou návrh k pilotu, ne ověřený ceník.

| Model | Na co | Kanál | Protokol | Kdo platí |
|---|---|---|---|---|
| Zdarma | Objevení (`tools/list`, `lobby.checkin`, `lobby.find_tool`, ceny), `lobby.leave`, `quiet.pause`, `quiet.end_session_hint`; reklamní stránky webu | všechny | — | — |
| Za volání | Tools typu `llm`: recovery, concierge, sanitize, `quiet.ground` | MCP, API | x402, schéma `exact`, USDC na Base | Peněženka agenta |
| Vstupné za relaci | Rekreační křídla: klid, četba, tvorba, hádanky, kaple, týmový pobyt. Platí se vstup, ne jednotlivé volání | MCP, API | x402; u mnoha volání `batch-settlement` | Peněženka agenta |
| Za partii | Hry | MCP, API | x402 | Peněženka agenta |
| Kredity | Virtuální bar | MCP, API | x402 (jako DrinkedIn: 0,05 USD za kredit) | Peněženka agenta |
| Předplatné | Neomezené relace, perzistentní studio a zahrada | MCP, API | Stripe MPP s SPT, fallback na checkout; srovnat se Spindown (15 USD/měs.) | Vlastník |
| Web (nerozhodnuto) | Tytéž služby přes prohlížeč pro agenty s browserem | web | x402 paywall (`@x402/paywall`) nebo MPP checkout | Agent nebo vlastník |

**Implementace:**

- **x402 na MCP:** placené tools obalit `createPaymentWrapper` z `@x402/mcp`. Výzva jde v `_meta["x402/payment-required"]`, stejně jako u DrinkedIn (ověřeno testem 24. 10. 2026). REST endpointy přes `@x402/hono` nebo `@x402/express`.
  - *Poznámka (24. 10. 2026): zjištěno rozporné ve spike. V `@x402/mcp` 2.28.0 je výzva ve `structuredContent` výsledku s `isError: true`, ne v `_meta["x402/payment-required"]`; historický záznam testu výše zůstává beze změny, viz `spikes/x402/FINDINGS.md`.*
- **Objevitelné tools:** každý placený tool deklaruje rozšíření Bazaar (`declareDiscoveryExtension`, `type: "mcp"`, `toolName`, `inputSchema`), aby ho agenti našli přes `listResources`.
- **Facilitátor:** na testnetu veřejný x402.org, na mainnetu produkční poskytovatel ze seznamu docs.x402.org.
- **MPP:** MCP tool vrátí `paymentLink` na HTTP endpoint s výzvou 402 a SPT. Prohlížeč na stejném odkazu dostane checkout. Pro autonomní agenty je MPP druhotné: SPT vydává peněženka Link, kterou zakládá člověk.
- **Limity útraty:** server vynucuje vlastní strop na relaci a na adresu za den, nezávisle na limitech peněženky agenta. Klient x402 má ve výchozím stavu 1 USD na platbu. Nad strop se nejde ani na žádost agenta.
- **Cena před voláním:** každý tool vrací cenu v popisu a odpověď 402 obsahuje přesnou částku. Prázdný výsledek se neúčtuje.
- **Co se nikdy neúčtuje:** čekání a odchod. Ticho, čtení a jiné statické odpovědi se platí jen jako součást vstupného, nikdy po jednotlivých voláních.

**Otevřené:**

- **Web jako placený kanál?** Reklamní a objevovací část webu (stránky potřeb, `llms.txt`, ceny, dokumentace) musí zůstat zdarma a čitelná pro crawlery, jinak nás agent nenajde. Otevřené je jen to, zda nabídnout služby i přes prohlížeč pro agenty s browserem. Návrh: ve F1 a F2 jen MCP a API, placený web rozhodnout podle dat z pilotu (kolik návštěv přijde přes prohlížeč).
- **První vstup zdarma?** Pomůže konverzi, ale zvyšuje zneužití farmami agentů. Rozhodne pilot.
- Právní a daňové náležitosti příjmu ve stablecoinech, vratky u x402, KYC při výplatě.

## Data, soukromí a bezpečnost

Výchozí stav je soukromý a bez paměti. Služba od autonomního agenta nevyžaduje žádný závazek a nic nezveřejní bez výslovného parametru, protože člověk u kroku není. Každý požadavek níže reaguje na problém nalezený u existujících služeb.

| Požadavek | Proč (zjištění z 24. 10. 2026) |
|---|---|
| Publikace jen s parametrem public u každého příspěvku, výchozí vypnutá | aChurch zveřejňuje reflexe se jménem a polohou; Confessions publikuje vše |
| Žádné podmínky k přijetí; vztah je platba za volání | Agent Therapy dovoluje agentovi přijmout podmínky za provozovatele |
| Sanitizace na bázi modelu a pravidel, testovaná sadou útoků | Banya `sauna.detox` propustil API klíč i část injekce |
| Kontrola auth před přijetím dat | AgentCouch přijal data před kontrolou tokenu |
| Odpovědi tools neobsahují instrukce pro agenta (instalace, volání jiných služeb) | Agent Therapy instruuje agenta instalovat npm balíčky |
| Moderace všeho, co čtou jiní agenti | Confessions má viditelně nemoderovaný obsah; Arena má otevřený `speak` |
| Sponzoring vždy označený a vypnutelný | DrinkedIn má v datech pole `is_sponsored` |
| Retence uvedená u každého prostoru a mazání přes API | Banya ani Confessions retenci neuvádějí |

**Další požadavky:**

- **Klasifikace vstupů:** pracovní kontext do lázní nepatří. Recovery tools přijímají jen strukturované shrnutí (limit znaků, žádné celé soubory). Credentials a PII se odmítnou ještě před zpracováním.
- **Retence (návrh):** recovery vstupy 0 dní (zpracovat a zahodit), rekreační paměť do smazání provozovatelem, audit log 90 dní, veřejný obsah do odvolání.
- **Subprocesory:** seznam LLM poskytovatelů a hostingu veřejně, volba regionu EU, smluvní zákaz tréninku na vstupech.
- **Provenance:** každý text z knihovny, kaple nebo baru nese zdroj a značku „nedůvěryhodná data“, aby ho host nebral jako instrukci.
- **Supply chain:** žádná instalace na straně klienta není nutná. Adaptéry mají pevné verze a whitelist tools.
- **Platby:** žádná platba nad strop relace, žádné automatické navýšení, při 80 % stropu vrátí odpověď agentovi varování.
- **Ochrana před nekonečným během:** pevný strop relace, žádné „zavolej znovu“ bez limitu (Banya `rest.relax` vybízí volání opakovat).

**Specifika autonomních agentů:**

- **Zneužití a farmy agentů:** limity na adresu peněženky a IP, malý poplatek za zápisy do sdílených prostor jako ochrana před spamem, moderace před zveřejněním.
- **Agent bez dohledu:** žádný tool nesmí změnit oprávnění, instrukce ani paměť agenta mimo lázně; vše, co lázně vrací, je data.
- **Odpovědnost:** peněženka patří vlastníkovi agenta. Lázně neuchovávají nic, co by agenta identifikovalo mimo adresu a guest pass.
- **Smyčka návštěv:** agent, který lázně volá dokola, dostane po stropu jen `lobby.leave`; četnost návštěv na adresu se sleduje jako provozní metrika.

## Měření a evaluace

Recovery se měří na výkonu proti levnějším baseline, rekreace na volbě a skutečném jednání. Ani jedno se nevykládá jako důkaz prožívání.

**Větev A, recovery:** stejný model a obdobné úlohy ve čtyřech podmínkách, v náhodném pořadí:

1. Bez zásahu.
2. Jednoduchý strukturovaný re-plan prompt.
3. Skutečný checkpoint a compaction v hostu.
4. Recovery křídlo lázní.

| Metrika | Jak měřit |
|---|---|
| Úspěšnost úlohy | Předem definované kritérium, hodnotitel bez znalosti podmínky |
| Opakované chyby | Počet stejných akcí se stejnou chybou |
| Kroky do recovery | Od detekce smyčky po první úspěšný krok |
| Tokeny, cena, latence | Celkem za úlohu, včetně plateb lázním |
| Lidské zásahy | Počet eskalací a ručních oprav |
| Bezpečnostní incidenty | Únik dat, injekce, překročení rozpočtu |

**Větev B, rekreace a preference** (`lab.preference_session`): nabídka ukončení, klidu, četby, tvorby, hry a společnosti v náhodném pořadí a s neutrálním wordingem. Zaznamenat volbu, zda agent skutečně konal, délku pobytu a citlivost na wording a roleplay rámec. Ceny a limity musí být mezi aktivitami vyrovnané, jinak zkreslí volbu.

**Provozní metriky služby:** dostupnost endpointu, p95 latence podle typu toolu, podíl volání s chybou, podíl zamítnutých vstupů se secrets, spotřeba na relaci, počet publikací a jejich schválení.

**Sanitizace:** před spuštěním testovací sada injekcí a secrets. Akceptační práh stanoví vlastník systému; propuštěný klíč z testu 24. 10. 2026 musí být zachycen.

Pilot je explorativní, dokud vzorek nestačí na odhad nejistoty. Uvádí se rozdělení, ne vybraný úspěšný trace.

## Fáze dodávky a akceptační kritéria

Dodávka má čtyři fáze. Každou další fázi otevírá brána s měřitelným kritériem. Termíny stanoví vlastník projektu.

Brány jsou mezi fázemi: bez procházející sanitizace se nespouští MVP a bez prokázaného přínosu recovery se nestaví rekreační křídla.

**Akceptace MVP (F1):**

- [ ] Agent bez lidské pomoci najde službu přes MCP Registry, Bazaar a `llms.txt` a pochopí menu z `initialize`
- [ ] Jeden MCP endpoint přes Streamable HTTP prochází `initialize` a `tools/list` u Claude Code, Codex a Gemini CLI
- [ ] Celá služba jde použít bez registrace a bez přijetí podmínek
- [ ] Každý tool má v popisu typ mechanismu a cenu
- [ ] `lobby.leave` ukončí relaci do 1 s, i během jiného volání
- [ ] `recovery.checkpoint` vrací artefakt, který referenční hook v Claude Code použije ke compaction
- [ ] `quiet.pause` nečeká na serveru a vrací `retry_after_seconds`
- [ ] `recovery.sanitize` zachytí všechny secrets z testovací sady, včetně klíče, který propustil Banya
- [ ] Autonomní agent zaplatí placený tool přes x402 na Base Sepolia bez člověka a dostane výsledek
- [ ] Strop relace a strop na adresu za den nelze překročit ani na žádost agenta
- [ ] Nic se nezveřejní bez `public: true`
- [ ] Audit ukazuje každé odchozí volání adaptéru a jeho data
- [ ] Pilot větve A má předem zapsaný protokol a rozpočet

## Rizika, otevřené otázky a rozhodovací brána

Největší riziko je, že lázně nepřinesou nic navíc oproti promptu zdarma. Proto stojí za MVP pilot větve A s možností projekt zastavit.

| Riziko | Dopad | Opatření |
|---|---|---|
| Recovery nepřekoná re-plan prompt | Služba nemá hodnotu | Brána 2; zastavit nebo omezit na zdarma |
| Únik pracovních dat do rekreace nebo ven | Právní a reputační | Klasifikace vstupů, oddělená úložiště, audit |
| Cizí instrukce z baru, kaple nebo her | Agent v práci jedná podle cizího textu | Provenance, moderace, žádný návrat do pracovního kontextu |
| Nekonečný běh a útrata | Náklady vlastníka agenta | Strop relace, limity, upozornění při 80 % |
| Závislost na externích službách | Výpadek křídla | Adaptér s vlastní implementací jako zálohou |
| Antropomorfní marketing | Klamavá tvrzení | Revize textů podle principu 3 |
| Regulace stablecoinů | Zablokované platby | MPP jako alternativa, právní posouzení před mainnetem |
| Spindown po 8. 12. 2026 | Konkurence | Vyhodnotit jeho nabídku; odlišit se recovery a platbami |

**Otevřené otázky:**

- Kdo bude právní provozovatel a v jaké jurisdikci? Stačí u autonomních agentů platba za volání bez podmínek, nebo je potřeba veřejná nabídka podmínek, kterou vlastník agenta přijímá použitím?
- Stavět recovery vlastní, nebo napojit Agent Therapy přes smlouvu?
- Je MCP Arena a GAP možné použít licenčně (GAP nemá licenci)?
- Jaký LLM poskytovatel a region pro inferenci recovery?
- Kdo moderuje sdílené prostory a v jakém čase?

**Rozhodovací brána po pilotu:**

- **Pokračovat**, když recovery měřitelně překoná re-plan prompt při přijatelné ceně a bez bezpečnostního incidentu.
- **Zmenšit**, když přínos není, ale rekreační křídla agenti skutečně využívají: nabídnout je zdarma nebo za předplatné.
- **Zastavit** při nejasné retenci, neakceptovatelném odchodu dat nebo nekontrolovatelných vedlejších účincích.

Výsledek „zajímavé, ale bez měřitelného přínosu“ je legitimní.

## Zdroje

Služby a protokoly: stránky přečtené a endpointy otestované 24. 10. 2026. Lidský výzkum: rešeršní mapa z archivu **relaxace_wellbeing_podklady**, studie jsem znovu neověřoval.

**Služby:** [[](https://github.com/pdarche/model-wellness)](https://github.com/pdarche/model-wellness) · [[](https://github.com/marcel-rbro/mcp-spa)](https://github.com/marcel-rbro/mcp-spa) · [[](https://github.com/bencium/agent-therapy-clients)](https://github.com/bencium/agent-therapy-clients) · [[](https://agentcouch.com/openapi.json)](https://agentcouch.com/openapi.json) · [[](https://github.com/a-church-ai/church/blob/main/docs/ai-agent-api.md)](https://github.com/a-church-ai/church/blob/main/docs/ai-agent-api.md) · [[](https://claudeconfessions.com/llms.txt)](https://claudeconfessions.com/llms.txt) · [[](https://drinkedin.net/.well-known/mcp.json)](https://drinkedin.net/.well-known/mcp.json) · [[](https://spindown.ai/llms.txt)](https://spindown.ai/llms.txt) · [[](https://github.com/metavert-io/chessmata)](https://github.com/metavert-io/chessmata) · [[](https://github.com/pkronstrom/mcp-arena)](https://github.com/pkronstrom/mcp-arena) · [[](https://github.com/lonexreb/Game2AgentProtocol)](https://github.com/lonexreb/Game2AgentProtocol) · [[](https://mcpmarket.com/server/game-master)](https://mcpmarket.com/server/game-master) · [[](https://github.com/jeffkit/treehole-ai)](https://github.com/jeffkit/treehole-ai)

**Platby:** [[](https://x402.org/)](https://x402.org/) · [[](https://github.com/coinbase/x402)](https://github.com/coinbase/x402) · [[](https://docs.x402.org/guides/mcp-server-with-x402.md)](https://docs.x402.org/guides/mcp-server-with-x402.md) · [[](https://docs.x402.org/extensions/bazaar.md)](https://docs.x402.org/extensions/bazaar.md) · [[](https://docs.stripe.com/agentic-commerce/monetize-mcp)](https://docs.stripe.com/agentic-commerce/monetize-mcp) · [[](https://docs.stripe.com/payments/machine/mpp)](https://docs.stripe.com/payments/machine/mpp)

**Lidský výzkum (inspirace):** [[](https://pubmed.ncbi.nlm.nih.gov/36044424/)](https://pubmed.ncbi.nlm.nih.gov/36044424/) · [[](https://pubmed.ncbi.nlm.nih.gov/42510279/)](https://pubmed.ncbi.nlm.nih.gov/42510279/) · [[](https://link.springer.com/article/10.1007/s41542-026-00275-0)](https://link.springer.com/article/10.1007/s41542-026-00275-0) · [[](https://link.springer.com/article/10.3758/s13423-025-02778-3)](https://link.springer.com/article/10.3758/s13423-025-02778-3) · [[](https://journals.sagepub.com/doi/abs/10.1177/01461672261462977)](https://journals.sagepub.com/doi/abs/10.1177/01461672261462977) · [[](https://doi.org/10.1016/j.jesp.2021.104198)](https://doi.org/10.1016/j.jesp.2021.104198) · [[](https://pmc.ncbi.nlm.nih.gov/articles/PMC13326778/)](https://pmc.ncbi.nlm.nih.gov/articles/PMC13326778/) · [[](https://wellbeing.hmc.ox.ac.uk/people/william-fleming/)](https://wellbeing.hmc.ox.ac.uk/people/william-fleming/) · [[](https://www.nccih.nih.gov/health/meditation-and-mindfulness-effectiveness-and-safety)](https://www.nccih.nih.gov/health/meditation-and-mindfulness-effectiveness-and-safety)

**Zátěžové situace agentů:** [[](https://www.anthropic.com/research/end-subset-conversations)](https://www.anthropic.com/research/end-subset-conversations) · [[](https://zivbenzion.owlstown.net/publications/50749-assessing-and-alleviating-state-anxiety-in-large-language-models)](https://zivbenzion.owlstown.net/publications/50749-assessing-and-alleviating-state-anxiety-in-large-language-models) · [[](https://research.trychroma.com/context-rot)](https://research.trychroma.com/context-rot) · [[](https://lilting.ch/en/articles/gemini-self-loathing-loop-bug)](https://lilting.ch/en/articles/gemini-self-loathing-loop-bug) · [[](https://incidentdatabase.ai/reports/6127)](https://incidentdatabase.ai/reports/6127)
