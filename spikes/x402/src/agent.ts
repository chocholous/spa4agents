/**
 * Autonomous buyer agent: no human in the loop. Pays x402 challenges from a testnet wallet
 * given only by env (AGENT_PRIVATE_KEY). Usage: npm run agent -- "loop"
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createx402MCPClient } from "@x402/mcp";
import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { GUEST_PASS_HEADER, NETWORK, REST_PATH, TOOL_NAME } from "./config.js";

export interface AgentOptions {
  serverUrl: string;
  privateKey: `0x${string}`;
  /** Hard cap per payment in USD, enforced by the client before signing (library default is $1). */
  maxUsdPerPayment?: string;
}

export function createAgent(opts: AgentOptions) {
  const account = privateKeyToAccount(opts.privateKey);
  const schemes = [{ network: NETWORK, client: new ExactEvmScheme(account) }];
  const spendControls = { maxAmountPerPayment: (opts.maxUsdPerPayment ?? "$0.05") as `$${string}` };

  async function guestPass(): Promise<string> {
    const r = await fetch(`${opts.serverUrl}/guest-pass`, { method: "POST" });
    return ((await r.json()) as { guest_pass: string }).guest_pass;
  }

  async function callMcp(query: string) {
    const pass = await guestPass();
    const x402 = createx402MCPClient({
      name: "autonomous-agent", version: "0.0.0", schemes, spendControls, autoPayment: true,
      onPaymentRequested: async () => true, // policy lives in spendControls, not in a human prompt
    });
    await x402.connect(
      new StreamableHTTPClientTransport(new URL(`${opts.serverUrl}/mcp`), { requestInit: { headers: { [GUEST_PASS_HEADER]: pass } } }),
    );
    try {
      return await x402.callTool(TOOL_NAME, { query });
    } finally {
      await x402.close();
    }
  }

  async function callRest(query: string) {
    const pass = await guestPass();
    const pay = wrapFetchWithPaymentFromConfig(fetch, { schemes });
    const res = await pay(`${opts.serverUrl}${REST_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json", [GUEST_PASS_HEADER]: pass },
      body: JSON.stringify({ query }),
    });
    const hdr = res.headers.get("PAYMENT-RESPONSE");
    return { status: res.status, body: await res.json().catch(() => null), settlement: hdr ? decodePaymentResponseHeader(hdr) : undefined };
  }

  return { address: account.address, callMcp, callRest };
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const key = process.env.AGENT_PRIVATE_KEY;
  if (!key) throw new Error("AGENT_PRIVATE_KEY (testnet wallet with Base Sepolia USDC) is required, see .env.example");
  const agent = createAgent({ serverUrl: process.env.SERVER_URL ?? "http://localhost:4022", privateKey: key as `0x${string}` });
  const q = process.argv[2] ?? "loop";
  console.log("agent", agent.address);
  const m = await agent.callMcp(q);
  console.log("MCP:", JSON.stringify({ paymentMade: m.paymentMade, tx: m.paymentResponse?.transaction, content: m.content }));
  const r = await agent.callRest(q);
  console.log("REST:", JSON.stringify(r));
}
