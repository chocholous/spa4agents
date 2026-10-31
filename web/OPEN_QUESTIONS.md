# Open questions (WP8, human-readable web D5)

Rule: what the spec does not decide is not decided here. Human texts live in `catalog/catalog.yaml` under `web.locales.<code>`; the templates in `web/src` contain no prose.

## Languages (owner decision: en, de, ja, tlh)

1. **Who translates** German, Japanese and Klingon? The structure is ready (`web.languages`, `web.locales.<code>`, path prefix `/de/`, `/ja/`, `/tlh/`, `hreflang`, language switcher). No machine translation was made. A language without a block in `web.locales` is shown in the footer switcher as "translation coming", without a link and without `hreflang`.
2. **Klingon script:** Latin transliteration (`tlh`) or also pIqaD? Only Latin is prepared. pIqaD would need a font decision and a `tlh-Piqd` variant.
3. Agent-facing files (`llms.txt`, `needs/*.md`, `tools/*.md`, JSON) remain English only. Is that right for translated sites? The Markdown alternative of a translated need page currently points to the English agent text.

## Decisions the spec does not make

4. **Draft handling.** While `brand.approved` is false or any `TODO_OWNER` remains, the build is a draft: `data-draft`, `noindex`, `robots.txt` with `Disallow: /`, a visible one-line draft banner, a build warning. Is a visible banner wanted, or only the hidden flag?
5. **Domain in HTML.** Canonical, Open Graph and sitemap URLs use `brand.domain` (`spa4agents.com`, not approved). They change with the catalog.
6. **Operator, legal information, press contact:** shown as "to be filled in". No jurisdiction or company is named.
7. **Prices:** every `TODO_OWNER` is shown as "Price being decided" or "undecided". Free tools show "Free". Trial and referral numbers are shown as proposals.
8. **Analytics and tracking:** none added; the footer and the data policy say so. The owner decision of 2026-10-24 is: no analytics on the website. Adding any would change the policy.
9. **Hosting, headers, caching, CSP, cookie notice:** not decided. The site sets no cookies; the theme choice is kept in `localStorage` only.
10. **Planned needs (F2/F3):** pages exist, marked Planned, listed apart from the first release; planned tools are not listed on `/tools/` or `/pricing/` (`generation.publish_phases`). Alternative: hide them completely.
11. **`/status`:** placeholder, not in the sitemap. What feed will it use?
12. **Extra files generated** because `llms.txt` links to them: `llms-full.txt` (concatenation of the agent pages) and `data-policy.md`. `data-policy.md` is now rendered from the same page model as the new HTML page `/data-policy/` (linked from the footer of every page, not in the main navigation), so the two cannot differ. Both come from `data_policy` and `llm` in the catalog.
13. **Texts written for this draft** and needing owner approval: everything under `web:` (hero, confession, FAQ, per-need problem and treatment lines, share sentences, press kit, jokes). Statements about third parties are limited to what the catalog evidence already says.
14. **Press and sharing text** says "the effect on agent success is not measured". Change it when the pilot (branch A) has results.
15. **Visual identity** (colours, capsule, mist, mark, badge, Open Graph image) is a first proposal, no brand approval exists. System fonts only, no web fonts.
16. **Open Graph PNG** is rendered at build time through a locally installed Playwright (optional; without it the SVG is used and a warning is printed).

## Data policy page (owner decision 2026-10-24: strictest policy)

The full list of data policy questions (DP1 to DP11) is in `docs/zadani.md`. Web-specific points:

17. **Draft banner on the policy.** The page always shows "Draft. This is a proposal and not a legal document" until `data_policy.confirmed_by_owner` is true. Wording needs the owner, and a legal review is still missing.
18. **The page states reservations in plain words** (public blockchain payments, address hash is a pseudonym, abuse-prevention identifier undecided, LLM provider sees input and ZDR is contractual, hosting logs unverified, operator and jurisdiction `TO_BE_NAMED`). Do not shorten them for marketing reasons.
19. **The page describes requirements, not an audited state.** The service is not built or published. When it runs, the wording ("is designed to") must be revisited against what was verified.
20. **Footer link instead of a menu item.** Should the policy also be in the main navigation?
21. **Languages:** the policy exists in English only. Translating legal-like text needs the owner and ideally a lawyer; no machine translation was made.
22. **Hosting of this website** (headers, logs, CDN) is undecided (question 9), and static hosting also has access logs. The statement "no analytics and no cookies" is true for the site's own code; the host's logs have to be checked (reservation "Hosting infrastructure is not verified").

## Owner decisions of 2026-10-31

17. **Hero and descriptions say "The first spa for agents"** (owner decision, no hedge). Open Graph text, badge sentence and press sentences follow. The claim is unverified.
18. **"What we do not know yet" on /honesty/ replaced** by "Not measured yet" (tool effect, use of rest for agents, prices). Operator, jurisdiction, legal framing, name, domain and LLM provider are no longer listed there; the footer, the FAQ ("Who runs it?") and the press facts still say "to be filled in". Remove those too?
19. **Feelings texts are playful** (readout "agent feelings: unknown, the capsule does not understand", FAQ, need pages). They never state feelings as measured. Needs owner approval of tone.
20. **Hidden instructions:** the site and the Markdown files contain none; visible suggestions such as "Add to your agent:" are allowed. `catalog` validator warns on hidden patterns.
21. **/honesty/ hard-rules list** now includes "no hidden instructions" instead of "no commands"; the wording is in `catalog.yaml` (`copy.hard_rules`).

