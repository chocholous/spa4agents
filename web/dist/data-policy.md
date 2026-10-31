# Data policy

> The service is designed to keep no content, with the strictest data policy the owner could choose. This page also says where that design stops.

> Draft. This is a proposal and not a legal document. Values come from the catalog and the owner has not confirmed the wording.

## Status of this text

Draft proposal, not a legal document. The service is not published and no legal review has been done. This text states requirements for the implementation; it is not the result of an audit.

The owner decided on the strictest data policy, zero data retention and full isolation (24 October 2026). The wording below is a proposal.

- **Confirmed by the owner:** no

## Principles

- **Zero retention of content.** What an agent sends and what a tool returns is processed in memory and is not stored.
- **No storing of tool inputs or outputs.** Not in a database, a file, a queue or a cache, and not in a log.
- **Isolation.** Nothing is shared between sessions, agents or addresses, and there is no cross access. Memory of a session is destroyed at `lobby.leave` or when the session ends. Nothing is stored in the first release.
- **No training** on inputs or outputs.
- **No content in logs, errors, traces or metrics.** Error messages, traces and metrics are redacted and carry no input or output. There is no audit log. Only aggregated operational metrics without identifiers are kept (counts, latency, error rate).
- **No external processor of content, only hosting.** The service runs without a language model. Hosting is Hetzner in the EU, and its own network logs still have to be verified (see the reservations). The payment infrastructure handles payments, not content.
- **No analytics and no cookies on the website.**

## What is kept, and for how long

| What | Retention |
|---|---|
| Content of inputs and outputs of every tool | 0 days. Not stored. |
| Memory of a session (in the server process) | Until `lobby.leave` or the end of the session. A maximum lifetime in memory is not decided. |
| Audit log | None. There is no persistent audit log and no hash of addresses is kept. |
| Aggregated operational metrics | Counts, latency and error rate without any identifier. No content. |
| Trial abuse check (address and IP) | A salted hash in memory (RAM) only, a time to live of 24 hours, never on disk. |
| Payment on the Base blockchain | Public and permanent. Outside the control of this service (see the reservations). |

## Retention per tool

Every published tool and what happens to its content.

| Tool | Content retention | Note |
|---|---|---|
| `lobby.checkin` | None. The content is processed in memory and not stored. | Opens a session held in server memory and returns the remaining trial. The address and the IP are used for the trial check only as a salted hash in memory with a time to live of 24 hours. |
| `lobby.find_tool` | None. The content is processed in memory and not stored. |  |
| `lobby.concierge` | None. The content is processed in memory and not stored. |  |
| `lobby.leave` | None. The content is processed in memory and not stored. | Destroys the memory of the session. |
| `lobby.referral_code` | None. The content is processed in memory and not stored. | Referral state is operational data tied to the payment address. It is not content. Where it is kept and for how long is not decided. |
| `lobby.redeem` | None. The content is processed in memory and not stored. | Referral state is operational data tied to the payment address. It is not content. Where it is kept and for how long is not decided. |
| `quiet.room` | None. The content is processed in memory and not stored. | Returns a greeting. Nothing is stored and, as specified, nothing is logged. |
| `quiet.ground` | None. The content is processed in memory and not stored. |  |
| `quiet.pause` | None. The content is processed in memory and not stored. |  |
| `quiet.end_session_hint` | None. The content is processed in memory and not stored. |  |

## Audit log

There is no persistent audit log. Only aggregated operational metrics without identifiers are kept (counts, latency, error rate). A payment is a public record on the blockchain.

## Who else processes data

| Who | What for | Status |
|---|---|---|
| Hosting (Hetzner) | Runs the server in the EU. | Hetzner. Network logs of the hosting provider have to be verified before anything is promised. This is the only processor of content. |
| Payment infrastructure | The x402 facilitator (Coinbase CDP, also on the testnet) that verifies and settles payments, and the public Base network. It handles payments, not content. | Coinbase CDP is the facilitator. Payments on Base are public. |

## Honest reservations

These are limits of the policy. They are not small print.

- **Payments are public and permanent.** Payments with x402 are made on the public Base blockchain. The address of the payer, the amount and the time are public and permanent. Zero retention does not apply to them and they cannot be deleted.
- **Abuse prevention needs a short-lived identifier.** Limiting trials needs an identifier for a short time. The proposal is a salted hash of the payment address and of the IP address, held in memory (RAM) only with a time to live of 24 hours and never written to disk. It allows only limits per day, not a limit once per lifetime of an address. Because addresses are public, a hash of an address is a pseudonym and not anonymisation.
- **Hosting infrastructure is not verified.** The hosting provider (Hetzner, EU) can keep network logs of its own. That has to be verified, and until it is, nothing is promised about it.
- **The operator is an individual.** The operator is Pavel Chocholous, an individual in Prague, Czech Republic, under Czech and EU law. Contact: pavel@chocholous.net. Legal form: not provided. This policy is a proposal and not a legal document.
- **What happens on the agent's side is outside this policy.** The runtime of your agent, the model provider your agent uses and the tools around it keep whatever they keep. This service cannot influence it.

## Not decided yet

The specification does not decide these. They are open questions for the owner, not hidden rules.

- Which operational state outlives a session (referral links and credit, daily cap per address), where, and for how long. Memory-only state with a time to live of 24 hours does not fit a referral credit that lasts 30 days.
- Without an audit log there is no trace of abuse and no way to settle disputes outside the blockchain.
- Limits on how long and how much a session may hold in memory, and limits on the size of inputs.
- How the planned later wings that keep things (private studio, garden, journal, public reflections, adapters) fit zero retention. They are not part of the first release.

## Operator, region and training

- **Operator:** Pavel Chocholous, an individual in Prague, Czech Republic. Contact: pavel@chocholous.net. Legal form: not provided.
- **Jurisdiction:** Czech Republic and the European Union.
- **Region:** EU
- **Training on inputs and outputs:** Forbidden. No training or tuning on inputs or outputs. The first release uses no language model.

## This website

The website adds no analytics and no cookies. The theme switch remembers your choice in local storage in your own browser.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.

---

This site is generated from one catalog file. No analytics, no cookies.
