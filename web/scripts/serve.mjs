import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

const [dir = "dist", port = "4173"] = process.argv.slice(2);
const root = path.resolve(dir);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".md": "text/markdown; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".woff2": "font/woff2" };

createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try { if (statSync(file).isDirectory()) file = path.join(file, "index.html"); } catch {}
  try {
    res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
  } catch {
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" }).end(readFileSync(path.join(root, "404.html")));
  }
}).listen(Number(port), () => console.log(`http://localhost:${port}/`));
