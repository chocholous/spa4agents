import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connect, env, makeAgent, post, startPaid } from "./helpers/harness.js";

let g: Awaited<ReturnType<typeof startPaid>>;
const ran: string[] = [];
beforeAll(async () => {
  g = await startPaid({
    handlers: {
      "quiet.ground": async () => { ran.push("quiet.ground"); return { data: { text: "x" } }; },
      "quiet.room": async () => { ran.push("quiet.room"); return { data: {} }; }, // prázdný výsledek se účtuje stejně
    },
  });
});
afterAll(async () => { await g.close(); });
beforeEach(() => { ran.length = 0; g.fac.reset(); });

describe("MCP: standard x402 (402 -> payment -> response)", () => {
  it("unpaid call: challenge in structuredContent with isError (not in _meta); handler and facilitator untouched", async () => {
    const c = await connect(g.url);
    const res: any = await c.callTool({ name: "quiet.room", arguments: {} });
    expect(res.isError).toBe(true);
    const pr = res.structuredContent;
    expect(pr.x402Version).toBe(2);
    expect(pr.accepts[0]).toMatchObject({ scheme: "exact", network: "eip155:84532", amount: "5000", payTo: expect.any(String) });
    expect(JSON.parse(res.content[0].text)).toEqual(pr);
    expect(res._meta?.["x402/payment-required"]).toBeUndefined();
    expect(pr.resource.url).toBe("mcp://tool/quiet.room");
    expect(pr.extensions.bazaar.info.input).toMatchObject({ type: "mcp", toolName: "quiet.room" });
    expect(ran).toEqual([]);
    expect(g.fac.paid()).toEqual([]);
    await c.close();
  });

  it("autonomous agent pays: verify precedes the handler, settle follows; the envelope shows the cost", async () => {
    const agent = makeAgent(g.url);
    const x = await agent.mcp();
    const res = await x.callTool("quiet.ground", {});
    expect(res.paymentMade).toBe(true);
    expect(res.paymentResponse?.success).toBe(true);
    expect(res.paymentResponse?.network).toBe("eip155:84532");
    const e = JSON.parse((res.content[0] as any).text);
    expect(e).toMatchObject({ ok: true, cost: { usd: "0.005", paid_with: "x402" } });
    expect(e.session.usd_left).toBe("0.495");
    expect(ran).toEqual(["quiet.ground"]);
    expect(g.fac.paid()).toEqual(["verify", "settle"]);
    await x.close();
  });

  it("settles even when the handler result is empty (no 'empty result' rule)", async () => {
    const x = await makeAgent(g.url).mcp();
    const res = await x.callTool("quiet.room", {});
    expect(res.paymentResponse?.success).toBe(true);
    expect(g.fac.paid().at(-1)).toBe("settle");
    await x.close();
  });

  it("auth before data: a forged payment is refused before the handler and invalid input is not settled", async () => {
    const c = await connect(g.url);
    const bad: any = await c.callTool({
      name: "quiet.ground",
      arguments: {},
      _meta: { "x402/payment": { x402Version: 2, accepted: { scheme: "exact", network: "eip155:84532" }, payload: { signature: "0x00", authorization: {} } } },
    } as any);
    expect(bad.isError).toBe(true);
    expect(bad.structuredContent.accepts).toBeTruthy();
    expect(ran).toEqual([]);
    expect(g.fac.paid().filter((x) => x === "settle")).toEqual([]);
    await c.close();
    // platba je v pořádku, ale vstup je neplatný: handler neběží a nic se nevypořádá
    const x = await makeAgent(g.url).mcp();
    const r = await x.callTool("quiet.ground", { unexpected: true });
    expect(JSON.parse((r.content[0] as any).text).error.code).toBe("invalid_input");
    expect(ran).toEqual([]);
    expect(g.fac.paid()).not.toContain("settle");
    await x.close();
  });

  it("free tools never ask for payment", async () => {
    const c = await connect(g.url);
    expect(env(await c.callTool({ name: "quiet.pause", arguments: { reason: "r" } })).ok).toBe(true);
    expect(g.fac.paid()).toEqual([]);
    await c.close();
  });

  it("identity is the payment address: the same payer shares one session across MCP connections", async () => {
    const agent = makeAgent(g.url);
    const a = await agent.mcp();
    const e1 = JSON.parse(((await a.callTool("quiet.ground", {})).content[0] as any).text);
    expect(e1.session.usd_left).toBe("0.495");
    const b = await agent.mcp();
    const e2 = JSON.parse(((await b.callTool("quiet.ground", {})).content[0] as any).text);
    expect(e2.session.usd_left).toBe("0.49");
    expect(e2.session.actions_left).toBe(198);
    await a.close(); await b.close();
  });

  it("settlement failure: the data is not delivered and a challenge is returned", async () => {
    const f = await startPaid({});
    f.fac.state.failSettle = true;
    const x = await makeAgent(f.url).mcp();
    const res: any = await x.callTool("quiet.ground", {});
    expect(res.isError).toBe(true);
    expect(res.paymentMade).toBe(true);
    expect(JSON.stringify(res.content)).not.toContain("fixed_text");
    await x.close();
    await f.close();
  });
});

