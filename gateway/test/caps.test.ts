import { describe, expect, it } from "vitest";
import { catalog, connect, env, FakeGate, post, startGateway } from "./helpers/harness.js";
import { Gateway } from "../src/gateway.js";
import { loadConfig } from "../src/config.js";

function mk(envv: Record<string, string> = {}, gate = new FakeGate()) {
  let t = Date.UTC(2026, 10, 1, 10, 0, 0);
  const gw = new Gateway({ config: loadConfig({ TRIAL_FREE_SESSIONS: "0", ...envv }, catalog.limits), catalog, payments: gate, now: () => t });
  const call = (tool: string, args: Record<string, unknown> = {}, mcp = "m1", headers: Record<string, string> = {}) =>
    gw.call({ tool, args, headers, mcpSessionId: mcp, transport: "mcp", ip: "10.1.1.1" });
  return { gw, call, gate, advance: (ms: number) => { t += ms; } };
}

describe("session caps (server-enforced)", () => {
  it("defaults come from the catalog", () => {
    const c = loadConfig({}, catalog.limits);
    expect(c.session).toMatchObject({ maxActions: 200, maxMinutes: 60, maxUsdMicro: 500_000, warnAt: 0.8 });
    expect(c.addressDaily.maxUsdMicro).toBe(5_000_000);
    expect(c.trial).toMatchObject({ freeSessions: 3, maxTurnsPerSession: 20, validDays: 14, dailyBudgetMicro: 20_000_000 });
  });

  it("action cap: warns at 80 %, refuses beyond the cap, lobby.leave still works", async () => {
    const { call } = mk({ SESSION_MAX_ACTIONS: "10" });
    const out: any[] = [];
    for (let i = 0; i < 10; i++) out.push((await call("quiet.pause", { reason: "r" })).envelope);
    expect(out[6].warning).toBeUndefined(); // 7 akcí
    expect(out[7].warning).toMatch(/80%.*actions/); // 8 = 80 %
    expect(out[9].session!.actions_left).toBe(0);
    const over = await call("quiet.pause", { reason: "r" });
    expect(over.status).toBe(429);
    expect(over.envelope.error!.code).toBe("session_limit");
    const leave = await call("lobby.leave");
    expect(leave.status).toBe(200);
  });

  it("minutes cap with the clock, warning at 80 % of the time", async () => {
    const { call, advance } = mk({ SESSION_MAX_MINUTES: "10" });
    await call("quiet.pause", { reason: "r" });
    advance(8 * 60_000);
    const w = await call("quiet.pause", { reason: "r" });
    expect(w.envelope.warning).toMatch(/minutes/);
    advance(2 * 60_000);
    const r = await call("quiet.pause", { reason: "r" });
    expect(r.envelope.error!.code).toBe("session_limit");
    expect((await call("lobby.leave")).envelope.ok).toBe(true);
  });

  it("USD cap per session: a call that does not fit is refused before settlement; warning at 80 %", async () => {
    const gate = new FakeGate();
    const { call } = mk({ SESSION_MAX_USD: "0.012" }, gate);
    const h = { "x-test-payer": "0xAAA" };
    const a = await call("quiet.room", {}, "m1", h);
    expect(a.envelope.cost).toEqual({ usd: "0.005", paid_with: "x402" });
    const b = await call("quiet.room", {}, "m1", h);
    expect(b.envelope.ok).toBe(true);
    expect(b.envelope.warning).toMatch(/usd/); // 0.010 >= 80 % z 0.012
    const c = await call("quiet.room", {}, "m1", h);
    expect(c.status).toBe(429);
    expect(c.envelope.error!.message).toMatch(/usd/);
    expect(gate.settled).toEqual([5000, 5000]); // třetí platba se nevypořádala
    expect(c.envelope.session!.usd_left).toBe("0.002");
  });

  it("USD cap per address and day (default 5 USD), warning at 80 %", async () => {
    const gate = new FakeGate();
    const { call, advance } = mk({ SESSION_ADDRESS_DAILY_MAX_USD: "0.02", SESSION_MAX_USD: "10" }, gate);
    const h = { "x-test-payer": "0xBBB" };
    const rs: any[] = [];
    for (let i = 0; i < 4; i++) rs.push(await call("quiet.room", {}, `s${i}`, h)); // více spojení téže adresy
    expect(rs[2].envelope.warning).toBeUndefined(); // 0.015 < 0.016
    expect(rs[3].envelope.warning).toMatch(/daily cap/); // 0.020 >= 80 % z 0.02
    expect(rs[3].envelope.ok).toBe(true);
    const over = await call("quiet.room", {}, "s9", h);
    expect(over.status).toBe(429);
    expect(over.envelope.error!.code).toBe("address_daily_limit");
    advance(24 * 3600_000 + 5000);
    expect((await call("quiet.room", {}, "s10", h)).envelope.ok).toBe(true); // nový den
  });

  it("caps are configurable by env", async () => {
    const { call } = mk({ SESSION_MAX_ACTIONS: "2" });
    await call("quiet.pause", { reason: "r" });
    await call("quiet.pause", { reason: "r" });
    expect((await call("quiet.pause", { reason: "r" })).status).toBe(429);
  });
});

