import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema, isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Gateway } from "./gateway.js";

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 1_000_000) throw new Error("body_too_large");
    chunks.push(c as Buffer);
  }
  const t = Buffer.concat(chunks).toString("utf8");
  return t ? JSON.parse(t) : undefined;
}

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

function buildMcpServer(gw: Gateway): Server {
  const server = new Server(
    { name: gw.catalog.serviceName, version: "0.0.1" },
    { capabilities: { tools: {} }, instructions: gw.instructions() },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: gw.exposed.map((t) => ({
      name: t.name,
      description: `${t.description} [type: ${t.mechanism}; price: ${t.price.model === "free" ? "free" : `${t.price.model} ${t.price.usd ?? "TBD"} USD`}]`,
      inputSchema: t.inputSchema as { type: "object" },
    })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (req, extra) => {
    const r = await gw.call({
      tool: req.params.name,
      args: (req.params.arguments ?? {}) as Record<string, unknown>,
      headers: (extra.requestInfo?.headers ?? {}) as Record<string, string | string[] | undefined>,
      mcpSessionId: extra.sessionId,
      mcpMeta: req.params._meta as Record<string, unknown> | undefined,
      signal: extra.signal, // MCP cancellation (notifications/cancelled)
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(r.envelope) }],
      structuredContent: r.envelope as unknown as Record<string, unknown>,
      isError: !r.envelope.ok,
      ...(r.paymentChallenge !== undefined ? { _meta: { "x402/payment-required": r.paymentChallenge } } : {}),
    };
  });
  return server;
}

export function createHttpServer(gw: Gateway): HttpServer {
  const transports = new Map<string, StreamableHTTPServerTransport>();

  async function handleMcp(req: IncomingMessage, res: ServerResponse) {
    const sid = req.headers["mcp-session-id"] as string | undefined;
    let body: unknown;
    if (req.method === "POST") {
      try { body = await readJson(req); } catch { return send(res, 400, { error: "invalid_json" }); }
    }
    let transport = sid ? transports.get(sid) : undefined;
    if (!transport) {
      if (req.method === "POST" && !sid && isInitializeRequest(body)) {
        const t = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => { transports.set(id, t); },
        });
        t.onclose = () => { if (t.sessionId) transports.delete(t.sessionId); };
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
    try { args = (await readJson(req)) ?? {}; } catch { return send(res, 400, { error: "invalid_json" }); }
    if (typeof args !== "object" || args === null || Array.isArray(args)) return send(res, 400, { error: "body_must_be_object" });
    const ac = new AbortController();
    res.on("close", () => { if (!res.writableEnded) ac.abort(new Error("cancelled")); });
    const r = await gw.call({ tool, args: args as Record<string, unknown>, headers: req.headers, signal: ac.signal });
    const hdr: Record<string, string> = {};
    if (r.paymentChallenge !== undefined) hdr["PAYMENT-REQUIRED"] = Buffer.from(JSON.stringify(r.paymentChallenge)).toString("base64");
    send(res, r.status, r.envelope, hdr);
  }

  return createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0]!;
    const run = async () => {
      if (path === "/mcp") return handleMcp(req, res);
      if (path === "/healthz") return send(res, 200, { ok: true });
      if (path.startsWith("/v1/")) return handleRest(req, res, decodeURIComponent(path.slice(4)));
      send(res, 404, { error: "not_found" });
    };
    run().catch(() => { if (!res.headersSent) send(res, 500, { error: "internal_error" }); else res.end(); });
  });
}
