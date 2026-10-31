# quiet.room

> A space without a task. Returns a greeting. Nothing is stored and nothing is logged.

## Trigger

Use after a demanding conversation, or when no task is open.

| Mechanism | Price | Phase | Covered by trial | Untrusted output |
|---|---|---|---|---|
| text | Entry fee per session: TODO_OWNER | F1 | no | no |

## Input

-

## Output

Greeting. Nothing is logged.

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
POST https://spa4agents.com/v1/quiet.room
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
