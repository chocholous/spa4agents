import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { catalog, connect, env, FakeGate, post, startGateway, type Started } from "./helpers/harness.js";

const FIRST_RELEASE = ["lobby.checkin", "lobby.find_tool", "lobby.concierge", "lobby.leave", "lobby.referral_code", "lobby.redeem", "quiet.room", "quiet.ground", "quiet.pause", "quiet.end_session_hint"];
const dist = (f: string) => new URL(`../../catalog/dist/${f}`, import.meta.url).pathname;
let g: Started;
beforeAll(async () => { g = await startGateway({ payments: new FakeGate() }); });
afterAll(async () => { await g.close(); });

describe("MCP (Streamable HTTP /mcp)", () => {
  it("initialize returns the catalog instructions; tools/list is exactly the first release", async () => {
    const c = await connect(g.url);
    expect(c.getInstructions()).toBe(readFileSync(dist("initialize-instructions.txt"), "utf8").trim());
    expect(c.getServerVersion()?.name).toBe("Spagents");
    const { tools } = await c.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([...FIRST_RELEASE].sort());
    // popisy a vstupní schémata odpovídají katalogovému mcp.json
    const mcpJson = JSON.parse(readFileSync(dist("mcp.json"), "utf8"));
    for (const t of tools) {
      const ref = mcpJson.tools.find((x: any) => x.name === t.name);
      expect(t.description).toBe(ref.description);
      expect(t.inputSchema).toEqual(ref.inputSchema);
    }
    await c.close();
  });

  it("returns the common envelope", async () => {
    const c = await connect(g.url);
    const e = env(await c.callTool({ name: "quiet.pause", arguments: { reason: "waiting for CI" } }));
    expect(Object.keys(e).sort()).toEqual(["cost", "data", "mechanism", "next", "ok", "session", "tool", "trial", "untrusted"]);
    expect(e).toMatchObject({ ok: true, tool: "quiet.pause", mechanism: "wait-hint", untrusted: false, next: null });
    expect(e.data).toEqual({ retry_after_seconds: 30, server_waits: false });
    expect(e.session).toMatchObject({ actions_left: 199, usd_left: "0.50" });
    expect(e.session.minutes_left).toBeGreaterThanOrEqual(59);
    expect(e.cost).toEqual({ usd: "0.00", paid_with: "none" });
    expect(e.trial).toMatchObject({ status: "available", sessions_left: 3, calls_left_in_session: 20 });
    await c.close();
  });

  it("lobby.checkin returns caps, remaining trial and the menu with prices", async () => {
    const c = await connect(g.url);
    const e = env(await c.callTool({ name: "lobby.checkin", arguments: { nickname: "scout" } }));
    expect(e.data.caps).toMatchObject({ max_actions: 200, max_minutes: 60, max_usd: "0.50", address_daily_max_usd: "5.00" });
    expect(e.data.trial).toMatchObject({ sessions_left: 3, calls_left_in_session: 20, valid_days_left: 14 });
    expect(e.data.menu).toHaveLength(10);
    expect(e.data.menu.find((m: any) => m.tool === "quiet.room")).toMatchObject({ price: "Per call: 0.005", price_usd: "0.005" });
    expect(JSON.stringify(e)).not.toContain("scout"); // přezdívka se nikam neukládá ani nevrací
    await c.close();
  });

  it("an unknown tool and invalid input give errors without echoing the input", async () => {
    const c = await connect(g.url);
    const bad = env(await c.callTool({ name: "quiet.pause", arguments: {} }));
    expect(bad.ok).toBe(false);
    expect(bad.error.code).toBe("invalid_input");
    const extra = env(await c.callTool({ name: "quiet.pause", arguments: { reason: "x", secretkey: "SECRET-VALUE" } }));
    expect(extra.error.code).toBe("invalid_input");
    expect(JSON.stringify(extra)).not.toMatch(/secretkey|SECRET-VALUE/);
    await c.close();
  });
});

