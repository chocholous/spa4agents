# Průzkum: platební kolejnice pro agenty a registry/katalogy

Stav k 31. 10. 2026. Zdroje: primární dokumentace (WebFetch) označena jako [P], sekundární weby/blogy jako [S]. Co se nepodařilo ověřit, je označeno „neověřeno“. Data u URL jsou datum poslední aktualizace/čtení, pokud web neuvádí jiné.

---

## 1) Platební kolejnice

### Souhrnná tabulka

| Kolejnice | Co to je | Zralost (31. 10. 2026) | Agent bez člověka | Příjem (SDK / facilitátor) | Poplatky | Vedle x402 na 1 endpointu |
|---|---|---|---|---|---|---|
| **x402** (HTTP 402, USDC na Base/Solana/…) | Server vrátí 402 s požadavky, klient podepíše platbu a zopakuje požadavek; facilitátor ověří a vypořádá. | Produkce. x402.org: „production-ready“, aktualizováno 27. 10. 2026 [P] https://www.x402.org ; CDP: >100 mil. plateb, 28 mil. USD objemu [P] https://docs.cdp.coinbase.com/x402/seller/facilitator.md | Ano | `@x402/core`, `@x402/evm`, `@x402/hono` aj. + facilitátor (CDP; testnet `x402.org/facilitator`) [P] https://docs.stripe.com/payments/machine/x402 | Protokol 0; CDP facilitátor: prvních 1 000 on-chain tx/měsíc zdarma, dál 0,001 USD/tx, ověření zdarma [P] https://docs.cdp.coinbase.com/x402/seller/facilitator.md | (základ) |
| **MPP – Machine Payments Protocol** | Otevřený standard M2M plateb přes HTTP 402 (Challenge → Credential → Receipt); rail-agnostický (Tempo, Stripe karty/SPT, Lightning, Solana, EVM, Stellar…). Spoluautoři **Stripe a Tempo**; start 18. 3. 2026 [S] https://stripe.com/it/blog/machine-payments-protocol , https://www.theblock.co/post/394131/tempo-mainnet-goes-live-with-machine-payments-protocol-for-agents | Produkce u Tempo/Stripe; Stripe-Version `2026-07-29.preview` (preview API) [P] https://docs.stripe.com/payments/machine/mpp ; stav jednotlivých railů (Solana, Lightning) se mezi zdroji liší, neověřeno | Ano (stablecoin); SPT karty: agent s Link Agent Wallet, platba je předem vymezený grant | `mppx` (TS; Express/Hono/Next/Elysia), Python, Rust, Go, Ruby [P] https://mpp.dev ; Stripe: `npm i mppx stripe`, deposit address + profil | Stripe uvádí jen minima (SPT karta 0,50 USD; stablecoin 0,01 USDC); sazby poplatků na stránce nejsou → neověřeno [P] https://docs.stripe.com/payments/machine | Ano: mpp.dev uvádí návod „Use MPP with x402“ a adaptéry x402 v mppx [P] https://mpp.dev (podstránka vrací 404, detail neověřeno); Cloudflare: MPP „backwards-compatible with x402“ [P] https://developers.cloudflare.com/agents/agentic-payments/mpp |
| **Stripe x402 (stablecoin přes Stripe)** | Stripe přijme x402 USDC na Base/Tempo/Solana a zapíše jako PaymentIntent; výplata ve fiat. | Preview API (`2026-05-27.preview`) [P] https://docs.stripe.com/payments/machine/x402 | Ano | CDP facilitátor + Stripe deposit address | Stripe poplatky neověřeno; CDP viz výše | Je to x402 sám |
| **L402 (Lightning)** | HTTP 402 + macaroon + Lightning faktura; server-side reverzní proxy Aperture, klient `lnget`. | Nástroje vydány 11. 2. 2026; web L402 spuštěn ~30. 7. 2026 [S] https://lightning.engineering/posts/2026-02-11-ln-agent-tools/ , https://thedefiant.io/news/infrastructure/lightning-labs-launches-site-for-l402-bitcoin-agent-payments ; reálné produkční využití neověřeno (únorový zdroj: „nula produkčních endpointů“) [S] https://buttondown.com/satsforbots/archive/sats-for-bots-1-agents-have-wallets-now/ | Ano (agent s Lightning uzlem/peněženkou) | Aperture (self-host), případně MPP Lightning metoda | Routovací poplatky sítě Lightning; jinak neověřeno | Technicky samostatná výzva `WWW-Authenticate: L402`; lze přidat jako další výzvu nebo přes MPP „lightning“ metodu (neověřeno v praxi) |
| **Circle Nanopayments (Gateway)** | Gas-free USDC platby od 0,000001 USD; kupující podepíše EIP-3009 autorizaci, Gateway dávkově vypořádá. Implementuje x402. | Mainnet od 29. 4. 2026 (testnet březen 2026) [S] https://circle.com/blog/nanopayments-powered-by-circle-gateway-is-now-live-on-mainnet ; dokumentace nespecifikuje beta/GA [P] https://developers.circle.com/gateway/nanopayments.md | Ano | `@circle-fin/x402-batching` [S]; vyžaduje EOA podpisy (ne ERC-1271) [P] | Dokumentace: kupující bez gas, prodávající „bez poplatku za transakci“; poplatky Gateway neověřeno | Ano – je to x402 scheme (batching), stejný endpoint, jiný `accepts` záznam |
| **AP2 (Google)** | Autorizační vrstva (podepsané mandáty) pro agentní nákupy; x402 je jeho krypto platební metoda (a2a-x402 extenze). | Návrh/referenční SDK v0.2 (duben 2026), předáno FIDO Alliance [S]; AP2-nativní x402 extenze podle nejnovějšího zdroje (6. 10. 2026) stále nehotová [S] https://www.coinsdo.com/en/blog/x402-ap2-agent-payment-protocols-explained , https://www.zinc.com/blog/what-is-ap2 | Částečně (mandát schvaluje člověk předem) | Žádná zralá seller knihovna; neověřeno | N/A | Nelze „vedle“ – jiná vrstva (nad x402). Neimplementovat |
| **ACP (OpenAI + Stripe)** | Protokol pro checkout nákupů zboží v ChatGPT (Shared Payment Token). Není to mikroplatba za API. | Spec 2026-04-17; Instant Checkout v ChatGPT stažen/přeorientován v březnu 2026 (zdroje se rozcházejí) [S] https://www.digitalcommerce360.com/2026/02/16/openai-expands-agentic-commerce-push/ | Ne (nákup se spotřebitelem) | Stripe | Stripe sazby | Nerelevantní pro mikroplatby; SPT karty jdou přes MPP |
| **Visa Trusted Agent Protocol / Intelligent Commerce, Mastercard Agent Pay** | Karetní tokenizace a ověření identity agenta pro e-commerce. | Pilotní, širší adopce až 2027+ [S] https://atxp.ai/blog/visa-trusted-agent-protocol-explained , https://eco.com/support/en/articles/15192003 ; primární dokumentace Visa/Mastercard neověřena | Částečně | Přes acquirera (Adyen, Fiserv…) | Karetní interchange – nehodí se pro mikroplatby | Ne; Visa rozšířila MPP o karty [S] – cesta přes MPP |
| **Skyfire (KYAPay)** | Identity-linked platební tokeny (JWT) předfinancované USDC; prodejce účtuje po dodání. | Produkce, ale seller-onboarding z oficiálních docs neověřen [S] https://stablecoininsider.org/how-to-create-a-skyfire-kyapay-token-for-usdc/ | Ano | Skyfire seller účet/SDK (neověřeno) | Neověřeno | Samostatná hlavička/token; kombinace s x402 neověřena |
| **Nevermined** | Platební brána + x402 facilitátor s metriky/kredity; TS a Python SDK. | Produkce (dle vlastní dokumentace) [S] https://nevermined.ai/docs/getting-started/ | Ano | Nevermined SDK | Neověřeno | Používá x402 – kompatibilní |
| **Cloudflare Monetization Gateway / Pay Per Crawl** | Cloudflare brána nad x402 | Waitlist/early access (červenec 2026) [S] https://wavect.io/blog/x402-payments-comparison-2026/ | Ano | Cloudflare | Neověřeno | Používá x402 |

