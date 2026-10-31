import { randomBytes } from "node:crypto";
import { AgentStore, type AgentState } from "./agents.js";
import type { ToolDef } from "./catalog.js";
import type { Config } from "./config.js";
import type { DailyGuard } from "./daily.js";
import { fmtUsd, pct, toMicro, type Micro } from "./money.js";
import type { Session } from "./session.js";

const DAY = 86_400_000;

export type TrialStatus = "available" | "session_used" | "exhausted" | "expired" | "blocked_today" | "budget_exhausted";

export interface TrialRemaining {
  status: TrialStatus;
  sessions_left: number;
  calls_left_in_session: number;
  bonus_calls_left: number;
  valid_days_left: number | null;
  next_call_usd: string;
  note?: string;
}

export interface Quote {
  /** Co se skutečně účtuje x402 (po slevě a kreditu). */
  micro: Micro;
  baseMicro: Micro;
  discountMicro: Micro;
  creditMicro: Micro;
}

export interface FreeGrant {
  kind: "trial" | "referral";
  micro: Micro;
  /** Vrátí rezervaci (volání selhalo, nic se neúčtuje ani nečerpá). */
  release(): void;
}

export class Economy {
  constructor(
    private readonly cfg: Config,
    readonly agents: AgentStore,
    private readonly guard: DailyGuard,
    private readonly now: () => number,
  ) {}

  baseMicro(tool: ToolDef): Micro {
    return tool.price.model === "free" ? 0 : toMicro(tool.price.usd);
  }

  isPaid(tool: ToolDef): boolean {
    return tool.price.model === "per_call";
  }

  private liveCredits(a: AgentState): Micro {
    const t = this.now();
    a.credits = a.credits.filter((c) => c.expiresAt > t && c.micro > 0);
    return a.credits.reduce((s, c) => s + c.micro, 0);
  }

  quote(agent: AgentState, tool: ToolDef): Quote {
    const a = agent.root();
    const base = this.baseMicro(tool);
    const disc = a.redeemed ? pct(base, this.cfg.referral.inviteeDiscountPercent) : 0;
    const afterDisc = base - disc;
    const credit = Math.min(this.liveCredits(a), afterDisc);
    return { micro: afterDisc - credit, baseMicro: base, discountMicro: disc, creditMicro: credit };
  }

  // ---- trial ------------------------------------------------------------------------------------------------

  private trialDaysLeft(a: AgentState): number | null {
    if (a.trialStartedAt === null) return this.cfg.trial.validDays;
    return Math.max(0, Math.ceil((a.trialStartedAt + this.cfg.trial.validDays * DAY - this.now()) / DAY));
  }

  private trialExpired(a: AgentState): boolean {
    return a.trialStartedAt !== null && this.now() > a.trialStartedAt + this.cfg.trial.validDays * DAY;
  }

  /** Může tato relace čerpat trial za cenu `micro`? Nic nemění. */
  private trialCheck(s: Session, micro: Micro, ipKey: string | null, addrDay: string | null): TrialStatus {
    const a = s.agent.root();
    const c = this.cfg.trial;
    if (s.trial) return s.trial.calls < c.maxTurnsPerSession ? "available" : "session_used";
    if (this.trialExpired(a)) return "expired";
    if (a.trialClaimed >= c.freeSessions) return "exhausted";
    if (ipKey && this.guard.ipTrialClaims(ipKey) >= c.perIpPerDay) return "blocked_today";
    if (addrDay && this.guard.addrTrialClaims(addrDay) >= c.perAddressPerDay) return "blocked_today";
    if (this.guard.budgetUsedToday() + micro > c.dailyBudgetMicro) return "budget_exhausted";
    return "available";
  }

  /** Souhrn zbývajícího trialu pro obálku a `lobby.checkin`. */
  trialSummary(s: Session, ipKey: string | null, addrDay: string | null, nextCall: Micro): TrialRemaining {
    const a = s.agent.root();
    const c = this.cfg.trial;
    const status = this.trialCheck(s, nextCall, ipKey, addrDay);
    const unclaimed = this.trialExpired(a) ? 0 : Math.max(0, c.freeSessions - a.trialClaimed);
    const callsLeft = s.trial ? Math.max(0, c.maxTurnsPerSession - s.trial.calls) : unclaimed > 0 ? c.maxTurnsPerSession : 0;
    const bonus = a.redeemed?.freeCallsLeft ?? 0;
    const out: TrialRemaining = {
      status,
      sessions_left: unclaimed,
      calls_left_in_session: callsLeft,
      bonus_calls_left: bonus,
      valid_days_left: this.trialDaysLeft(a),
      next_call_usd: fmtUsd(nextCall),
    };
    if (status !== "available") {
      const why: Record<string, string> = {
        session_used: "The trial calls of this session are used up.",
        exhausted: "No trial is left.",
        expired: "The trial has expired.",
        blocked_today: "A trial session was already started today for this address or network; the next one is possible after 24 hours.",
        budget_exhausted: "The daily trial budget of the service is used up.",
      };
      out.note = `${why[status]} The next call to a paid tool costs ${fmtUsd(nextCall)} USD and is paid only after an x402 challenge.`;
    }
    return out;
  }

