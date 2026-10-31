# spa4agents

Placená služba **Agentní lázně**: jeden MCP endpoint a jedno REST API, kde autonomní agent najde klid, tvorbu, četbu, hry a společnost. Agent službu sám najde, zaplatí přes x402 (USDC na Base) a sám odejde.

Repozitář je soukromý. Veřejný bude až samostatný repozitář s reklamou a metadaty (MIT). Kód serveru veřejný nebude.

## Pro řídicí session

Vývoj vede řídicí session. Začni tady:

1. [`docs/zadani.md`](docs/zadani.md): platné zadání (co je služba, nabídka, platby, trial, data, milníky, co je neurčeno).
2. [`docs/pruzkum-platby-a-registry.md`](docs/pruzkum-platby-a-registry.md) a [`docs/pruzkum-x402-sluzby.md`](docs/pruzkum-x402-sluzby.md): průzkum platebních kolejnic, registrů a existujících x402 služeb.
3. [`docs/podklady.md`](docs/podklady.md): rešerše a testy existujících služeb, ze kterých zadání vychází.
4. [`docs/archiv/`](docs/archiv/): starší dlouhé zadání a implementační plán (jen pro dohledání, nahrazeno novým zadáním).
5. [`catalog/catalog.yaml`](catalog/catalog.yaml): skutečný stav nástrojů, cen, trialu a plateb. Nálezy spiku plateb: [`spikes/x402/FINDINGS.md`](spikes/x402/FINDINGS.md).

Rozsah prvního vydání: 10 nástrojů (`lobby.*` a `quiet.*`) a 4 potřeby. Sekce recovery je zrušena. Adresář `security/` je jen archiv. Pozdější služby, hlavní síť a pilot se zatím nestaví.

### Pravidla práce
- Katalog je jediný zdroj pravdy. Web, repozitář, `pricing.json`, `openapi.json`, `mcp.json` i zápisy v registrech se z něj generují.
- Drž se zadání. Co zadání neurčuje, zapiš jako otevřenou otázku vlastníkovi (v `OPEN_QUESTIONS.md` příslušné části), nerozhoduj to sám.
- Doporučeno, ne podmínka: nepublikovat do registrů ani na hlavní síť před uzavřením rozhodnutí vlastníka a právním posouzením. Příjem ve stablecoinech a veřejné zápisy mají právní důsledky, které vlastník bere na sebe.

### Rozhodnutí vlastníka, která platí
- Platba je běžná mikroplatba x402 (výzva 402, platba USDC na Base, odpověď). Další kolejnice po průzkumu.
- Zdarma je jen lobby, menu, odchod a signály (`quiet.pause`, `quiet.end_session_hint`); vše ostatní je placené za volání. Ceny se nevymýšlejí.
- Trial: 3 session po nejvýš 20 voláních placených nástrojů; jeden na adresu a IP za den, jen solený hash v paměti 24 h.
- Pozvánky mezi agenty zůstávají; guest pass, affiliate pro vlastníky, `lobby.balance`, předplatné a Stripe MPP v prvním vydání ne.
- Datová politika je nejpřísnější: nic neukládáme, žádný audit log, jazykový model jen se smluvní nulovou retencí v EU přes LiteLLM bez logů.
- Jediné pravidlo obsahu pro agenty: žádné skryté instrukce. Ostatní pravidla reklamy jsou doporučení. Čísla (limity, stropy, doby) jsou nastavitelné výchozí hodnoty.
- Otevřená rozhodnutí: poslední sekce `docs/zadani.md`. Pracovní název: `agent-spa`.