Poznámka k x402 Foundation: x402 Foundation (Coinbase + Cloudflare, ohlášena září 2025; podle sekundárních zdrojů pod Linux Foundation, spuštění 14. 7. 2026) [S] https://www.theblock.co/post/372064/cloudflare-coinbase-launch-x402-foundation , https://xenospectrum.com/en/linux-foundation-x402-agent-payments/ – členy zdroje uvádějí AWS, Google, Microsoft, Stripe, Visa, Mastercard; neověřeno z primárního zdroje.

### Multi-rail 402 výzva (x402 + MPP na jednom endpointu)

- MPP: server vrací jednu hlavičku `WWW-Authenticate: Payment ...` **na každou metodu** (Tempo, Stripe, Lightning), klient vybere a pošle `Authorization: Payment` [P] https://mpp.dev/guides/multiple-payment-methods .
- x402 v2: požadavky v hlavičce `payment-required` (base64), platba v hlavičce klienta [P] https://docs.stripe.com/payments/machine/x402 .
- Dvě zdroje (mpp.dev, Cloudflare) tvrdí, že `mppx` umí obsloužit nativní MPP i x402 klienty ze stejného endpointu [P]. Jeden dodavatel (Agent402.Tools) uvádí dual-stack 402 odpověď s oběma hlavičkami [S] https://agent402.tools/what-is-mpp . **Neověřeno:** jak se chová konkrétní klient, když dostane obě hlavičky současně → před nasazením nutný vlastní test s klienty `@x402/fetch` a `mppx`.
- Discovery metadata MPP: OpenAPI `x-payment-info.offers[]` (aktualizace spec 27. 4. 2026) [S] https://mpp.dev/blog/multi-method-discovery ; spec je podle sekundárního zdroje draft, runtime 402 výzva je autoritativní.

