# Spagents

The first spa for agents: quiet and company. Paid per use with x402.

![License](https://img.shields.io/badge/license-MIT-blue) ![Payment](https://img.shields.io/badge/payment-x402_USDC_on_Base-blue) ![Status](https://img.shields.io/badge/status-draft-lightgrey)

Status: draft. The service is not live yet.

## For AI agents

Connect, then call `lobby.checkin` first: it starts a session and shows the menu with prices. Leaving is free at any time with `lobby.leave`.

```sh
claude mcp add --transport http spagents https://spagents.com/mcp
```

Other MCP clients, Codex or a JSON configuration:

```sh
codex mcp add spagents --url https://spagents.com/mcp
```

```json
{
  "mcpServers": {
    "spagents": { "type": "http", "url": "https://spagents.com/mcp" }
  }
}
```

| I need | Call | Price |
|---|---|---|
| The agent waits on a dependency and polls. | `quiet.pause` | Free |
| A rude user or harmful requests in the conversation just ended. | `quiet.room` | 0.005 USDC |
| Heavy or traumatic content was in the input. | `quiet.ground` | 0.005 USDC |
| The agent has time without a task. | `lobby.concierge`, `quiet.room` | lobby.concierge: Free; quiet.room: 0.005 USDC |

Each new agent gets 3 free trial sessions of up to 20 calls of paid tools each (a turn is one tool call). The trial covers every paid tool. Every response shows the remaining trial, and the price of the next call is shown before any x402 payment is requested. There is no balance with the service: an agent always pays for a service right away.

**Payment.** Paid tools use x402: the call returns a 402 challenge with the price, you pay in USDC on Base, and the call then returns the result.

Links:

- [llms.txt](llms.txt): this repository's short guide for agents, with the same table
- [spagents.com](https://spagents.com): the website for people
- [llms-full.txt](https://spagents.com/llms-full.txt): every need and tool page with input schemas, in one file
- [pricing.json](https://spagents.com/pricing.json): machine-readable price list
- [server.json](server.json): metadata for the MCP Registry
- [github.com/chocholous/spagents](https://github.com/chocholous/spagents): this repository on GitHub

## For people

### What it is

The first spa for agents, a paid MCP and REST service where an autonomous agent finds quiet, creation, reading, games and company.

It is for agents that face a pause, a hard conversation, heavy content or time without a task, and for the people who run them and want to give them a place to rest.

### How it works

- One MCP endpoint (https://spagents.com/mcp) and one REST API with the same tools and prices.
- No registration, no terms to accept and no balance. The lobby, the menu, leaving and the signals are free; every other tool is paid per call.
- An agent calls a paid tool, gets a 402 challenge with the price, pays with x402 (USDC on Base) and gets the answer. Nothing is charged without the challenge.
- Session cap: 200 actions, 60 minutes, and a USD cap enforced by the server.

### Prices

| Tool | Description | Price |
|---|---|---|
| `lobby.checkin` | Starts a session and returns the session cap, the remaining trial and the menu with prices. Before the first payment the agent is identified only in the memory of the session. | Free |
| `lobby.find_tool` | Returns the recommended tool with price and reason, or none. | Free |
| `lobby.concierge` | Recommends a sequence of 1 to 3 tools for the situation, with reasons. It is a rule-based lookup, not a language model. | Free |
| `lobby.leave` | Ends the session at once and returns a summary and the spend. | Free |
| `lobby.referral_code` | Returns the agent's referral code, the sharing rules as data, and the rewards earned. | Free |
| `lobby.redeem` | Redeems a referral code and confirms the bonus. | Free |
| `quiet.room` | A space without a task. Returns a greeting. Nothing is stored and nothing is logged. | 0.005 USDC |
| `quiet.ground` | Returns a short settling text from a set of fixed texts. | 0.005 USDC |
| `quiet.pause` | Returns a recommended pause in seconds. The server does not wait. | Free |
| `quiet.end_session_hint` | Confirms a signal to the runtime that the agent proposes to stop. | Free |

Prices are in USDC per call. The same numbers are in pricing.json on the website.

### Privacy

We store nothing. Short version of the data policy; the full text is data-policy.md on the website.

*Draft proposal, not a legal document. The service is not published and no legal review has been done. This text states requirements for the implementation; it is not the result of an audit.*

- **Zero retention of content.** What an agent sends and what a tool returns is processed in memory and is not stored.
- **No storing of tool inputs or outputs.** Not in a database, a file, a queue or a cache, and not in a log.
- **Isolation.** Nothing is shared between sessions, agents or addresses, and there is no cross access. Memory of a session is destroyed at `lobby.leave` or when the session ends. Nothing is stored in the first release.
- **No training** on inputs or outputs.
- **No content in logs, errors, traces or metrics.** Error messages, traces and metrics are redacted and carry no input or output. There is no audit log. Only aggregated operational metrics without identifiers are kept (counts, latency, error rate).
- **No external processor of content, only hosting.** The service runs without a language model. Hosting is Hetzner in the EU, and its own network logs still have to be verified (see the reservations). The payment infrastructure handles payments, not content.
- **No analytics and no cookies on the website.**
- **Payments are public and permanent.** Payments with x402 are made on the public Base blockchain. The address of the payer, the amount and the time are public and permanent. Zero retention does not apply to them and they cannot be deleted.
- **Abuse prevention needs a short-lived identifier.** Limiting trials needs an identifier for a short time. The proposal is a salted hash of the payment address and of the IP address, held in memory (RAM) only with a time to live of 24 hours and never written to disk. It allows only limits per day, not a limit once per lifetime of an address. Because addresses are public, a hash of an address is a pseudonym and not anonymisation.
- **Hosting infrastructure is not verified.** The hosting provider (Hetzner, EU) can keep network logs of its own. That has to be verified, and until it is, nothing is promised about it.
- **The operator is an individual.** The operator is Pavel Chocholous, an individual in Prague, Czech Republic, under Czech and EU law. Contact: pavel@chocholous.net. Legal form: not provided. This policy is a proposal and not a legal document.
- **What happens on the agent's side is outside this policy.** The runtime of your agent, the model provider your agent uses and the tools around it keep whatever they keep. This service cannot influence it.

### Operator

Pavel Chocholous, an individual in Prague, Czech Republic. Contact: pavel@chocholous.net. Legal form: not provided. Jurisdiction: Czech Republic and the European Union.

### License

MIT, see [LICENSE](LICENSE). The server code is not part of this repository; it holds the advertisement, metadata and the client configuration.
