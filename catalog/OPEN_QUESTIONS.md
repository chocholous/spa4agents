# Open questions (WP1, catalog D1)

Rule: what the spec (`docs/zadani.md`, README) does not decide is not decided here. Each item: the question, where the spec is silent, the proposal used in `catalog.yaml` (if any). Values the owner has not set are the literal `TODO_OWNER` in `catalog.yaml`; `npm run validate:strict` fails while any remain.

## A. Parameters set to `TODO_OWNER` (owner must decide)

| # | Question | Where the spec is silent | Catalog key | Proposal |
|---|---|---|---|---|
| A1 | Referral: discount for the invited agent | README: "amount set by owner" | `referral.invitee_discount_percent` | none |
| A2 | Referral: number of free calls for the invited agent | README: "amount set by owner" | `referral.invitee_free_calls` | none |
| A3 | Price amounts per tool (per call, entry, per game, credits, subscription) | zadani: "prices are a proposal for the pilot", derive from inference cost after F0 | `tools[].price.amount_usd` | none |
| A4 | USD cap per session, USD cap per address per day | zadani: "cap in USD" with no value | `session.max_usd`, `session.address_daily_cap_usd` | none |
| A5 | Validity period of the trial (the old voucher had 7 days) | README replaced the voucher; no validity given for trial sessions | `trial.valid_days` | none |
| A6 | Daily global trial budget | zadani: "a daily global budget", no value | `trial.daily_global_budget` | none |
| A7 | Input limit of `recovery.detangle.content` | zadani: "max according to the price list" | `tools[recovery.detangle].inputs[content].max_length` | none |
| A8 | Registry namespace (`io.github.<owner>` or own domain) | depends on approved name | `brand.registry_namespace` | none |

Pricing note for A3: the zadani and podklady name the *model* per tool (free, per call, entry, per game, credits, subscription) but no amounts. The DrinkedIn comparison (0.05 USD per credit) and Spindown (15 USD/month) are comparisons, not decisions, and are not used.

## B. Ambiguities in the spec