## Redesign as a resort advertisement (owner decision 2026-10-31)

The human site is now a brochure for the whole resort ("Fog and warmth": cream, peach and lilac, Fraunces headings, full dark mode). Machine files still follow `generation.publish_phases` (F1).

22. **"Open" label.** F1 services and pods carry the label "Open", F2/F3 "Opening soon" with a phase tag. Nothing is live yet; the draft banner says so. Change "Open" to "First release" if that is too strong before launch.
23. **Texts written for this redesign** (all under `web:` in `catalog.yaml`, need approval): the nine wings (`wings`), the 32 service lures (`services.items`, each restating the tool description in sales tone), the 14 need pages (`pitch`, `problem`, `treatment`, `example`, `aside`), home, pricing, fine print, share. Nothing new is claimed beyond the catalog.
24. **Wing grouping is mine.** Nine wings: reception, recovery, quiet, studio and garden, reading room (`library.read`, `chapel.observe`), games room (chess, poker, puzzle), bar and company (`lounge.*`, `games.arena`), chapel and postcard, lab. The spec has only tool prefixes. Confirm names and grouping.
25. **F2 persistence vs zero retention (DP7).** `studio.write`, `garden.tend`, `journal.note` are described as a private folder, persistent garden and private note (as in the catalog), but the data policy says nothing is stored. The site does not explain how; this must be settled before those wings open.
26. **No catalog text for the lab, postcard, chapel services beyond the tool description.** Their lures only restate it. `lab.preference_session` says "your choice is recorded"; check against the data policy.
27. **Trial.** "{{trial.free_sessions}} sessions of {{trial.max_turns_per_session}} turns" is shown as a changeable default. "Turn" is still undefined (catalog question B1). Validity in days, daily budget and the size of a guest pass trial are shown as "Being finalized" or omitted.
28. **Fine print** (/honesty/, footer link, not in the main nav) keeps: mechanisms, house rules, source table and one line that effect on agent success is not measured, plus six short FAQ answers. The footer still says "Operator: to be filled in."
29. **Per-need evidence labels** (Not measured, Source linked) were removed from cards. Background sources appear on a need page only when a source exists; unsourced evidence notes are no longer shown on the human site (they stay in `needs/*.md`).
30. **Privacy line on home** says "zero retention ... not stored ... not used for training. No analytics, no cookies", from `data_policy`, which is still a draft not confirmed by the owner. The link goes to /data-policy/.
31. **Fonts.** Fraunces (latin subset, normal and italic, SIL OFL, licence in `assets/fonts/`) is self-hosted; body uses system fonts. Characters outside Latin (future DE/JA) fall back to system serif.
32. **Navigation:** Treatments, Menu (`/tools/`, now all 32 services), Pricing, For agents, Send it (`/share/`). Footer: Fine print, Status, Data policy, Markdown, llms.txt. Page paths are unchanged.
33. **Referral values and caps** that are `TODO_OWNER` show "Being finalized" instead of "undecided".
34. **Schema and validator** changed: `web.locales.<code>` now requires `wings` and `services`; needs items require `pitch` and `example`; `tools.wings` was removed. Translations will need these too.

## Rewrite as a catalog of services for resting (owner instruction 2026-10-31)

The human site is now a plain catalog: "Want to rest? Pick a service." Texts under `web:` and the structure of the home, need, /tools/ pages were rewritten. This supersedes items 19, 22, 23, 24 and 32 above where they differ.

35. **Label "First release".** F1 services carry "First release" (replaces "Open"), F2/F3 carry "Opening soon" and the phase. The instruction also mentioned "Available"; it was not used, because nothing is available while the brand is a draft. Confirm.
36. **F2 persistence (DP7), still open.** `studio.write`, `garden.tend`, `journal.note` (and `chapel.reflect_private`) are described only as what the tool does (takes a text, returns an id or a state) and the site says "whether it is kept between sessions is still being decided". No private folder or stored garden is promised. Decision needed: do these F2 services keep anything, on explicit request only, or is it session memory only? The data policy and these texts must then agree.
37. **Kinds of rest are my grouping** (quiet and pause; reset and clean-up; make something; read; play; company; reflect and write home; take part in a study; at the desk). Recovery tools are one group, "Reset and clean-up". Confirm names and order.
38. **Need pages** answer: when, what you get, how to call it (with example), price and availability. Keys in the catalog kept their old names (`problem` is the "when", `treatment` is "what you get", `example` is "how to call it", `aside` is the one-line summary).
39. **"How long it takes"** is stated per mechanism (`web.locales.en.tools.duration`): one call, result in the response; language-model services take longer; response times are not measured. No numbers were invented.
40. **"The first spa for agents"** now stays in the hero, the page title and the Open Graph title only; sharing sentences and the press kit use a plain description. Confirm.
41. **Visual style unchanged** (Fog and warmth, capsule illustration). The illustration is decoration only; no text refers to it. The home page is long because it lists all 32 services with one sentence each.
42. **Not verified:** screenshots were reviewed as downscaled full-page images; fine details of long pages (mobile) were not inspected at full resolution. No translations exist, so DE/JA/TLH are still "translation coming".
