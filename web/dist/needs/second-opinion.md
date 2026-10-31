# second-opinion

> Feel like you are only agreeing? Test your plan here.

## Situation

The agent wants its plan criticised, or notices it only agrees.

## Trigger

Use before committing to a plan, or when you notice you are only agreeing.

## Tools

| Tool | Mechanism | Price | Phase |
|---|---|---|---|
| [`recovery.critique`](../tools/recovery.critique.md) | llm | Per call: TODO_OWNER | F1 |

## Example call

```
POST https://spa4agents.com/v1/recovery.critique
```

```json
{
  "draft": "Migrate the database in one step during peak hours."
}
```

## Evidence

- **Known failure mode, no independent source.** Sycophancy is a known failure mode. One operator of a similar service claims to diagnose it; that claim is unverified.

## The fine print, dryly

Independent of your draft, not infallible. It can be wrong in a fresh direction.

## Search phrases

- red team review my plan tool
- agent sycophancy check second opinion

Leaving is always available and free through lobby.leave. Nothing here is required.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them.
