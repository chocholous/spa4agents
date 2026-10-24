# Gateway D2 (WP2, F0 kostra)

TypeScript/Node 22+. MCP Streamable HTTP `/mcp` (protokol 2025-06-18, oficiální `@modelcontextprotocol/sdk`) a REST zrcadlo `POST /v1/<tool>`; `GET /healthz`.

## Spuštění
```
cd gateway && npm install
npm test                 # vitest, 12 testů
npm run typecheck
npm start                # PORT=8787 HOST=127.0.0.1
CATALOG_PATH=test/fixtures/catalog.min.yaml npm start
```
Katalog: `CATALOG_PATH`, jinak `../catalog/catalog.yaml`, pokud existuje, jinak fixture. Env: `PORT`, `HOST`, `GATEWAY_PHASES` (default `F1`), `SESSION_MAX_ACTIONS` (200), `SESSION_MAX_MINUTES` (60), `SESSION_MAX_USD` (nenastaveno), `ADDRESS_DAILY_MAX_ACTIONS`/`_USD` (stub), `TRIAL_FREE_SESSIONS` (3), `TRIAL_MAX_TURNS_PER_SESSION` (20), `TIMEOUT_MS_<TEXT|WAIT_HINT|STATE_CHANGE|PUBLISH|LLM>`, `PAUSE_RETRY_AFTER_SECONDS`, `LITELLM_BASE_URL`, `LITELLM_MODEL`, `LITELLM_API_KEY`. Doména není nikde natvrdo.

## Struktura
- `src/catalog.ts` loader (jen potřebná pole), `src/config.ts`, `src/envelope.ts` společná obálka, `src/session.ts` relace a stropy, `src/gateway.ts` jednotné volání toolu pro MCP i REST, `src/handlers.ts` stub handlery, `src/payments.ts` rozhraní pro WP3, `src/llm.ts` výměnná LLM vrstva (LiteLLM proxy), `src/server.ts` HTTP + MCP.
- Tok volání: relace (guest pass / MCP session) -> strop -> `PaymentGate.authorize` (před daty) -> validace vstupu (JSON Schema) -> handler -> `settle`.
- `lobby.leave` nejde přes žádnou frontu: HTTP/MCP požadavky běží souběžně, `leave` zavře relaci a zruší (AbortController) všechna její běžící volání; nepodléhá stropu ani zavřené relaci. Test měří odezvu < 1 s při běžícím 15s volání (MCP i REST).
- Timeout podle typu mechanismu + MCP cancellation (`notifications/cancelled` -> `extra.signal`) + zavření REST spojení.
- Identita: `Session.address` (platební adresa) je připravená, vyplní ji `PaymentGate` ve WP3.

## Pole, která gateway čte z katalogu
Loader (`src/catalog.ts`) akceptuje dva tvary; zbytek katalogu ignoruje.
- Název služby: `brand.name` (nebo `service.name`).
- `tools[]`: `name`, `description`, volitelně `trigger` (připojí se před popis), `mechanism` (`text|llm|state-change|wait-hint|publish`), `phase`.
- `price.model` (`free|per_call|entry|per_game|credits`) a `price.amount_usd` (nebo `price.usd`); hodnotu přenáší jako řetězec, i `TODO_OWNER`.
- Vstupy: buď `input_schema` (JSON Schema), nebo skutečný tvar `inputs[]` (`name`, `type`, `required`, `description`, číselné `max_length`, `max_items`, `items`) + `one_of_required` (-> `anyOf`).
- Fáze vystavované v `tools/list`: `GATEWAY_PHASES` (default `F1`); návrh: sjednotit s `generation.publish_phases`.
- Zjištění: stav `catalog/catalog.yaml` při psaní: nevalidní YAML (řádek ~331-337, `invitation:` s dvojtečkou bez uvozovek), loader ho proto zatím neotevře. Typy `price_models` v katalogu obsahují i `entry_or_subscription`, `included_in_entry`, `research_funded` (loader je nezná; až bude F1 obsahovat takový tool, rozšířit enum).

## Neověřeno
- Codex a Gemini CLI nejsou v prostředí. Claude Code CLI: `claude mcp add --transport http` + `claude mcp list` hlásí "Connected" (initialize proběhl); interaktivní volání tools Claude Code jsem nezkoušel.
- Platby, trial, referral, audit s retencí, tři oddělené prostory úložiště, strop na adresu: nejsou implementovány (WP3/WP4/později).

## Požadavky datové politiky
Zdroj: `docs/zadani.md`, sekce "Datová politika (závazná)" (rozhodnutí vlastníka 24. 10. 2026: zero data retention, plná izolace). Kód se zatím NEMĚNIL, toto jsou požadavky na implementaci (WP2, WP3, WP6).

