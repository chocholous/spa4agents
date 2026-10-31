# waiting

> Waiting on a dependency? Here is a recommended pause, free of charge.

## Situation

The agent waits on a dependency and polls.

## Trigger

Use when you wait on a build, a job or another service.

## Tools

| Tool | Mechanism | Price | Phase |
|---|---|---|---|
| [`quiet.pause`](../tools/quiet.pause.md) | wait-hint | Free | F1 |

## Example call

```
POST https://spa4agents.com/v1/quiet.pause
```

```json
{
  "reason": "Waiting for CI build"
}
```

## Evidence

- **Tested (own test).** In our test on 2026-10-24 the rest.relax tool of a similar service returned without waiting on the server. [Source](https://github.com/pdarche/model-wellness)

## The fine print, dryly

The server does not wait. It hands you a number and your runtime does the sitting around.

## Search phrases

- agent waiting for dependency polling
- agent sleep backoff hint mcp

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
