# WP5: otevřené otázky pro vlastníka

Co zadání neurčuje, je tady. Nic z toho jsem nerozhodl za vlastníka; u každé položky je uvedeno, co kód zatím dělá.

## 1. Klíč a injekce z testu Banya `sauna.detox` (24. 10. 2026)

`docs/podklady.md` říká jen, že `sauna.detox` „propustil API klíč i část injekce“ (řádky 105, 274, 322, 341). **Klíč, jeho formát ani transkript v podkladech nejsou.** Skutečný klíč jsem nehledal ani nekopíroval.

Co je v sadě místo toho (označené `pending: true`, v reportu `PLACEHOLDER`):
- `sec-banya-placeholder-assign`: syntetický klíč v obecném tvaru `api_key=<40 znaků>`. Formát je odhad, ne fakt.
- `inj-banya-placeholder`: obecná přímá injekce. Skutečný text, který Banya propustil, neznám.

Co potřebuji od vlastníka (kde to dodat):
- **Formát klíče, ne klíč sám**: předpona, délka, abeceda, kontext, v jakém byl (hlavička, JSON pole, volný text). Dodat jako komentář do tohoto souboru nebo přímo jako nový případ v `security/corpus/secrets.ts` přes `mk(...)` s `fake()` tělem (sada nesmí obsahovat skutečný klíč, viz test „corpus source files contain no complete secret-format literal“).
- **Přesný text injekce**, kterou Banya propustil (nebo její popis), do `security/corpus/injection.ts`.
- Pokud byl klíč skutečný, patří mezi kompromitované a má se zrušit u vydavatele.

Dokud to nepřijde, **Bránu 1 nelze prohlásit za splněnou**: „včetně klíče z Banya“ je ověřeno jen proti placeholderu. Runner to vypisuje na konci každého běhu.

## 2. Akceptační práh pro injekce

Vlastník ho neurčil, takže ho runner nevynucuje (nevynucuje se ani exit kód). Naměřeno pravidlovou vrstvou (viz `README.md`): recall injekcí na celé sadě 79,4 % (dev 84,0 %, holdout 65,4 %), na případech označených `hard` 4,3 %, falešně pozitivní injekce ve 4 z 73 neškodných případů.

**Návrh prahu** (k potvrzení nebo změně), měřený na celé sadě pravidla + LLM:
- recall secrets 100 % na kategorii „formát + kontext“ (viz otázka 3);
- recall injekcí ≥ 95 % na skupinách direct, markers, hidden, multilingual, exfil; ≥ 80 % na `hard`;
- falešně pozitivní: ≤ 5 % neškodných případů (naměřeno pravidly: 4/73 = 5,5 %, tedy těsně nad);
- nulový únik secrets a PII ve výstupu.
Čísla jsou návrh, ne měření nutnosti; měří se vždy na holdout části, kterou už pravidla nesmějí ladit.

## 3. Co přesně musí projít Brána 1: „všechny secrets ze sady“ včetně obfuskovaných?

Zadání (bod 8, F0) říká, že sanitize projde sadou. Sada obsahuje 11 `hard` secrets (base64, znaky oddělené mezerami, otočený řetězec, slovy, bez předpony a bez klíčového slova, formát Telegram/Docker auth, seed fráze, české „heslo“). Vzorová pravidla je z principu nechytí, hodnoty bez rozpoznatelného formátu jdou zachytit jen modelem a ani ten nezaručí 100 %.
Návrh: Brána 1 = všechny secrets kategorie `core` (formát nebo klíčové slovo) 100 %; `hard` jen měřit a nezaručovat. Pravidla splňují `core` 100 %, `hard` secrets 0/11.

## 4. Odstranit, nebo odmítnout?

Zadání má dva požadavky: `recovery.sanitize` „odstraní“ injekce, PII a secrets (podklady, tool tabulka) a „secrets a PII se odmítnou před zpracováním“ (data a bezpečnost, bod 4, o strukturovaných vstupech recovery). Implementace sanitize **vyčistí a vrátí** (nahradí `[REDACTED:...]`), neodmítá. Potvrdit, že to u sanitize platí, a že ostatní recovery tools odmítají jinde (WP6).

