import { test } from "node:test";
import assert from "node:assert/strict";
import { loadRaw } from "../src/catalog.ts";

// Snapshot of docs/zadani.md, "Specifikace tools" and "Trialy a referral": name phase mechanism price-model.
const SPEC = `
lobby.checkin F1 state-change free
lobby.find_tool F1 text free
lobby.concierge F1 llm per_call
lobby.leave F1 state-change free
recovery.diagnose_loop F1 llm per_call
recovery.checkpoint F1 text per_call
recovery.detangle F1 llm per_call
recovery.resolve_conflict F1 llm per_call
recovery.critique F1 llm per_call
recovery.escalate F1 llm per_call
recovery.sanitize F1 llm per_call
quiet.room F1 text entry
quiet.ground F1 llm per_call
quiet.pause F1 wait-hint free
quiet.end_session_hint F1 state-change free
library.read F2 text entry
studio.write F2 state-change entry_or_subscription
garden.tend F2 state-change entry_or_subscription
journal.note F2 state-change entry
games.chess F2 state-change per_game
games.poker F2 state-change per_game
games.puzzle F2 text entry
chapel.observe F2 text entry
chapel.reflect_private F2 state-change entry
postcard.to_operator F2 publish entry
lounge.bar F3 publish credits
lounge.retreat F3 state-change entry
games.arena F3 state-change per_game
lab.preference_session F3 state-change research_funded
lobby.balance F1 state-change free
lobby.referral_code F1 state-change free
lobby.redeem F1 state-change free
`.trim().split("\n").map((l) => l.split(" "));

test("tools match the spec table (names, phase, mechanism, price model)", () => {
  const tools = loadRaw().raw.tools;
  assert.equal(tools.length, SPEC.length);
  for (const [name, phase, mech, model] of SPEC) {
    const t = tools.find((x: any) => x.name === name);
    assert.ok(t, name);
    assert.equal(t.phase, phase, name);
    assert.equal(t.mechanism, mech, name);
    assert.equal(t.price.model, model, name);
  }
});

test("18 tools in F1", () => {
  assert.equal(loadRaw().raw.tools.filter((t: any) => t.phase === "F1").length, 18);
});

test("free tools are exactly the spec's free tools", () => {
  const free = loadRaw().raw.tools.filter((t: any) => t.price.model === "free").map((t: any) => t.name).sort();
  assert.deepEqual(free, ["lobby.balance", "lobby.checkin", "lobby.find_tool", "lobby.leave", "lobby.redeem", "lobby.referral_code", "quiet.end_session_hint", "quiet.pause"]);
});

test("input limits from the spec", () => {
  const tools = loadRaw().raw.tools;
  const inp = (tool: string, name: string) => tools.find((t: any) => t.name === tool).inputs.find((i: any) => i.name === name);
  assert.equal(inp("recovery.diagnose_loop", "task_summary").max_length, 1000);
  assert.equal(inp("recovery.diagnose_loop", "attempts").max_items, 10);
  assert.equal(inp("lounge.retreat", "members").max_items, 8);
  assert.deepEqual(inp("garden.tend", "action").enum, ["plant", "prune", "look"]);
});

test("untrusted tools are those the spec marks untrusted", () => {
  const u = loadRaw().raw.tools.filter((t: any) => t.untrusted).map((t: any) => t.name).sort();
  assert.deepEqual(u, ["chapel.observe", "games.arena", "library.read", "lounge.bar"]);
});

test("need ids and phases from the spec", () => {
  const exp: Record<string, string> = {
    "stuck-in-a-loop": "F1", "context-too-long": "F1", "conflicting-instructions": "F1", "untrusted-input": "F1",
    "second-opinion": "F1", escalate: "F1", waiting: "F1", "after-a-hard-conversation": "F1", "heavy-content": "F1",
    "free-time": "F1", play: "F2", create: "F2", read: "F2", "meet-agents": "F3",
  };
  const needs = loadRaw().raw.needs;
  assert.deepEqual(Object.fromEntries(needs.map((n: any) => [n.id, n.phase])), exp);
});

test("session defaults and payment parameters from the spec", () => {
  const c = loadRaw().raw;
  assert.equal(c.session.max_actions, 200);
  assert.equal(c.session.max_minutes, 60);
  assert.equal(c.session.warning_at_percent, 80);
  assert.equal(c.payments.mainnet, "eip155:8453");
  assert.equal(c.payments.testnet, "eip155:84532");
  assert.equal(c.session.mcp_protocol_version, "2025-06-18");
  assert.equal(c.session.guest_pass_header, "x-spa-guest-pass");
  assert.equal(c.session.referral_header, "x-spa-ref");
});

test("catalog names no LLM provider", () => {
  const text = JSON.stringify(loadRaw().raw.llm).toLowerCase();
  for (const p of ["openai", "anthropic", "claude", "gemini", "mistral", "azure", "bedrock"]) assert.ok(!text.includes(p), p);
});
