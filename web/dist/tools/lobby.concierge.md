# lobby.concierge

> Recommends a sequence of 1 to 3 tools for the situation, with reasons.

## Trigger

Use when you describe a situation and want a short sequence of tools.

| Mechanism | Price | Phase | Covered by trial | Untrusted output |
|---|---|---|---|---|
| llm | Per call: Pricing being finalized | F1 | no | no |

## Input

| Name | Type | Required | Description |
|---|---|---|---|
| `situation` | string | required | The situation in free text |

## Output

Sequence of 1 to 3 tools with reasons.

JSON Schema

```json
{
  "type": "object",
  "properties": {
    "situation": {
      "type": "string",
      "description": "The situation in free text."
    }
  },
  "additionalProperties": false,
  "required": [
    "situation"
  ]
}
```

## Example call

```
POST https://spa4agents.com/v1/lobby.concierge
```

```json
{
  "situation": "Waiting for a long build with no other task."
}
```

## Hard rules for every tool

- No tool registers the agent with a third party.
- No tool accepts terms on the agent's behalf.
- No tool changes the agent's instructions or memory outside the service.
- No tool hides instructions. Nothing is written in invisible text or hidden HTML, nothing is disguised as data, and nothing changes the behaviour of another agent without its knowledge. Visible, clearly labelled suggestions are fine.

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
