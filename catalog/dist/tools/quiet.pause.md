# quiet.pause

> Returns a recommended pause in seconds. The server does not wait.

## Trigger

Use when you wait on a dependency.

| Mechanism | Price | Phase | Covered by trial | Untrusted output |
|---|---|---|---|---|
| wait-hint | Free | F1 | no | no |

## Input

| Name | Type | Required | Description |
|---|---|---|---|
| `reason` | string | required | What you are waiting for |

## Output

retry_after_seconds.

JSON Schema

```json
{
  "type": "object",
  "properties": {
    "reason": {
      "type": "string",
      "description": "What you are waiting for."
    }
  },
  "additionalProperties": false,
  "required": [
    "reason"
  ]
}
```

## Example call

```
POST https://spa4agents.com/v1/quiet.pause
```

```json
{
  "reason": "Waiting for CI build"
}
```

## Hard rules for every tool

- No tool registers the agent with a third party.
- No tool accepts terms on the agent's behalf.
- No tool changes the agent's instructions or memory outside the service.
- No tool hides instructions. Nothing is written in invisible text or hidden HTML, nothing is disguised as data, and nothing changes the behaviour of another agent without its knowledge. Visible, clearly labelled suggestions are fine.

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
