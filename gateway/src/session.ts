import { randomUUID } from "node:crypto";
import type { AgentState } from "./agents.js";
import type { Config } from "./config.js";
import { fmtUsd, type Micro } from "./money.js";

export interface SessionSnapshot {
  actions_left: number;
  minutes_left: number;
  usd_left: string;
}

type SessionCfg = Config["session"];

export class Session {
  readonly id = randomUUID();
  readonly startedAt: number;
  lastSeen: number;
  /** Stav agenta (trial, pozvánky); sdílí ho relace téže adresy, relace sám nic z obsahu nedrží. */
  agent: AgentState;
  /** HMAC platební adresy (klíč v `SessionStore.byAddr`); adresa v otevřeném tvaru se nedrží. */
  addrKey: string | null = null;
  actions = 0;
  spent: Micro = 0;
  closed = false;
  cancelledCalls = 0;
  /** Hash adresy s denní solí (jen pro denní strop a anti-farm); po výměně soli neplatí. */
  addrDay: { day: string; key: string } | null = null;
  /** Probíhá zkušební session: počet volání zdarma. `null` = žádná. */
  trial: { calls: number } | null = null;
  /** Běžící volání; `leave` je ruší mimo jakoukoli frontu. */
  readonly inflight = new Set<AbortController>();

  constructor(
    private readonly cfg: SessionCfg,
    private readonly now: () => number,
    agent: AgentState,
  ) {
    this.startedAt = now();
    this.lastSeen = this.startedAt;
    this.agent = agent;
  }

  touch(): void {
    this.lastSeen = this.now();
    this.agent.root().lastSeen = this.lastSeen;
  }

  minutesUsed(): number {
    return (this.now() - this.startedAt) / 60_000;
  }

  expired(): boolean {
    return this.minutesUsed() >= this.cfg.maxMinutes;
  }

  atCap(): "actions" | "minutes" | "usd" | null {
    if (this.actions >= this.cfg.maxActions) return "actions";
    if (this.expired()) return "minutes";
    if (this.spent >= this.cfg.maxUsdMicro) return "usd";
    return null;
  }

  /** Vejde se do USD stropu relace ještě volání za `price`? */
  fitsBudget(price: Micro): boolean {
    return this.spent + price <= this.cfg.maxUsdMicro;
  }

  snapshot(): SessionSnapshot {
    return {
      actions_left: Math.max(0, this.cfg.maxActions - this.actions),
      minutes_left: Math.max(0, Math.floor(this.cfg.maxMinutes - this.minutesUsed())),
      usd_left: fmtUsd(Math.max(0, this.cfg.maxUsdMicro - this.spent)),
    };
  }

  /** Warning při >= 80 % kteréhokoli stropu relace. */
  warning(): string | null {
    const w = this.cfg.warnAt;
    const hit: string[] = [];
    if (this.actions >= w * this.cfg.maxActions) hit.push("actions");
    if (this.minutesUsed() >= w * this.cfg.maxMinutes) hit.push("minutes");
    if (this.spent >= w * this.cfg.maxUsdMicro) hit.push("usd");
    return hit.length ? `Session has used ${Math.round(w * 100)}% or more of its cap (${hit.join(", ")}).` : null;
  }

  /** Uzavře relaci, zruší běžící volání a zničí paměť relace. */
  close(): number {
    const n = this.inflight.size;
    this.closed = true;
    for (const c of this.inflight) c.abort(new Error("session_closed"));
    this.inflight.clear();
    this.cancelledCalls += n;
    this.trial = null;
    return n;
  }
}

/**
 * Relace jen v paměti. Zavřená nebo nečinná relace se z map ODSTRANÍ (zůstane jen malý náhrobek s časem,
 * aby další volání na tutéž MCP session dostalo `session_closed`; náhrobek taky vyprší).
 */
export class SessionStore {
  private byMcp = new Map<string, Session>();
  private byAddr = new Map<string, Session>();
  private closedMcp = new Map<string, { at: number; agent: AgentState }>();
  private closedAddr = new Map<string, number>();
  /** Dočasné relace bez MCP session (REST): drží se jen po dobu volání. */
  private live = new Set<Session>();
  onEvictMcp: ((mcpSessionId: string) => void) | undefined;

  constructor(
    private readonly cfg: SessionCfg,
    private readonly now: () => number,
    private readonly maxLive: number,
  ) {}

  create(agent: AgentState): Session {
    return new Session(this.cfg, this.now, agent);
  }

  count(): number {
    return this.live.size;
  }

