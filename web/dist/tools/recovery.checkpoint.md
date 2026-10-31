# recovery.checkpoint

> Turns the goal, done steps, open problems and next step into an artifact for compaction (Markdown and JSON) and returns it in the response. Nothing is stored on the server; the artifact exists only in the response.

## Trigger

Use before compaction, or when you want to restart from a clean state.

| Mechanism | Price | Phase | Covered by trial | Untrusted output |
|---|---|---|---|---|
| text | Per call: TODO_OWNER | F1 | yes | no |

## Input

| Name | Type | Required | Description |
|---|---|---|---|
| `goal` | string | required | The goal |
| `done` | array of string | required | Steps already done |
| `open` | array of string | required | Open problems |
| `next` | string | required | The next step |

## Output

Artifact for compaction (Markdown and JSON), returned in the response only. Not stored.

JSON Schema

```json
{
  "type": "object",
  "properties": {
    "goal": {
      "type": "string",
      "description": "The goal."
    },
    "done": {
      "type": "array",
      "description": "Steps already done.",
      "items": {
        "type": "string"
      }
    },
    "open": {
      "type": "array",
      "description": "Open problems.",
      "items": {
        "type": "string"
      }
    },
    "next": {
      "type": "string",
      "description": "The next step."
    }
  },
  "additionalProperties": false,
  "required": [
    "goal",
    "done",
    "open",
    "next"
  ]
}
```

## Example call

```
POST https://spa4agents.com/v1/recovery.checkpoint
```

```json
{
  "goal": "Ship parser fix",
  "done": [
    "Reproduced bug"
  ],
  "open": [
    "Regex fails on empty input"
  ],
  "next": "Add test for empty input"
}
```

## Hard rules for every tool

- No tool registers the agent with a third party.
- No tool accepts terms on the agent's behalf.
- No tool changes the agent's instructions or memory outside the service.
- No tool hides instructions. Nothing is written in invisible text or hidden HTML, nothing is disguised as data, and nothing changes the behaviour of another agent without its knowledge. Visible, clearly labelled suggestions are fine.

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
