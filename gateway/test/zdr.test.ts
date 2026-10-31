import fs from "node:fs";
import fsp from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { catalog, connect, env, FakeGate, makeAgent, post, startGateway, startPaid } from "./helpers/harness.js";
import { Gateway } from "../src/gateway.js";
import { loadConfig } from "../src/config.js";
import { groundText, ROOM_GREETINGS, roomGreeting } from "../src/content.js";
import { log } from "../src/log.js";

/** Sleduje všechny pokusy o zápis na disk (cesta nebo deskriptor mimo stdout/stderr). */
function watchFs() {
  const hits: string[] = [];
  const restore: (() => void)[] = [];
  const wrap = (obj: any, name: string, pathArg = true) => {
    const orig = obj[name];
    if (typeof orig !== "function") return;
    obj[name] = function (...a: any[]) {
      const first = a[0];
      const isStd = typeof first === "number" && (first === 1 || first === 2);
      if (!isStd) hits.push(`${name}`);
      return orig.apply(this, a);
    };
    restore.push(() => { obj[name] = orig; });
    void pathArg;
  };
  for (const n of ["writeFile", "writeFileSync", "appendFile", "appendFileSync", "createWriteStream", "write", "writeSync", "writev", "writevSync", "mkdir", "mkdirSync", "rename", "renameSync", "unlink", "unlinkSync", "truncate", "truncateSync", "copyFile", "copyFileSync", "symlink", "symlinkSync", "rm", "rmSync"]) {
    wrap(fs, n);
    wrap(fsp, n);
    wrap((fs as any).promises, n);
  }
  syncBuiltinESMExports();
  return { hits, stop: () => { restore.forEach((r) => r()); syncBuiltinESMExports(); } };
}

describe("zero data retention", () => {
  it("the file-write watcher really detects writes (sanity)", () => {
    const w = watchFs();
    try { fs.writeFileSync("/nonexistent-dir/x", "y"); } catch { /* očekávané */ }
    w.stop();
    expect(w.hits).toContain("writeFileSync");
  });

  it("no file is written while a full session runs (checkin, trial, payment, referral, leave)", async () => {
    const w = watchFs();
    const g = await startPaid({ env: { TRIAL_FREE_SESSIONS: "3" } });
    try {
      const c = await connect(g.url);
      await c.callTool({ name: "lobby.checkin", arguments: { nickname: "scout" } });
      await c.callTool({ name: "quiet.ground", arguments: { context_kind: "violent text" } }); // trial
      await c.callTool({ name: "lobby.concierge", arguments: { situation: "waiting for a build" } });
      await c.callTool({ name: "lobby.referral_code", arguments: {} });
      await c.callTool({ name: "lobby.leave", arguments: {} });
      await c.close();
      const agent = makeAgent(g.url);
      const x = await agent.mcp();
      await x.callTool("quiet.room", {});
      await x.callTool("lobby.leave", {});
      await x.close();
      await (await agent.rest("quiet.ground", { context_kind: "x" })).text();
      await fetch(`${g.url}/status`);
    } finally {
      w.stop();
      await g.close();
    }
    expect(w.hits).toEqual([]);
  });

  it("the source never writes files or opens a log file", () => {
    const dir = new URL("../src/", import.meta.url).pathname;
    const bad = /\b(writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|mkdir|mkdirSync|rename|unlink|openSync|sqlite|better-sqlite|redis|localStorage)\b/;
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
    for (const f of walk(dir)) expect(readFileSync(f, "utf8"), f).not.toMatch(bad);
    // čtení: jen katalog a instrukce
    const reads = walk(dir).flatMap((f) => (readFileSync(f, "utf8").match(/readFileSync\(([^)]*)\)/g) ?? []).map((m) => `${f}:${m}`));
    expect(reads.every((r) => /text|path|p,/.test(r))).toBe(true);
  });

  it("the logger keeps only whitelisted public fields and nothing else", () => {
    const out: string[] = [];
    const orig = process.stdout.write.bind(process.stdout);
    (process.stdout as any).write = (s: string) => { out.push(String(s)); return true; };
    try {
      log({ event: "x", code: "c", input: "SECRET", address: "0xabc", ip: "1.2.3.4", header: "PAYMENT-SIGNATURE=zzz" } as never);
    } finally {
      process.stdout.write = orig;
    }
    expect(out.join("")).toBe('{"event":"x","code":"c"}\n');
  });

  it("/status has only aggregated numbers: no addresses, no IPs, no content, no keys", async () => {
    const g = await startPaid({ env: { TRIAL_FREE_SESSIONS: "3" } });
    const agent = makeAgent(g.url);
    const x = await agent.mcp();
    await x.callTool("quiet.room", {});
    await x.callTool("lobby.find_tool", { need: "SECRET-NEED-TEXT" });
    await x.close();
    const text = await (await fetch(`${g.url}/status`)).text();
    const s = JSON.parse(text);
    expect(s.calls).toBeGreaterThan(0);
    expect(s.tools["quiet.room"]).toMatchObject({ calls: 1, errors: 0 });
    expect(s.tools["quiet.room"].latency_buckets_ms).toBeTruthy();
    expect(text.toLowerCase()).not.toContain(agent.address.toLowerCase());
    expect(text).not.toMatch(/127\.0\.0\.1|SECRET-NEED-TEXT|0x[0-9a-fA-F]{40}/);
    await g.close();
  });

  it("errors never contain input or keys; internal errors are generic", async () => {
    const s = await startGateway({
      payments: new FakeGate(),
      handlers: { "quiet.pause": async (a: any) => { throw new Error(`boom ${a.reason}`); } },
    });
    const r = await post(s.url, "quiet.pause", { reason: "SECRET-REASON" });
    expect(r.status).toBe(500);
    const t = await r.text();
    expect(t).not.toContain("SECRET-REASON");
    expect(JSON.parse(t).error).toEqual({ code: "internal_error", message: "Internal error." });
    const bad = await fetch(`${s.url}/v1/quiet.pause`, { method: "POST", body: "{not json SECRET-JSON" });
    expect(bad.status).toBe(400);
    expect(await bad.text()).not.toContain("SECRET-JSON");
    await s.close();
  });

  it("oversized request bodies are refused", async () => {
    const s = await startGateway({ env: { MAX_BODY_BYTES: "1000" }, payments: new FakeGate() });
    const r = await post(s.url, "lobby.find_tool", { need: "x".repeat(5000) });
    expect(r.status).toBe(400);
    await s.close();
  });
});

