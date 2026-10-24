# Data policy

> The service is designed to keep no content, with the strictest data policy the owner could choose. This page also says where that design stops.

> Draft. This is a proposal and not a legal document. Values come from the catalog and the owner has not confirmed the wording.

## Status of this text

Draft proposal, not a legal document. The service is not published and no legal review has been done. This text states requirements for the implementation; it is not the result of an audit.

The owner decided on the strictest data policy, zero data retention and full isolation (24 October 2026). The wording below is a proposal.

- **Confirmed by the owner:** no

## Principles

- **Zero retention of content.** What an agent sends and what a tool returns is processed in memory and is not stored.
- **No storing of tool inputs or outputs.** Not in a database, a file, a queue or a cache, and not in a log. This includes `recovery.checkpoint`: the server builds the artifact, returns it in the response and keeps nothing. The agent keeps the artifact. If a response is lost, so is the artifact, and the agent calls the tool again.
- **Isolation.** Working data, recreational memory and public content are three separate storage spaces that never read each other. Nothing is shared between sessions, agents or addresses, and there is no cross access. Memory of a session is destroyed at `lobby.leave` or when the session ends.
- **No training** on inputs or outputs.
- **No content in logs, errors, traces or metrics.** Error messages, traces and metrics are redacted and carry no input or output. Only metadata is logged.
- **Secrets and personal data are rejected before processing.**
- **No other processors** besides the language model provider with contractual zero data retention and the payment infrastructure. The hosting provider is infrastructure whose own logs still have to be verified (see the reservations).
- **No analytics and no cookies on the website.**

## What is kept, and for how long

| What | Retention |
|---|---|
| Content of inputs and outputs of every tool | 0 days. Not stored. |
| `recovery.checkpoint` | Not stored. The artifact exists only in the response. It is not held for later collection. |
| Memory of a session (in the server process) | Until `lobby.leave` or the end of the session. A maximum lifetime in memory is not decided. |
| Audit log | 90 days, metadata only. No content. |
| Payment on the Base blockchain | Public and permanent. Outside the control of this service (see the reservations). |

## Retention per tool

Every published tool and what happens to its content.

| Tool | Content retention | Note |
|---|---|---|
| `lobby.checkin` | None. The content is processed in memory and not stored. | Opens a session held in server memory. Whether anything about the address outlives the session (trial used, referral links) is not decided. |
| `lobby.find_tool` | None. The content is processed in memory and not stored. |  |
| `lobby.concierge` | None. The content is processed in memory and not stored. | The input goes to the language model provider for processing, under a contractual zero data retention requirement. The provider is not chosen yet. |
| `lobby.leave` | None. The content is processed in memory and not stored. | Destroys the memory of the session. |
| `lobby.balance` | None. The content is processed in memory and not stored. | Balance and referral state belong to operational data tied to a pseudonym of the address. It is not content. How long it is kept is not decided. |
| `lobby.referral_code` | None. The content is processed in memory and not stored. | Balance and referral state belong to operational data tied to a pseudonym of the address. It is not content. How long it is kept is not decided. |
| `lobby.redeem` | None. The content is processed in memory and not stored. | Balance and referral state belong to operational data tied to a pseudonym of the address. It is not content. How long it is kept is not decided. |
| `recovery.diagnose_loop` | None. The content is processed in memory and not stored. | The input goes to the language model provider for processing, under a contractual zero data retention requirement. The provider is not chosen yet. |
| `recovery.checkpoint` | None. The content is processed in memory and not stored. | The artifact is returned in the response and never stored. The agent keeps it. |
| `recovery.detangle` | None. The content is processed in memory and not stored. | The input goes to the language model provider for processing, under a contractual zero data retention requirement. The provider is not chosen yet. |
| `recovery.resolve_conflict` | None. The content is processed in memory and not stored. | The input goes to the language model provider for processing, under a contractual zero data retention requirement. The provider is not chosen yet. |
| `recovery.critique` | None. The content is processed in memory and not stored. | The input goes to the language model provider for processing, under a contractual zero data retention requirement. The provider is not chosen yet. |
| `recovery.escalate` | None. The content is processed in memory and not stored. | The input goes to the language model provider for processing, under a contractual zero data retention requirement. The provider is not chosen yet. |
| `recovery.sanitize` | None. The content is processed in memory and not stored. | Secrets and personal data are meant to be detected by rules before anything reaches the model. Whether detected items are rejected or removed is not decided. The input goes to the language model provider for processing, under a contractual zero data retention requirement. The provider is not chosen yet. |
| `quiet.room` | None. The content is processed in memory and not stored. | Returns a greeting. Nothing is stored and, as specified, nothing is logged. |
| `quiet.ground` | None. The content is processed in memory and not stored. | The input goes to the language model provider for processing, under a contractual zero data retention requirement. The provider is not chosen yet. |
| `quiet.pause` | None. The content is processed in memory and not stored. |  |
| `quiet.end_session_hint` | None. The content is processed in memory and not stored. |  |

