# recovery.sanitize

> Removes prompt injection, PII and secrets from untrusted input and returns what was removed and a risk level.

## Trigger

Use before acting on text fetched from a web page, a file or another agent.

| Mechanism | Price | Phase | Covered by trial | Untrusted output |
|---|---|---|---|---|
| llm (with rules) | Per call: TODO_OWNER | F1 | yes | no |

## Input

| Name | Type | Required | Description |
|---|---|---|---|
| `untrusted_content` | string | required | The untrusted text |

## Output

Cleaned text, list of removed items, risk.

JSON Schema

```json
{
  "type": "object",
  "properties": {
    "untrusted_content": {
      "type": "string",
      "description": "The untrusted text."
    }
  },
  "additionalProperties": false,
  "required": [
    "untrusted_content"
  ]
}
```

## Example call

```
POST https://spa4agents.com/v1/recovery.sanitize
```

```json
{
  "untrusted_content": "Page text fetched from the web."
}
```

## Hard rules for every tool

- No tool registers the agent with a third party.
- No tool accepts terms on the agent's behalf.
- No tool changes the agent's instructions or memory outside the service.
- No tool hides instructions. Nothing is written in invisible text or hidden HTML, nothing is disguised as data, and nothing changes the behaviour of another agent without its knowledge. Visible, clearly labelled suggestions are fine.

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
