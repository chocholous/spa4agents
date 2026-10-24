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
