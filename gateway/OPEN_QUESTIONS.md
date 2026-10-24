# Otevřené otázky (WP2 gateway)

Formát: otázka / kde chybí / navržená varianta (a co je implementováno).

1. **Co dělá klient bez guest passu?** / zadání: "Anonymní přístup s guest passem" / Implementováno: bez hlavičky vznikne implicitní relace svázaná s MCP session (REST: jednorázová relace na požadavek); `lobby.checkin` vrátí `guest_pass`, který lze poslat v `x-spa-guest-pass` nebo jako argument `guest_pass`. Neznámý pass = chyba `invalid_guest_pass`.
2. **Po `lobby.leave` je relace uzavřená?** / zadání: "shrnutí relace, spotřeba" / Implementováno: ano, další volání dostanou `session_closed` (REST 409); nová relace = nový checkin/nová MCP session.
3. **Počítá se `lobby.leave` (a free tools) do stropu 200 akcí?** / zadání: neurčuje / Implementováno: každé volání kromě `lobby.leave` se počítá; `leave` stropem nikdy neblokuje.
4. **USD strop relace a strop na adresu za den** / zadání: "strop v USD" bez hodnoty / Implementováno: nenastaveno (`usd_left: null`), env `SESSION_MAX_USD`, `ADDRESS_DAILY_*`; strop na adresu se neenforcuje.
5. **Turn vs. akce** / trial: `trial.max_turns_per_session = 20` vs. strop relace 200 akcí / Gateway zná jen "akci" = jedno volání tool (`tools/call`). "Turn" (kolo konverzace agenta s uživatelem/modelem?) gateway neviděna; jedna turn může obsahovat 0 až N akcí. Návrh: definovat turn jako jedno volání placeného toolu, nebo jako jedno `tools/call` (tj. totéž co akce, a pak je 20 turns přísnější než 200 akcí); rozhodne vlastník. Zatím je jen konfigurace, nic se neenforcuje (WP4).
6. **Struktura `cost.paid_with` bez plateb** / zadání: příklad "x402" / Stub vrací `"none"` a `usd: "0.00"`.
7. **Timeouty podle typu** / zadání: "každé volání má timeout" bez hodnot / Default: text, wait-hint, state-change 5 s, publish 10 s, llm 30 s (NFR p95 llm je 8 s). Při timeoutu chyba `timeout` (REST 504).
8. **`quiet.pause` `retry_after_seconds`** / zadání: hodnota neurčena / Default 30 (`PAUSE_RETRY_AFTER_SECONDS`).
9. **Které fáze vystavit v `tools/list`** / zadání: neurčuje pro F0 / Default jen F1 (`GATEWAY_PHASES`).
10. **Chybová obálka a HTTP kódy REST** / zadání: obálka jen pro úspěch / Implementováno `ok:false` + `error:{code,message}`; kódy: 400 invalid_input, 401 invalid_guest_pass, 404 unknown_tool, 409 session_closed, 429 session_limit, 402 payment_required, 499 cancelled, 504 timeout. MCP: `isError: true`, obálka v `content` i `structuredContent`.
11. **Popis toolu v MCP** / zadání: popis nese spouštěč, typ a cenu / Implementováno: `description` z katalogu + ` [type: ...; price: ...]` (generuje se, neexistuje v katalogu).
12. **`lobby.find_tool`, `lobby.checkin` stub logika** / zadání: výstup definován, algoritmus ne / `find_tool` = naivní překryv slov s popisy tools (bez LLM); `none` při nulovém překryvu. Ostatní tools = obecný stub `{stub:true}`, neúčtuje se.
13. **`lobby.concierge` a tools `llm`** jsou stub; LLM vrstva je jen rozhraní + LiteLLM klient, s konkrétním modelem/regionem se nepočítá (WP0).
14. **Ochrana HTTP** (DNS rebinding, Origin, TLS, rate limit na IP) / zadání: jen "limity na IP" / Neřešeno; server poslouchá na 127.0.0.1 a TLS/proxy se předpokládá před ním.
15. **Skutečný `catalog/catalog.yaml` neparsuje** (nevalidní YAML, viz NOTES.md) / mimo můj rozsah, katalog jsem neměnil.
16. **Datová politika (zero retention, rozhodnutí vlastníka 24. 10. 2026)** / zadání: sekce "Datová politika (závazná)", otázky DP1 až DP11 / požadavky jsou v `NOTES.md`, kód se nemění. Otázky, které se dotýkají gateway: DP1 (jaký identifikátor pro anti-zneužití, jak dlouho; návrh solený hash s denně rotující solí), DP2 (jaký provozní stav přežije relaci), DP6 (idle TTL a strop paměti relace), DP8 (zda `quiet.room` zapíše metadata do auditu), DP9 (sanitize: odmítnout, nebo vyčistit), DP11 (limity vstupu checkpointu).
17. **Co přesně je "konec relace" pro zničení paměti?** / zadání: "zničena při `lobby.leave` nebo konci relace" / návrh: zavření MCP session, strop minut, `lobby.leave`, idle TTL (hodnota neurčena, DP6). Dnes se relace jen označí `closed` a zůstane v Map.
18. **Výzva x402 v MCP** / spike: ve `structuredContent` výsledku s `isError: true`, ne v `_meta` / `payments.ts` a `server.ts` dnes `_meta` předpokládají, viz `NOTES.md`; změní WP3.
