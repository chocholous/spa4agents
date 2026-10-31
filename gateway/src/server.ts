import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema, isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Gateway } from "./gateway.js";
import { encodePaymentRequiredHeader, encodePaymentResponseHeader } from "./x402.js";

/** Interní hlavička, kterou nastavuje jen server (klientská hodnota se přepíše); nese IP jen po dobu požadavku. */
const IP_HEADER = "x-spagents-internal-ip";

async function readJson(req: IncomingMessage, max: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > max) throw new Error("body_too_large");
    chunks.push(c as Buffer);
  }
  const t = Buffer.concat(chunks).toString("utf8");
  return t ? JSON.parse(t) : undefined;
}

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

export function clientIp(req: IncomingMessage, hops: number): string | undefined {
  let ip: string | undefined;
  if (hops > 0) {
    const xff = String(req.headers["x-forwarded-for"] ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    ip = xff[xff.length - hops];
  }
  ip ??= req.socket.remoteAddress;
  return ip?.replace(/^::ffff:/, "");
}

function baseUrlOf(gw: Gateway, req: IncomingMessage): string {
  if (gw.config.baseUrl) return gw.config.baseUrl;
  const proto = gw.config.trustProxyHops > 0 && req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  return `${proto}://${req.headers.host ?? "localhost"}`;
}

function buildMcpServer(gw: Gateway): Server {
  const server = new Server(
    { name: gw.catalog.serviceName, version: "0.1.0" },
    { capabilities: { tools: {} }, instructions: gw.instructions() },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: gw.exposed.map((t) => ({
      name: t.name,
      description: gw.toolDescription(t),
      inputSchema: t.inputSchema as { type: "object" },
    })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (req, extra) => {
    const headers = (extra.requestInfo?.headers ?? {}) as Record<string, string | string[] | undefined>;
    const ipH = headers[IP_HEADER];
    const r = await gw.call({
      tool: req.params.name,
      args: (req.params.arguments ?? {}) as Record<string, unknown>,
      headers,
      transport: "mcp",
      mcpSessionId: extra.sessionId,
      mcpMeta: req.params._meta as Record<string, unknown> | undefined,
      ip: Array.isArray(ipH) ? ipH[0] : ipH,
      signal: extra.signal, // MCP cancellation (notifications/cancelled)
    });
    if (r.paymentChallenge !== undefined) {
      // Standardní x402 v MCP: výzva ve structuredContent s isError, stejný JSON v content[0].text (ne v _meta).
      return {
        structuredContent: r.paymentChallenge as Record<string, unknown>,
        content: [{ type: "text" as const, text: JSON.stringify(r.paymentChallenge) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(r.envelope) }],
      structuredContent: r.envelope as unknown as Record<string, unknown>,
      isError: !r.envelope.ok,
      ...(r.receipt !== undefined ? { _meta: { "x402/payment-response": r.receipt } } : {}),
    };
  });
  return server;
}

export function createHttpServer(gw: Gateway): HttpServer {
  const transports = new Map<string, StreamableHTTPServerTransport>();
  gw.sessions.onEvictMcp = (id) => {
    const t = transports.get(id);
    transports.delete(id);
    void t?.close().catch(() => {});
  };

  async function handleMcp(req: IncomingMessage, res: ServerResponse) {
    const sid = req.headers["mcp-session-id"] as string | undefined;
    let body: unknown;
    if (req.method === "POST") {
      try { body = await readJson(req, gw.config.maxBodyBytes); } catch { return send(res, 400, { error: "invalid_json" }); }
    }
    const ip = clientIp(req, gw.config.trustProxyHops);
    if (ip) req.headers[IP_HEADER] = ip; else delete req.headers[IP_HEADER];
    let transport = sid ? transports.get(sid) : undefined;
    if (!transport) {
      if (req.method === "POST" && !sid && isInitializeRequest(body)) {
        const t = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => { transports.set(id, t); },
        });
        t.onclose = () => {
          if (t.sessionId) {
            transports.delete(t.sessionId);
            gw.endMcp(t.sessionId); // konec MCP session = zničení paměti relace
          }
        };
        await buildMcpServer(gw).connect(t);
        transport = t;
      } else {
        return send(res, sid ? 404 : 400, { jsonrpc: "2.0", error: { code: -32000, message: sid ? "Unknown session" : "Missing session" }, id: null });
      }
    }
    await transport.handleRequest(req, res, body);
  }

  async function handleRest(req: IncomingMessage, res: ServerResponse, tool: string) {
    if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" }, { allow: "POST" });
    let args: unknown;
    try { args = (await readJson(req, gw.config.maxBodyBytes)) ?? {}; } catch { return send(res, 400, { error: "invalid_json" }); }
    if (typeof args !== "object" || args === null || Array.isArray(args)) return send(res, 400, { error: "body_must_be_object" });
    const ac = new AbortController();
    res.on("close", () => { if (!res.writableEnded) ac.abort(new Error("cancelled")); });
    const r = await gw.call({
      tool,
      args: args as Record<string, unknown>,
      headers: req.headers,
      transport: "rest",
      ip: clientIp(req, gw.config.trustProxyHops),
      baseUrl: baseUrlOf(gw, req),
      signal: ac.signal,
    });
    const hdr: Record<string, string> = {};
    let body: unknown = r.envelope;
    if (r.paymentChallenge !== undefined) {
      hdr["PAYMENT-REQUIRED"] = encodePaymentRequiredHeader(r.paymentChallenge as never);
      body = { ...r.envelope, data: { payment_required: r.paymentChallenge } };
    }
    if (r.receipt !== undefined) hdr["PAYMENT-RESPONSE"] = encodePaymentResponseHeader(r.receipt as never);
    send(res, r.status, body, hdr);
  }

  return createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0]!;
    const run = async () => {
      if (path === "/mcp") return handleMcp(req, res);
      if (path === "/healthz") return send(res, 200, { ok: true });
      if (path === "/status") return send(res, 200, gw.status());
      if (path.startsWith("/v1/")) return handleRest(req, res, decodeURIComponent(path.slice(4)));
      send(res, 404, { error: "not_found" });
    };
    run().catch(() => { if (!res.headersSent) send(res, 500, { error: "internal_error" }); else res.end(); });
  });
}
