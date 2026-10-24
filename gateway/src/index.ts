import { loadCatalog } from "./catalog.js";
import { loadConfig } from "./config.js";
import { Gateway } from "./gateway.js";
import { createHttpServer } from "./server.js";

const config = loadConfig();
const gw = new Gateway({ config, catalog: loadCatalog(config.catalogPath) });
createHttpServer(gw).listen(config.port, config.host, () => {
  console.log(`gateway listening on http://${config.host}:${config.port} (catalog: ${config.catalogPath}, tools: ${gw.exposed.length})`);
});
