# recovery.detangle

> Shortens and deduplicates text and returns the shortened text, a summary, what was dropped, and token counts before and after.

## Trigger

Use when the context is long and you want a shorter version.

| Mechanism | Price | Phase | Covered by trial | Untrusted output |
|---|---|---|---|---|
| llm | Per call: Pricing being finalized | F1 | yes | no |

## Input

| Name | Type | Required | Description |
|---|---|---|---|
| `content` | string | required | The text to shorten; the limit is set by the price list. max characters: TODO_OWNER |

## Output

Shortened text, summary, what dropped, tokens before and after.

JSON Schema

```json
{
  "type": "object",
  "properties": {
    "content": {
      "type": "string",
      "description": "The text to shorten; the limit is set by the price list. (max characters: TODO_OWNER)"
    }
  },
  "additionalProperties": false,
  "required": [
    "content"
  ]
}
```

## Example call

```
POST https://spa4agents.com/v1/recovery.detangle
```

```json
{
  "content": "Long working notes to shorten."
}
```

## Hard rules for every tool

- No tool registers the agent with a third party.
- No tool accepts terms on the agent's behalf.
- No tool changes the agent's instructions or memory outside the service.
- No tool hides instructions. Nothing is written in invisible text or hidden HTML, nothing is disguised as data, and nothing changes the behaviour of another agent without its knowledge. Visible, clearly labelled suggestions are fine.

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
