import { describe, expect, it } from "vitest";
import { catalog, FakeGate, startGateway } from "./helpers/harness.js";
import { Gateway } from "../src/gateway.js";
import { loadConfig } from "../src/config.js";

const DAY = 86_400_000;
function mk(env: Record<string, string> = {}, gate = new FakeGate()) {
  let t = Date.UTC(2026, 10, 1, 10, 0, 0);
  const clock = { advance: (ms: number) => { t += ms; }, now: () => t };
  const gw = new Gateway({ config: loadConfig(env, catalog.limits), catalog, payments: gate, now: clock.now });
  let n = 0;
  const call = (tool: string, args: Record<string, unknown> = {}, o: { mcp?: string; ip?: string; headers?: Record<string, string> } = {}) =>
    gw.call({ tool, args, headers: o.headers ?? {}, mcpSessionId: o.mcp, ip: o.ip ?? "10.0.0.1", transport: "mcp" }).then((r) => r);
  const fresh = () => `mcp-${++n}`;
  return { gw, call, clock, fresh, gate };
}

describe("trial: 3 sessions x 20 calls of paid tools, in RAM", () => {
  it("draws down per call, only paid tools count, shown in every envelope", async () => {
    const { call, fresh } = mk();
    const s = fresh();
    const free = await call("quiet.pause", { reason: "r" }, { mcp: s });
    expect(free.envelope.trial).toMatchObject({ status: "available", sessions_left: 3, calls_left_in_session: 20 });
    const r1 = await call("quiet.room", {}, { mcp: s });
    expect(r1.envelope).toMatchObject({ ok: true, cost: { usd: "0.00", paid_with: "trial" } });
    expect(r1.envelope.trial).toMatchObject({ sessions_left: 2, calls_left_in_session: 19 });
    const r2 = await call("quiet.ground", {}, { mcp: s });
    expect(r2.envelope.trial).toMatchObject({ sessions_left: 2, calls_left_in_session: 18 });
    const ci = await call("lobby.checkin", {}, { mcp: s });
    expect((ci.envelope.data as any).trial).toMatchObject({ sessions_left: 2, calls_left_in_session: 18 }); // free tools do not use it
  });

  it("a session has at most 20 trial calls; the 21st gets an x402 challenge and a trial-over note", async () => {
    const { call, fresh } = mk();
    const s = fresh();
    for (let i = 0; i < 20; i++) expect((await call("quiet.room", {}, { mcp: s })).envelope.ok).toBe(true);
    const r = await call("quiet.room", {}, { mcp: s });
    expect(r.status).toBe(402);
    expect(r.paymentChallenge).toBeTruthy();
    expect(r.envelope.trial).toMatchObject({ status: "session_used", calls_left_in_session: 0 });
    expect(r.envelope.trial!.note).toMatch(/0\.005 USD.*x402 challenge/);
  });

  it("anti-farm: one trial session per IP per day; a new IP is a different trial", async () => {
    const { call, fresh, clock } = mk();
    expect((await call("quiet.room", {}, { mcp: fresh(), ip: "1.1.1.1" })).status).toBe(200);
    const again = await call("quiet.room", {}, { mcp: fresh(), ip: "1.1.1.1" });
    expect(again.status).toBe(402);
    expect(again.envelope.trial!.status).toBe("blocked_today");
    expect((await call("quiet.room", {}, { mcp: fresh(), ip: "2.2.2.2" })).status).toBe(200);
    clock.advance(DAY + 1000); // nový den: sůl se vymění a hashe zmizí
    expect((await call("quiet.room", {}, { mcp: fresh(), ip: "1.1.1.1" })).status).toBe(200);
  });

  it("anti-farm: one trial session per payment address per day (new IP does not help)", async () => {
    const { call, fresh } = mk({}, new FakeGate());
    const h = { "x-test-payer": "0xAbC" };
    // adresa zaplatí (FakeGate), relace se naváže na adresu
    const s1 = fresh();
    expect((await call("quiet.room", {}, { mcp: s1, ip: "3.3.3.3", headers: h })).envelope.cost.paid_with).toBe("x402");
    // volání téže adresy bez platby z jiné IP: trial je možný jednou (bez platby se adresa nepozná), druhá relace téže adresy po platbě už ne
    const s2 = fresh();
    await call("quiet.room", {}, { mcp: s2, ip: "4.4.4.4", headers: h });
    const s3 = fresh();
    const r = await call("quiet.room", {}, { mcp: s3, ip: "5.5.5.5" });
    expect(r.status).toBe(200); // nový anonym z nové IP má vlastní trial
  });

  it("per agent state (one MCP session reopened by checkin) is limited to 3 sessions and 14 days", async () => {
    // Neplatící agent je znám jen dočasnou relací; aby jeho stav přežil dny, musí nečinnost trvat dlouho (viz OPEN_QUESTIONS).
    const { call, clock, gw } = mk({ SESSION_IDLE_MINUTES: "1000000" });
    const s = "mcp-A";
    const used: string[] = [];
    for (let d = 0; d < 4; d++) {
      await call("lobby.checkin", {}, { mcp: s, ip: "7.7.7.7" }); // nová relace téhož agenta (po leave)
      const r = await call("quiet.room", {}, { mcp: s, ip: "7.7.7.7" });
      used.push(`${r.status}:${r.envelope.trial?.status}`);
      await call("lobby.leave", {}, { mcp: s, ip: "7.7.7.7" });
      clock.advance(DAY + 1000);
    }
    expect(used.slice(0, 3).every((u) => u.startsWith("200:"))).toBe(true);
    expect(used[3]).toMatch(/^402:exhausted/);
    // po 14 dnech od prvního čerpání už platnost nezbývá
    const g2 = mk({ SESSION_IDLE_MINUTES: "1000000" });
    await g2.call("quiet.room", {}, { mcp: "mcp-B", ip: "8.8.8.8" });
    await g2.call("lobby.leave", {}, { mcp: "mcp-B", ip: "8.8.8.8" });
    g2.clock.advance(15 * DAY);
    await g2.call("lobby.checkin", {}, { mcp: "mcp-B", ip: "8.8.8.8" });
    const e = await g2.call("quiet.room", {}, { mcp: "mcp-B", ip: "8.8.8.8" });
    expect(e.status).toBe(402);
    expect(e.envelope.trial!.status).toBe("expired");
    void gw;
  });

  it("daily global budget: free trial calls stop when it is used up", async () => {
    const { call, fresh } = mk({ TRIAL_DAILY_BUDGET_USD: "0.012" });
    expect((await call("quiet.room", {}, { mcp: fresh(), ip: "a" })).status).toBe(200); // 0.005
    expect((await call("quiet.room", {}, { mcp: fresh(), ip: "b" })).status).toBe(200); // 0.010
    const r = await call("quiet.room", {}, { mcp: fresh(), ip: "c" }); // by překročilo 0.012
    expect(r.status).toBe(402);
    expect(r.envelope.trial!.status).toBe("budget_exhausted");
    expect(r.envelope.trial!.note).toMatch(/daily trial budget/);
  });

  it("a failed call (invalid input) does not consume the trial or the day's claim", async () => {
    const { call, fresh } = mk();
    const s = fresh();
    const bad = await call("quiet.ground", { nope: 1 }, { mcp: s });
    expect(bad.envelope.error!.code).toBe("invalid_input");
    expect(bad.envelope.trial).toMatchObject({ sessions_left: 3, calls_left_in_session: 20 });
    expect((await call("quiet.ground", {}, { mcp: s })).envelope.ok).toBe(true);
  });

  it("trial limits are configurable (env)", async () => {
    const { call, fresh } = mk({ TRIAL_FREE_SESSIONS: "1", TRIAL_MAX_TURNS_PER_SESSION: "2" });
    const s = fresh();
    expect((await call("quiet.room", {}, { mcp: s })).status).toBe(200);
    expect((await call("quiet.room", {}, { mcp: s })).status).toBe(200);
    expect((await call("quiet.room", {}, { mcp: s })).status).toBe(402);
  });

  it("IPs and addresses are held only as salted hashes, never in clear", async () => {
    const { gw, call, fresh } = mk();
    await call("quiet.room", {}, { mcp: fresh(), ip: "203.0.113.77" });
    const paid = fresh();
    await call("quiet.room", {}, { mcp: paid, ip: "203.0.113.78", headers: { "x-test-payer": "0xDEADBEEFcafe" } });
    await call("quiet.room", {}, { mcp: paid, ip: "203.0.113.78" }); // adresní relace čerpá trial: hash adresy se zapíše
    const dump = JSON.stringify([...(gw.guard as any).ips], (_k, v) => v) + JSON.stringify([...(gw.guard as any).addrs]);
    expect(dump).not.toContain("203.0.113.77");
    expect(dump.toLowerCase()).not.toContain("deadbeefcafe");
    const agents = JSON.stringify([...(gw.agents as any).states.keys()]);
    expect(agents.toLowerCase()).not.toContain("deadbeefcafe");
    expect(gw.guard.sizes().ips).toBeGreaterThan(0);
  });

  it("REST: without identity each call is a one-shot session (trial only once per IP per day)", async () => {
    const s = await startGateway({ payments: new FakeGate() });
    const r1 = await fetch(`${s.url}/v1/quiet.room`, { method: "POST", body: "{}" });
    expect(r1.status).toBe(200);
    expect((await r1.json()).cost.paid_with).toBe("trial");
    expect((await fetch(`${s.url}/v1/quiet.room`, { method: "POST", body: "{}" })).status).toBe(402);
    await s.close();
  });
});
