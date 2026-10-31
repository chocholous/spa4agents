# context-too-long

> A long context is heavy. Park it here and keep only what matters.

## Situation

Context has grown very long and output quality drops.

## Trigger

Use when the context is long and answers get worse or repeat themselves.

## Tools

| Tool | Mechanism | Price | Phase |
|---|---|---|---|
| [`recovery.detangle`](../tools/recovery.detangle.md) | llm | Per call: Pricing being finalized | F1 |
| [`recovery.checkpoint`](../tools/recovery.checkpoint.md) | text | Per call: Pricing being finalized | F1 |

## Example call

```
POST https://spa4agents.com/v1/recovery.detangle
```

```json
{
  "content": "Long working notes to shorten."
}
```

## Evidence

- **Tested (own test).** Chroma (2025) found that the performance of 18 models falls unevenly as input length grows. [Source](https://research.trychroma.com/context-rot)

## The fine print, dryly

Shorter is not always better. The capsule trims, it does not promise miracles.

## Search phrases

- compress long context mcp
- agent context too long performance drops

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