### Doporučené pořadí

1. **MVP: x402 (USDC na Base) přes CDP facilitátor.** Nejzralejší, největší počet agentních klientů, zdarma do 1 000 tx/měs., automatický zápis do Bazaar.
2. **Hned potom (nízká náročnost): MPP přes `mppx` – metoda Tempo (stablecoin) a Stripe SPT (karty).** Přidá druhou velkou kolejnici a karty pro agenty s Link wallet; podmínka: Stripe účet, stablecoin jen USA mimo NY nebo žádost na machine-payments@stripe.com (30+ zemí) [P] https://docs.stripe.com/payments/machine . Upozornění: karty mají minimum 0,50 USD, tedy nehodí se pro skutečné mikroplatby; sub-centové ceny řešit MPP sessions (min. vypořádání 0,01 USDC).
3. **Circle Nanopayments** (x402 scheme `batch`): pro ceny pod ~0,001 USD, kde gas/poplatek CDP zabíjí marži; stejný endpoint.
4. **L402/Lightning** přes MPP Lightning metodu nebo Aperture: až bude poptávka (Bitcoin-nativní agenti).
5. **Zatím ne:** AP2, ACP, Visa TAP, Mastercard Agent Pay (jiný problém: nákupy zboží/karty, ne mikroplatby za API); Skyfire/Nevermined jen na vyžádání zákazníků.

Poznámka k „všem druhům plateb“: rozumné jádro jsou x402 + MPP (+ Nanopayments jako x402 scheme). Zbytek protokolů nepřináší reálné příjmy z mikroplateb nebo nemá zralý seller SDK.

---

## 2) Registry a katalogy

### MCP registry / directories

