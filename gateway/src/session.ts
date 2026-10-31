import { randomBytes, randomUUID } from "node:crypto";
import type { Config } from "./config.js";

export interface SessionSnapshot {
  actions_left: number;
  minutes_left: number;
  usd_left: string | null;
}

export class Session {
  readonly id = randomUUID();
  readonly guestPass = "gp_" + randomBytes(18).toString("base64url");
  readonly startedAt: number;
  /** Identita = platební adresa x402; vyplní WP3. */
  address: string | null = null;
  nickname: string | null = null;
  actions = 0;
  usdSpent = 0;
  closed = false;
  cancelledCalls = 0;
  /** Běžící volání; `leave` je ruší mimo jakoukoli frontu. */
  readonly inflight = new Set<AbortController>();

  constructor(private readonly cfg: Config["session"], private readonly now: () => number) {
    this.startedAt = now();
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
    if (this.cfg.maxUsd !== null && this.usdSpent >= Number(this.cfg.maxUsd)) return "usd";
    return null;
  }

  snapshot(): SessionSnapshot {
    return {
      actions_left: Math.max(0, this.cfg.maxActions - this.actions),
      minutes_left: Math.max(0, Math.floor(this.cfg.maxMinutes - this.minutesUsed())),
      usd_left: this.cfg.maxUsd === null ? null : Math.max(0, Number(this.cfg.maxUsd) - this.usdSpent).toFixed(2),
    };
  }

  /** Warning při >= 80 % kteréhokoli stropu. */
  warning(): string | null {
    const w = this.cfg.warnAt;
    const hit: string[] = [];
    if (this.actions >= w * this.cfg.maxActions) hit.push("actions");
    if (this.minutesUsed() >= w * this.cfg.maxMinutes) hit.push("minutes");
    if (this.cfg.maxUsd !== null && this.usdSpent >= w * Number(this.cfg.maxUsd)) hit.push("usd");
    return hit.length ? `Session has used 80% or more of its cap (${hit.join(", ")}).` : null;
  }

  /** Uzavře relaci a zruší všechna běžící volání. */
  close(): number {
    this.closed = true;
    const n = this.inflight.size;
    for (const c of this.inflight) c.abort(new Error("session_closed"));
    this.cancelledCalls += n;
    return n;
  }
}

export class SessionStore {
  private byPass = new Map<string, Session>();
  private byMcp = new Map<string, Session>();

  constructor(private readonly cfg: Config["session"], private readonly now: () => number = Date.now) {}

  create(): Session {
    const s = new Session(this.cfg, this.now);
    this.byPass.set(s.guestPass, s);
    return s;
  }

  getByPass(pass: string): Session | undefined {
    return this.byPass.get(pass);
  }

  /** Implicitní relace svázaná s MCP session; služba je použitelná bez checkinu. */
  forMcp(mcpSessionId: string): Session {
    let s = this.byMcp.get(mcpSessionId);
    if (!s) {
      s = this.create();
      this.byMcp.set(mcpSessionId, s);
    }
    return s;
  }

  bindMcp(mcpSessionId: string, s: Session): void {
    this.byMcp.set(mcpSessionId, s);
  }
}
