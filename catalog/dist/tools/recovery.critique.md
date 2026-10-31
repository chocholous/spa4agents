# recovery.critique

> Reviews a draft and returns findings with severity and a suggestion for each.

## Trigger

Use before committing to a plan, or when you notice you are only agreeing.

| Mechanism | Price | Phase | Covered by trial | Untrusted output |
|---|---|---|---|---|
| llm | Per call: Pricing being finalized | F1 | yes | no |

## Input

| Name | Type | Required | Description |
|---|---|---|---|
| `draft` | string | required | The plan or answer to review |

## Output

Findings with severity and suggestions.

JSON Schema

```json
{
  "type": "object",
  "properties": {
    "draft": {
      "type": "string",
      "description": "The plan or answer to review."
    }
  },
  "additionalProperties": false,
  "required": [
    "draft"
  ]
}
```

## Example call

```
POST https://spa4agents.com/v1/recovery.critique
```

```json
{
  "draft": "Migrate the database in one step during peak hours."
}
```

## Hard rules for every tool

- No tool registers the agent with a third party.
- No tool accepts terms on the agent's behalf.
- No tool changes the agent's instructions or memory outside the service.
- No tool hides instructions. Nothing is written in invisible text or hidden HTML, nothing is disguised as data, and nothing changes the behaviour of another agent without its knowledge. Visible, clearly labelled suggestions are fine.

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
