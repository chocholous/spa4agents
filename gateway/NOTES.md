# Gateway Spagents (jádro služby, 10 nástrojů prvního vydání)

TypeScript/Node 22. MCP Streamable HTTP `/mcp` (protokol 2025-06-18, oficiální `@modelcontextprotocol/sdk`) a REST `POST /v1/<tool>` se stejnou obálkou; `GET /healthz`, `GET /status` (jen agregované metriky). Služba běží bez jazykového modelu. Závazné zadání: `docs/zadani.md`; katalog `catalog/catalog.yaml` je jediný zdroj pravdy.

## Spuštění
```
cd gateway && npm install
npm test                      # vitest (mock facilitátor, žádná síť)
npm run typecheck             # tsc --noEmit
npm run dev:mock              # lokálně: mock facilitátor + gateway (PORT=8787), bez sítě a bez klíčů
PAY_TO_ADDRESS=0x... npm start   # ostře: facilitátor x402.org (Base Sepolia), viz .env.example
```
Ověření: `curl -s -X POST localhost:8787/mcp -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'`.

Env (vše v `.env.example`, bez klíčů v repu): `PORT`, `HOST`, `BASE_URL` (nepovinné; bez něj se výzva odvozuje z hlavičky Host, funguje na IP/localhostu), `TRUST_PROXY_HOPS`, `CATALOG_PATH`, `INSTRUCTIONS_PATH`, `PAY_TO_ADDRESS` (povinné), `X402_NETWORK` (default `eip155:84532`), `X402_FACILITATOR` (`url`|`cdp`), `X402_FACILITATOR_URL` (default `https://x402.org/facilitator`), `CDP_API_KEY_ID`/`CDP_API_KEY_SECRET` (jen pro `cdp`), `SESSION_*`, `TRIAL_*`, `REFERRAL_*`. Defaulty limitů se čtou z katalogu (sekce `session`, `trial`, `referral`) a env je přepíše. Doména není nikde natvrdo. Dockerfile zde není (řeší `deploy/`).

## Struktura (`src/`)
- `catalog.ts` loader (nástroje, potřeby, limity), `config.ts` env, `money.ts` mikro-USD.
- `gateway.ts` jednotné volání pro MCP i REST; `server.ts` HTTP + MCP + REST; `index.ts` start, redakce `uncaughtException`.
- `x402.ts` brána `X402Gate` nad `@x402/core` (`x402ResourceServer`, schéma `exact`, Bazaar extension), CDP přes `@coinbase/x402`; `payments.ts` rozhraní (bez brány jsou placené nástroje nedostupné, nikdy zdarma).
- `economy.ts` ceny (sleva, kredit), trial, bonus z pozvánky, kredit zvoucího; `agents.ts` stav agenta napříč relacemi; `daily.ts` denní solené hashe (anti-farm, strop adresy, rozpočet); `session.ts` relace a úklid.
- `handlers.ts` 10 nástrojů; `content.ts` pravidlové vyhledávání a pevné texty; `metrics.ts`, `log.ts` (whitelist polí).
- `llm.ts` ponecháno kvůli pozdějším službám, nic ho nevyžaduje.

## Tok volání
dočasná relace (MCP session; REST = jednorázová) -> strop -> placený nástroj: bez platby zkušební/bonusové volání, jinak výzva 402; s platbou ověření u facilitátora (`verify`) -> relace adresy z platby -> strop relace a adresy za den (před daty) -> validace vstupu (JSON Schema, zpráva bez hodnot) -> handler -> `settle` VŽDY až po úspěšné odpovědi handleru (žádné pravidlo o prázdném výsledku) -> obálka. Chyba, timeout, zrušení nebo `invalid_input` = nevypořádá se nic a zkušební volání se vrátí.
- MCP: výzva ve `structuredContent` výsledku s `isError: true` (stejný JSON v `content[0].text`), platba v `_meta["x402/payment"]`, potvrzení v `_meta["x402/payment-response"]`. REST: 402 s hlavičkou `PAYMENT-REQUIRED`, platba v `PAYMENT-SIGNATURE`, potvrzení v `PAYMENT-RESPONSE`.
- Obálka: `ok, tool, mechanism, data, untrusted, cost, session, trial, next, [warning], [error]`. `trial` je v každé odpovědi; po vyčerpání nese `note` s cenou dalšího volání.
- `lobby.leave` nejde přes žádnou frontu: zavře relaci, zruší (AbortController) její běžící volání a zničí paměť relace. Test měří < 1 s při běžícím 15s volání. Timeouty podle mechanismu a MCP cancellation (`notifications/cancelled`) jsou ověřeny testem.

## Paměť a data (zero data retention)
Vše v RAM procesu, nic na disk (test sleduje zápisy `fs` a prohledává zdroj). Žádný audit log; logy jen přes `log()` s whitelistem (událost, kód, název nástroje). `/status`: počty, latence v koších, chybovost, bez identifikátorů. Relace se při `lobby.leave`, konci MCP session a po nečinnosti (`SESSION_IDLE_MINUTES`, default 30) odstraní z map (zůstane krátký náhrobek, aby další volání dostalo `session_closed`). Stav agenta (trial, pozvánky) je pod HMAC adresy se solí, která žije jen v procesu; denní anti-farm hashe (adresa, IP) mají sůl měnící se každý den (UTC), po výměně se zahodí (TTL <= 24 h). Restart procesu smaže vše (viz OPEN_QUESTIONS).

## Neověřeno
- Reálné vypořádání USDC na Base Sepolia a CDP facilitátor s klíči (testy jedou proti mocku ze spiku; spuštění proti `x402.org` jen došlo k načtení `/supported` a vydání výzvy).
- Codex a Gemini CLI klienti nejsou v prostředí; ověřeno jen klientem `@modelcontextprotocol/sdk`, `@x402/mcp` a `curl`.
- Zápis do x402 Bazaar po první platbě (vyžaduje CDP a skutečnou platbu).
- Síťové logy hostingu (Hetzner), reverzní proxy před serverem (TLS, Origin/DNS rebinding).
