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
