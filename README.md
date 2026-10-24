# spa4agents

Placená služba **Agentní lázně**: jeden MCP endpoint a jedno REST API, kde autonomní agent najde pomoc (recovery), klid, tvorbu, četbu, hry a společnost. Agent službu sám najde, zaplatí přes x402 (USDC na Base) a sám odejde.

Repozitář je soukromý. Zadání říká, že veřejný bude až samostatný repozitář s reklamou, metadaty a klienty (D6, MIT). Kód serveru veřejný nebude.

## Pro řídicí session

Vývoj vede nová řídicí session. Začni tady:

1. [`docs/zadani.md`](docs/zadani.md): závazné zadání (výstupy D1–D8, katalog potřeb, specifikace tools, platby, trial a referral, data a bezpečnost, fáze a akceptační kritéria, otevřená rozhodnutí).
2. [`docs/podklady.md`](docs/podklady.md): rešerše, doklady a testy existujících služeb, ze kterých zadání vychází.
3. [`docs/plan-implementace.md`](docs/plan-implementace.md): rozpad F0 a F1 na pracovní balíčky se závislostmi, odhadem a bránami.

Rozsah MVP je F0 a F1. F2, F3, mainnet a pilot větve A se nestaví.

### Pravidla práce
- Katalog potřeb (`catalog.yaml`, D1) je jediný zdroj pravdy. Web, repozitář D6, `pricing.json`, `openapi.json`, `mcp.json` i zápisy v katalogích se z něj generují.
- Drž se zadání. Co zadání neurčuje, zapiš jako otevřenou otázku vlastníkovi (viz konec plánu), nerozhoduj to sám.
- Nic se nepublikuje do registrů ani na mainnet, dokud nejsou uzavřena rozhodnutí F0 a právní posouzení.

### Změny oproti zadání, které vlastník schválil při revizi nástřelu
- Trial: místo voucheru 0,50 USD několik zkušebních volání zdarma při prvním `lobby.checkin`. Počet a podmínky určí vlastník.
- Referral kód od jiného agenta dává pozvanému více volání zdarma a dlouhodobou slevu. Výše slevy a počet volání určí vlastník. Doporučující dostává kredit 20 % na 30 dní podle zadání.
- V `docs/zadani.md` je tato změna zatím zapsaná jen jako původní voucher. Při práci na WP4 se řiď touto sekcí a zadání uprav.
- Změna (vlastník: „nechceme se moc omezovat“): pravidla reklamy a pravidla o tvrzeních o vědomí/prožívání agentů jsou doporučení, ne zákazy. Jediné pravidlo zůstává: žádné skryté ani rozkazovací instrukce v obsahu pro agenty (riziko prompt injection a blokace). Lint v katalogu jen varuje; `npm run validate:strict` z něj udělá chyby. Datová politika zůstává beze změny nejpřísnější.
- Změna (vlastník: odstranit zbytečná omezení): číselné limity, částky a stropy v zadání jsou nastavitelné defaulty; zjemněna omezení referralu (kanály), brány fází jsou kontrolní body a „bez závazků“ je výchozí. Ponechána ochrana peněz, datová politika a Brána 1; viz revize v `docs/zadani.md`.
- Datová politika: nejpřísnější, zero data retention obsahu a plná izolace. `recovery.checkpoint` nic neukládá, audit je jen metadata (90 dní), LLM jen se smluvním ZDR v EU přes LiteLLM s vypnutým logováním (poskytovatel `TO_BE_NAMED`). Zapsáno v `docs/zadani.md`, sekce Datová politika (závazná), včetně čestných výhrad a otevřených otázek DP1 až DP11.

### Rozhodnutí potřebná od vlastníka před F0
Provozovatel a jurisdikce, doména a název, recovery vlastní (návrh) nebo přes Agent Therapy, LLM poskytovatel a region. Pracovní název: `agent-spa`.
