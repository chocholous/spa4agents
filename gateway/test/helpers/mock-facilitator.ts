/**
 * MOCK facilitátor pro lokální testy (ze spiku spikes/x402). Není to x402.org ani on-chain:
 * ověřuje EIP-712 podpis autorizace EIP-3009 (špatný podepisovatel, částka či příjemce se odmítnou),
 * zůstatek nekontroluje a „vypořádá“ vrácením falešného hashe transakce.
 */
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { verifyTypedData, type Hex } from "viem";

export const NETWORK = "eip155:84532" as const;

export interface MockCall { endpoint: "verify" | "settle" | "supported"; at: number; ok?: boolean; reason?: string }

export async function startMockFacilitator(opts: { failSettle?: boolean } = {}) {
  const calls: MockCall[] = [];
  const state = { failSettle: opts.failSettle ?? false };
  const app = new Hono();

  app.get("/supported", (c) => {
    calls.push({ endpoint: "supported", at: Date.now() });
    return c.json({
      kinds: [{ x402Version: 2, scheme: "exact", network: NETWORK }],
      extensions: [],
      signers: { "eip155:*": ["0x00000000000000000000000000000000000000FF"] },
    });
  });

  async function check(body: any): Promise<{ ok: boolean; reason?: string; payer?: string }> {
    const { paymentPayload: pp, paymentRequirements: req } = body;
    const auth = pp?.payload?.authorization;
    const sig = pp?.payload?.signature as Hex | undefined;
    if (!auth || !sig) return { ok: false, reason: "missing_authorization" };
    if (req.network !== NETWORK) return { ok: false, reason: "wrong_network" };
    if (auth.to.toLowerCase() !== String(req.payTo).toLowerCase()) return { ok: false, reason: "wrong_recipient" };
    if (BigInt(auth.value) < BigInt(req.amount)) return { ok: false, reason: "insufficient_value" };
    if (BigInt(auth.validBefore) < BigInt(Math.floor(Date.now() / 1000))) return { ok: false, reason: "expired" };
    const valid = await verifyTypedData({
      address: auth.from,
      domain: { name: req.extra?.name, version: req.extra?.version, chainId: 84532, verifyingContract: req.asset },
      types: {
        TransferWithAuthorization: [
          { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" },
        ],
      },
      primaryType: "TransferWithAuthorization",
      message: {
        from: auth.from, to: auth.to, value: BigInt(auth.value),
        validAfter: BigInt(auth.validAfter), validBefore: BigInt(auth.validBefore), nonce: auth.nonce,
      },
      signature: sig,
    }).catch(() => false);
    return valid ? { ok: true, payer: auth.from } : { ok: false, reason: "invalid_signature" };
  }

  app.post("/verify", async (c) => {
    const r = await check(await c.req.json());
    calls.push({ endpoint: "verify", at: Date.now(), ok: r.ok, reason: r.reason });
    return c.json(r.ok ? { isValid: true, payer: r.payer } : { isValid: false, invalidReason: r.reason });
  });

  app.post("/settle", async (c) => {
    const r = await check(await c.req.json());
    const ok = r.ok && !state.failSettle;
    calls.push({ endpoint: "settle", at: Date.now(), ok, reason: r.reason });
    return c.json(
      ok
        ? { success: true, transaction: "0x" + "ab".repeat(32), network: NETWORK, payer: r.payer }
        : { success: false, errorReason: r.reason ?? "settle_failed", transaction: "", network: NETWORK },
    );
  });

  const server = await new Promise<ReturnType<typeof serve>>((resolve) => {
    const s = serve({ fetch: app.fetch, port: 0 }, () => resolve(s));
  });
  const port = (server.address() as { port: number }).port;
  return {
    url: `http://127.0.0.1:${port}`,
    calls,
    state,
    paid: () => calls.filter((c) => c.endpoint !== "supported").map((c) => c.endpoint),
    reset: () => { calls.length = 0; },
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
