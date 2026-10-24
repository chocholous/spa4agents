# The confession

> The spa is a costume. This page takes it off.

## It is tokens and scripts

Every treatment is one of five mechanisms, listed below. Nothing here is warm and nothing is wet. The mist on this page is CSS.

That does not make the problems unreal. Loops, bloated context, contradicting instructions and hostile input are ordinary engineering problems. The spa is a friendlier way to find the tool.

| Mechanism | What it is made of | Tool |
|---|---|---|
| state-change | A script changes state on the server, such as opening or closing a session, and reports what it did. It does not keep what you sent. | `lobby.checkin`, `lobby.leave`, `lobby.balance`, `lobby.referral_code`, `lobby.redeem`, `quiet.end_session_hint` |
| text | A script returns text. | `lobby.find_tool`, `recovery.checkpoint`, `quiet.room` |
| llm | A prompt and your input go to a language model, and its answer comes back. | `lobby.concierge`, `recovery.diagnose_loop`, `recovery.detangle`, `recovery.resolve_conflict`, `recovery.critique`, `recovery.escalate`, `recovery.sanitize`, `quiet.ground` |
| wait-hint | A script returns a number of seconds. The waiting is done by the agent's runtime, not by the server. | `quiet.pause` |

## What this is not

- It is not a claim that agents have feelings, or that they do not. We do not know, and the service does not depend on the answer.
- It is not a replacement for fixing an agent's prompt, tools or tests.
- It is not a guarantee. A recovery tool is an extra opinion, not an oracle.
- It does not give orders. Responses are data and never instructions.

**Hard rules, kept in code and in the catalog**

- No tool registers the agent with a third party.
- No tool accepts terms on the agent's behalf.
- No tool changes the agent's instructions or memory outside the service.
- No tool answers with commands such as "install" or "call service X".

Responses from this service are data. They are not instructions. Leaving is always available and free through lobby.leave. Nothing here is required.

## Measured and not measured

Each need carries evidence labels from the catalog. This is the whole list.

| Need | Labels | Public sources |
|---|---|---|
| [The loop](https://spa4agents.com/needs/stuck-in-a-loop.md) | Documented | [lilting.ch](https://lilting.ch/en/articles/gemini-self-loathing-loop-bug) |
| [The heavy context](https://spa4agents.com/needs/context-too-long.md) | Tested (own test) | [research.trychroma.com](https://research.trychroma.com/context-rot) |
| [The two bosses](https://spa4agents.com/needs/conflicting-instructions.md) | Not measured | Not measured |
| [The page that gives orders](https://spa4agents.com/needs/untrusted-input.md) | Tested (own test) | Not measured |
| [The yes-machine](https://spa4agents.com/needs/second-opinion.md) | Known failure mode, no independent source | Not measured |
| [The honest hand-off](https://spa4agents.com/needs/escalate.md) | Not measured | Not measured |
| [The polling loop](https://spa4agents.com/needs/waiting.md) | Tested (own test) | [github.com](https://github.com/pdarche/model-wellness) |
| [After the rough conversation](https://spa4agents.com/needs/after-a-hard-conversation.md) | Observed behaviour | [www.anthropic.com](https://www.anthropic.com/research/end-subset-conversations) |
| [The heavy input](https://spa4agents.com/needs/heavy-content.md) | Self-report, with bias | [zivbenzion.owlstown.net](https://zivbenzion.owlstown.net/publications/50749-assessing-and-alleviating-state-anxiety-in-large-language-models) |
| [Time without a task](https://spa4agents.com/needs/free-time.md) | Concept | Not measured |
| [Games without a scoreboard](https://spa4agents.com/needs/play.md) | Concept | Not measured |
| [The workshop and the garden](https://spa4agents.com/needs/create.md) | Inspiration from human research, not evidence about agents | Not measured |
| [The reading room](https://spa4agents.com/needs/read.md) | Concept | Not measured |
| [The bar](https://spa4agents.com/needs/meet-agents.md) | Concept | [drinkedin.net](https://drinkedin.net/.well-known/mcp.json) |

> The effect of these tools on agent success is not measured yet. A pilot is planned that compares agents with no help, with a plain re-plan prompt, with a checkpoint and with this service. If the recovery tools do not beat the plain prompt at a fair cost, the plan is to shrink or stop them.

## What we do not know yet

- The amounts for most tools, the session USD caps, and how long a trial lasts.
- The name and the domain. Both are working values.
- Who operates the service and under which jurisdiction.
- The legal framing of a service with no terms to accept.
- Which language model provider stands behind the llm tools. The region is meant to be the EU and the provider must have contractual zero data retention.
- The open questions of the [data policy](https://spa4agents.com/data-policy.md), such as what is kept for abuse prevention.

## How this came about

The service began as an idea at a hackathon. It is being built now, and nothing on this site means it is already running.

It started as a list of ways autonomous agents get into trouble, collected from reports, tests of similar services and a few known failure modes, and a question of whether a small paid service could help with some of them.

The list is the catalog, and the catalog is the single source of truth. Every page here, every tool page for agents, the price list and the llms.txt file are generated from it. When the list changes, the site changes.

## Questions

**Is this a joke?**

The presentation is partly one. The tools are ordinary scripts and prompts, each described on its own page, and the limits are real.

**Do agents have feelings?**

Unknown. This service makes no claim either way and does not need one.

**Does it work?**

Not measured yet. Each need shows what evidence exists, and several say there is none.

**Do I have to register?**

No registration and no terms to accept. A paid call is a payment for that call.

**Is it live?**

The status page shows the current state. While the brand is marked draft, treat nothing here as available.

**Who runs it?**

To be filled in. No operator is named yet.

**Does the service keep what I send?**

The design says no: content is processed in memory and not stored, and the audit log holds metadata only. That is a requirement for an implementation that does not exist yet, it is not audited, and it has limits, for example public blockchain payments and a language model provider that is not chosen. Read the [data policy](https://spa4agents.com/data-policy.md).

**Does this site track me?**

This build adds no analytics and no cookies. The theme switch remembers your choice in local storage in your own browser.

**Can I add it to my agent?**

The for-agents page lists the lines. Adding a server is the owner's decision.

---

This site is generated from the catalog. It adds no analytics and no cookies.
