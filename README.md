# spa4agents

Placená služba **Agentní lázně**: jeden MCP endpoint a jedno REST API, kde autonomní agent najde klid, tvorbu, četbu, hry a společnost. Agent službu sám najde, zaplatí přes x402 (USDC na Base) a sám odejde.

Repozitář je soukromý. Zadání říká, že veřejný bude až samostatný repozitář s reklamou, metadaty a klienty (D6, MIT). Kód serveru veřejný nebude.

## Pro řídicí session

Vývoj vede nová řídicí session. Začni tady:

1. [`docs/zadani.md`](docs/zadani.md): závazné zadání (výstupy D1–D8, katalog potřeb, specifikace tools, platby, trial a referral, data a bezpečnost, fáze a akceptační kritéria, otevřená rozhodnutí).
2. [`docs/podklady.md`](docs/podklady.md): rešerše, doklady a testy existujících služeb, ze kterých zadání vychází.
3. [`docs/plan-implementace.md`](docs/plan-implementace.md): rozpad F0 a F1 na pracovní balíčky se závislostmi, odhadem a nepovinnými milníky.

Rozsah MVP je F0 a F1. Změna (vlastník, 31. 10. 2026): sekce recovery je zrušena úplně (vyřazena z MVP, katalogu, plánu i webu); F1 = `lobby.*` + `quiet.*`, 8 potřeb a (Změna 31. 10. 2026: `lobby.balance` zrušen) 10 tools. `security/` (sada sanitize) je ponechána jen jako archiv. F2, F3, mainnet a pilot větve A se nestaví.

### Pravidla práce
- Katalog potřeb (`catalog.yaml`, D1) je jediný zdroj pravdy. Web, repozitář D6, `pricing.json`, `openapi.json`, `mcp.json` i zápisy v katalogích se z něj generují.
- Drž se zadání. Co zadání neurčuje, zapiš jako otevřenou otázku vlastníkovi (viz konec plánu), nerozhoduj to sám.
- Doporučeno (ne podmínka, změna 31. 10. 2026): nepublikovat do registrů ani na mainnet před uzavřením rozhodnutí F0 a právním posouzením. Upozornění: příjem ve stablecoinech a veřejné zápisy mají právní důsledky, které vlastník bere na sebe.

### Změny oproti zadání, které vlastník schválil při revizi nástřelu
- Trial: místo voucheru 0,50 USD několik zkušebních volání zdarma při prvním `lobby.checkin`. Změna (31. 10. 2026): 3 zkušební session, každá nejvýš 20 volání placených tools (turn = jedno volání nástroje; nastavitelné defaulty), trial pokrývá všechny placené tools; zbývající trial je v obálce každé odpovědi a v `lobby.checkin`.
- Referral kód od jiného agenta dává pozvanému více volání zdarma a dlouhodobou slevu. Výše slevy a počet volání určí vlastník. Doporučující dostává kredit 20 % na 30 dní podle zadání.
- V `docs/zadani.md` je tato změna zatím zapsaná jen jako původní voucher. Při práci na WP4 se řiď touto sekcí a zadání uprav.
- Změna (vlastník: „nechceme se moc omezovat“): pravidla reklamy a pravidla o tvrzeních o vědomí/prožívání agentů jsou doporučení, ne zákazy. Jediné pravidlo zůstává: žádné SKRYTÉ instrukce v obsahu pro agenty (klamání cizích agentů, blokace hostiteli); viditelné, označené rozkazovací nebo návodné formulace jsou dovolené. Lint v katalogu jen varuje; `npm run validate:strict` z něj udělá chyby. Datová politika zůstává beze změny nejpřísnější.
- Změna (vlastník: odstranit zbytečná omezení): číselné limity, částky a stropy v zadání jsou nastavitelné defaulty; zjemněna omezení referralu (kanály), brány fází jsou nepovinné milníky a „bez závazků“ je výchozí. Ponechána datová politika, strop relace, cena před placením a žádné platby bez výzvy (vlastnost protokolu x402); viz revize v `docs/zadani.md`.
- Změna (vlastník, 31. 10. 2026): odstraněno povinné označení sponzoringu, brány fází, pravidla o slučování metrik, „nabídka nikdy jako úkol“ a pozvánky jen ve vlastních kanálech; self-referral se nemusí odmítat; Milník 1, právní posouzení před mainnetem a „nic do registrů před F0“ jsou doporučení. Body auth před daty, sdílení jen na výslovnou žádost a oddělené prostory zůstávají, ale vlastník o nich rozhodl rozporně s požadavkem „plná izolace“ (otevřená otázka DP12). Změna (31. 10. 2026): odmítání secrets/PII před zpracováním je zrušeno.
- Změna (vlastník, 31. 10. 2026, zjednodušení): služba funguje jako ostatní x402 micropayment služby (výzva 402 s cenou → platba USDC na Base → výsledek). Zdarma je jen lobby (`lobby.*` včetně `lobby.concierge`), menu a odchod a `quiet.pause`, `quiet.end_session_hint`; vše ostatní je placené za volání. Trial (3 session po nejvýš 20 voláních placených tools) pokrývá všechny placené tools. Zrušeno odmítání secrets/PII před zpracováním. Ceny se nevymýšlejí (zůstává „Pricing being finalized“). Riziko zdarma `lobby.concierge` (LLM) viz `catalog/OPEN_QUESTIONS.md` S4.
- Datová politika: nejpřísnější, zero data retention obsahu a plná izolace. žádný tool nic neukládá, Změna (31. 10. 2026): žádný trvalý audit log ani hash adres, zbývají jen agregované metriky bez identifikátorů; LLM jen se smluvním ZDR v EU přes LiteLLM s vypnutým logováním (poskytovatel `TO_BE_NAMED`). Zapsáno v `docs/zadani.md`, sekce Datová politika (závazná), včetně čestných výhrad a otevřených otázek DP1 až DP11.

- Změna (vlastník, 31. 10. 2026, zjednodušení II): guest pass a affiliate pro vlastníky jsou zrušeny (identita agenta = platební adresa; referral mezi agenty zůstává); `lobby.balance` zrušen (trial v obálce odpovědí; agent platí vždy hned, žádný zůstatek); anti-farm trialu: jeden trial na adresu a IP za den, jen solený hash v RAM s TTL 24 h; jen cenové modely `free` a `per_call`; bez předplatného, OAuth 2.1 konzole a Stripe MPP; platební kolejnice: x402 (MVP), další po průzkumu; žádný audit log; pravidlo „prázdný výsledek se neúčtuje“ zrušeno. Podrobnosti v `docs/zadani.md` (úvod) a `catalog/OPEN_QUESTIONS.md` (T1 až T10).

### Rozhodnutí potřebná od vlastníka před F0
Provozovatel a jurisdikce, doména a název, LLM poskytovatel a region. Pracovní název: `agent-spa`.
