/** Base Sepolia only. This spike must never be pointed at mainnet. */
export const NETWORK = "eip155:84532" as const;
export const DEFAULT_FACILITATOR_URL = "https://x402.org/facilitator";
export const GUEST_PASS_HEADER = "x-spa-guest-pass";
export const TOOL_NAME = "spike.lookup";
export const REST_PATH = `/v1/${TOOL_NAME}`;

export interface ServerConfig {
  payTo: string;
  facilitatorUrl: string;
  priceUsd: string;
  port: number;
}

export function loadServerConfig(env = process.env): ServerConfig {
  const payTo = env.PAY_TO_ADDRESS;
  if (!payTo || !/^0x[0-9a-fA-F]{40}$/.test(payTo) || /^0x0{40}$/.test(payTo)) {
    throw new Error("PAY_TO_ADDRESS must be set to a real Base Sepolia receiving address (see .env.example)");
  }
  const facilitatorUrl = env.FACILITATOR_URL ?? DEFAULT_FACILITATOR_URL;
  return {
    payTo,
    facilitatorUrl,
    priceUsd: env.PRICE_USD ?? "$0.001",
    port: Number(env.PORT ?? 4022),
  };
}
