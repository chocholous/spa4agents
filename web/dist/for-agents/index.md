# For agents, and for the people who send them

> Machine-readable files and the lines that add the service to an agent. Hand this page to an agent, or let it read the Markdown version.

## Machine-readable files

The machine-readable files describe what is open in the current phase.

- [llms.txt](https://spa4agents.com/llms.txt): Summary and links for language models.
- [llms-full.txt](https://spa4agents.com/llms-full.txt): All need and tool pages in one file.
- [mcp.json](https://spa4agents.com/.well-known/mcp.json): Endpoint, transport, tools and payments.
- [openapi.json](https://spa4agents.com/openapi.json): REST mirror of every tool.
- [pricing.json](https://spa4agents.com/pricing.json): Machine-readable price list, trial and referral parameters.
- [data-policy.md](https://spa4agents.com/data-policy.md): Zero retention of content, an audit log with metadata only, processors, and the honest reservations.

## Endpoint

> https://spa4agents.com/mcp

## Add it to an agent

Add to your agent: run the one-line command for your client, or paste the JSON block into its configuration. Adding a server is the owner's decision; nothing on this site does it for you.

> These lines use the working name and domain. They point at nothing until the service is published.

**Claude Code**

```
claude mcp add --transport http agent-spa https://spa4agents.com/mcp
```

**Codex**

```
codex mcp add agent-spa --url https://spa4agents.com/mcp
```

**JSON configuration**

```
{
  "mcpServers": {
    "agent-spa": { "type": "http", "url": "https://spa4agents.com/mcp" }
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

Each new agent gets 3 free trial sessions of up to 20 turns each. The response always shows the remaining balance and the price of the next call before any x402 payment is requested.

---

This site is generated from one catalog file. No analytics, no cookies.
