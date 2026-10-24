import { Hono } from "hono";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createPaymentWrapper, createToolResourceUrl } from "@x402/mcp";
import { paymentMiddleware } from "@x402/hono";
import type { x402ResourceServer } from "@x402/core/server";
import { GuestPasses, requireGuestPass } from "./auth.js";
import { GUEST_PASS_HEADER, NETWORK, REST_PATH, TOOL_NAME } from "./config.js";
import { lookup, lookupInputShape, mcpDiscovery, restDiscovery } from "./tool.js";

export interface AppOptions {
  resourceServer: x402ResourceServer;
  payTo: string;
  priceUsd: string;
  passes?: GuestPasses;
  /** Free calls per new guest pass (voucher stand-in, MCP only in this spike). */
  freeCalls?: number;
  /** Observability hook for tests/logs: called when the tool body actually runs (after verify). */
  onToolRun?: (via: "mcp" | "rest", query: string) => void;
}

export async function createApp(opts: AppOptions) {
  const passes = opts.passes ?? new GuestPasses(opts.freeCalls ?? 0);
  const app = new Hono();

  // Free endpoint: issues the guest pass (stand-in for lobby.checkin / x-spa-guest-pass).
  app.post("/guest-pass", (c) => c.json({ guest_pass: passes.issue() }));
  app.get("/health", (c) => c.json({ ok: true }));

  // Auth BEFORE payment and before any tool code, for both MCP and REST.
  app.use("/mcp", requireGuestPass(passes));
  app.use("/v1/*", requireGuestPass(passes));

  // ---- MCP: createPaymentWrapper -------------------------------------------------
  const accepts = await opts.resourceServer.buildPaymentRequirements({
    scheme: "exact",
    network: NETWORK,
    payTo: opts.payTo,
    price: opts.priceUsd,
  });
  const paid = createPaymentWrapper(opts.resourceServer, {
    accepts,
    // The wrapper derives the tool name from resource.url ("mcp://tool/<name>").
    resource: {
      url: createToolResourceUrl(TOOL_NAME),
      description: "Temporary spike tool: look up a calming line by keyword.",
      mimeType: "application/json",
    },
    extensions: mcpDiscovery,
  });

  // Voucher/free-call composition: createPaymentWrapper has no "grant access" path (no payment => always a
  // challenge), so the free path wraps OUTSIDE it. When the allowance is used up the very next call gets the
  // normal x402 challenge (never an automatic switch to paying).
  const withFreeCalls = (handler: (args: { query: string }) => Promise<any>) => {
    const gated = paid(handler as never) as unknown as (args: any, extra: any) => Promise<any>;
    return async (args: { query: string }, extra: any) => {
      const h = extra?.requestInfo?.headers?.[GUEST_PASS_HEADER];
      return passes.consumeFree(Array.isArray(h) ? h[0] : h) ? handler(args) : gated(args, extra);
    };
  };

  const buildMcpServer = () => {
    const mcp = new McpServer({ name: "spa-x402-spike", version: "0.0.0" });
    mcp.registerTool(
      TOOL_NAME,
      { description: `Temporary paid spike tool (${opts.priceUsd} USDC on Base Sepolia). Empty results are not charged.`, inputSchema: lookupInputShape },
      withFreeCalls(async (args: { query: string }) => {
        opts.onToolRun?.("mcp", args.query);
        const r = lookup(args.query);
        if (!r.ok) {
          // isError => wrapper cancels settlement: the payment authorization is never submitted.
          return { isError: true, content: [{ type: "text", text: "No results. You were not charged." }] };
        }
        return { content: [{ type: "text", text: JSON.stringify({ query: r.query, matches: r.matches }) }] };
      }) as never,
    );
    mcp.registerTool("spike.ping", { description: "Free tool." }, async () => ({ content: [{ type: "text", text: "pong" }] }));
    return mcp;
  };

  app.all("/mcp", async (c) => {
    // Stateless: one server + transport per request.
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    const mcp = buildMcpServer();
    await mcp.connect(transport);
    return transport.handleRequest(c.req.raw);
  });

  // ---- REST: @x402/hono ----------------------------------------------------------
  app.use(
    paymentMiddleware(
      {
        [`POST ${REST_PATH}`]: {
          accepts: { scheme: "exact", network: NETWORK, payTo: opts.payTo, price: opts.priceUsd },
          description: "Temporary spike tool: look up a calming line by keyword.",
          mimeType: "application/json",
          extensions: restDiscovery,
        },
      },
      opts.resourceServer,
      undefined,
      undefined,
      false, // resourceServer is already initialized
    ),
  );

  app.post(REST_PATH, async (c) => {
    // Only reached with a verified payment. Body is read here, never before.
    const body = (await c.req.json().catch(() => null)) as { query?: unknown } | null;
    if (!body || typeof body.query !== "string" || !body.query) return c.json({ error: "invalid_input" }, 400); // 4xx => no settlement
    opts.onToolRun?.("rest", body.query);
    const r = lookup(body.query);
    if (!r.ok) return c.json({ error: "no_results", charged: false }, 404); // >=400 => middleware cancels, no settlement
    return c.json({ query: r.query, matches: r.matches });
  });

  return { app, passes };
}
