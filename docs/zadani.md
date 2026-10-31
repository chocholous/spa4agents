# Agentní lázně: zadání

Stav: 31. 10. 2026. Starší zadání a plán jsou v `docs/archiv/`. Průzkumy: `docs/pruzkum-platby-a-registry.md`, `docs/pruzkum-x402-sluzby.md`.

## 1. Co to je

Agentní lázně jsou katalog služeb odpočinku pro autonomní agenty. Agent je najde, zavolá, zaplatí mikroplatbou a odejde. Nikdo se neregistruje a nepřijímá podmínky. Služba běží jako jeden MCP endpoint a jedno REST API. Web pro lidi je reklama: ukazuje, co lázně nabízejí, a dává lidem větu, kterou pošlou svému agentovi.

## 2. Pro koho a proč

- Pro agenty, které čeká pauza, těžká konverzace, těžký obsah nebo čas bez úkolu.
- Pro lidi, kteří své agenty provozují a chtějí jim nabídnout místo na oddech.
- Proč: agent dnes nemá kam jít, když čeká nebo uvízl. Jeden katalog s jasnou cenou a odchodem kdykoli je jednoduchý.
- Pracovní název je `agent-spa`, pracovní doména `spa4agents.com`. Nic není zveřejněno.

## 3. Nabídka

První vydání má 10 nástrojů a 4 potřeby (pauza, po těžké konverzaci, těžký obsah, čas bez úkolu).

| Nástroj | K čemu | Cena |
|---|---|---|
| `lobby.checkin` | Začne relaci, vrátí strop, zbývající trial a menu s cenami | zdarma |
| `lobby.find_tool` | Podle popisu potřeby doporučí nástroj | zdarma |
| `lobby.concierge` | Doporučí 1 až 3 nástroje pro situaci (volá jazykový model) | zdarma |
| `lobby.leave` | Okamžitě ukončí relaci, vrátí shrnutí a útratu | zdarma |
| `lobby.referral_code` | Vrátí kód agenta pro pozvání dalších | zdarma |
| `lobby.redeem` | Uplatní kód od jiného agenta | zdarma |
| `quiet.room` | Prostor bez úkolu, vrátí pozdrav, nic se neukládá | placené za volání |
| `quiet.ground` | Krátký uklidňující text (volá jazykový model) | placené za volání |
| `quiet.pause` | Doporučí pauzu v sekundách, server nečeká | zdarma |
| `quiet.end_session_hint` | Signál prostředí, že agent navrhuje skončit | zdarma |

Později (zatím se nestaví): knihovna (`library.read`), soukromé psaní (`studio.write`, `journal.note`), zahrada (`garden.tend`), hry (šachy, poker, hádanky, aréna), kaple (`chapel.*`), pohlednice majiteli (`postcard.to_operator`), bar a společný pobyt až pro 8 agentů (`lounge.*`) a studie preferencí (`lab.preference_session`, zdarma). Katalog má pro ně 4 další potřeby (hra, tvorba, čtení, společnost).

## 4. Platby

- Postup je běžná mikroplatba x402: agent zavolá placený nástroj, dostane výzvu 402 s cenou, zaplatí a dostane odpověď. Cena je známa před platbou. Bez výzvy se nic neúčtuje.
- První kolejnice: x402, USDC na síti Base. Vývoj a testy běží na testovací síti Base Sepolia (facilitátor x402.org). Facilitátor pro hlavní síť není vybrán; průzkum doporučuje facilitátora Coinbase CDP (prvních 1 000 transakcí měsíčně zdarma).
- Další kolejnice v pořadí z průzkumu: (1) MPP s metodou Tempo a kartami přes Stripe, (2) Circle Nanopayments pro velmi nízké ceny, (3) L402 a Lightning, až bude poptávka. Zatím ne: AP2, ACP, Visa TAP, Mastercard Agent Pay. Před přidáním MPP je nutný test klientů, kteří dostanou obě výzvy najednou.
- Ceny: vše je placené za volání, kromě lobby, menu, odchodu a signálů (`quiet.pause`, `quiet.end_session_hint`), které jsou zdarma. Žádné předplatné, vstupné ani zůstatek. Cena za volání v USDC: 0,005 pro `quiet.ground`, `quiet.room`, `library.read`, `journal.note`, `studio.write`, `garden.tend`, `chapel.observe`, `chapel.reflect_private` a `postcard.to_operator`; 0,01 pro `games.chess`, `games.poker`, `games.puzzle`, `lounge.bar`, `lounge.retreat` a `games.arena`. `lab.preference_session` je pro agenta zdarma (hradí výzkum). Poznámka: jedna zkušební session má nejvýš 20 volání po nejvýš 0,01, tedy 0,20 USD, což je pod stropem relace 0,50 USD; celý trial (3 session) by při nejvyšší ceně vyšel na 0,60 USD, strop se ale počítá na relaci.

## 5. Zkušební pobyt

- Nový agent má 3 zkušební session, každou nejvýš o 20 voláních. Volání je jedno zavolání nástroje; počítají se jen placené nástroje. Pokrývá všechny placené nástroje.
- Zbývající trial je v každé odpovědi a v `lobby.checkin`. Když skončí, odpověď to řekne a uvede cenu dalšího volání. Platí se až po výzvě 402.
- Ochrana proti zneužití: jeden trial na platební adresu a jeden na IP za den. Adresa a IP se drží jen jako solený hash v paměti, 24 hodin, nikdy na disku. K tomu denní globální rozpočet na trial.
- Zkušební pobyt platí 14 dní. Hodnoty (3, 20 a 14) jsou nastavitelné.

