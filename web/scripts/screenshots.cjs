// Builds nothing; screenshots the existing dist/ served locally. Needs Playwright with Chromium.
const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const PORT = 4179;
const OUT = path.join(__dirname, "..", "screenshots");
const PAGES = [["home", "/"], ["needs", "/needs/"], ["need-loop", "/needs/stuck-in-a-loop/"], ["need-planned", "/needs/meet-agents/"], ["tools", "/tools/"], ["pricing", "/pricing/"], ["honesty", "/honesty/"], ["for-agents", "/for-agents/"], ["share", "/share/"], ["status", "/status/"]];
const VIEWS = [["desktop", { width: 1366, height: 900 }], ["mobile", { width: 390, height: 844 }]];

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const srv = spawn("node", [path.join(__dirname, "serve.mjs"), path.join(__dirname, "..", "dist"), String(PORT)], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 800));
  const browser = await chromium.launch();
  const problems = [];
  for (const scheme of ["light", "dark"]) {
    for (const [vname, viewport] of VIEWS) {
      const ctx = await browser.newContext({ viewport, colorScheme: scheme, reducedMotion: "reduce", deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      for (const [name, url] of PAGES) {
        await page.goto(`http://localhost:${PORT}${url}`);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (over > 0) problems.push(`${scheme} ${vname} ${url}: horizontal overflow ${over}px`);
        await page.screenshot({ path: path.join(OUT, `${name}-${vname}-${scheme}.png`), fullPage: true });
      }
      await ctx.close();
    }
  }
  await browser.close();
  srv.kill();
  console.log(problems.length ? problems.join("\n") : "no horizontal overflow");
})();
