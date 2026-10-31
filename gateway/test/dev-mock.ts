/** Lokální běh bez sítě: mock facilitátor + gateway na 127.0.0.1. Jen pro vývoj a ruční ověření. */
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { loadCatalog } from "../src/catalog.js";
import { catalogPathFromEnv, loadConfig } from "../src/config.js";
import { Gateway } from "../src/gateway.js";
import { createHttpServer } from "../src/server.js";
import { createResourceServer, X402Gate } from "../src/x402.js";
import { NETWORK, startMockFacilitator } from "./helpers/mock-facilitator.js";

const fac = await startMockFacilitator();
const env = { ...process.env, X402_FACILITATOR_URL: fac.url, X402_NETWORK: NETWORK, PAY_TO_ADDRESS: process.env.PAY_TO_ADDRESS ?? privateKeyToAccount(generatePrivateKey()).address };
const catalog = loadCatalog(catalogPathFromEnv(env));
const config = loadConfig(env, catalog.limits);
const gate = new X402Gate(await createResourceServer(config.x402), config.x402);
await gate.start();
const gw = new Gateway({ config, catalog, payments: gate });
gw.startMaintenance();
createHttpServer(gw).listen(config.port, config.host, () => console.log(`dev-mock gateway on http://${config.host}:${config.port} (mock facilitator ${fac.url})`));