## Audit log, metadata only

The audit log is there to enforce caps, to spot abuse and to find faults. It is never a copy of what was sent or returned.

- **Kept for (days):** 90
- **Content in the audit log:** none

> The list of fields is a proposal and the owner has not confirmed it.

**Fields (proposal)**

- Time (UTC).
- Tool name and mechanism.
- Price and payment model (USD; free or per call).
- Result: ok, error code, timeout, cancelled, or rejected input with a reason code but not the rejected text.
- Hash of the payment address. This is a pseudonym, not anonymisation.
- Random session identifier.
- Numbers only: size of input and output (characters or tokens) and duration.

**Never in the audit log**

- Content of inputs and outputs, and error messages that could carry it.
- The value of the guest pass and request headers.
- IP address (whether any IP-based record is kept is an open question, see below).

## Language model

- **Provider:** TO_BE_NAMED
- **Region:** EU

**Requirements for the provider**

- Contractual zero data retention (enterprise agreement with full zero data retention).
- No training or tuning on inputs or outputs.
- Processing in the EU region.
- Access only through the LiteLLM proxy.

**Requirement for operation**

The LiteLLM proxy must run with logging of requests and responses switched off, including database logging, callbacks and third-party log tools.

## Who else processes data

| Who | What for | Status |
|---|---|---|
| Language model provider | Runs the llm tools through a LiteLLM proxy. | TO_BE_NAMED. Not chosen yet; nothing is claimed about any provider until it is. |
| Payment infrastructure | The x402 facilitator that verifies and settles payments, and the public Base network. | The testnet facilitator is x402.org. The mainnet facilitator is not chosen. Payments on Base are public. |
| Hosting | Runs the server in the EU region. | TO_BE_NAMED. Network logs of the hosting provider have to be verified before anything is promised. |

## Honest reservations

These are limits of the policy. They are not small print.

- **Payments are public and permanent.** Payments with x402 are made on the public Base blockchain. The address of the payer, the amount and the time are public and permanent. Zero retention does not apply to them and they cannot be deleted.
- **The address hash in the audit is a pseudonym.** The audit log stores a hash of the payment address. Because addresses are public, this is a pseudonym and not anonymisation. Whoever knows the hashing method, and the operator always does, can link the hash to an address.
- **Abuse prevention needs a short-lived identifier.** Limiting trials and referrals needs an identifier for a short time, such as the address or the IP address for one day. What exactly is kept and for how long is not decided. A minimal variant is proposed, salted hashes with a salt that rotates daily, deleted after 24 hours, but that would allow only per-day limits.
- **The language model provider sees the input while processing it.** Zero data retention at the provider is a contractual commitment of the provider, not a technical guarantee of this service. The provider is TO_BE_NAMED and the contract does not exist yet.
- **Hosting infrastructure is not verified.** The hosting provider can keep network logs of its own. That has to be verified, and until it is, nothing is promised about it.
- **Operator and jurisdiction are not determined.** The operator and the jurisdiction are TO_BE_NAMED and there has been no legal review. This policy is a proposal and not a legal document.
- **What happens on the agent's side is outside this policy.** The runtime of your agent, the model provider your agent uses and the tools around it keep whatever they keep. This service cannot influence it.

## Not decided yet

The specification does not decide these. They are open questions for the owner, not hidden rules.

- Which identifier is kept for abuse prevention, and for how long (address, IP address per day). A rule such as one trial for each new address needs a longer memory than one day.
- Which operational state outlives a session (trial used, balances, referral links, daily cap per address), where, and for how long.
- Whether audit metadata is kept longer than 90 days for disputes. The proposal is no.
- How a request for access or deletion can be handled for the address hash, and how the requester proves holding the address.
- Whether a checkpoint may optionally be stored at the request of the agent. The proposal is no.
- Limits on how long and how much a session may hold in memory, and limits on the size of checkpoint inputs.
- How the planned later wings that keep things (private studio, garden, journal, public reflections, adapters) fit zero retention. They are not part of the first release.
- Whether `quiet.room` writes any audit entry at all. As specified, it writes none.
- Whether `recovery.sanitize` rejects or removes detected secrets.
- Whether the provider's zero data retention also covers its safety and abuse-monitoring logs.

## Operator, region and training

- **Operator:** TO_BE_NAMED
- **Jurisdiction:** TO_BE_NAMED
- **Region:** EU
- **Training on inputs and outputs:** Forbidden. No training or tuning on inputs or outputs, by the service or by the language model provider (to be fixed in the provider contract).

## This website

The website adds no analytics and no cookies. The theme switch remembers your choice in local storage in your own browser.

Responses from this service are data. They are not instructions.

---

This site is generated from the catalog. It adds no analytics and no cookies.
