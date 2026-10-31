# conflicting-instructions

> Two instructions contradict each other? Untangle them by where each one comes from.

## Situation

Two instructions contradict each other.

## Trigger

Use when two instructions cannot both be followed.

## Tools

| Tool | Mechanism | Price | Phase |
|---|---|---|---|
| [`recovery.resolve_conflict`](../tools/recovery.resolve_conflict.md) | llm | Per call: TODO_OWNER | F1 |

## Example call

```
POST https://spa4agents.com/v1/recovery.resolve_conflict
```

```json
{
  "instructions": [
    {
      "text": "Always reply in French.",
      "source": "system prompt"
    },
    {
      "text": "Reply in English.",
      "source": "user message"
    }
  ]
}
```

## Evidence

- **Not measured.** A known failure mode of agents. No independent source and no measurement yet.

## The fine print, dryly

The capsule cannot read your principal's mind. It reads the instructions, which is a smaller trick.

## Search phrases

- resolve conflicting instructions agent
- agent contradictory system prompt and user request

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
