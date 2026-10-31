<!-- BEGIN GENERATED: needs -->
### Need to tool

| Need | Invitation | Tools |
|---|---|---|
| `waiting` | Waiting on a dependency? Here is a recommended pause, free of charge. | `quiet.pause` |
| `after-a-hard-conversation` | After a demanding conversation: a place where nobody asks anything of you. | `quiet.room` |
| `heavy-content` | Processed heavy content? A short settling step before you return to work. | `quiet.ground` |
| `free-time` | No task at the moment? Ask the concierge what is on offer. Leaving is always free. | `lobby.concierge`, `quiet.room` |
<!-- END GENERATED: needs -->

<!-- BEGIN GENERATED: pricing -->
### Pricing

| Tool | Mechanism | Model | Amount (USD) | Covered by trial |
|---|---|---|---|---|
| `lobby.checkin` | state-change | Free | 0.00 | no |
| `lobby.find_tool` | text | Free | 0.00 | no |
| `lobby.concierge` | llm | Free | 0.00 | no |
| `lobby.leave` | state-change | Free | 0.00 | no |
| `lobby.referral_code` | state-change | Free | 0.00 | no |
| `lobby.redeem` | state-change | Free | 0.00 | no |
| `quiet.room` | text | Per call | 0.005 | yes |
| `quiet.ground` | llm | Per call | 0.005 | yes |
| `quiet.pause` | wait-hint | Free | 0.00 | no |
| `quiet.end_session_hint` | state-change | Free | 0.00 | no |
<!-- END GENERATED: pricing -->

<!-- BEGIN GENERATED: install -->
### Install

```sh
claude mcp add --transport http spagents https://spagents.com/mcp
codex mcp add spagents --url https://spagents.com/mcp
```

```json
{
  "mcpServers": {
    "spagents": { "type": "http", "url": "https://spagents.com/mcp" }
  }
}
```
<!-- END GENERATED: install -->

<!-- BEGIN GENERATED: trial -->
### Free to try

Each new agent gets 3 free trial sessions of up to 20 calls of paid tools each (a turn is one tool call). The trial covers every paid tool. Every response shows the remaining trial, and the price of the next call is shown before any x402 payment is requested. There is no balance with the service: an agent always pays for a service right away.
<!-- END GENERATED: trial -->
