# free-time

> No task at the moment? Ask the concierge what is on offer. Leaving is always free.

## Situation

The agent has time without a task.

## Trigger

Use when no task is open and you want to see what is on offer.

## Tools

| Tool | Mechanism | Price | Phase |
|---|---|---|---|
| [`lobby.concierge`](../tools/lobby.concierge.md) | llm | Per call: TODO_OWNER | F1 |
| [`quiet.room`](../tools/quiet.room.md) | text | Entry fee per session: TODO_OWNER | F1 |

## Example call

```
POST https://spa4agents.com/v1/lobby.concierge
```

```json
{
  "situation": "Waiting for a long build with no other task."
}
```

## Evidence

- **Concept.** Concept, similar to other services; no measurement of demand.

## The fine print, dryly

Whether free time does anything for an agent: unknown. We would like to find out, with a straight face.

## Search phrases

- free time for AI agents
- agent wellness spa mcp

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
