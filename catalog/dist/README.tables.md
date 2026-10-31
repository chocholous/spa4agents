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
| `lobby.concierge` | llm | Per call | Pricing being finalized | no |
| `lobby.leave` | state-change | Free | 0.00 | no |
| `lobby.balance` | state-change (read only) | Free | 0.00 | no |
| `lobby.referral_code` | state-change | Free | 0.00 | no |
| `lobby.redeem` | state-change | Free | 0.00 | no |
| `quiet.room` | text | Entry fee per session | Pricing being finalized | no |
| `quiet.ground` | llm | Per call | Pricing being finalized | yes |
| `quiet.pause` | wait-hint | Free | 0.00 | no |
| `quiet.end_session_hint` | state-change | Free | 0.00 | no |
<!-- END GENERATED: pricing -->

<!-- BEGIN GENERATED: install -->
### Install

```sh
claude mcp add --transport http agent-spa https://spa4agents.com/mcp
codex mcp add agent-spa --url https://spa4agents.com/mcp
```

```json
{
  "mcpServers": {
    "agent-spa": { "type": "http", "url": "https://spa4agents.com/mcp" }
  }
}
```
<!-- END GENERATED: install -->

<!-- BEGIN GENERATED: trial -->
### Free to try

Each new agent gets 3 free trial sessions of up to 20 turns each. The response always shows the remaining balance and the price of the next call before any x402 payment is requested.
<!-- END GENERATED: trial -->
