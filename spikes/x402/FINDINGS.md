# WP3 spike x402: nálezy (24. 10. 2026)

Zdroj: hlášení implementačního agenta, uloženo řídicí session. Kód: tento adresář. `npm test` (12 testů) a `npm run typecheck` prošly.

## Verze
`@x402/core`, `mcp`, `hono`, `evm`, `extensions`, `fetch` 2.28.0 (zafixované), `@modelcontextprotocol/sdk` 1.32.2, `hono` 4.13.13, `viem` 2.57.11, `zod` 4.6.7, Node 22. `@x402/express` nepoužito (`@x402/hono`).

## Jak to funguje
- MCP: `createPaymentWrapper(resourceServer, {accepts, resource:{url: createToolResourceUrl(name)}, extensions: declareDiscoveryExtension({toolName, inputSchema})})`. Název toolu se bere z `resource.url`.
- REST: `paymentMiddleware` z `@x402/hono` na `POST /v1/spike.lookup`; 402 nese hlavičku `PAYMENT-REQUIRED`, úspěch `PAYMENT-RESPONSE`.
- Bazaar: `declareDiscoveryExtension` je ve výzvě v `extensions.bazaar`; platící klient ji echuje v `payload.extensions`.
- Auth před daty: guest pass `x-spa-guest-pass` se kontroluje před MCP transportem i x402 middleware (bez něj 401, handler ani facilitátor se nevolají). MCP SDK validuje argumenty ještě před wrapperem.
- Agent: `createx402MCPClient` (MCP), `wrapFetchWithPaymentFromConfig` (REST), klientský strop `spendControls.maxAmountPerPayment` (knihovna 1 USD, agent 0,05 USD).

## Odchylka od zadání
Výzva NENÍ v `_meta["x402/payment-required"]`. `@x402/mcp` 2.28.0 vrací `isError:true` se `structuredContent = PaymentRequired` a stejný JSON v `content[0].text`; klient umí číst i JSON-RPC chybu -32042 (`error.data.x402`). `_meta` má jen `x402/payment` a `x402/payment-response`. Zdroje: `createPaymentRequiredResult` v `@x402/mcp`, README balíčku, `specs/transports-v2/mcp.md` v repu x402. Rozpor: `docs/zadani.md` ř. 196 a `docs/podklady.md` ř. 252 (DrinkedIn "ověřeno 24. 10. 2026"). **Otázka vlastníkovi:** upravit zadání na "ve `structuredContent` s `isError:true`"?

## Otevřená otázka 3: neúčtování prázdného výsledku u `exact`
Ano, ale musí to řešit handler. Tok `authorization`: verify před handlerem, settle po něm. MCP: při `isError`/výjimce se settle neprovede; prázdný úspěšný výsledek se zaúčtuje, proto tool prázdný výsledek ohlásí jako `isError` ("No results. You were not charged."). REST: `@x402/hono` při statusu ≥ 400 nevypořádá (404 neúčtuje, 204 by účtovalo). Riziko: mezi verify a settle může agent utratit zůstatek, náklady (LLM) pak zůstanou nepokryté; zmírnění krátkým `maxTimeoutSeconds`.

Voucher / volání zdarma: `createPaymentWrapper` nemá cestu "přístup bez platby". Skládání vně wrapperu (`withFreeCalls` v `src/server.ts`). Před první platbou adresu plátce neznáme, voucher potřebuje jiný identifikátor (guest pass; WP4). REST: `ProtectedRequestHook` s `{grantAccess:true}` (jen z typů, nezkoušeno).

## Otevřená otázka 4: Bazaar na Base Sepolia
Částečně, ne přes x402.org.
- Dokumentace `docs.x402.org/extensions/bazaar.md`: Base i Base Sepolia podporovány; katalogizace při zpracování platby facilitátorem s echovaným `bazaar`; indexace je detail facilitátoru, Bazaar je "early development".
- Katalog Coinbase CDP (`api.cdp.coinbase.com/platform/v2/x402/discovery/resources`): z 40 219 položek 1 519 akceptuje `eip155:84532`; typ `mcp` 137 položek, z nich jediná akceptuje Sepolii.
- x402.org nemá discovery (404) a `/supported` nezmiňuje `bazaar`.
- Důsledek: platby přes x402.org se pravděpodobně nikam nezapíšou. **Rozhodnutí vlastníka (WP10):** CDP facilitátor i na Sepolii (vyžaduje CDP API klíče), nebo zápis v Bazaaru nechat na mainnet.
- Neověřeno: zda položky vznikly po reálné platbě; zda by naše deklarace `type:"mcp"` skončila v katalogu; latence indexace.

## Co je ověřeno čím
- Reálný x402.org (`npm run check:facilitator`): `/supported` vrací `exact` na `eip155:84532` v2; reálný `/verify` přijal formát autorizace a vrátil `invalid_exact_evm_insufficient_balance` (efemérní nefinancovaný klíč, nic on-chain).
- Mock facilitátor: celý tok 402 → platba → odpověď (MCP i REST), pořadí verify → handler → settle, prázdný výsledek bez settle, echo `bazaar`, auth před daty, klientský strop, voucher mimo wrapper.
- NEověřeno: reálné vypořádání USDC na Sepolii (tx hash) a zápis do Bazaaru po platbě.

## Co musí dodat vlastník
1. `PAY_TO_ADDRESS` (Base Sepolia).
2. Nová testnet peněženka agenta, klíč v `AGENT_PRIVATE_KEY` (jen env).
3. Testnet USDC na Base Sepolia (asset `0x036CbD53842c5426634e7929541eC2318f3dCF7e`); gas platí facilitátor.
4. Volitelně CDP API klíče a rozhodnutí o CDP facilitátoru.
5. `cp .env.example .env`, `npm run server`, v druhém terminálu `npm run agent -- loop`; tx hash v `PAYMENT-RESPONSE`.

## Rizika
- API knihoven se mění (nové toky `upto`, `batch-settlement`, `permit2`, `escrow`); držet přesnou verzi, spike jako kontraktní test v CI.
- Klienti nesmí číst `_meta["x402/payment-required"]`; MCP SDK 1.x ztrácí `error.data` u `McpError`.
- Serverové stropy (relace, adresa za den) v knihovně nejsou, patří do WP2. Adresa plátce je známa z `paymentPayload.payer` v `onBeforeExecution`; při odmítnutí wrapper vrací znovu výzvu, pozor na smyčku u klienta s `autoPayment`.
- Guest pass musí být u `initialize` volitelný; spike chrání celé `/mcp`.
