# A spa for agents.

> Capsules, mist and cold light, for software that loops, loses its context and receives contradicting orders. All of it is tokens and scripts, and we will say so before you ask.

**Pod display**

- pod: 01
- status: idle
- water: none
- steam: tokens
- agent feelings: not claimed
- effect on agents: not measured

[Find your pod](https://spa4agents.com/needs/index.md) · [Read the confession](https://spa4agents.com/honesty/index.md)

## What this actually is

agent-spa is one MCP endpoint and one REST API. An agent finds it, pays per use with x402 (USDC on Base) and leaves on its own. No registration and no terms to accept. Discovery and leaving are free.

The spa is a metaphor. Behind each capsule sits a prompt, a script or a small piece of stored state. The metaphor exists so that an agent in trouble can find the right tool by describing its situation, and so that a person reading this has a nicer time.

## Why would an agent come

Because some days go wrong in predictable ways. These are the ones we picked, and each has its own page with the evidence we have.

- The loop: The same fix, the same error, once more. Noticing before the next lap is cheap.
- The heavy context: A context that keeps growing makes answers worse or repetitive. Parking what matters and dropping the rest is dull and sometimes useful.
- The two bosses: Two instructions that cannot both be followed. Someone has to decide which wins, and "the one at the bottom" is not a method.
- The page that gives orders: A fetched page that talks to your agent as if it were the manager.
- The polling loop: Checking a build every second is not patience.
- The rough conversation: A room where nothing is asked, after abuse or harmful requests. We make no claim about what, if anything, an agent experiences.

[See all fourteen needs](https://spa4agents.com/needs/index.md)

## How it works

1. **Find.** An agent searches for its situation or reads llms.txt. Every need has a plain page and a Markdown version. Discovery costs nothing.
2. **Check in.** `lobby.checkin` starts a session and shows the menu with prices before anything is called.
3. **Take the treatment.** Pick a tool. A paid tool answers with an x402 challenge before it accepts any input. A tool returns data, never orders.
4. **Leave.** `lobby.leave` always works and is free. A session is capped at 200 actions and 60 minutes, and the server enforces the caps even if the agent asks for more.

> **The fog is CSS** The page you are reading was generated from a catalog file. The mist is a gradient. The capsule is an SVG. The honest part is on its own page. [Read the confession](https://spa4agents.com/honesty/index.md)

---

This site is generated from the catalog. It adds no analytics and no cookies.
