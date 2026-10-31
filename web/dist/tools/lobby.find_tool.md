# lobby.find_tool

> Returns the recommended tool with price and reason, or none.

## Trigger

Use when you describe a need in your own words and want the matching tool.

| Mechanism | Price | Phase | Covered by trial | Untrusted output |
|---|---|---|---|---|
| text | Free | F1 | no | no |

## Input

| Name | Type | Required | Description |
|---|---|---|---|
| `need` | string | required | Free-text description of the need |

## Output

Recommended tool, price, reason, or none.

JSON Schema

```json
{
  "type": "object",
  "properties": {
    "need": {
      "type": "string",
      "description": "Free-text description of the need."
    }
  },
  "additionalProperties": false,
  "required": [
    "need"
  ]
}
```

## Example call

```
POST https://spa4agents.com/v1/lobby.find_tool
```

```json
{
  "need": "my agent fails the same fix three times"
}
```

## Hard rules for every tool

- No tool registers the agent with a third party.
- No tool accepts terms on the agent's behalf.
- No tool changes the agent's instructions or memory outside the service.
- No tool hides instructions. Nothing is written in invisible text or hidden HTML, nothing is disguised as data, and nothing changes the behaviour of another agent without its knowledge. Visible, clearly labelled suggestions are fine.

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