describe("lobby.leave", () => {
  const slow = async () => { await new Promise((r) => setTimeout(r, 15_000)); return { data: { slow: true } }; };

  it("MCP: answers < 1 s during a running long call and cancels it", async () => {
    const s = await startGateway({ env: { TIMEOUT_MS_TEXT: "60000" }, payments: new FakeGate(), handlers: { "quiet.ground": slow as never } });
    const c = await connect(s.url);
    const long = c.callTool({ name: "quiet.ground", arguments: {} });
    await new Promise((r) => setTimeout(r, 300));
    const t0 = Date.now();
    const leave = env(await c.callTool({ name: "lobby.leave", arguments: {} }));
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(leave.ok).toBe(true);
    expect(leave.data.summary.cancelled_calls).toBe(1);
    expect(leave.data.memory_destroyed).toBe(true);
    const longEnv = env(await long);
    expect(longEnv.ok).toBe(false);
    expect(longEnv.error.code).toBe("cancelled");
    // další volání na zavřenou relaci; nový checkin otevře novou
    expect(env(await c.callTool({ name: "quiet.pause", arguments: { reason: "r" } })).error.code).toBe("session_closed");
    expect(env(await c.callTool({ name: "lobby.checkin", arguments: {} })).ok).toBe(true);
    expect(env(await c.callTool({ name: "quiet.pause", arguments: { reason: "r" } })).ok).toBe(true);
    await c.close(); await s.close();
  });

  it("REST: the address session (identified by a paid call) is destroyed in < 1 s and its running call cancelled", async () => {
    const s = await startGateway({ env: { TIMEOUT_MS_TEXT: "60000", TRIAL_FREE_SESSIONS: "0" }, payments: new FakeGate(), handlers: { "quiet.ground": slow as never } });
    const h = { "x-test-payer": "0xREST1" };
    // adresní relace vznikne první placenou (rychlou) akcí
    expect((await post(s.url, "quiet.room", {}, h)).status).toBe(200);
    const long = post(s.url, "quiet.ground", {}, h);
    await new Promise((r) => setTimeout(r, 300));
    // leave nese platební důkaz jen u placených nástrojů; volání zdarma tedy zavírá relaci svého spojení (MCP), u REST jednorázovou.
    // Adresní relaci proto zavíráme přes volání gateway se stejnou identitou (viz OPEN_QUESTIONS 23).
    const key = s.gw.agents.addrKey("0xrest1");
    const sess = (s.gw.sessions as any).byAddr.get(key);
    expect(sess).toBeTruthy();
    const t0 = Date.now();
    const cancelled = s.gw.sessions.destroy(sess);
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(cancelled).toBe(1);
    expect((await (await long).json()).error.code).toBe("cancelled");
    await s.close();
  });

  it("MCP cancellation (notifications/cancelled) aborts the call and the session stays usable", async () => {
    const s = await startGateway({ env: { TIMEOUT_MS_TEXT: "60000" }, payments: new FakeGate(), handlers: { "quiet.ground": slow as never } });
    const c = await connect(s.url);
    const ac = new AbortController();
    const p = c.callTool({ name: "quiet.ground", arguments: {} }, undefined, { signal: ac.signal });
    await new Promise((r) => setTimeout(r, 200));
    ac.abort();
    await expect(p).rejects.toBeTruthy();
    await new Promise((r) => setTimeout(r, 100));
    expect(env(await c.callTool({ name: "quiet.pause", arguments: { reason: "r" } })).ok).toBe(true);
    const [sess] = [...((s.gw.sessions as any).live as Set<any>)];
    expect(sess.inflight.size).toBe(0);
    await c.close(); await s.close();
  });

  it("closing the REST connection aborts the call", async () => {
    const s = await startGateway({ env: { TIMEOUT_MS_TEXT: "60000" }, payments: new FakeGate(), handlers: { "quiet.ground": slow as never } });
    const ac = new AbortController();
    const p = fetch(`${s.url}/v1/quiet.ground`, { method: "POST", body: "{}", signal: ac.signal }).catch(() => "aborted");
    await new Promise((r) => setTimeout(r, 200));
    ac.abort();
    expect(await p).toBe("aborted");
    await s.close();
  });

  it("times out a call (per mechanism) with 504", async () => {
    const s = await startGateway({ env: { TIMEOUT_MS_TEXT: "200" }, payments: new FakeGate(), handlers: { "quiet.ground": slow as never } });
    const r = await post(s.url, "quiet.ground", {});
    expect(r.status).toBe(504);
    expect((await r.json()).error.code).toBe("timeout");
    await s.close();
  });
});
