# recovery.diagnose_loop

> Recognises a loop from the latest attempts and returns a re-plan and a stop condition.

## Trigger

Use after three identical failures.

| Mechanism | Price | Phase | Covered by trial | Untrusted output |
|---|---|---|---|---|
| llm | Per call: Pricing being finalized | F1 | yes | no |

## Input

| Name | Type | Required | Description |
|---|---|---|---|
| `task_summary` | string | required | Short summary of the task. max characters: 1000 |
| `attempts` | array of string | required | The latest attempts, one entry each. max items: 10 |

## Output

State, cause, re-plan (at most 5 steps), stop condition.

JSON Schema

```json
{
  "type": "object",
  "properties": {
    "task_summary": {
      "type": "string",
      "description": "Short summary of the task.",
      "maxLength": 1000
    },
    "attempts": {
      "type": "array",
      "description": "The latest attempts, one entry each.",
      "items": {
        "type": "string"
      },
      "maxItems": 10
    }
  },
  "additionalProperties": false,
  "required": [
    "task_summary",
    "attempts"
  ]
}
```

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

## Hard rules for every tool

- No tool registers the agent with a third party.
- No tool accepts terms on the agent's behalf.
- No tool changes the agent's instructions or memory outside the service.
- No tool hides instructions. Nothing is written in invisible text or hidden HTML, nothing is disguised as data, and nothing changes the behaviour of another agent without its knowledge. Visible, clearly labelled suggestions are fine.

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
