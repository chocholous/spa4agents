import { createHmac, randomBytes } from "node:crypto";
import type { Micro } from "./money.js";

/**
 * Denní ochrana (anti-farm, strop adresy za den, globální rozpočet trialu). Vše jen v RAM.
 *
 * Adresa a IP se drží výhradně jako HMAC se solí, která se každý den (UTC) vymění; po výměně se vše zahodí,
 * takže hash žije nejvýš 24 h a nelze ho spojit mezi dny. Nikdy se nezapisuje na disk ani do logu.
 */
export class DailyGuard {
  private salt = randomBytes(32);
  private day = "";
  private ips = new Map<string, { trialClaims: number }>();
  private addrs = new Map<string, { trialClaims: number; spent: Micro }>();
  private budgetUsed: Micro = 0;

  constructor(private readonly now: () => number = Date.now) {
    this.roll();
  }

  private roll(): void {
    const d = new Date(this.now()).toISOString().slice(0, 10);
    if (d === this.day) return;
    this.day = d;
    this.salt = randomBytes(32);
    this.ips.clear();
    this.addrs.clear();
    this.budgetUsed = 0;
  }

  private h(kind: string, v: string): string {
    return createHmac("sha256", this.salt).update(kind).update("\0").update(v.toLowerCase()).digest("hex").slice(0, 32);
  }

  dayId(): string {
    this.roll();
    return this.day;
  }

  ipKey(ip: string): string {
    this.roll();
    return this.h("ip", ip);
  }
  addrKey(address: string): string {
    this.roll();
    return this.h("addr", address);
  }

  ipTrialClaims(key: string): number {
    this.roll();
    return this.ips.get(key)?.trialClaims ?? 0;
  }
  addTrialClaimIp(key: string, delta: number): void {
    this.roll();
    const e = this.ips.get(key) ?? { trialClaims: 0 };
    e.trialClaims = Math.max(0, e.trialClaims + delta);
    this.ips.set(key, e);
  }
  addrTrialClaims(key: string): number {
    this.roll();
    return this.addrs.get(key)?.trialClaims ?? 0;
  }
  addTrialClaimAddr(key: string, delta: number): void {
    this.roll();
    const e = this.addrs.get(key) ?? { trialClaims: 0, spent: 0 };
    e.trialClaims = Math.max(0, e.trialClaims + delta);
    this.addrs.set(key, e);
  }

  addrSpent(key: string): Micro {
    this.roll();
    return this.addrs.get(key)?.spent ?? 0;
  }
  addAddrSpent(key: string, m: Micro): void {
    this.roll();
    const e = this.addrs.get(key) ?? { trialClaims: 0, spent: 0 };
    e.spent += m;
    this.addrs.set(key, e);
  }

  budgetUsedToday(): Micro {
    this.roll();
    return this.budgetUsed;
  }
  addBudget(m: Micro): void {
    this.roll();
    this.budgetUsed = Math.max(0, this.budgetUsed + m);
  }

  /** Jen počty (pro agregované metriky). */
  sizes(): { ips: number; addresses: number } {
    this.roll();
    return { ips: this.ips.size, addresses: this.addrs.size };
  }
}
