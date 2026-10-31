import { x402ResourceServer } from "@x402/core/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { bazaarResourceServerExtension } from "@x402/extensions/bazaar";
import { NETWORK } from "./config.js";

/** Resource server shared by the MCP wrapper and the Hono REST middleware. */
export async function createResourceServer(facilitatorUrl: string): Promise<x402ResourceServer> {
  const server = new x402ResourceServer(new HTTPFacilitatorClient({ url: facilitatorUrl }));
  server.register(NETWORK, new ExactEvmScheme());
  server.registerExtension(bazaarResourceServerExtension);
  await server.initialize(); // fetches /supported from the facilitator
  return server;
}
