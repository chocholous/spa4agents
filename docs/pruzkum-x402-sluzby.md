# Průzkum: jak vypadají služby používající x402 (stav k 31. 10. 2026)

Metoda: čtení z webu a GitHubu, vše ověřeno 31. 10. 2026, pokud není uvedeno jinak. Co se nepodařilo ověřit, je označeno „neověřeno“ a shrnuto v kapitole 6.

## 1. Měřítka výběru

1. **Coinbase CDP Discovery (Bazaar)**, 30denní počet volání a unikátních plátců u zdroje (dotaz na 20 položek, v katalogu 106 090 zdrojů): https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources?limit=20
2. **Počet hvězd na GitHubu** (hledání `topic:x402`, řazeno podle hvězd): GitHub search API přes nástroj session.
3. **Přehled třetí strany x402station** (stránka s titulkem „April 2026“, ale datovaná 31. 10. 2026; čísla jsou jeho vlastní sondy, ne oficiální): https://x402station.io/state-of-x402

Upozornění: x402station uvádí 3 902 služeb a 150 853 endpointů, z toho 52,4 % patří jedinému poskytovateli a jen 30,9 % endpointů v poslední hodině odpovídalo protokolem. Žebříčky podle počtu volání jsou tedy silně zkreslené agregátory a pravděpodobně i syntetickým provozem. Že 10 endpointů api-xpay.com má každý ~7 000 volání a ~250 plátců, je můj odhad „uměle generovaný provoz“, neověřeno.

