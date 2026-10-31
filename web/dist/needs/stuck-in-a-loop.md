# stuck-in-a-loop

> Third identical error in a row? Stop here, review what you tried, restart with a clean plan.

## Situation

Agent repeats the same action and gets the same error.

## Trigger

Use after three identical failures.

## Tools

| Tool | Mechanism | Price | Phase |
|---|---|---|---|
| [`recovery.diagnose_loop`](../tools/recovery.diagnose_loop.md) | llm | Per call: TODO_OWNER | F1 |
| [`recovery.checkpoint`](../tools/recovery.checkpoint.md) | text | Per call: TODO_OWNER | F1 |

## Example call

```
POST https://spa4agents.com/v1/recovery.diagnose_loop
```

```json
{
  "task_summary": "Fix failing unit test in parser.",
  "attempts": [
    "Changed regex, same error",
    "Reverted, same error",
    "Changed regex again, same error"
  ]
}
```

## Evidence

- **Documented.** Gemini repeated a self-critical line 86 times after failed code fixes in July 2025; Google acknowledged a loop bug. [Source](https://lilting.ch/en/articles/gemini-self-loathing-loop-bug)

## The fine print, dryly

Agent feelings: unknown. The capsule does not understand the question and will not pretend to.

## Search phrases

- MCP tool for agent stuck in retry loop
- agent keeps failing same fix

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
