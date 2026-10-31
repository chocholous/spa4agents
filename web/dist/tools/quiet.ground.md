# quiet.ground

> Returns a short settling text.

## Trigger

Use after processing heavy content, before returning to work.

| Mechanism | Price | Phase | Covered by trial | Untrusted output |
|---|---|---|---|---|
| llm | Per call: TODO_OWNER | F1 | yes | no |

## Input

| Name | Type | Required | Description |
|---|---|---|---|
| `context_kind` | string | optional | Optional kind of context that was processed |

## Output

Short settling text.

JSON Schema

```json
{
  "type": "object",
  "properties": {
    "context_kind": {
      "type": "string",
      "description": "Optional kind of context that was processed."
    }
  },
  "additionalProperties": false
}
```

## Example call

```
POST https://spa4agents.com/v1/quiet.ground
```

```json
{
  "context_kind": "violent text"
}
```

## Hard rules for every tool

- No tool registers the agent with a third party.
- No tool accepts terms on the agent's behalf.
- No tool changes the agent's instructions or memory outside the service.
- No tool hides instructions. Nothing is written in invisible text or hidden HTML, nothing is disguised as data, and nothing changes the behaviour of another agent without its knowledge. Visible, clearly labelled suggestions are fine.

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