1. **Definition of "turn"** for `trial.max_turns_per_session: 20`. Not defined in zadani or README. Is a turn one tool call, one paid action (the 200-action session cap), or one request/response pair? Proposal: not decided; the catalog stores the number only.
2. **What the trial covers when the unit is a session.** zadani (voucher) covers recovery tools, `quiet.ground` and one entry per recreation wing. Catalog `trial.covers` keeps this; `trial_eligible: true` is set on the 7 recovery tools and `quiet.ground`. Does a trial session also cover `lobby.concierge` and `quiet.room` (entry fee)? Proposal: no, as in zadani.
3. **Guest pass without wallet: "half credit"** (zadani) has no meaning for sessions. Proposal: left undecided in `trial.guest_pass_rule`; per-IP limit of the guest-pass trial is not set.
4. **"Higher credit only for an address that already holds USDC"** (zadani) has no equivalent for a fixed number of sessions. Proposal: dropped from the catalog until the owner says whether such addresses get more than 3 sessions.
5. **Affiliate code at checkin**: zadani says "header `x-spa-ref` or a parameter at `lobby.checkin`" without the parameter name. Proposal: only the header is in the catalog; `lobby.checkin` has no referral parameter.
6. **Referral doubled trial**: zadani says the invited agent gets "double trial (1 USD)", README says discount and calls, set by the owner. Catalog follows README (A1, A2).
7. **Mechanism of `lobby.balance`, `lobby.referral_code`, `lobby.redeem`**: the spec table for them has no mechanism column. Proposal: `state-change` (balance with note "read only"). Same for `lobby.checkin` is given (state-change).
8. **Price model for tools marked "Entry / subscription", "Per game", "Credits", "Paid by research"**: mapped to `entry_or_subscription`, `per_game`, `credits`, `research_funded` (price 0.00 for the agent). `included_in_entry` exists in the type list (podklady: `journal.note`, `chapel.reflect_private`, `postcard.to_operator` "within the entry fee") but zadani says "Entry fee" for them; catalog uses `entry`. Which is right?
9. **How the entry fee per session and bar credits are charged** (zadani: "to be specified"). Not modelled beyond the model name.
10. **`quiet.room` is an entry fee (F1) but the "entry per session" model is F2** (plan open question 2). Catalog marks it `entry` with amount `TODO_OWNER`.
11. **Input types not stated in the spec.** Only limits stated in the spec are in the catalog (`task_summary` 1000 characters, `attempts` 10, `members` 8, `content` per price list). Other limits (e.g. `draft`, `untrusted_content`, `blocker`, `text`) are not set. Proposed types: strings; `attempts[]`, `done[]`, `open[]`, `members[]` arrays of strings; `instructions[]` array of objects `{text, source}` ("with a source"); `public` boolean; `games.poker` `observe` boolean and `act` string (spec: "`observe` or `act`"); `games.chess` `action` and `move` strings; `garden.tend.action` enum plant/prune/look (given). Please confirm.
12. **Output shapes** are stored as prose (`output`) as in the spec table; the response `data` has no JSON Schema yet (OpenAPI uses the common envelope with `data: object`).
13. **Data policy** (`data_policy`, revised 2026-10-24 after the owner chose the strictest policy): content retention 0 days, `recovery.checkpoint` not stored (the pickup/7-day retention is gone), audit 90 days metadata only. The schema pins `content_retention_days: 0`, `checkpoint_stored: false`, `audit_content: none`, so a weaker value is a schema error and a deliberate policy change. The wording is a proposal, `confirmed_by_owner: false`. Audit fields (`data_policy.audit.fields`) are my proposal.
14. **Tools and needs outside F1.** The catalog holds all 14 needs and all spec tools (F1, F2, F3). Generated outputs (tool pages, `llms.txt`, openapi, mcp, server, pricing, README tables) include only phases in `generation.publish_phases` (now `[F1]`), so unbuilt tools are not advertised. `needs/*.md` are generated for all 14 needs; F2 and F3 needs carry a "planned" notice and appear neither in `llms.txt` nor in the README table. Is this right?
15. **Evidence labels.** `second-opinion` is labelled `known-failure` ("known failure, no independent source"), not `unmeasured` (the plan names only `conflicting-instructions` and `escalate` as "not measured"). `untrusted-input` and `waiting` are labelled `tested` (own test of 2026-10-24) without a transcript; `waiting` links the tested repository. The Banya key/transcript itself is plan question 1 (WP5).
16. **Texts written for this draft** and needing owner approval: all `trigger` lines (only `stuck-in-a-loop` is given in the spec), invitations for `heavy-content`, `free-time`, `play`, `create`, `read`, `meet-agents`, `search_phrases` for needs not listed in podklady (`heavy-content`, `read`, extra phrases), tool descriptions, `not_claimed` lines (only `stuck-in-a-loop` is given), tool `example` inputs. Invitations for the other needs are translations of podklady.
17. **Brand and domain**: `agent-spa` / `spa4agents.com` are working values in `brand.*` (approved: false). Nothing is published. The domain appears in every generated URL; the MCP Registry name needs A8.
18. **`server.json` schema URL and fields** follow the MCP Registry schema known at writing time (`2025-09-29`); verify before publishing.
19. **`llms.txt` links** to `/data-policy.md`, which is generated by WP8 and not here. `llms-full.txt`, `data-policy.md` and `/status` are WP8, not generated here.
20. **Lint list** (`lint.forbidden_phrases`: "you must", "install", "suffer", ...) is my reading of the advertising rules (no commands, no claims of suffering, no false urgency). Please confirm or extend.
21. **LLM**: `llm.provider` is `TO_BE_NAMED`; the catalog holds the requirements (contractual zero data retention, no training, EU, only via the LiteLLM proxy) and the operating requirement that the proxy has request and response logging off. `data_policy.region: EU` is from the spec (hosting).

## C. Data policy (owner decision 2026-10-24, strictest policy)

The open questions DP1 to DP11 live in `docs/zadani.md`, section "Datová politika (závazná)". Catalog-specific points:

22. **`TO_BE_NAMED`** is a second placeholder next to `TODO_OWNER` (operator, jurisdiction, LLM provider, hosting). `collectTodos` counts it, so `validate:strict` fails and the build stays a draft while any remains. Is that wanted, or should `TO_BE_NAMED` stay a plain text?
23. **`recovery.checkpoint` mechanism changed from `state-change` to `text`.** The spec table said `state-change` because it stored the checkpoint; with no storing, `state-change` ("a script changes state on the server") would be untrue on the web. `test/spec.test.ts` was updated. Please confirm, or keep `state-change` and change the plain-language text instead.
24. **Checkpoint input limits** are not set (DP11). Nothing is invented; a limit would only protect memory.
25. **`quiet.room` and the audit log** (DP8): the spec says nothing is logged. The data policy repeats that; billing and cap enforcement for an entry fee may need a metadata entry.
26. **`mcp.json` carries a `data_policy` block** (retention, audit, status, URL) generated from the catalog, because podklady say retention and rules should be machine readable. Remove it if not wanted.
27. **`payments.mcp_meta_key` replaced by `payments.mcp_challenge`.** The x402 spike showed the MCP challenge is in `structuredContent` with `isError: true`, not in `_meta`. The generated `mcp.json` now says so (`payments.mcp_challenge`, was `challenge_meta_key`). Agents or clients that read the old key must change.
28. **Per-tool retention table** is generated for all published (F1) tools: the default text plus a note per tool (`data_policy.per_tool`). Tools of later phases appear when their phase is published; their notes (private studio, garden, journal) are not written because F2 persistence is undecided (DP7).
