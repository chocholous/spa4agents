import { randomBytes } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { GUEST_PASS_HEADER } from "./config.js";

/**
 * Spike-only guest pass store (in memory). The real gateway (WP2) owns this.
 * The point here is ordering: auth runs BEFORE the x402 middleware and before any tool code,
 * so an unauthenticated caller never reaches payment verification or the handler.
 */
export class GuestPasses {
  private passes = new Set<string>();
  issue(): string {
    const pass = `gp_${randomBytes(18).toString("base64url")}`;
    this.passes.add(pass);
    return pass;
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
