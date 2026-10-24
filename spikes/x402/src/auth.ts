import { randomBytes } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { GUEST_PASS_HEADER } from "./config.js";

/**
 * Spike-only guest pass store (in memory). The real gateway (WP2) owns this.
 * The point here is ordering: auth runs BEFORE the x402 middleware and before any tool code,
 * so an unauthenticated caller never reaches payment verification or the handler.
 */
export class GuestPasses {
  private passes = new Map<string, number>(); // pass -> remaining free calls (stand-in for a voucher)
  constructor(private freeCalls = 0) {}
  issue(): string {
    const pass = `gp_${randomBytes(18).toString("base64url")}`;
    this.passes.set(pass, this.freeCalls);
    return pass;
  }
  /** Spend one free call if the pass has any. Returns whether the call is free. */
  consumeFree(pass: string | undefined | null): boolean {
    const left = pass ? this.passes.get(pass) ?? 0 : 0;
    if (left <= 0 || !pass) return false;
    this.passes.set(pass, left - 1);
    return true;
  }
  has(pass: string | undefined | null): boolean {
    return !!pass && this.passes.has(pass);
  }
}

export function requireGuestPass(passes: GuestPasses): MiddlewareHandler {
  return async (c, next) => {
    if (!passes.has(c.req.header(GUEST_PASS_HEADER))) {
      return c.json({ error: "guest_pass_required", hint: "POST /guest-pass (free) and send the x-spa-guest-pass header" }, 401);
    }
    await next();
  };
}