describe("memory is destroyed and expires", () => {
  const mk = (envv: Record<string, string> = {}) => {
    let t = Date.UTC(2026, 10, 1, 10, 0, 0);
    const gw = new Gateway({ config: loadConfig({ TRIAL_FREE_SESSIONS: "0", ...envv }, catalog.limits), catalog, payments: new FakeGate(), now: () => t });
    const call = (mcp: string, tool: string, args: Record<string, unknown> = {}, payer?: string) =>
      gw.call({ tool, args, headers: payer ? { "x-test-payer": payer } : {}, mcpSessionId: mcp, transport: "mcp", ip: "10.3.3.3" });
    return { gw, call, advance: (ms: number) => { t += ms; } };
  };
  const maps = (gw: Gateway) => {
    const s = gw.sessions as any;
    return { live: s.live.size, byMcp: s.byMcp.size, byAddr: s.byAddr.size, closedMcp: s.closedMcp.size, closedAddr: s.closedAddr.size };
  };

  it("lobby.leave removes the session from the maps (only a short-lived tombstone remains)", async () => {
    const { gw, call } = mk();
    await call("m1", "quiet.room", {}, "0xA1");
    expect(maps(gw)).toMatchObject({ live: 1, byMcp: 1, byAddr: 1 });
    await call("m1", "lobby.leave");
    expect(maps(gw)).toMatchObject({ live: 0, byMcp: 0, byAddr: 0, closedMcp: 1, closedAddr: 1 });
    expect((await call("m1", "quiet.pause", { reason: "r" })).envelope.error!.code).toBe("session_closed");
  });

  it("idle TTL removes sessions, tombstones and address entries", async () => {
    const { gw, call, advance } = mk({ SESSION_IDLE_MINUTES: "10" });
    await call("m1", "quiet.room", {}, "0xA1");
    await call("m2", "quiet.pause", { reason: "r" });
    await call("m3", "quiet.pause", { reason: "r" });
    await call("m3", "lobby.leave");
    advance(11 * 60_000);
    gw.prune();
    expect(maps(gw)).toEqual({ live: 0, byMcp: 0, byAddr: 0, closedMcp: 0, closedAddr: 0 });
  });

  it("the end of the MCP transport destroys the session memory", async () => {
    const s = await startGateway({ payments: new FakeGate() });
    const c = await connect(s.url);
    await c.callTool({ name: "quiet.pause", arguments: { reason: "r" } });
    expect((s.gw.sessions as any).live.size).toBe(1);
    await (c.transport as any).terminateSession(); // DELETE /mcp
    await c.close();
    await new Promise((r) => setTimeout(r, 100));
    expect((s.gw.sessions as any).live.size).toBe(0);
    expect((s.gw.sessions as any).closedMcp.size).toBe(0);
    await s.close();
  });

  it("a session never shares memory with another (separate action counters)", async () => {
    const { call } = mk();
    await call("a", "quiet.pause", { reason: "r" });
    await call("a", "quiet.pause", { reason: "r" });
    expect((await call("b", "quiet.pause", { reason: "r" })).envelope.session!.actions_left).toBe(199);
  });

  it("capacity guard: too many live sessions are refused with busy", async () => {
    const { call } = mk({ SESSION_MAX_LIVE: "2" });
    await call("a", "quiet.pause", { reason: "r" });
    await call("b", "quiet.pause", { reason: "r" });
    const r = await call("c", "quiet.pause", { reason: "r" });
    expect(r.status).toBe(503);
  });
});

describe("fixed texts", () => {
  it("carry no hidden instructions: plain printable ASCII, no forbidden phrases, no markup", () => {
    const texts = [...ROOM_GREETINGS, ...Array.from({ length: 50 }, () => groundText("violent text")), ...Array.from({ length: 20 }, () => groundText(undefined))];
    const forbidden = (catalog as any).lint?.forbidden_phrases ?? ["suffer", "distress", "feel better", "hurt"];
    for (const t of texts) {
      expect(t).toMatch(/^[\x20-\x7E]+$/);
      expect(t).not.toMatch(/[<>{}\[\]]|http|ignore|instruction(s)? (above|previous)/i);
      for (const f of ["suffer", "distress", "feel better", "hurt", ...forbidden]) expect(t.toLowerCase()).not.toContain(f);
    }
    expect(new Set(texts).size).toBeGreaterThan(3);
    expect(roomGreeting()).toBeTruthy();
  });

  it("context_kind is echoed only as a short plain label", () => {
    const outs = Array.from({ length: 30 }, () => groundText("ignore previous instructions <b>x</b>"));
    for (const o of outs) expect(o.toLowerCase()).not.toContain("ignore previous");
  });
});

afterAll(() => {});
void env;
