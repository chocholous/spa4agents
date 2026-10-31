import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createx402MCPClient } from "@x402/mcp";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { loadCatalog } from "../../src/catalog.js";
import { loadConfig } from "../../src/config.js";
import { Gateway } from "../../src/gateway.js";
import type { Handler } from "../../src/handlers.js";
import type { PaymentGate, PaymentRequest } from "../../src/payments.js";
import { createHttpServer } from "../../src/server.js";
import { createResourceServer, X402Gate } from "../../src/x402.js";
import { NETWORK, startMockFacilitator } from "./mock-facilitator.js";

export const CATALOG_PATH = new URL("../../../catalog/catalog.yaml", import.meta.url).pathname;
export const catalog = loadCatalog(CATALOG_PATH);

/** Testovací brána: nic nevybírá; „platbu“ nese hlavička/meta `x-test-payer` (adresa). Zaznamenává ceny a vypořádání. */
export class FakeGate implements PaymentGate {
  prices: number[] = [];
  settled: number[] = [];
  failSettle = false;
  constructor(private readonly resolveAddress = (req: PaymentRequest) => {
    const h = req.headers["x-test-payer"] ?? (req.mcpMeta?.["x-test-payer"] as string | undefined);
    return Array.isArray(h) ? h[0] : h;
  }) {}
  hasPayment(req: PaymentRequest) {
    return !!this.resolveAddress(req);
  }
  async authorize(req: PaymentRequest) {
    const address = this.resolveAddress(req);
    if (!address) return { kind: "required" as const, challenge: { x402Version: 2, accepts: [{ amount: String(req.priceMicro) }] } };
    this.prices.push(req.priceMicro);
    return { kind: "ok" as const, cost: { usd: (req.priceMicro / 1e6).toString(), paid_with: "x402" }, address, token: req.priceMicro };
  }
  async settle(d: { token?: unknown }) {
    if (this.failSettle) return { ok: false };
    this.settled.push(d.token as number);
    return { ok: true, receipt: { success: true, transaction: "0xfake" } };
  }
}

export interface Started {
  gw: Gateway;
  server: Server;
  url: string;
  close(): Promise<void>;
}

export async function startGateway(p: {
  env?: Record<string, string>;
  payments?: PaymentGate;
  handlers?: Record<string, Handler>;
  now?: () => number;
} = {}): Promise<Started> {
  const config = loadConfig({ ...p.env }, catalog.limits);
  const gw = new Gateway({ config, catalog, payments: p.payments, handlers: p.handlers, now: p.now });
  const server = createHttpServer(gw);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    gw,
    server,
    url,
    close: async () => {
      gw.stopMaintenance();
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}

export const payTo = privateKeyToAccount(generatePrivateKey()).address;

/** Gateway s reálnou x402 bránou proti mock facilitátoru. */
export async function startPaid(p: { env?: Record<string, string>; handlers?: Record<string, Handler>; failSettle?: boolean; now?: () => number } = {}) {
  const fac = await startMockFacilitator({ failSettle: p.failSettle });
  const env = { TRIAL_FREE_SESSIONS: "0", X402_FACILITATOR_URL: fac.url, X402_NETWORK: NETWORK, PAY_TO_ADDRESS: payTo, ...p.env };
  const config = loadConfig(env, catalog.limits);
  const rs = await createResourceServer(config.x402);
  const gate = new X402Gate(rs, config.x402);
  await gate.start();
  const g = await startGateway({ env, payments: gate, handlers: p.handlers, now: p.now });
  fac.reset();
  return { ...g, fac, gate, close: async () => { gate.stop(); await g.close(); await fac.close(); } };
}

export async function connect(url: string, headers: Record<string, string> = {}) {
  const c = new Client({ name: "t", version: "0" });
  await c.connect(new StreamableHTTPClientTransport(new URL(url + "/mcp"), { requestInit: { headers } }));
  return c;
}
export const env = (r: any) => JSON.parse((r.content as { text: string }[])[0]!.text);

export const post = (url: string, tool: string, body: unknown = {}, headers: Record<string, string> = {}) =>
  fetch(`${url}/v1/${tool}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

/** Autonomní agent s testovací peněženkou: platí výzvy x402 sám. */
export function makeAgent(url: string, maxUsdPerPayment = "$0.05") {
  const account = privateKeyToAccount(generatePrivateKey());
  const schemes = [{ network: NETWORK, client: new ExactEvmScheme(account) }];
  const spendControls = { maxAmountPerPayment: maxUsdPerPayment as `$${string}` };
  return {
    address: account.address,
    async mcp() {
      const x = createx402MCPClient({ name: "agent", version: "0", schemes, spendControls, autoPayment: true, onPaymentRequested: async () => true });
      await x.connect(new StreamableHTTPClientTransport(new URL(url + "/mcp")));
      return x;
    },
    rest(tool: string, body: unknown = {}) {
      const pay = wrapFetchWithPaymentFromConfig(fetch, { schemes });
      return pay(`${url}/v1/${tool}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    },
  };
}