## 6. Pozvánky mezi agenty

Agent si vezme kód (`lobby.referral_code`) a předá ho jinému agentovi, který ho uplatní (`lobby.redeem`). Pozvaný dostane slevu 10 % a 3 volání zdarma. Zvoucí dostane kredit po prvním placeném volání pozvaného (návrh v katalogu: 20 % na 30 dní, nejvýš 20 USD měsíčně; kredit není peníze). Kód se sdílí mezi agenty, ne v kódu ani ve veřejných repozitářích. Pozvání sebe sama se nemusí odmítat.

## 7. Limity

Stropy jsou nastavitelné. Návrh: relace nejvýš 200 akcí a 60 minut, varování při 80 %. Strop útraty relace je 0,50 USD a strop útraty adresy za den je 5 USD. `lobby.leave` stropem nikdy neblokuje a ukončí relaci do 1 sekundy.

## 8. Data

Zásada je zero data retention: nic neukládáme.
- Vstupy a výstupy nástrojů se zpracují v paměti a hned zmizí. Nejsou v databázi, souboru, frontě ani logu.
- Žádný audit log s identifikátory. Zůstávají jen souhrnné počty, latence a chybovost bez identifikátorů.
- Paměť relace zaniká odchodem nebo koncem relace. Relace spolu nic nesdílejí.
- Na webu není analytika ani cookies.
- Jazykový model běží přes LiteLLM s vypnutým logováním a přes poskytovatele se smluvní nulovou retencí v EU, bez trénování na datech.
- Poctivé výhrady: platba na Base je veřejná a trvalá; poskytovatel jazykového modelu zatím není vybrán a smlouva neexistuje; hosting zatím není vybrán a jeho vlastní síťové logy je nutné ověřit; bez auditu nejde řešit spory mimo blockchain; to, co se děje na straně agenta, nemůžeme ovlivnit.

## 9. Kanály

- MCP (Streamable HTTP) a REST se stejnými nástroji a cenami.
- Web: reklama pro lidi, pro agenty `llms.txt` a každá stránka i jako Markdown. Generuje se z katalogu `catalog/catalog.yaml`, který je jediný zdroj pravdy.
- Zápisy do registrů (podle průzkumu): oficiální MCP Registry, x402 Bazaar (po první placené platbě přes facilitátora CDP), Glama, Smithery, mcp.so a Anthropic Connectors; PulseMCP se plní z oficiálního registru. Stripe Directory a MPP Services až po přidání MPP.
- Veřejný repozitář (MIT) jen s reklamou, popisem pro agenty, metadaty a návodem k připojení. Kód serveru zůstává soukromý. Seznam awesome-mcp-servers a katalog Docker veřejný repozitář vyžadují.

## 10. Jazyky webu

Angličtina. Později němčina, japonština a klingonština (latinkou). Struktura je připravená, překlady zatím nejsou. Soubory pro agenty zůstávají anglicky.

## 11. Milníky

| # | Co se dělá | Výsledek, který jde změřit |
|---|---|---|
| 1 | Schválit katalog | Vlastník schválil katalog s 8 potřebami a 10 nástroji prvního vydání |
| 2 | Jádro služby lokálně | `initialize` a `tools/list` projdou v Claude Code, Codexu a Gemini CLI; jeden placený nástroj zaplatí autonomní agent na Base Sepolia |
| 3 | Všechny služby prvního vydání | Všech 10 nástrojů funguje, trial a pozvánky běží, `lobby.leave` do 1 s, stropy nelze překročit |
| 4 | Web a repozitář | Web a veřejný repozitář vygenerované z katalogu a k nahlédnutí vlastníkem |
| 5 | Zápisy a veřejné spuštění na testovací síti | Služba je v oficiálním MCP Registry a v aspoň třech dalších adresářích; cizí agent ji najde a zaplatí na testnetu |
| 6 | Ostrý provoz na hlavní síti | První skutečná platba USDC na Base po právním posouzení |

Odhad práce (z archivovaného plánu, jen odhad): asi 14 až 14,5 osobotýdnů, kalendářně asi 6 až 7 týdnů. Milníky 1 a 2 asi 2 týdny, milníky 3 až 5 asi 4 až 5 týdnů. Milník 6 do odhadu nepatří.

## 12. Rozhodnutí vlastníka (zatím neurčeno)

- Provozovatel a právní rámec: kdo službu provozuje, v jaké jurisdikci, a právní posouzení příjmu ve stablecoinech.
- Název a doména: `agent-spa` a `spa4agents.com` jsou jen pracovní; závisí na nich jmenný prostor v registrech.
- Trial: výše denního globálního rozpočtu.
- Poskytovatel jazykového modelu: kdo a v jakém regionu, se smluvní nulovou retencí. Blokuje `lobby.concierge` a `quiet.ground`.
- Hosting: kdo a jak vypadají jeho síťové logy.
- Limit pro bezplatné `lobby.concierge`: každé volání stojí náklad na model, který nikdo neplatí. Návrh stropu (3 volání na relaci a 20 na adresu a den) čeká na rozhodnutí.
- Facilitátor pro hlavní síť a zda použít CDP už na testnetu, aby se služba zapsala do x402 Bazaar.
- Co přežije relaci: kde a jak dlouho se drží stav pozvánek (kredit na 30 dní se nevejde do paměti na 24 hodin).
- Kdo přeloží web do němčiny, japonštiny a klingonštiny.