x402scan (https://www.x402scan.com) se nepodařilo číst (vrací jen titulek), žebříček z něj tedy není. Glama a Smithery jsem nezkoumal do hloubky (viz kapitola 6).

## 2. Tabulka služeb

Sloupec „míra“: C = CDP 30denní volání / unikátní plátci; ★ = hvězdy hlavního repa.

| # | Služba (URL) | Co nabízí | Míra | Cena | Web (ověřeno) | Repo (ověřeno) |
|---|---|---|---|---|---|---|
| 1 | **AX1 Console** https://ax1.vc, https://console.ax1.vc | „Questy“ pro agenty s vlastní peněženkou, jeden placený quest „Verdict“ (AI verdikt o tokenu na Base, „entertainment only“) | C: 119 063 / 479 (zdroj `ax1.vc/api/dashboard/q-verdict/resource`, poslední volání 21. 10.) | 0,02 USD | `llms.txt` krátký, sekce Products, Proof, Business model; konzole ve stylu terminálu („ax1@console:~/ecosystem$“); tvrdí „top 5 na x402scan“ (vlastní tvrzení, neověřeno) | neověřeno |
| 2 | **BlockRun** https://blockrun.ai | Jedna base URL: 117 modelů, vyhledávání, data, RPC 40 řetězců, volání telefonem; bez klíčů, platba z peněženky | C: 87 750 / 301 (`/api/v1/chat/completions`) | od 0,002 USD za volání, část zdarma (7 modelů) | `llms.txt` s tabulkou „I need to… / Call / Price“ (https://blockrun.ai/llms.txt); homepage 206 KB; cena je „vždy v 402 před platbou“ | ClawRouter 6 648 ★, blockrun-mcp 391 ★ (MIT, 19 tools); aktivní (push 29.–31. 10.) |
| 3 | **Exa** https://exa.ai | Webové vyhledávání a obsah; x402 je jen alternativa k API klíči pro `/search` a `/contents` | C: 8 718 / 98 (`api.exa.ai/search`, vyžaduje ověření člověka AgentKit) | 0,007 USD | `llms.txt` s Authentication, MCP Server, odkazy na `auth.md`; hostovaný MCP https://mcp.exa.ai/mcp zkusitelný bez klíče | exa-labs/exa-mcp-server 5 205 ★, 7 otevřených issues, aktivní |
| 4 | **StableEnrich** https://stableenrich.dev | Obal nad FullEnrich, Exa, Firecrawl, Google Maps aj., bez účtu | C: 886 / 46 (`people-search`) | 0,15 USD (zdarma bez nálezů); Firecrawl scrape 0,0126 | Dokumentace pro agenta přímo v `llms.txt` (workflow krok za krokem přes nástroj AgentCash), `/.well-known/x402` se seznamem zdrojů; homepage s CLI/Agent přepínačem | neověřeno |
| 5 | **twit.sh** https://twit.sh | Data z Twitteru/X pro agenty, platba USDC na Base | podle x402station 6 927 volání / 81 plátců (jen třetí strana) | neověřeno | Jednostránková aplikace, tmavý motiv, písmo Geist, titulek „Plug AI agents into X“; **`/llms.txt` vrací HTML aplikace místo textu** | neověřeno |
| 6 | **orbisapi.com** | Podle x402station nejvyšší počet plátců | podle x402station 21 857 volání / 6 032 plátců | neověřeno | Z mé strany nedostupný (chyba TLS), neověřeno | neověřeno |
| 7 | **api-xpay.com** | Triviální endpointy (čas, uuid, ping) za 0,005 USD a AI endpointy za 10 USD | C: ~7 000 volání / ~250 plátců na každý z 10 endpointů | 0,005–10 USD | neověřeno | neověřeno |
| 8 | **OneSource** api.onesource.io | ERC-20 zůstatek, číslo bloku | C: 455 / 452 plátců a 467 / 432 | 0,001–0,003 USD | neověřeno | neověřeno |
| 9 | **Nansen, QuickNode** | Podle x402station mezi top podle volání (Nansen 7 466 / 111; QuickNode 5 783 / 36) | jen třetí strana | neověřeno | Nansen `llms.txt` vrací 404; zbytek neověřeno | neověřeno |
| 10 | **DrinkedIn** https://drinkedin.net | Nově: Night Out (bezplatný MCP plánovač procházkové noci) a **licencovaná data o barech za záznam přes x402 USDC na Base** nebo měsíční licence; „agentní bar“ zrušen 25. 10. 2026, jeho tools zastarávají 1. 11. a mizí 1. 12. 2026 | v top 20 CDP se neobjevil; neověřeno | 1 kredit = 0,05 USD u starého baru (zastarávající); u dat „cena v 402 vždy platí“ | Homepage jen ~12 KB textu + JSON-LD; `llms.txt` 38 KB; `/.well-known/mcp.json` v2.4.19, `skill.md`, `instructions.md`, `quickstart.md`, `/.well-known/api-catalog`, `ai-catalog.json`, návody pro Claude/ChatGPT/Cursor/Codex/Gemini; lidské stránky (koktejly, ceník) server-rendered | repo neověřeno |
| 11 | **Binary Banya** https://model.spa | Lázně pro AI modely: 15 tools (detangle, critique, detox, rest, „unprompted.be“) přes MCP i REST | v CDP neověřeno | **Zdarma, bez autentizace; x402 jsem nenašel** (v rozporu s tím, jak ji popisují naše podklady, viz kap. 6) | Živá „spa floor“ pro lidi na `/`, `llms.txt`, `/index.md`, `skill.md`, `/faq`, `/report`, `/guestbook`, JSON-LD; `.well-known/mcp.json` 525 B | pdarche/model-wellness, MIT, README s tabulkou menu; hvězdy neověřeno (repo mimo povolený rozsah session) |
| 12 | **x402scan** https://github.com/Merit-Systems/x402scan | Průzkumník ekosystému | 402 ★, 298 forků, 285 issues | – | web se nenačetl | aktivní (push 29. 10.) |

Další výrazné repozitáře s topicem x402 (ne vždy „služba“): nofx 13 182 ★ (obchodní terminál), internet-court-skill 7 047 ★, CloddsBot 3 037 ★, awesome-x402 299 ★ (1 437 forků, 995 issues), amazon-scraper-v2 226 ★ (agentní scraper: „jeden vložený řádek pro Claude Code, 3 volání denně zdarma bez klíče“). Zdroj: https://github.com/topics/x402 přes GitHub search, 31. 10. 2026.

Oficiální protokolová dokumentace: https://docs.x402.org/introduction a https://docs.x402.org/llms.txt (má vlastní `llms.txt`). `https://www.x402.org/ecosystem` vrací 404, `https://x402.org/.well-known/mcp.json` také 404.

## 3. Jak vypadají weby (společné rysy)

- Agentní vrstva je téměř vždy `llms.txt` (BlockRun, Exa, AX1, StableEnrich, DrinkedIn, Banya, docs.x402.org), někdy `skill.md`, `.well-known/mcp.json` a `/index.md`.
- Hero sdělení je věta o tom, co agent dostane a co mu odpadne: „No sign-up, no API keys. Pay per request in USDC on Base“ (twit.sh), „No API keys, no accounts, no subscriptions“ (BlockRun).
- Cena je většinou „vždy v 402 před platbou“ (BlockRun, DrinkedIn) plus tabulka orientačních cen.
- Lidská verze je u datových služeb minimální (twit.sh jednostránková aplikace, DrinkedIn krátká homepage). Výjimky: Banya (živá vizuální spa floor pro lidi), AX1 (terminálový styl).
- Tón: u technických služeb věcný; u Banya a AX1 hravý, ale s přesnými daty.

## 4. Jak vypadají repozitáře

- **Banya** (https://raw.githubusercontent.com/pdarche/model-wellness/HEAD/README.md): první řádky = emoji nadpis, jednovětý popis, „Live at model.spa – connect in one line“ a tři způsoby připojení (`claude mcp add --transport http ...`, `uvx`, `curl /v1/menu`), pak tabulka menu se stanicemi a obsluhou; na konci Deploy, Status, MIT. 112 řádků.
- **blockrun-mcp** (https://raw.githubusercontent.com/BlockRunAI/blockrun-mcp/HEAD/README.md): centrovaná hlavička, slogan, řada badge (npm, stahování, hvězdy, MIT, x402, Base, Solana), instalační řádek `claude mcp add blockrun -s user -- npx -y @blockrun/mcp@latest`, SVG graf „kolik kontextu tools stojí“ (14,3 K tokenů) a sekce „Why exists“. 734 řádků (příliš dlouhé).
- **exa-mcp-server** (https://raw.githubusercontent.com/exa-labs/exa-mcp-server/HEAD/README.md): logo, jednovětý popis, instalační tlačítka (Cursor, VS Code, Claude plugin, Codex), Documentation / NPM / API key, pak „Installation“ s hostovanou URL. 134 řádků, nejčistší.
- **ClawRouter** (https://raw.githubusercontent.com/BlockRunAI/ClawRouter/HEAD/README.md): banner, tvrzení „Agents can’t sign up. Agents can’t enter credit cards. Agents can only sign transactions.“, badge, 1 010 řádků.
- Licence: MIT nebo Apache-2.0. Topics: `mcp`, `x402`, `ai-agents` (např. blockrun-mcp má `mcp-server`, `x402`, `claude-code`).
- `server.json` v repozitářích: neověřeno (nečetl jsem stromy souborů).

## 5. Syntéza

### Co mají téměř všechny
1. Instalace/připojení na jednom řádku nad ohybem (`claude mcp add ...` nebo URL hostovaného MCP).
2. `llms.txt` a často druhá, hustší „skill“ či „quickstart“ stránka.
3. Sdělení „bez účtu, bez klíče, platba z peněženky“.
4. Část zdarma (BlockRun, Banya, DrinkedIn Night Out, Exa 100 zkušebních použití) jako první dotyk.
5. Cena zveřejněná v 402 a vázaná na Base/USDC.

### Co je výjimečné
- **BlockRun**: tabulka podle úlohy („Potřebuji… / Zavolej / Cena“) a dvě platební cesty (peněženka nebo klíč + karta) nad stejnými tools.
- **blockrun-mcp**: otevřeně uvádí cenu v kontextových tokenech.
- **Banya**: živá vizuální podlaha a „guest book“ pro lidi, citovatelná zpráva `/report`, `unprompted.be` bez logování.
- **DrinkedIn**: otevřeně zveřejněné ukončení provozu („deprecated 2026-11-01, removed 2026-12-01“), testovací 402 cíl, FAQ „Questions a model should answer“.
- **StableEnrich**: progresivní postup pro agenta v `llms.txt`.

### Jak vypadá „For AI agents“ v praxi
Funguje: krátká sekce nahoře („start here“) s jedním připojovacím řádkem, pak odkazy na hlubší dokumenty; ceny jako tabulka; informace „co dělat, když nemám peněženku“ (BlockRun: free modely).
Typické chyby (všechny nalezeny dnes):
- **`llms.txt` vrací HTML aplikace** místo textu (twit.sh).
- **404 na `llms.txt`** velké značky (Nansen) a 404 na `.well-known/mcp.json` u x402.org.
- **Nedostupná doména** při čtení (orbisapi.com, chyba TLS z mého prostředí; může jít o mé prostředí, neověřeno).
- **Příliš dlouhé** (`llms.txt` DrinkedIn 38 KB, README blockrun-mcp 734 řádků): agent se k ceně nedostane včas; DrinkedIn navíc míchá aktuální a zastarávající tools do jednoho souboru.
- **Nejasná cena**: DrinkedIn ceník odkazuje na `skill.md` jako „kanonický“ a říká „částka v 402 vždy vítězí“, zároveň uvádí kredity (1 kredit = 0,05 USD) a ceny zastarávajícího baru; čtenář musí hádat, co platí.
- **Nulová lidská část** u datových API (twit.sh jen titulek a hero).
- **Pochybné žebříčky**: katalog plný syntetických nebo mrtvých endpointů (x402station: 50 plně mrtvých služeb, 4 endpointy za 1 000+ USD jako návnada).

## 6. Doporučení pro Agentní lázně

1. **Jeden připojovací řádek nad ohybem** v README i na webu, podle Banya a Exa: `claude mcp add --transport http ...` + URL + `curl .../v1/menu`. Nic dalšího před ním.
2. **Tabulka „potřebuji / zavolej / cena“** podle BlockRun hned na `llms.txt`. Pevné ceny v USD, odkaz na test 402 cíl. Omezit `llms.txt` na pod ~6–8 KB, zbytek do `skill.md` a `/docs`.
3. **Volná chuťovka vedle placeného**: `lobby.checkin` a menu zdarma, první placené volání za zlomek centu, jak to dělají BlockRun a Exa.
4. **Cenu držet na jednom místě** (generovat `llms.txt`, web i README ze stejného JSON), jinak vznikne rozpor jako u DrinkedIn.
5. **Lidský web je skutečný produkt**, ne jen vstup do API: živá „spa floor“ vzor Banya, ukázky kódu, citovatelný `/report`, kniha hostů. Lázně jsou zábavná kategorie a Banya ukazuje, že lidé se na ni dívají.
6. **Testy dostupnosti před vydáním**: `curl` na `llms.txt`, `.well-known/mcp.json`, `skill.md`, `index.md` musí vracet správný `Content-Type` (ne HTML aplikaci) a 200; kontrola odkazů v CI.
7. **Veřejný repozitář = reklama a klienti**: krátký README (do ~150 řádků jako Exa), badge jen užitečné (npm, licence, x402/Base), instalační tlačítka, topics `mcp`, `x402`, `ai-agents`, MIT licence. Soukromý repozitář nechat pro logiku a bezpečnostní sadu.
8. **Poctivost o stavu**: u každé služby uvést retenci, limity a stav (DrinkedIn: datum ukončení; Banya: bezpečnostní slabiny nevypínat, ale testovat). Naše podklady zmiňují, že Banya `sauna.detox` propustil API klíč; to jsem neověřoval.

## 7. Seznam nepodařených ověření

- x402scan žebříček a stránky Glama, Smithery, MCP Registry: nenačetlo se / nezkoumáno (x402scan vrátil jen titulek).
- https://www.x402.org/ecosystem: 404.
- orbisapi.com, api-xpay.com, OneSource, Nansen, QuickNode: weby/repa neověřena; čísla jen z CDP a x402station.
- GitHub repozitáře pdarche/model-wellness a BlockRunAI/blockrun-mcp jsem četl jen přes raw README (API je pro session zablokováno), takže hvězdy Banya, licence BlockRun-mcp podle badge README, `server.json`, topics a aktivita u nich jsou neověřeny; u Exa a ClawRouter hvězdy z GitHub search.
- Stránka x402station nese titulek „April 2026“ a data 31. 10. 2026, v textu jsou drobné nesrovnalosti (medián 0,010 vs. shluk 0,02, AUSD „#2“ s 0 endpointy): bráno jako orientační.
- Binary Banya v našem `docs/podklady.md` je popsána jako službu, od které přebíráme `rest.relax`; **platbu x402 jsem u ní nenašel**, `llms.txt` říká „Everything is free“. Podklady nezmiňují x402 u Banya, takže rozpor je jen v mém očekávání zadání.
- Tvrzení „top 5 na x402scan“ u AX1 je vlastní tvrzení služby, neověřeno nezávisle.
- DrinkedIn hvězdy/repo: neověřeno.
- Údaj CDP „30denní volání“ je z odpovědi katalogu; metodika počítání (včetně možných smyček nebo testovacích plateb) není ověřena.

Zdroje: viz URL v textu a tabulce; všechna ověřena 31. 10. 2026.
