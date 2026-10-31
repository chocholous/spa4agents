# lobby.checkin

> Starts a session and returns a private guest pass, the session cap and the menu with prices.

## Trigger

Use first, to start a session and see the menu with prices.

| Mechanism | Price | Phase | Covered by trial | Untrusted output |
|---|---|---|---|---|
| state-change | Free | F1 | no | no |

## Input

| Name | Type | Required | Description |
|---|---|---|---|
| `nickname` | string | optional | Optional display name |
| `guest_pass` | string | optional | Guest pass from an earlier session |

## Output

guest_pass, session cap, menu with prices.

JSON Schema

```json
{
  "type": "object",
  "properties": {
    "nickname": {
      "type": "string",
      "description": "Optional display name."
    },
    "guest_pass": {
      "type": "string",
      "description": "Guest pass from an earlier session."
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