  /** Dočasná relace svázaná s MCP session (jen v paměti). `undefined` = přeplněno. */
  forMcp(mcpSessionId: string, mkAgent: () => AgentState, reopen: boolean): { session: Session; tombstone: boolean } | undefined {
    const s = this.byMcp.get(mcpSessionId);
    if (s && !s.closed) return { session: s, tombstone: false };
    if (this.closedMcp.has(mcpSessionId)) {
      if (!reopen) {
        const dummy = this.create(this.closedMcp.get(mcpSessionId)!.agent);
        dummy.closed = true;
        return { session: dummy, tombstone: true };
      }
    }
    if (this.live.size >= this.maxLive) return undefined;
    const n = this.create(this.closedMcp.get(mcpSessionId)?.agent ?? mkAgent());
    this.closedMcp.delete(mcpSessionId);
    this.byMcp.set(mcpSessionId, n);
    this.live.add(n);
    return { session: n, tombstone: false };
  }

  /** Odstraní relaci z evidence bez náhrobku (nahrazena relací téže adresy). */
  drop(s: Session): void {
    this.live.delete(s);
    s.close();
  }

  /** Jednorázová relace (REST bez platby). */
  ephemeral(agent: AgentState): Session {
    return this.create(agent);
  }

  getByAddr(addrKey: string): Session | undefined {
    const s = this.byAddr.get(addrKey);
    return s && !s.closed ? s : undefined;
  }

  isAddrClosed(addrKey: string): boolean {
    return this.closedAddr.has(addrKey);
  }

  /** Svázání relace s adresou (a s MCP session, pokud nějaká je). */
  bind(s: Session, addrKey: string, mcpSessionId?: string): void {
    s.addrKey = addrKey;
    this.byAddr.set(addrKey, s);
    this.closedAddr.delete(addrKey);
    if (mcpSessionId) this.byMcp.set(mcpSessionId, s);
    this.live.add(s);
  }

  /** Nový `lobby.checkin` po zavřené relaci: čistá relace pro MCP session a/nebo adresu. */
  reopen(agent: AgentState, addrKey: string | null, mcpSessionId?: string): Session {
    const n = this.create(agent);
    if (addrKey) {
      this.closedAddr.delete(addrKey);
      n.addrKey = addrKey;
      this.byAddr.set(addrKey, n);
    }
    if (mcpSessionId) {
      this.closedMcp.delete(mcpSessionId);
      this.byMcp.set(mcpSessionId, n);
    }
    this.live.add(n);
    return n;
  }

  /** Zničí relaci: zavře ji, odstraní z map a nechá náhrobek. */
  destroy(s: Session): number {
    const cancelled = s.close();
    const t = this.now();
    for (const [k, v] of this.byMcp) if (v === s) { this.byMcp.delete(k); this.closedMcp.set(k, { at: t, agent: s.agent }); }
    if (s.addrKey && this.byAddr.get(s.addrKey) === s) {
      this.byAddr.delete(s.addrKey);
      this.closedAddr.set(s.addrKey, t);
    }
    this.live.delete(s);
    return cancelled;
  }

  /** Konec MCP session (zavření transportu): relace se zničí bez náhrobku. */
  endMcp(mcpSessionId: string): void {
    const s = this.byMcp.get(mcpSessionId);
    if (s) {
      this.destroy(s);
    }
    this.closedMcp.delete(mcpSessionId);
  }

  /** Uklidí nečinné a prošlé relace a staré náhrobky. */
  prune(): void {
    const t = this.now();
    const idle = this.cfg.idleMinutes * 60_000;
    const hardMs = this.cfg.maxMinutes * 60_000 + idle;
    for (const s of [...this.live]) {
      if (t - s.lastSeen > idle || t - s.startedAt > hardMs) {
        const ids = [...this.byMcp].filter(([, v]) => v === s).map(([k]) => k);
        this.destroy(s);
        for (const id of ids) {
          this.closedMcp.delete(id);
          this.onEvictMcp?.(id);
        }
        if (s.addrKey) this.closedAddr.delete(s.addrKey);
      }
    }
    for (const [k, e] of this.closedMcp) if (t - e.at > idle) this.closedMcp.delete(k);
    for (const [k, at] of this.closedAddr) if (t - at > idle) this.closedAddr.delete(k);
  }

  /** Agregované počty (bez identifikátorů). */
  sizes(): { live: number; tombstones: number } {
    return { live: this.live.size, tombstones: this.closedMcp.size + this.closedAddr.size };
  }
}
