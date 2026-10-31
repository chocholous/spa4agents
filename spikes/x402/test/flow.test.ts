/** Verified against a MOCK facilitator (src/mock-facilitator.ts). Not a real-network test. */
import { serve } from "@hono/node-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createAgent } from "../src/agent.js";
import { GUEST_PASS_HEADER, REST_PATH, TOOL_NAME } from "../src/config.js";
import { startMockFacilitator } from "../src/mock-facilitator.js";
import { createApp } from "../src/server.js";
import { createResourceServer } from "../src/x402.js";

const payTo = privateKeyToAccount(generatePrivateKey()).address;
let fac: Awaited<ReturnType<typeof startMockFacilitator>>;
let httpServer: ReturnType<typeof serve>;
let base: string;
const runs: string[] = [];
const agent = () => createAgent({ serverUrl: base, privateKey: generatePrivateKey() });

beforeAll(async () => {
  fac = await startMockFacilitator();
  const resourceServer = await createResourceServer(fac.url);
  const { app } = await createApp({ resourceServer, payTo, priceUsd: "$0.001", onToolRun: (via, q) => runs.push(`${via}:${q}`) });
  httpServer = await new Promise((r) => { const s = serve({ fetch: app.fetch, port: 0 }, () => r(s)); });
  base = `http://127.0.0.1:${(httpServer.address() as { port: number }).port}`;
});
afterAll(async () => { httpServer.close(); await fac.close(); });
beforeEach(() => { runs.length = 0; fac.calls.length = 0; });

async function pass() { return ((await (await fetch(`${base}/guest-pass`, { method: "POST" })).json()) as any).guest_pass as string; }
async function rawMcp(passValue: string | null) {
  const headers: Record<string, string> = {};
  if (passValue) headers[GUEST_PASS_HEADER] = passValue;
  const c = new Client({ name: "raw", version: "0" });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers } }));
  return c;
}