describe("REST: standard x402", () => {
  it("unpaid call: 402 with PAYMENT-REQUIRED header and no handler run", async () => {
    const r = await post(g.url, "quiet.room");
    expect(r.status).toBe(402);
    const pr = JSON.parse(Buffer.from(r.headers.get("PAYMENT-REQUIRED")!, "base64").toString());
    expect(pr.accepts[0]).toMatchObject({ scheme: "exact", network: "eip155:84532", amount: "5000" });
    expect(pr.resource.url).toBe(`${g.url}/v1/quiet.room`);
    expect(pr.extensions.bazaar.info.input).toMatchObject({ bodyType: "json" });
    const body = await r.json();
    expect(body).toMatchObject({ ok: false, error: { code: "payment_required" } });
    expect(ran).toEqual([]);
    expect(g.fac.paid()).toEqual([]);
  });

  it("agent pays and gets the envelope with PAYMENT-RESPONSE", async () => {
    const r = await makeAgent(g.url).rest("quiet.ground");
    expect(r.status).toBe(200);
    const e = await r.json();
    expect(e).toMatchObject({ ok: true, cost: { usd: "0.005", paid_with: "x402" } });
    const sr = JSON.parse(Buffer.from(r.headers.get("PAYMENT-RESPONSE")!, "base64").toString());
    expect(sr.success).toBe(true);
    expect(g.fac.paid().at(-1)).toBe("settle");
  });

  it("garbage PAYMENT-SIGNATURE gives a fresh 402", async () => {
    const r = await post(g.url, "quiet.ground", {}, { "PAYMENT-SIGNATURE": "not-base64-json" });
    expect(r.status).toBe(402);
    expect(ran).toEqual([]);
  });

  it("the same payer over REST and MCP is one identity", async () => {
    const agent = makeAgent(g.url);
    const r = await agent.rest("quiet.ground");
    expect((await r.json()).session.usd_left).toBe("0.495");
    const x = await agent.mcp();
    const e = JSON.parse(((await x.callTool("quiet.ground", {})).content[0] as any).text);
    expect(e.session.usd_left).toBe("0.49");
    await x.close();
  });

  it("client-side spend cap stops a payment above the cap", async () => {
    const capped = await makeAgent(g.url, "$0.0001").mcp();
    await expect(capped.callTool("quiet.ground", {})).rejects.toThrow();
    expect(ran).toEqual([]);
    await capped.close();
  });
});

describe("payments unavailable", () => {
  it("without a configured gate paid tools are refused, never free", async () => {
    const { startGateway } = await import("./helpers/harness.js");
    const s = await startGateway({ env: { TRIAL_FREE_SESSIONS: "0" } });
    const r = await post(s.url, "quiet.room");
    expect(r.status).toBe(503);
    expect((await r.json()).error.code).toBe("payments_unavailable");
    expect((await post(s.url, "quiet.pause", { reason: "x" })).status).toBe(200);
    await s.close();
  });
});
