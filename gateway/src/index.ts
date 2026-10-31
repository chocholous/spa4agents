import { loadCatalog } from "./catalog.js";
import { catalogPathFromEnv, loadConfig } from "./config.js";
import { Gateway } from "./gateway.js";
import { log, errName } from "./log.js";
import { createHttpServer } from "./server.js";
import { X402Gate, createResourceServer } from "./x402.js";

// Redakce: výchozí výpis Node by mohl obsahovat text výjimky (a v něm vstup); logujeme jen typ.
process.on("uncaughtException", (e) => {
  log({ event: "uncaught_exception", name: errName(e) });
  process.exit(1);
});
process.on("unhandledRejection", (e) => {
  log({ event: "unhandled_rejection", name: errName(e) });
});

const catalog = loadCatalog(catalogPathFromEnv());
const config = loadConfig(process.env, catalog.limits);

if (!config.x402.payTo || !/^0x[0-9a-fA-F]{40}$/.test(config.x402.payTo)) {
  log({ event: "config_error", code: "PAY_TO_ADDRESS_missing_or_invalid" });
  process.exit(1);
}

const rs = await createResourceServer(config.x402);
const gate = new X402Gate(rs, config.x402, (e) => log({ event: "facilitator_unreachable", name: errName(e) }));
void gate.start();

const gw = new Gateway({ config, catalog, payments: gate });
gw.startMaintenance();
createHttpServer(gw).listen(config.port, config.host, () => {
  log({ event: "listening", count: gw.exposed.length, name: `${config.host}:${config.port}` });
});
