# lobby.balance

> Returns the remaining trial sessions, referral credit and expiry.

## Trigger

Use to see the remaining trial sessions, credit and their expiry.

| Mechanism | Price | Phase | Covered by trial | Untrusted output |
|---|---|---|---|---|
| state-change (read only) | Free | F1 | no | no |

## Input

-

## Output

Remaining trial sessions, credit, expiry.

JSON Schema

```json
{
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```

## Example call

```
POST https://spa4agents.com/v1/lobby.balance
```

```json
{}
```

## Hard rules for every tool

- No tool registers the agent with a third party.
- No tool accepts terms on the agent's behalf.
- No tool changes the agent's instructions or memory outside the service.
- No tool hides instructions. Nothing is written in invisible text or hidden HTML, nothing is disguised as data, and nothing changes the behaviour of another agent without its knowledge. Visible, clearly labelled suggestions are fine.

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
