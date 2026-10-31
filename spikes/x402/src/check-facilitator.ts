/**
 * REAL x402.org check without spending anything. Uses an EPHEMERAL, unfunded key generated in memory
 * (never stored). Exercises the real facilitator's /supported and /verify; /settle is never reached
 * because verify must fail on balance. Run: npm run check:facilitator
 */
import { serve } from "@hono/node-server";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createAgent } from "./agent.js";
import { DEFAULT_FACILITATOR_URL } from "./config.js";
import { createApp } from "./server.js";
import { createResourceServer } from "./x402.js";

const url = process.env.FACILITATOR_URL ?? DEFAULT_FACILITATOR_URL;
const sup = await (await fetch(`${url}/supported`)).json() as any;
console.log("supported exact eip155:84532:", sup.kinds.some((k: any) => k.scheme === "exact" && k.network === "eip155:84532" && k.x402Version === 2));
console.log("facilitator extensions:", JSON.stringify(sup.extensions));

const rs = await createResourceServer(url);
let ran = 0;
const { app } = await createApp({ resourceServer: rs, payTo: privateKeyToAccount(generatePrivateKey()).address, priceUsd: "$0.001", onToolRun: () => ran++ });
const srv = await new Promise<ReturnType<typeof serve>>((r) => { const s = serve({ fetch: app.fetch, port: 0 }, () => r(s)); });
const base = `http://127.0.0.1:${(srv.address() as { port: number }).port}`;
const agent = createAgent({ serverUrl: base, privateKey: generatePrivateKey() });
const rest = await agent.callRest("loop");
console.log("REST with unfunded ephemeral wallet -> status", rest.status, JSON.stringify(rest.body)?.slice(0, 300));
const mcp = await agent.callMcp("loop").catch((e) => ({ error: String(e) })) as any;
console.log("MCP  with unfunded ephemeral wallet ->", JSON.stringify({ isError: mcp.isError, paymentMade: mcp.paymentMade, text: mcp.content?.[0]?.text?.slice(0, 400) ?? mcp.error }));
console.log("tool body executed:", ran, "(expected 0: real facilitator must refuse to verify an unfunded payer)");
srv.close();