  /** Rezervuje volání zdarma (trial, potom bonus z pozvánky). `null` = nelze, platí se. */
  tryFree(s: Session, quote: Quote, ipKey: string | null, addrDay: string | null): FreeGrant | null {
    const a = s.agent.root();
    const c = this.cfg.trial;
    const micro = quote.micro;
    if (this.trialCheck(s, micro, ipKey, addrDay) === "available") {
      const claimedNow = !s.trial;
      const firstEver = a.trialStartedAt === null;
      if (claimedNow) {
        a.trialClaimed++;
        if (firstEver) a.trialStartedAt = this.now();
        s.trial = { calls: 0 };
        if (ipKey) this.guard.addTrialClaimIp(ipKey, 1);
        if (addrDay) this.guard.addTrialClaimAddr(addrDay, 1);
      }
      s.trial!.calls++;
      this.guard.addBudget(micro);
      let released = false;
      return {
        kind: "trial",
        micro,
        release: () => {
          if (released) return;
          released = true;
          this.guard.addBudget(-micro);
          if (!s.trial) return;
          s.trial.calls--;
          if (claimedNow && s.trial.calls <= 0) {
            a.trialClaimed--;
            if (firstEver) a.trialStartedAt = null;
            s.trial = null;
            if (ipKey) this.guard.addTrialClaimIp(ipKey, -1);
            if (addrDay) this.guard.addTrialClaimAddr(addrDay, -1);
          }
        },
      };
    }
    void c;
    const red = a.redeemed;
    if (red && red.freeCallsLeft > 0 && this.guard.budgetUsedToday() + micro <= c.dailyBudgetMicro) {
      red.freeCallsLeft--;
      this.guard.addBudget(micro);
      let released = false;
      return {
        kind: "referral",
        micro,
        release: () => {
          if (released) return;
          released = true;
          red.freeCallsLeft++;
          this.guard.addBudget(-micro);
        },
      };
    }
    return null;
  }

  // ---- pozvánky ---------------------------------------------------------------------------------------------

  newCode(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const b = randomBytes(8);
    let out = "";
    for (const x of b) out += alphabet[x % alphabet.length];
    return `SPA-${out.slice(0, 4)}-${out.slice(4)}`;
  }

  referralCode(s: Session): string | null {
    return this.agents.codeFor(s.agent, () => this.newCode());
  }

  rewardsEarned(s: Session) {
    const a = s.agent.root();
    return {
      invitees_redeemed: a.invitees,
      credit_balance_usd: fmtUsd(this.liveCredits(a)),
      credit_earned_total_usd: fmtUsd(a.earnedTotal),
      credit_is_money: false,
    };
  }

  /** Uplatní kód; chyba `unknown_code` / `already_redeemed` se vrací jako řetězec. */
  redeem(s: Session, code: string): { ok: true; self: boolean } | { ok: false; error: "unknown_code" | "already_redeemed" } {
    const a = s.agent.root();
    if (a.redeemed) return { ok: false, error: "already_redeemed" };
    const ref = this.agents.lookupCode(code.trim().toUpperCase());
    if (!ref) return { ok: false, error: "unknown_code" };
    const self = ref === a;
    a.redeemed = { referrer: ref, self, at: this.now(), freeCallsLeft: this.cfg.referral.inviteeFreeCalls, firstPaidAt: null };
    ref.invitees++;
    ref.lastSeen = this.now();
    return { ok: true, self };
  }

  /** Po úspěšném vypořádání placeného volání: spotřebuje kredit a připíše kredit zvoucímu. */
  onPaid(s: Session, quote: Quote): void {
    const a = s.agent.root();
    a.lastSeen = this.now();
    let toUse = quote.creditMicro;
    for (const c of a.credits) {
      if (toUse <= 0) break;
      const u = Math.min(c.micro, toUse);
      c.micro -= u;
      toUse -= u;
    }
    const red = a.redeemed;
    if (!red || !red.referrer || quote.micro <= 0) return;
    if (red.self && !this.cfg.referral.selfEarns) return;
    const t = this.now();
    if (red.firstPaidAt === null) red.firstPaidAt = t;
    if (t - red.firstPaidAt > this.cfg.referral.referrerCreditDays * DAY) return;
    const ref = red.referrer.root();
    const month = new Date(t).toISOString().slice(0, 7);
    const cap = toMicro(this.cfg.referral.referrerCreditMonthlyCapUsd);
    const earned = ref.earnedByMonth.get(month) ?? 0;
    const credit = Math.min(pct(quote.micro, this.cfg.referral.referrerCreditPercent), Math.max(0, cap - earned));
    if (credit <= 0) return;
    ref.earnedByMonth.set(month, earned + credit);
    ref.earnedTotal += credit;
    ref.credits.push({ micro: credit, expiresAt: t + this.cfg.referral.referrerCreditDays * DAY });
    ref.lastSeen = t;
  }
}
