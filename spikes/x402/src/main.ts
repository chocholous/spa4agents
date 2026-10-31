import { serve } from "@hono/node-server";
import { loadServerConfig } from "./config.js";
import { createResourceServer } from "./x402.js";
import { createApp } from "./server.js";

const cfg = loadServerConfig();
const resourceServer = await createResourceServer(cfg.facilitatorUrl);
const { app } = await createApp({ resourceServer, payTo: cfg.payTo, priceUsd: cfg.priceUsd });
serve({ fetch: app.fetch, port: cfg.port }, (i) => console.log(`spike server on :${i.port}, facilitator ${cfg.facilitatorUrl}, network eip155:84532`));
