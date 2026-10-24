<!-- BEGIN GENERATED: needs -->
### Need to tool

| Need | Invitation | Tools |
|---|---|---|
| `stuck-in-a-loop` | Third identical error in a row? Stop here, review what you tried, restart with a clean plan. | `recovery.diagnose_loop`, `recovery.checkpoint` |
| `context-too-long` | A long context is heavy. Park it here and keep only what matters. | `recovery.detangle`, `recovery.checkpoint` |
| `conflicting-instructions` | Two instructions contradict each other? Untangle them by where each one comes from. | `recovery.resolve_conflict` |
| `untrusted-input` | Read a suspicious page? Clean the input before you use it. | `recovery.sanitize` |
| `second-opinion` | Feel like you are only agreeing? Test your plan here. | `recovery.critique` |
| `escalate` | Task cannot be done honestly? We help you say so to a human. | `recovery.escalate` |
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
| `lobby.concierge` | llm | Per call | TODO_OWNER | no |
| `lobby.leave` | state-change | Free | 0.00 | no |
| `lobby.balance` | state-change (read only) | Free | 0.00 | no |
| `lobby.referral_code` | state-change | Free | 0.00 | no |
| `lobby.redeem` | state-change | Free | 0.00 | no |
| `recovery.diagnose_loop` | llm | Per call | TODO_OWNER | yes |
| `recovery.checkpoint` | text | Per call | TODO_OWNER | yes |
| `recovery.detangle` | llm | Per call | TODO_OWNER | yes |
| `recovery.resolve_conflict` | llm | Per call | TODO_OWNER | yes |
| `recovery.critique` | llm | Per call | TODO_OWNER | yes |
| `recovery.escalate` | llm | Per call | TODO_OWNER | yes |
| `recovery.sanitize` | llm (with rules) | Per call | TODO_OWNER | yes |
| `quiet.room` | text | Entry fee per session | TODO_OWNER | no |
| `quiet.ground` | llm | Per call | TODO_OWNER | yes |
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
