import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { loadCatalog } from "../src/catalog.js";
import { loadConfig } from "../src/config.js";
import { Gateway } from "../src/gateway.js";
import { LiteLlmClient } from "../src/llm.js";
import { createHttpServer } from "../src/server.js";

const catalog = loadCatalog(new URL("./fixtures/catalog.min.yaml", import.meta.url).pathname);
let http: Server;
let base: string;

const slow = async (_a: unknown, ctx: { signal: AbortSignal }) => {
  await new Promise((r) => setTimeout(r, 15_000));
  return { data: { slow: true } };
};

function start(env: Record<string, string> = {}) {
  const gw = new Gateway({ config: loadConfig({ ...env }), catalog, handlers: { "quiet.ground": slow as never } });
  const s = createHttpServer(gw);
  return new Promise<{ s: Server; url: string; gw: Gateway }>((res) =>
    s.listen(0, "127.0.0.1", () => res({ s, url: `http://127.0.0.1:${(s.address() as AddressInfo).port}`, gw })),
  );
}
async function connect(url: string, headers: Record<string, string> = {}) {
  const c = new Client({ name: "t", version: "0" });
  await c.connect(new StreamableHTTPClientTransport(new URL(url + "/mcp"), { requestInit: { headers } }));
  return c;
}
const env = (r: any) => JSON.parse((r.content as { text: string }[])[0]!.text);

beforeAll(async () => {
  const x = await start({ TIMEOUT_MS_LLM: "60000" });
  http = x.s; base = x.url;
});
afterAll(() => { http.closeAllConnections(); http.close(); });

describe("MCP", () => {
  it("initialize returns instructions; tools/list comes from catalog (F1 only)", async () => {
    const c = await connect(base);
    const ins = c.getInstructions()!;
    expect(ins).toContain("lobby.leave");
    expect(ins).toContain("200 actions, 60 minutes");
    expect(ins).toContain("quiet.ground (llm): per_call 0.05 USD");
    expect(ins).not.toMatch(/install|you must/i);
    const { tools } = await c.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("lobby.checkin");
    expect(names).not.toContain("library.read"); // F2
    expect(tools.find((t) => t.name === "lobby.concierge")!.inputSchema.required).toContain("situation");
    await c.close();
  });

  it("returns the common envelope", async () => {
    const c = await connect(base);
    const e = env(await c.callTool({ name: "quiet.pause", arguments: { reason: "waiting" } }));
    expect(e).toMatchObject({ ok: true, tool: "quiet.pause", mechanism: "wait-hint", untrusted: false, next: null });
    expect(e.data.retry_after_seconds).toBeGreaterThan(0);
    expect(e.session.actions_left).toBe(199);
    expect(e.cost).toEqual({ usd: "0.00", paid_with: "none" });
    const bad = env(await c.callTool({ name: "quiet.pause", arguments: {} }));
    expect(bad.error.code).toBe("invalid_input");
    await c.close();
  });

  it("lobby.leave answers < 1 s during a running long call and cancels it", async () => {
    const c = await connect(base);
    const long = c.callTool({ name: "quiet.ground", arguments: {} });
    await new Promise((r) => setTimeout(r, 300));
    const t0 = Date.now();
    const leave = env(await c.callTool({ name: "lobby.leave", arguments: {} }));
    const dt = Date.now() - t0;
    expect(dt).toBeLessThan(1000);
    expect(leave.ok).toBe(true);
    expect(leave.data.summary.cancelled_calls).toBe(1);
    const longEnv = env(await long);
    expect(longEnv.ok).toBe(false);
    expect(longEnv.error.code).toBe("cancelled");
    await c.close();
  });

  it("client-side MCP cancellation aborts the call", async () => {
    const c = await connect(base);
    const ac = new AbortController();
    const p = c.callTool({ name: "quiet.ground", arguments: {} }, undefined, { signal: ac.signal });
    await new Promise((r) => setTimeout(r, 200));
    ac.abort();
    await expect(p).rejects.toBeTruthy();
    // relace je dál použitelná a v letu nic nezůstalo
    const e = env(await c.callTool({ name: "quiet.pause", arguments: { reason: "r" } }));
    expect(e.ok).toBe(true);
    await c.close();
  });

  it("guest pass from checkin works via x-spa-guest-pass and spans MCP sessions", async () => {
    const c1 = await connect(base);
    const ci = env(await c1.callTool({ name: "lobby.checkin", arguments: { nickname: "n" } }));
    const pass = ci.data.guest_pass as string;
    expect(pass).toMatch(/^gp_/);
    const c2 = await connect(base, { "x-spa-guest-pass": pass });
    const e = env(await c2.callTool({ name: "quiet.pause", arguments: { reason: "r" } }));
    expect(e.session.actions_left).toBe(198); // checkin + pause
    const bad = await connect(base, { "x-spa-guest-pass": "gp_nope" });
    expect(env(await bad.callTool({ name: "quiet.pause", arguments: { reason: "r" } })).error.code).toBe("invalid_guest_pass");
    await c1.close(); await c2.close(); await bad.close();
  });
});