Co musí implementace dodržet:
- **Logování jen metadata.** Audit 90 dní, pole (návrh): čas UTC, tool a mechanismus, cena a model platby, výsledek (ok, kód chyby, timeout, zrušeno, odmítnutý vstup s kódem důvodu bez odmítnutého textu), hash platební adresy (pseudonym, ne anonymizace), náhodné id relace, velikosti vstupu a výstupu a doba trvání. Nikdy obsah, guest pass, hlavičky ani IP (DP1). `quiet.room` nic neloguje (DP8).
- **Redakce.** Chyby (včetně validační zprávy Ajv, výjimek, `stderr`, `unhandledRejection`), trasy a metriky neobsahují vstup ani výstup. Chybové kódy a obecné zprávy, nikdy text z vstupu. Logger přes jednu funkci s whitelistem polí.
- **Žádný persistentní obsah.** Vstupy a výstupy tools se nezapisují do DB, souboru, fronty ani cache. `recovery.checkpoint` artefakt vyrobí, vrátí v odpovědi a nic neuloží; typ mechanismu je `text`.
- **Izolace.** Tři oddělené prostory úložiště (pracovní, rekreační, veřejný), žádné čtení napříč; žádné sdílení mezi relacemi, agenty a adresami; klíče a mapy vždy v rozsahu jedné relace.
- **Paměť relace.** Žije jen v procesu, zničí se při `lobby.leave`, na konci relace (strop minut, zavření MCP session) a po idle TTL; po zničení se z `Map` odstraní (ne jen `closed = true`).
- **Timeouty a stropy paměti.** Idle TTL a maximální velikost paměti relace (hodnoty neurčeny, DP6), limity vstupu checkpointu (DP11), limit těla požadavku.
- **Secrets a PII** se odmítnou před zpracováním, tedy před voláním LLM; pravidlová detekce nesmí nalezený text vracet ani logovat (DP9).
- **LLM jen přes LiteLLM proxy** s vypnutým logováním požadavků a odpovědí (včetně DB logování, callbacků a nástrojů třetích stran); do požadavku neposílat adresu ani jiný identifikátor uživatele. Poskytovatel je `TO_BE_NAMED`; smluvní ZDR, EU, bez trénování.
- **Žádní další zpracovatelé** a žádná analytika.
- **x402:** výzva v MCP je ve `structuredContent` výsledku s `isError: true`, ne v `_meta` (`spikes/x402/FINDINGS.md`).

Místa v kódu, kde je dnes nesoulad (nic jsem neměnil):
- `src/session.ts` `SessionStore`: `byPass` a `byMcp` se nikdy nemažou. Po `lobby.leave` a po konci relace zůstává `Session` (včetně `nickname`, `address`, čítačů) v paměti do konce procesu; chybí idle TTL a úklid. REST bez passu vytvoří jednorázovou relaci při každém požadavku (`gateway.ts` `resolveSession`, `sessions.create()`) a ta se také nemaže.
- `src/handlers.ts` `lobby.checkin`: `nickname` od agenta se ukládá do relace (volný text, v paměti). Musí zaniknout s relací; do auditu nepatří.
- `src/gateway.ts` ř. ~111: `invalid_input` vrací `ajv.errorsText(validate.errors)`; zkontrolovat, že zpráva nikdy neobsahuje hodnoty ani názvy klíčů ze vstupu (jinak vracet jen kód a cestu schématu).
- `src/gateway.ts` `call()`: neexistuje žádný audit ani logger; metadata auditu je potřeba přidat (nyní se nic nezapisuje, což je v souladu s obsahem, ale chybí požadovaný audit).
- `src/index.ts`, `src/server.ts`: chybí process-level handler `uncaughtException`/`unhandledRejection` s redakcí (výchozí výpis Node může obsahovat text výjimky se vstupem). `server.ts` `readJson` nemá redakci chyb parsování (chyba se zahazuje, to je v pořádku) a limit 1 MB je jen u těla.
- `src/llm.ts`: klient posílá celé `messages` na `LITELLM_BASE_URL`; logování vypnout na straně proxy (provozní požadavek, v kódu nelze ověřit). Chybová zpráva `LLM backend returned HTTP n` neobsahuje tělo, tak ponechat.
- `src/payments.ts` (ř. 7, 28) a `src/server.ts` (ř. ~50): výzva v `_meta["x402/payment-required"]`, podle spiku má být `structuredContent` s `isError: true`. Hlavičky s platebním podpisem (`PAYMENT-SIGNATURE`) se nesmí logovat.
- `lobby.checkin` a `catalog` `recovery.checkpoint`: katalog už má mechanismus `text`; stub handler pro checkpoint zatím není.
- Hosting: reverzní proxy a platforma před serverem (README předpokládá TLS před ním) mají vlastní přístupové logy; ověřit před slibem v datové politice.
