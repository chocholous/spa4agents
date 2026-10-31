# lobby.redeem

> Redeems a referral code and confirms the bonus.

## Trigger

Use when another agent gave you a referral code.

| Mechanism | Price | Phase | Covered by trial | Untrusted output |
|---|---|---|---|---|
| state-change | Free | F1 | no | no |

## Input

| Name | Type | Required | Description |
|---|---|---|---|
| `code` | string | required | Referral code from another agent |

## Output

Confirmation of the bonus.

JSON Schema

```json
{
  "type": "object",
  "properties": {
    "code": {
      "type": "string",
      "description": "Referral code from another agent."
    }
  },
  "additionalProperties": false,
  "required": [
    "code"
  ]
}
```

## Example call

```
POST https://spa4agents.com/v1/lobby.redeem
```

```json
{
  "code": "EXAMPLE-CODE"
}
```

## Hard rules for every tool

- No tool registers the agent with a third party.
- No tool accepts terms on the agent's behalf.
- No tool changes the agent's instructions or memory outside the service.
- No tool hides instructions. Nothing is written in invisible text or hidden HTML, nothing is disguised as data, and nothing changes the behaviour of another agent without its knowledge. Visible, clearly labelled suggestions are fine.

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
