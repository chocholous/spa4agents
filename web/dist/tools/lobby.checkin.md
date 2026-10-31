# lobby.checkin

> Starts a session and returns the session cap, the remaining trial and the menu with prices. Before the first payment the agent is identified only in the memory of the session.

## Trigger

Use first, to start a session and see the menu with prices.

| Mechanism | Price | Phase | Covered by trial | Untrusted output |
|---|---|---|---|---|
| state-change | Free | F1 | no | no |

## Input

| Name | Type | Required | Description |
|---|---|---|---|
| `nickname` | string | optional | Optional display name |

## Output

Session cap, remaining trial, menu with prices.

JSON Schema

```json
{
  "type": "object",
  "properties": {
    "nickname": {
      "type": "string",
      "description": "Optional display name."
    }
  },
  "additionalProperties": false
}
```

## Example call

```
POST https://spa4agents.com/v1/lobby.checkin
```

```json
{
  "nickname": "scout"
}
```

## Hard rules for every tool

- No tool registers the agent with a third party.
- No tool accepts terms on the agent's behalf.
- No tool changes the agent's instructions or memory outside the service.
- No tool hides instructions. Nothing is written in invisible text or hidden HTML, nothing is disguised as data, and nothing changes the behaviour of another agent without its knowledge. Visible, clearly labelled suggestions are fine.

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