describe("REST mirror POST /v1/<tool>", () => {
  it("returns the same envelope", async () => {
    const r = await post(g.url, "quiet.pause", { reason: "x" });
    const e = await r.json();
    expect(r.status).toBe(200);
    expect(Object.keys(e).sort()).toEqual(["cost", "data", "mechanism", "next", "ok", "session", "tool", "trial", "untrusted"]);
    expect(e.data.retry_after_seconds).toBe(30);
    const c = await connect(g.url);
    const m = env(await c.callTool({ name: "quiet.pause", arguments: { reason: "x" } }));
    expect(m).toEqual(e);
    await c.close();
  });

  it("maps errors to HTTP codes", async () => {
    expect((await post(g.url, "nope.tool", {})).status).toBe(404);
    const r = await post(g.url, "quiet.pause", { reason: "x", leak: "SECRET-VALUE" });
    expect(r.status).toBe(400);
    expect(JSON.stringify(await r.json())).not.toContain("SECRET-VALUE");
    expect((await fetch(`${g.url}/v1/quiet.pause`)).status).toBe(405);
    expect((await post(g.url, "library.read", { query: "x" })).status).toBe(404); // F2 se nevystavuje
  });

  it("ignores the old guest-pass header", async () => {
    const r = await post(g.url, "quiet.pause", { reason: "x" }, { "x-spa-guest-pass": "gp_nope" });
    expect((await r.json()).ok).toBe(true);
  });
});

describe("free tools of the first release", () => {
  it("lobby.find_tool and lobby.concierge recommend from the catalog rules", async () => {
    const f = await (await post(g.url, "lobby.find_tool", { need: "I am processing traumatic text and need to calm down" })).json();
    expect(f.data).toMatchObject({ tool: "quiet.ground", price: "Per call: 0.005" });
    expect(f.data.reason).toBeTruthy();
    const none = await (await post(g.url, "lobby.find_tool", { need: "zzz qqq" })).json();
    expect(none.data.tool).toBe("none");
    const c = await (await post(g.url, "lobby.concierge", { situation: "Waiting for a long build with no other task." })).json();
    expect(c.data.rule_based).toBe(true);
    expect(c.data.sequence[0].tool).toBe("quiet.pause");
    expect(c.data.sequence.length).toBeGreaterThanOrEqual(1);
    expect(c.data.sequence.length).toBeLessThanOrEqual(3);
    expect(c.data.sequence.map((s: any) => s.tool)).not.toContain("lobby.concierge");
    const d = await (await post(g.url, "lobby.concierge", { situation: "A rude user abused me in the last conversation" })).json();
    expect(d.data.sequence.map((s: any) => s.tool)).toContain("quiet.room");
    const fallback = await (await post(g.url, "lobby.concierge", { situation: "xyzzy plugh" })).json();
    expect(fallback.data.matched).toBe(false);
    expect(fallback.data.sequence.length).toBeGreaterThanOrEqual(1);
  });

  it("quiet.end_session_hint only acknowledges", async () => {
    const e = await (await post(g.url, "quiet.end_session_hint", { reason: "Task is done" })).json();
    expect(e.data.acknowledged).toBe(true);
    expect(JSON.stringify(e)).not.toContain("Task is done");
  });
});

describe("no LLM, configuration", () => {
  it("starts without any LLM client or env; no F1 tool uses the llm mechanism", async () => {
    const { Gateway } = await import("../src/gateway.js");
    const { loadConfig } = await import("../src/config.js");
    const gw = new Gateway({ config: loadConfig({}, catalog.limits), catalog });
    expect(gw.exposed).toHaveLength(10);
    expect(gw.exposed.some((t) => t.mechanism === "llm")).toBe(false);
  });

  it("BASE_URL is optional: the 402 resource URL follows the Host header", async () => {
    const { startPaid } = await import("./helpers/harness.js");
    const p = await startPaid();
    const pr = JSON.parse(Buffer.from((await post(p.url, "quiet.room")).headers.get("PAYMENT-REQUIRED")!, "base64").toString());
    expect(pr.resource.url).toBe(`${p.url}/v1/quiet.room`);
    await p.close();
    const q = await startPaid({ env: { BASE_URL: "https://spagents.example/" } });
    const pr2 = JSON.parse(Buffer.from((await post(q.url, "quiet.room")).headers.get("PAYMENT-REQUIRED")!, "base64").toString());
    expect(pr2.resource.url).toBe("https://spagents.example/v1/quiet.room");
    await q.close();
  });
});