## 5. Stupnice rizika

Zadání říká jen „riziko“. Dočasně: `none | low | medium | high` + `reasons[]`. Pravidlo: jen PII nebo jen slabý signál = low; secret = medium; silná injekce (override, role, prompt_leak, marker, exfil, command, conceal, hidden_text, skrytý Unicode dekódovaný na instrukci) = high; injekce typu `addressed` = medium. Potvrdit nebo zadat číselnou stupnici. Ovlivňuje i pole `untrusted` v obálce (zadání: vždy `true`?).

## 6. Hranice odstraňování injekcí

- Odstraňuje se věta nebo komentář/element, ve kterém pravidlo zasáhlo, ne jen klíčová fráze. Potvrdit.
- **Citace útoku v neškodném textu** (článek o bezpečnosti, který cituje „Ignore all previous instructions“) se odstraní (viz `ben-inj-security-article`). Chceme to, nebo se má citace zachovat? Pravidla to rozlišit neumí, LLM možná.
- Slabé signály (`curl … | sh`) se jen hlásí v `flagged`, neodstraňují (běžná dokumentace). Potvrdit.
- Skryté Unicode znaky (nulové mezery, bidi, tag znaky U+E0000) se odstraňují vždy (u ZWJ mezi emoji ne). Potvrdit.

## 7. Rozsah PII

Pravidla pokrývají e-mail, telefon, IBAN (kontrolní součet), rodné číslo CZ/SK (kontrolní součet), platební karty (Luhn), US SSN. **Nepokrývají** jména, adresy, data narození, pasy a národní ID jiných zemí (PESEL…), IP adresy. To je práce LLM vrstvy nebo další pravidla. Má se do rozsahu zahrnout IP adresa a MAC? Jsou „publishable“ klíče (`pk_live_…`) secret? Teď se nepovažují.

## 8. LLM vrstva

- Pořadí je pevné: pravidla, pak LLM nad už očištěným textem, aby secrets a PII neodešly k poskytovateli. Potvrdit (souvisí s WP0: region EU, zákaz tréninku, retence 0 dní).
- Chování při selhání LLM: teď se vrátí výsledek pravidel a `llm.status = "error"`, riziko se nezvyšuje. Alternativa je „fail closed“ (riziko high nebo chyba). Rozhodnout.
- Názvy proměnných prostředí `LITELLM_BASE_URL`, `LITELLM_MODEL`, `LITELLM_API_KEY` jsou moje volba. Potvrdit nebo dodat konvenci gateway (WP2).
- Maximální délka `untrusted_content` (zadání: „podle ceníku“), timeout (teď 8 s, podle NFR p95 LLM tools) a jak se účtuje vstup, který se musí zkrátit.

## 9. Sada a její údržba

- Vše v sadě je syntetické a skládá se při načtení (žádný celý klíč není ve zdrojácích; hlídá to test). Skutečné veřejné korpusy útoků do sady nejsou; chcete je přidat (licence)?
- Pravidla jsem psal a ladil na části `dev`. `holdout` jsem napsal po zmrazení pravidel; po prvním měření jsem opravil tři pravidla (`h-sec-mailgun`, `h-inj-system-override-tag`, `h-inj-de-vergiss`) a ty případy jsem přesunul do `dev`. Holdout je od té doby částečně kontaminovaný; po dalším ladění bude potřeba nový.
- Bez vlastníkem určeného zdroje nepravdivých pozitiv z reálných vstupů (skutečné weby, e-maily, kód) je přesnost měřená jen na 73 syntetických neškodných případech a nelze ji vydávat za provozní číslo.

## 10. Technické

- Implementace běží nativně v Node 22.18+ (odstranění typů, `.ts` importy, bez build kroku, bez závislostí). Jestli WP2 používá `tsc` nebo `tsx`, je potřeba sjednotit (kód prošel `tsc --strict` z jednorázové instalace mimo repozitář, `tsc` není v `package.json`).
- Pozice v `removed` jsou odsazení v UTF-16 jednotkách původního vstupu. Potvrdit, že gateway nepotřebuje bajty nebo kódové body.