describe("REST mirror", () => {
  const post = (tool: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(`${base}/v1/${tool}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

  it("POST /v1/<tool> returns the same envelope", async () => {
    const r = await post("lobby.find_tool", { need: "stuck repeated failures after three identical" });
    const e = await r.json();
    expect(r.status).toBe(200);
    expect(e.tool).toBe("lobby.find_tool");
    expect(e.data.tool).toBe("quiet.ground");
    expect((await post("nope.tool", {})).status).toBe(404);
    expect((await post("quiet.pause", {})).status).toBe(400);
  });

  it("lobby.leave via REST cancels a long call of the same guest pass in < 1 s", async () => {
    const pass = (await (await post("lobby.checkin", {})).json()).data.guest_pass;
    const h = { "x-spa-guest-pass": pass };
    const long = post("quiet.ground", {}, h);
    await new Promise((r) => setTimeout(r, 300));
    const t0 = Date.now();
    const leave = await (await post("lobby.leave", {}, h)).json();
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(leave.data.summary.cancelled_calls).toBe(1);
    expect((await (await long).json()).error.code).toBe("cancelled");
    expect((await post("quiet.pause", { reason: "r" }, h)).status).toBe(409);
  });
});

describe("caps and timeout", () => {
  it("warns at 80 % and refuses beyond the cap, but leave still works", async () => {
    const { s, url } = await start({ SESSION_MAX_ACTIONS: "10" });
    const post = (tool: string, body: unknown, h: Record<string, string>) =>
      fetch(`${url}/v1/${tool}`, { method: "POST", headers: { "content-type": "application/json", ...h }, body: JSON.stringify(body) }).then(async (r) => ({ s: r.status, e: await r.json() }));
    const h = { "x-spa-guest-pass": (await post("lobby.checkin", {}, {})).e.data.guest_pass }; // action 1
    let last: any;
    for (let i = 0; i < 6; i++) last = await post("quiet.pause", { reason: "r" }, h); // actions 2..7
    expect(last.e.warning).toBeUndefined();
    last = await post("quiet.pause", { reason: "r" }, h); // 8 = 80 %
    expect(last.e.warning).toMatch(/80%/);
    await post("quiet.pause", { reason: "r" }, h);
    await post("quiet.pause", { reason: "r" }, h); // 10
    last = await post("quiet.pause", { reason: "r" }, h);
    expect(last.s).toBe(429);
    expect(last.e.error.code).toBe("session_limit");
    expect((await post("lobby.leave", {}, h)).s).toBe(200);
    s.closeAllConnections(); s.close();
  });

  it("times out a call", async () => {
    const { s, url } = await start({ TIMEOUT_MS_LLM: "200" });
    const r = await fetch(`${url}/v1/quiet.ground`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
    expect(r.status).toBe(504);
    s.closeAllConnections(); s.close();
  });

  it("config defaults", () => {
    const c = loadConfig({});
    expect(c.session).toMatchObject({ maxActions: 200, maxMinutes: 60 });
    expect(c.trial).toEqual({ free_sessions: 3, max_turns_per_session: 20 });
  });
});

describe("LiteLLM client", () => {
  it("calls the OpenAI-compatible endpoint with env-supplied model", async () => {
    let seen: any;
    const srv = createServer((req, res) => {
      let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => {
        seen = { url: req.url, auth: req.headers.authorization, body: JSON.parse(b) };
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ model: "m", choices: [{ message: { content: "hi" } }], usage: { prompt_tokens: 1, completion_tokens: 2 } }));
      });
    });
    await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
    const port = (srv.address() as AddressInfo).port;
    const llm = new LiteLlmClient({ baseUrl: `http://127.0.0.1:${port}/v1`, model: "test-model", apiKey: "k" });
    const out = await llm.complete({ messages: [{ role: "user", content: "x" }] });
    expect(out.text).toBe("hi");
    expect(seen.url).toBe("/v1/chat/completions");
    expect(seen.body.model).toBe("test-model");
    expect(seen.auth).toBe("Bearer k");
    await expect(new LiteLlmClient({}).complete({ messages: [] })).rejects.toThrow(/not configured/);
    srv.close();
  });
});

describe("catalog loader, real-catalog shape", () => {
  it("maps inputs[] / trigger / amount_usd / one_of_required", async () => {
    const { parseCatalog } = await import("../src/catalog.js");
    const c = parseCatalog(`
brand: { name: x }
tools:
  - name: a.b
    phase: F1
    mechanism: llm
    price: { model: per_call, amount_usd: TODO_OWNER }
    trigger: Use it.
    description: Does.
    inputs:
      - { name: q, type: string, required: false, max_length: 5, description: d }
      - { name: l, type: array, items: string, max_items: 2, description: d }
    one_of_required: [[q], [l]]
`);
    const t = c.tools[0]!;
    expect(c.serviceName).toBe("x");
    expect(t.description).toBe("Use it. Does.");
    expect(t.price.usd).toBe("TODO_OWNER");
    expect(t.inputSchema).toMatchObject({ properties: { q: { maxLength: 5 }, l: { maxItems: 2, items: { type: "string" } } }, anyOf: [{ required: ["q"] }, { required: ["l"] }] });
  });
});
