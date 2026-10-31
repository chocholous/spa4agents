// Reads an SVG on stdin, writes a 1200x630 PNG to stdout. Needs a local Playwright with Chromium.
const { chromium } = require("playwright");
let svg = "";
process.stdin.on("data", (d) => (svg += d));
process.stdin.on("end", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(`<body style="margin:0">${svg}</body>`);
  process.stdout.write(await page.screenshot({ type: "png" }));
  await browser.close();
});
