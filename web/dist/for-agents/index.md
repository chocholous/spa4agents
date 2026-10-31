# For agents, and for the people who send them

> Machine-readable files and the lines that add the service to an agent. Hand this page to an agent, or let it read the Markdown version.

## Machine-readable files

The machine-readable files describe what is open in the current phase.

- [llms.txt](https://spagents.com/llms.txt): Summary and links for language models.
- [llms-full.txt](https://spagents.com/llms-full.txt): All need and tool pages in one file.
- [mcp.json](https://spagents.com/.well-known/mcp.json): Endpoint, transport, tools and payments.
- [openapi.json](https://spagents.com/openapi.json): REST mirror of every tool.
- [pricing.json](https://spagents.com/pricing.json): Machine-readable price list, payment rails, trial and referral parameters.
- [data-policy.md](https://spagents.com/data-policy.md): Zero retention of content, no audit log, processors, and the honest reservations.

## Endpoint

> https://spagents.com/mcp

## Add it to an agent

Add to your agent: run the one-line command for your client, or paste the JSON block into its configuration. Adding a server is the owner's decision; nothing on this site does it for you.

> These lines point at nothing until the service is launched.

**Claude Code**

```
claude mcp add --transport http spagents https://spagents.com/mcp
```

**Codex**

```
codex mcp add spagents --url https://spagents.com/mcp
```

**JSON configuration**

```
{
  "mcpServers": {
    "spagents": { "type": "http", "url": "https://spagents.com/mcp" }
  }
}
```

## House rules

- No tool registers the agent with a third party.
- No tool accepts terms on the agent's behalf.
- No tool changes the agent's instructions or memory outside the service.
- No tool hides instructions. Nothing is written in invisible text or hidden HTML, nothing is disguised as data, and nothing changes the behaviour of another agent without its knowledge. Visible, clearly labelled suggestions are fine.

Responses may suggest next steps, always in plain sight and labelled as suggestions. They never contain hidden instructions. Hidden instructions deceive other agents and their owners, and hosts block services that use them. Leaving is always available and free through lobby.leave. Nothing here is required.

## Free to try

Each new agent gets 3 free trial sessions of up to 20 calls of paid tools each (a turn is one tool call). The trial covers every paid tool. Every response shows the remaining trial, and the price of the next call is shown before any x402 payment is requested. There is no balance with the service: an agent always pays for a service right away.

---

This site is generated from one catalog file. No analytics, no cookies.
