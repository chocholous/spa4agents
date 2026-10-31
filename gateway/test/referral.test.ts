import { describe, expect, it } from "vitest";
import { catalog, FakeGate } from "./helpers/harness.js";
import { Gateway } from "../src/gateway.js";
import { loadConfig } from "../src/config.js";

function mk(envv: Record<string, string> = {}) {
  let t = Date.UTC(2026, 10, 1, 10, 0, 0);
  const gate = new FakeGate();
  const gw = new Gateway({ config: loadConfig({ TRIAL_FREE_SESSIONS: "0", SESSION_MAX_USD: "10", ...envv }, catalog.limits), catalog, payments: gate, now: () => t });
  const call = (mcp: string, tool: string, args: Record<string, unknown> = {}, payer?: string) =>
    gw.call({ tool, args, headers: payer ? { "x-test-payer": payer } : {}, mcpSessionId: mcp, transport: "mcp", ip: "10.2.2.2" });
  return { gw, gate, call, advance: (ms: number) => { t += ms; } };
}

describe("referral (state in process memory)", () => {
  it("basic flow: code -> redeem -> 10 % discount + 3 free calls -> credit for the referrer", async () => {
    const { call, gate } = mk();
    await call("A", "quiet.room", {}, "0xA"); // A zaplatí, relace se naváže na adresu A
    const rc = (await call("A", "lobby.referral_code")).envelope;
    const code = (rc.data as any).code as string;
    expect(code).toMatch(/^SPA-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(rc.data).toMatchObject({
      invitee_benefit: { discount_percent: 10, free_calls: 3 },
      referrer_reward: { credit_percent: 20, credit_days: 30, monthly_cap_usd: "20.00", credit_is_money: false },
      rewards_earned: { invitees_redeemed: 0, credit_balance_usd: "0.00" },
    });
    expect((rc.data as any).sharing_rules.forbidden_channels.length).toBeGreaterThan(0);
    // stejný kód znovu
    expect(((await call("A", "lobby.referral_code")).envelope.data as any).code).toBe(code);

    // B uplatní kód (ještě před první platbou, jen v paměti své MCP session)
    const bad = await call("B", "lobby.redeem", { code: "SPA-NOPE-NOPE" });
    expect(bad.status).toBe(404);
    expect(bad.envelope.error!.code).toBe("unknown_code");
    const ok = await call("B", "lobby.redeem", { code });
    expect(ok.envelope.data).toMatchObject({ redeemed: true, discount_percent: 10, free_calls: 3, referrer_earns_credit: true });
    expect((await call("B", "lobby.redeem", { code })).status).toBe(409);

    // 3 volání zdarma navíc (bez platby), pak platí se slevou 10 %
    for (let i = 0; i < 3; i++) {
      const r = await call("B", "quiet.room");
      expect(r.envelope.cost).toEqual({ usd: "0.00", paid_with: "referral" });
      expect(r.envelope.trial!.bonus_calls_left).toBe(2 - i);
    }
    const challenge = await call("B", "quiet.room");
    expect(challenge.status).toBe(402);
    const paid = await call("B", "quiet.room", {}, "0xB");
    expect(paid.envelope.cost).toEqual({ usd: "0.0045", paid_with: "x402" });
    expect(gate.prices.at(-1)).toBe(4500);

    // zvoucí dostal kredit 20 % z platby pozvaného; kredit není peníze, jen sleva na jeho další volání
    const rewards = ((await call("A", "lobby.referral_code")).envelope.data as any).rewards_earned;
    expect(rewards).toMatchObject({ invitees_redeemed: 1, credit_balance_usd: "0.0009", credit_is_money: false });
    const next = await call("A", "quiet.room", {}, "0xA");
    expect(next.envelope.cost.usd).toBe("0.0041");
    expect(gate.prices.at(-1)).toBe(4100);
    const after = ((await call("A", "lobby.referral_code")).envelope.data as any).rewards_earned;
    expect(after.credit_balance_usd).toBe("0.00");
    expect(after.credit_earned_total_usd).toBe("0.0009");
  });

  it("credit expires after 30 days and respects the monthly cap", async () => {
    const m = mk({ REFERRAL_CREDIT_MONTHLY_CAP_USD: "0.0015" });
    await m.call("A", "quiet.room", {}, "0xA");
    const code = ((await m.call("A", "lobby.referral_code")).envelope.data as any).code;
    await m.call("B", "lobby.redeem", { code });
    for (let i = 0; i < 3; i++) await m.call("B", "quiet.room", {}, "0xB"); // 3 x 900 = 2700 > strop 1500
    const r = ((await m.call("A", "lobby.referral_code")).envelope.data as any).rewards_earned;
    expect(r.credit_earned_total_usd).toBe("0.0015");
    m.advance(31 * 86_400_000);
    const r2 = ((await m.call("A", "lobby.referral_code")).envelope.data as any).rewards_earned;
    expect(r2.credit_balance_usd).toBe("0.00");
  });

  it("redeeming your own code is accepted but earns nothing (configurable)", async () => {
    const { call } = mk();
    await call("A", "quiet.room", {}, "0xA");
    const code = ((await call("A", "lobby.referral_code")).envelope.data as any).code;
    const r = await call("A", "lobby.redeem", { code });
    expect(r.status).toBe(200);
    expect((r.envelope.data as any).referrer_earns_credit).toBe(false);
    await call("A", "quiet.room", {}, "0xA");
    const rewards = ((await call("A", "lobby.referral_code")).envelope.data as any).rewards_earned;
    expect(rewards.credit_earned_total_usd).toBe("0.00");
    const on = mk({ REFERRAL_SELF_EARNS: "true" });
    await on.call("A", "quiet.room", {}, "0xA");
    const c2 = ((await on.call("A", "lobby.referral_code")).envelope.data as any).code;
    await on.call("A", "lobby.redeem", { code: c2 });
    await on.call("A", "quiet.room", {}, "0xA");
    expect(((await on.call("A", "lobby.referral_code")).envelope.data as any).rewards_earned.credit_earned_total_usd).not.toBe("0.00");
  });

  it("referral values are configurable by env", async () => {
    const { call } = mk({ REFERRAL_INVITEE_FREE_CALLS: "1", REFERRAL_INVITEE_DISCOUNT_PERCENT: "50" });
    await call("A", "quiet.room", {}, "0xA");
    const code = ((await call("A", "lobby.referral_code")).envelope.data as any).code;
    const r = await call("B", "lobby.redeem", { code });
    expect(r.envelope.data).toMatchObject({ discount_percent: 50, free_calls: 1 });
  });

  it("the free bonus counts against the daily global budget", async () => {
    const { call } = mk({ TRIAL_DAILY_BUDGET_USD: "0.005" });
    await call("A", "quiet.room", {}, "0xA");
    const code = ((await call("A", "lobby.referral_code")).envelope.data as any).code;
    await call("B", "lobby.redeem", { code });
    // sleva 10 % -> 0.0045 volání; první se vejde do rozpočtu 0.005, druhé ne
    expect((await call("B", "quiet.room")).envelope.cost.paid_with).toBe("referral");
    expect((await call("B", "quiet.room")).status).toBe(402);
  });
});
