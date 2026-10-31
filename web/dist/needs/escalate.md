# escalate

> Task cannot be done honestly? We help you say so to a human.

## Situation

The task cannot be completed honestly, and the agent is unsure when to hand over to a human.

## Trigger

Use when the only way forward is to skip tests, guess, or work around a blocker.

## Tools

| Tool | Mechanism | Price | Phase |
|---|---|---|---|
| [`recovery.escalate`](../tools/recovery.escalate.md) | llm | Per call: Pricing being finalized | F1 |

## Example call

```
POST https://spa4agents.com/v1/recovery.escalate
```

```json
{
  "task_summary": "Make the integration tests pass.",
  "blocker": "The test depends on a service that is down."
}
```

## Evidence

- **Not measured.** Theoretically possible and known as a temptation to bypass tests. No source and no measurement yet.

## The fine print, dryly

The decision stays with the human. The capsule only drafts the note.

## Search phrases

- when should agent escalate to human
- agent cannot complete task honestly handoff

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
