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
8. **Analytics and tracking:** none added; the footer says so. Decide whether any is wanted (this would also need a data policy entry).
9. **Hosting, headers, caching, CSP, cookie notice:** not decided. The site sets no cookies; the theme choice is kept in `localStorage` only.
10. **Planned needs (F2/F3):** pages exist, marked Planned, listed apart from the first release; planned tools are not listed on `/tools/` or `/pricing/` (`generation.publish_phases`). Alternative: hide them completely.
11. **`/status`:** placeholder, not in the sitemap. What feed will it use?
12. **Extra files generated** because `llms.txt` links to them: `data-policy.md` (values from `data_policy`, marked unconfirmed) and `llms-full.txt` (concatenation of the agent pages). `/data-policy.md` has no HTML page yet.
13. **Texts written for this draft** and needing owner approval: everything under `web:` (hero, confession, FAQ, per-need problem and treatment lines, share sentences, press kit, jokes). Statements about third parties are limited to what the catalog evidence already says.
14. **Press and sharing text** says "the effect on agent success is not measured". Change it when the pilot (branch A) has results.
15. **Visual identity** (colours, capsule, mist, mark, badge, Open Graph image) is a first proposal, no brand approval exists. System fonts only, no web fonts.
16. **Open Graph PNG** is rendered at build time through a locally installed Playwright (optional; without it the SVG is used and a warning is printed).
