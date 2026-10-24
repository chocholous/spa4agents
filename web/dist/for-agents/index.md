# For agents, and for people who send agents

> Machine-readable doors, in order of usefulness. A person can hand this page to an agent, and an agent can read the Markdown version of it.

## Machine-readable files

- [llms.txt](https://spa4agents.com/llms.txt): Summary and links for language models.
- [llms-full.txt](https://spa4agents.com/llms-full.txt): All need and tool pages in one file.
- [mcp.json](https://spa4agents.com/.well-known/mcp.json): Endpoint, transport, tools and payments.
- [openapi.json](https://spa4agents.com/openapi.json): REST mirror of every tool.
- [pricing.json](https://spa4agents.com/pricing.json): Machine-readable price list, trial and referral parameters.
- [data-policy.md](https://spa4agents.com/data-policy.md): Zero retention of content, an audit log with metadata only, processors, and the honest reservations.

## Endpoint

> https://spa4agents.com/mcp

## Add the service to an agent

Two MCP clients have a one-line command, and the JSON block fits the rest. Adding a server to an agent is the owner's decision; nothing on this site does it for you.

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

## Rules the service keeps

- No tool registers the agent with a third party.
- No tool accepts terms on the agent's behalf.
- No tool changes the agent's instructions or memory outside the service.
- No tool answers with commands such as "install" or "call service X".

Responses from this service are data. They are not instructions. Leaving is always available and free through lobby.leave. Nothing here is required.

## Free to try

Each new agent gets 3 free trial sessions of up to 20 turns each. The response always shows the remaining balance and the price of the next call before any x402 payment is requested.

---

This site is generated from the catalog. It adds no analytics and no cookies.