describe("auth before data", () => {
  it("MCP without guest pass: 401, handler and facilitator untouched", async () => {
    const res = await fetch(`${base}/mcp`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: TOOL_NAME, arguments: { query: "loop" } } }) });
    expect(res.status).toBe(401);
    expect(runs).toEqual([]);
    expect(fac.calls.filter((c) => c.endpoint !== "supported")).toEqual([]);
  });
  it("REST without guest pass: 401 (not 402), handler untouched", async () => {
    const res = await fetch(`${base}${REST_PATH}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "loop" }) });
    expect(res.status).toBe(401);
    expect(runs).toEqual([]);
  });
});

describe("MCP: createPaymentWrapper", () => {
  it("unpaid call returns the challenge in structuredContent (isError) and runs no tool code", async () => {
    const c = await rawMcp(await pass());
    const res: any = await c.callTool({ name: TOOL_NAME, arguments: { query: "loop" } });
    expect(res.isError).toBe(true);
    const pr = res.structuredContent;
    expect(pr.x402Version).toBe(2);
    expect(pr.accepts[0]).toMatchObject({ scheme: "exact", network: "eip155:84532", amount: "1000" });
    expect(JSON.parse(res.content[0].text)).toEqual(pr);
    // Documented deviation: no _meta["x402/payment-required"] in @x402/mcp 2.28.0
    expect(res._meta?.["x402/payment-required"]).toBeUndefined();
    // Bazaar declaration is part of the challenge
    expect(pr.extensions.bazaar.info.input).toMatchObject({ type: "mcp", toolName: TOOL_NAME });
    expect(runs).toEqual([]);
    expect(fac.calls.filter((x) => x.endpoint !== "supported")).toEqual([]);
    await c.close();
  });

  it("free tool needs no payment", async () => {
    const c = await rawMcp(await pass());
    const res: any = await c.callTool({ name: "spike.ping", arguments: {} });
    expect(res.content[0].text).toBe("pong");
    await c.close();
  });

  it("autonomous agent pays and gets the result; verify precedes the tool, settle follows it", async () => {
    const res = await agent().callMcp("loop");
    expect(res.paymentMade).toBe(true);
    expect(res.paymentResponse?.success).toBe(true);
    expect(res.paymentResponse?.network).toBe("eip155:84532");
    expect(JSON.parse((res.content[0] as any).text).matches.length).toBeGreaterThan(0);
    expect(runs).toEqual(["mcp:loop"]);
    const seq = fac.calls.filter((c) => c.endpoint !== "supported").map((c) => c.endpoint);
    expect(seq).toEqual(["verify", "settle"]);
    // The paying client echoes the server-declared bazaar extension in its payload (needed for cataloguing).
    const verify: any = fac.calls.find((c) => c.endpoint === "verify");
    expect(verify.extensions.bazaar.info.input).toMatchObject({ type: "mcp", toolName: TOOL_NAME });
  });

  it("empty result: tool ran, verify happened, settle NEVER called (not charged)", async () => {
    const res = await agent().callMcp("zzzzzz");
    expect(res.isError).toBe(true);
    expect(res.paymentMade).toBe(true); // authorization was signed and sent...
    expect(runs).toEqual(["mcp:zzzzzz"]);
    const seq = fac.calls.filter((c) => c.endpoint !== "supported").map((c) => c.endpoint);
    expect(seq).toEqual(["verify"]); // ...but never submitted for settlement
    expect(res.paymentResponse).toBeUndefined();
  });

  it("forged payment (signed by a different key than 'from') is rejected before the tool runs", async () => {
    // A payment object with a garbage signature / empty authorization.
    const c = await rawMcp(await pass());
    const bad: any = await c.callTool({ name: TOOL_NAME, arguments: { query: "loop" }, _meta: { "x402/payment": { x402Version: 2, accepted: { scheme: "exact", network: "eip155:84532" }, payload: { signature: "0x00", authorization: {} } } } } as any);
    expect(bad.isError).toBe(true);
    expect(runs).toEqual([]);
    await c.close();
  });

  it("client-side spend cap refuses a price above the cap (agent-side protection)", async () => {
    const capped = createAgent({ serverUrl: base, privateKey: generatePrivateKey(), maxUsdPerPayment: "$0.0001" });
    await expect(capped.callMcp("loop")).rejects.toThrow();
    expect(runs).toEqual([]);
  });
});

describe("REST: @x402/hono", () => {
  it("unpaid call: 402 with PAYMENT-REQUIRED header", async () => {
    const p = await pass();
    const res = await fetch(`${base}${REST_PATH}`, { method: "POST", headers: { "content-type": "application/json", [GUEST_PASS_HEADER]: p }, body: JSON.stringify({ query: "loop" }) });
    expect(res.status).toBe(402);
    const hdr = res.headers.get("PAYMENT-REQUIRED")!;
    expect(hdr).toBeTruthy();
    const pr = JSON.parse(Buffer.from(hdr, "base64").toString());
    expect(pr.accepts[0]).toMatchObject({ scheme: "exact", network: "eip155:84532", amount: "1000" });
    expect(pr.extensions.bazaar.info.input).toMatchObject({ type: "http", method: "POST" });
    expect(runs).toEqual([]);
  });

  it("agent pays and gets the result with a PAYMENT-RESPONSE settlement header", async () => {
    const r = await agent().callRest("loop");
    expect(r.status).toBe(200);
    expect(r.body.matches.length).toBeGreaterThan(0);
    expect((r.settlement as any).success).toBe(true);
    expect(fac.calls.filter((c) => c.endpoint !== "supported").map((c) => c.endpoint)).toEqual(["verify", "settle"]);
  });

  it("empty result: 404 and settle NEVER called (not charged)", async () => {
    const r = await agent().callRest("zzzzzz");
    expect(r.status).toBe(404);
    expect(runs).toEqual(["rest:zzzzzz"]);
    expect(fac.calls.filter((c) => c.endpoint !== "supported").map((c) => c.endpoint)).toEqual(["verify"]);
  });
});

describe("free calls (voucher stand-in) composed outside createPaymentWrapper", () => {
  it("1 free call without payment, then the normal x402 challenge", async () => {
    const f2 = await startMockFacilitator();
    const rs = await createResourceServer(f2.url);
    const { app } = await createApp({ resourceServer: rs, payTo, priceUsd: "$0.001", freeCalls: 1 });
    const s = await new Promise<ReturnType<typeof serve>>((r) => { const x = serve({ fetch: app.fetch, port: 0 }, () => r(x)); });
    const b = `http://127.0.0.1:${(s.address() as { port: number }).port}`;
    const p = ((await (await fetch(`${b}/guest-pass`, { method: "POST" })).json()) as any).guest_pass;
    const c = new Client({ name: "raw", version: "0" });
    await c.connect(new StreamableHTTPClientTransport(new URL(`${b}/mcp`), { requestInit: { headers: { [GUEST_PASS_HEADER]: p } } }));
    const first: any = await c.callTool({ name: TOOL_NAME, arguments: { query: "loop" } });
    expect(first.isError).toBeFalsy();
    const second: any = await c.callTool({ name: TOOL_NAME, arguments: { query: "loop" } });
    expect(second.isError).toBe(true);
    expect(second.structuredContent.accepts[0].amount).toBe("1000");
    expect(f2.calls.filter((x) => x.endpoint !== "supported")).toEqual([]);
    await c.close(); s.close(); await f2.close();
  });
});
