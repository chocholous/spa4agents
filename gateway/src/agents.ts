import { createHmac, randomBytes, randomUUID } from "node:crypto";
import type { Config } from "./config.js";
import type { Micro } from "./money.js";

/**
 * Stav agenta napříč relacemi (trial, pozvánky). Jen v paměti procesu; restart ho smaže.
 * Klíč: před první platbou dočasný (`prov:...`), po platbě HMAC platební adresy se solí, která žije jen v procesu
 * (adresa v otevřeném tvaru se nedrží). Nejde o anti-farm hash s denní solí (viz `daily.ts`).
 */
export interface Redemption {
  /** Pozvánka od jiného agenta (nebo od sebe). */
  referrer: AgentState | null;
  self: boolean;
  at: number;
  freeCallsLeft: number;
  /** První placené volání pozvaného už proběhlo; od něj běží okno kreditu zvoucího. */
  firstPaidAt: number | null;
}

export interface CreditEntry {
  micro: Micro;
  expiresAt: number;
}

export class AgentState {
  readonly id = randomUUID();
  lastSeen: number;
  /** Zkušební session: kolik už bylo uplatněno a odkdy běží platnost. */
  trialClaimed = 0;
  trialStartedAt: number | null = null;
  ownCode: string | null = null;
  redeemed: Redemption | null = null;
  credits: CreditEntry[] = [];
  earnedByMonth = new Map<string, Micro>();
  earnedTotal: Micro = 0;
  invitees = 0;
  /** Po sloučení dočasného stavu s adresním. */
  mergedInto: AgentState | null = null;
  /** Svázán s platební adresou (dlouhá životnost); dočasný stav žije jen krátce. */
  bound = false;

  constructor(readonly createdAt: number) {
    this.lastSeen = createdAt;
  }

  root(): AgentState {
    let s: AgentState = this;
    while (s.mergedInto) s = s.mergedInto;
    return s;
  }
}

const DAY = 86_400_000;
const MAX_CODES = 100_000;

export class AgentStore {
  private readonly stableSalt = randomBytes(32);
  private states = new Map<string, AgentState>();
  private codes = new Map<string, AgentState>();

  constructor(
    private readonly cfg: Config,
    private readonly now: () => number,
  ) {}

  addrKey(address: string): string {
    return "a:" + createHmac("sha256", this.stableSalt).update(address.toLowerCase()).digest("hex").slice(0, 32);
  }

  /** Nový dočasný stav (v mapě není, dokud nemá co uchovat; dočasná relace ho drží přímo). */
  createProvisional(): AgentState {
    return new AgentState(this.now());
  }

  getByAddress(address: string): AgentState | undefined {
    const s = this.states.get(this.addrKey(address));
    return s?.root();
  }

  /**
   * Po zjištění platební adresy: stav adresy převezme dočasný stav, nebo (má-li adresa už svůj) se dočasný
   * sloučí do něj (pozvánka a vlastní kód se přenesou, pokud je cílový stav nemá).
   */
  bindAddress(address: string, prov: AgentState): AgentState {
    const key = this.addrKey(address);
    const p = prov.root();
    const existing = this.states.get(key)?.root();
    if (!existing) {
      p.bound = true;
      this.states.set(key, p);
      return p;
    }
    if (existing === p) return existing;
    if (!existing.ownCode && p.ownCode) {
      existing.ownCode = p.ownCode;
      this.codes.set(p.ownCode, existing);
    }
    if (!existing.redeemed && p.redeemed) existing.redeemed = p.redeemed;
    existing.credits.push(...p.credits);
    existing.invitees += p.invitees;
    p.mergedInto = existing;
    return existing;
  }

  /** `null` = přeplněno (ochrana paměti). */
  codeFor(state: AgentState, newCode: () => string): string | null {
    const s = state.root();
    if (!s.ownCode) {
      if (this.codes.size >= MAX_CODES) return null;
      let c = newCode();
      while (this.codes.has(c)) c = newCode();
      s.ownCode = c;
      this.codes.set(c, s);
    }
    return s.ownCode;
  }

  lookupCode(code: string): AgentState | undefined {
    return this.codes.get(code)?.root();
  }

  /** Zahodí stavy, které dlouho nikdo nepoužil (trial, kredit i pozvánka mají konečnou platnost). */
  prune(): void {
    const t = this.now();
    const ttl = (Math.max(this.cfg.trial.validDays, this.cfg.referral.referrerCreditDays) + 1) * 86_400_000;
    for (const [k, s] of this.states) {
      if (t - s.root().lastSeen > ttl) {
        this.states.delete(k);
        const c = s.ownCode;
        if (c) this.codes.delete(c);
      }
    }
    // Kód dočasného (nezaplaceného) stavu žije jen 24 h nečinnosti.
    for (const [c, s] of this.codes) {
      const r = s.root();
      if (t - r.lastSeen > (r.bound ? ttl : DAY)) this.codes.delete(c);
    }
  }

  /** Dočasný stav, který získal kód, musí přežít relaci jen do TTL; zaregistruje se pod náhodným klíčem. */
  keepProvisional(s: AgentState): void {
    const k = "p:" + s.id;
    if (!this.states.has(k)) this.states.set(k, s);
  }

  size(): number {
    return this.states.size;
  }
}