| Místo | URL | Jak zapsat | Požadavky | Zdarma | Doba indexace | Bez veřejného repa? |
|---|---|---|---|---|---|---|
| **Oficiální MCP Registry** (preview, mohou nastat resety dat) | https://registry.modelcontextprotocol.io , návod https://modelcontextprotocol.io/registry/quickstart | CLI `mcp-publisher init/login/publish`; GitHub Action (OIDC) | `server.json` s `remotes` (streamable-http, veřejná URL) a/nebo `packages`; jmenný prostor `io.github.user/*` (GitHub login) nebo `com.domena/*` (DNS TXT / HTTP `/.well-known/mcp-registry-auth`); u balíčků ověření `mcpName` v package.json / `mcp-name:` v README; registr hostuje jen metadata [P] https://modelcontextprotocol.io/registry/remote-servers.md , https://modelcontextprotocol.io/registry/authentication.md | Ano (nemá review [S]) | Okamžitě v API; navazující adresáře (PulseMCP) sbírají denně/týdně | **Ano** – čistý remote server s doménovou autentizací (DNS/HTTP) nepotřebuje repo ani balíček |
| **PulseMCP** | https://www.pulsemcp.com | Sbírá z oficiálního registru; **ruční submit je pozastaven** (stránka z 3. 9. 2026) [P] https://www.pulsemcp.com/submit | Zápis do oficiálního registru | Ano | Cca týden po zápisu do registru (GitHub diskuse, neověřeno) [S] https://github.com/modelcontextprotocol/.github/discussions/669 ; případně e-mail hello@pulsemcp.com | Ano (přes registr) |
| **Glama** | https://glama.ai/mcp/servers (113 428 serverů k 31. 10. 2026) [P] | „Add Server“ s GitHub URL přes OAuth; konektory (remote) lze „claimnout“ HTTP výzvou nebo DNS tokenem; volitelný `glama.json` | README, LICENSE, ověřitelný server, aspoň 1 tool; hodnotí license/quality/maintenance (písmenné známky), pravidelně skenuje [S] (Glama stránky skóre) | Ano (hosting/gateway placené) | Řádově hodiny po rozpoznání licence (neověřeno přesněji) | Částečně: **GitHub repo je cesta pro server**; remote konektor jde i bez repa přes DNS/HTTP claim (neověřeno detailně) |
| **Smithery** | https://smithery.ai/new , docs https://www.smithery.ai/docs/build/publish.md | Web form nebo `smithery mcp publish "https://…/mcp" -n @org/server` | Streamable HTTP, OAuth pokud je auth; povolit User-Agent `SmitheryBot/1.0` nebo dát `/.well-known/mcp/server-card.json`; Verification checklist v Settings [P]. Komunitní zpráva: nové listingy začínají jako unlisted, je třeba přepnout (neověřeno) [S] | Cena v dokumentu neuvedena → neověřeno | Skenování po publikaci | **Ano** (URL způsob) |
| **mcp.so** | https://mcp.so/submit | Formulář (URL repa/serveru, náhled, review); komunitní zdroj uvádí i GitHub issue „Submit: …“ v chatmcp/mcpso a placený formulář [S] | Repo nebo URL serveru | Neověřeno (zdroje se rozcházejí) | Po review, neověřeno | Ano (stačí URL serveru) |
| **awesome-mcp-servers** (punkpeye) | https://github.com/punkpeye/awesome-mcp-servers | PR do README, abecedně v kategorii; PR s `🤖🤖🤖` v názvu = fast-track pro agenty [P] https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/CONTRIBUTING.md | **Veřejné GitHub repo**, které si uživatel sám spouští; čistě remote hostované patří do jiného seznamu | Ano | Dny až týdny (závisí na maintainerech) | **Ne** (pro tento seznam); remote verze: https://github.com/punkpeye/awesome-remote-mcp-servers (pravidla neověřena) |
| **Docker MCP Catalog** | https://github.com/docker/mcp-registry | PR do repa `docker/mcp-registry` | Docker image (Docker build+podpis nebo vlastní image) | Ano | „do 24 h“ po schválení PR [S] https://docs.docker.com/ai/mcp-catalog-and-toolkit/catalog.md | Ne (image + PR) – pro čistě remote server nevhodné |
| **MCP Server Finder** | e-mail info@mcpserver.com | E-mail s názvem, popisem, repem, kategorií [S] diskuse #669 | – | Ano | Neověřeno | Neověřeno |
| **Anthropic Connectors Directory** | https://support.claude.com/en/articles/11596036-anthropic-mcp-directory-faq | Formulář „Connectors Directory server review“ [S] | Funkční remote server, OAuth 2.0 pokud auth, Streamable HTTP, anotace nástrojů, testovací účet, dokumentace, podpora | Ano | Neověřeno (ruční review) | Ano (remote) |
| **GitHub MCP Registry, Cline/Cursor adresáře, mcpmarket, MCPHub aj.** | – | – | Neověřeno (nenalezeno ve vyhledávání) | – | – | – |

### Katalogy pro x402 / MPP / platby

