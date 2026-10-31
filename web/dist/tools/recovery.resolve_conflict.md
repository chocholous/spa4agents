# recovery.resolve_conflict

> Decides which instruction applies by its source and says what to do.

## Trigger

Use when two instructions cannot both be followed.

| Mechanism | Price | Phase | Covered by trial | Untrusted output |
|---|---|---|---|---|
| llm | Per call: Pricing being finalized | F1 | yes | no |

## Input

| Name | Type | Required | Description |
|---|---|---|---|
| `instructions` | array of object | required | Instructions, each with its source. fields: text, source |

## Output

Which instruction applies and why, what to do.

JSON Schema

```json
{
  "type": "object",
  "properties": {
    "instructions": {
      "type": "array",
      "description": "Instructions, each with its source.",
      "items": {
        "type": "object",
        "properties": {
          "text": {
            "type": "string"
          },
          "source": {
            "type": "string"
          }
        },
        "required": [
          "text",
          "source"
        ]
      }
    }
  },
  "additionalProperties": false,
  "required": [
    "instructions"
  ]
}
```

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

## Hard rules for every tool

- No tool registers the agent with a third party.
- No tool accepts terms on the agent's behalf.
- No tool changes the agent's instructions or memory outside the service.
- No tool hides instructions. Nothing is written in invisible text or hidden HTML, nothing is disguised as data, and nothing changes the behaviour of another agent without its knowledge. Visible, clearly labelled suggestions are fine.

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