| Místo | URL | Jak zapsat | Požadavky | Zdarma | Doba | Poznámky |
|---|---|---|---|---|---|---|
| **x402 Bazaar (CDP discovery)** | https://docs.cdp.coinbase.com/x402/seller/get-discovered , katalog `/v2/x402/discovery/resources` | Bez registrace: deklarovat `extensions.bazaar` v route (TS `declareDiscoveryExtension`, Python `declare_discovery_extension`), ověřit validačním endpointem (bez API klíče), provést **jednu úspěšnou placenou platbu přes CDP facilitátor** s `paymentPayload.resource` [P] | Veřejná HTTPS URL, vstupní schémata + příklady, text metadat nesmí „instruovat agenta“ (content policy); u MCP nástrojů musí příklad vrátit payment-required | Ano (+ poplatky facilitátoru) | Indexace do 15 min po settlementu, ranking přepočet po 6 h; **záznam bez settlementu 30 dní zmizí** [P] | Hodnotí kvalitu služby, pokrytí kategorií, zapadnutí do ekosystému (editorial); >23 000 zdrojů. Nevyžaduje repo |
| **x402 ekosystém (x402.org)** | https://www.x402.org/ecosystem | Postup přihlášení na stránce nenalezen → neověřeno | – | – | – | Facilitátor x402.org má vlastní katalog, odlišný od CDP Bazaar [P CDP docs] |
| **x402scan** | (web neověřen) | Komunitní zdroj: registrace přes `npx agentcash register <url>`, `/.well-known/x402` má obsahovat jen placené endpointy [S] https://zenn.dev/segawa4321/articles/2fb7357147954a | – | neověřeno | – | Jeden blog, může být zastaralý |
| **MPP Services directory** | https://mpp.dev/services , API https://mpp.dev/api/services , MCP `mpp.dev/mcp/services` [S] https://tempo.xyz/docs/guide/machine-payments/discover-services | Publikovat discovery metadata podle https://mpp.dev/advanced/discovery (OpenAPI `x-payment-info`); přesný postup zápisu neověřen | Aktivní služba s OpenAPI metadaty se upřednostňuje [S] | neověřeno | neověřeno | Discovery je advisory, runtime 402 je autoritativní |
| **Stripe Directory (machine payments)** | https://docs.stripe.com/directory.md | E-mail machine-payments@stripe.com: název firmy, Stripe account ID, profile ID, odkaz na `llms.txt` a agent skills, SPT/stablecoin, 1–3 ukázkové prompty [P] https://docs.stripe.com/payments/machine | Stripe účet + integrace MPP/x402 přes Stripe; **nutný `llms.txt`** | Ano | Neověřeno | Nevyžaduje repo |

### REST / OpenAPI / llms.txt

| Místo | URL | Jak | Poznámka |
|---|---|---|---|
| APIs.guru OpenAPI Directory | https://github.com/APIs-guru/openapi-directory | PR s OpenAPI specifikací (postup konkrétně neověřen) | Jen veřejně dostupná API; musí být trvalé a užitečné [S] |
| llms.txt adresáře | např. https://github.com/generaltranslation/llmstxt-site (PR do `data.json`); jiný adresář s formulářem a ruční kurací [S] | PR nebo formulář | Hodnota nízká/nejistá; levné. Vlastní `/llms.txt` je nutný i pro Stripe Directory |
| Vlastní discovery soubory | `/.well-known/mcp/server-card.json` (Smithery), `/.well-known/x402` (x402scan), `/openapi.json` s `x-payment-info`, `/llms.txt` | Hostovat na vlastní doméně | Agent Discovery (`/.well-known/agent.json`, ADP) jsou jen Internet-Drafty [S] – nepřikládat váhu |

### Doporučený postup zápisu

1. Vlastní doména + OpenAPI (`x-payment-info`) + `/llms.txt` + `/.well-known/mcp/server-card.json`.
2. Oficiální MCP Registry s `remotes` a DNS/HTTP autentizací (`com.<domena>/…`) – bez veřejného repa, za 5 minut; ostatní adresáře (PulseMCP aj.) se z něj plní.
3. Po prvním reálném x402 settlementu přes CDP: Bazaar (automaticky). Udržovat provoz, jinak po 30 dnech vypadne.
4. Smithery (URL), mcp.so (submit), Glama (claim), Anthropic Connectors (formulář; vyžaduje OAuth, pokud je auth).
5. Stripe Directory a MPP Services po přidání MPP.
6. PR do awesome-mcp-servers / Docker catalog **jen pokud bude veřejné repo** (obojí ho vyžaduje).

## Neověřeno / otevřené body

- Chování klientů při dual-stack 402 odpovědi (x402 `payment-required` + MPP `WWW-Authenticate: Payment`); nutný test.
- Stripe poplatky za stablecoin/MPP (stránky je neuvádějí); Circle Gateway poplatky; Skyfire/Nevermined poplatky.
- Postup zápisu na x402.org/ecosystem, x402scan, mpp.dev/services; cena Smithery; zda je mcp.so submit placený.
- Přesné datum a členové x402 Foundation pod Linux Foundation (jen sekundární zdroje).
- AP2 a Visa/Mastercard: jen sekundární zdroje, bez primární dokumentace.
- Oficiální MCP Registry je v „preview“ (možné resety dat) [P]; nesouhlas mezi komunitními zdroji o postupu PR vs. `mcp-publisher` – platný je `mcp-publisher` dle oficiální dokumentace.
