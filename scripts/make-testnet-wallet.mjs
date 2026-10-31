#!/usr/bin/env node
// Vygeneruje NOVOU testovací peněženku pro Base Sepolia.
// Vytiskne jen veřejnou adresu. Soukromý klíč zapíše do .env.wallet (chmod 600)
// a nikdy ho nevytiskne ani nezaloguje. Existující .env.wallet nepřepíše.
// Závislost: viem (viz scripts/README.md).
import { existsSync, openSync, writeSync, closeSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(process.env.WALLET_FILE ?? resolve(here, "..", ".env.wallet"));

if (existsSync(target)) {
  console.error(`Soubor ${target} už existuje; nepřepisuji. Smažte ho ručně, pokud opravdu chcete novou peněženku.`);
  process.exit(1);
}

async function loadViem() {
  try {
    return await import("viem/accounts");
  } catch {
    // záloha: viem nainstalované ve spikes/x402
    const alt = resolve(here, "..", "spikes", "x402", "node_modules", "viem", "_esm", "accounts", "index.js");
    if (existsSync(alt)) return await import(pathToFileURL(alt).href);
    console.error("Chybí balíček viem. Spusťte v scripts/:  npm i viem");
    process.exit(1);
  }
}

const { generatePrivateKey, privateKeyToAccount } = await loadViem();
const key = generatePrivateKey();
const address = privateKeyToAccount(key).address;

// flag "wx" = selže, pokud soubor vznikl mezitím; mode 0600 od vzniku
const fd = openSync(target, "wx", 0o600);
try {
  writeSync(fd, `# Testovací peněženka Base Sepolia. NIKDY necommitovat ani nesdílet.\nAGENT_PRIVATE_KEY=${key}\nPAY_TO_ADDRESS=${address}\n`);
} finally {
  closeSync(fd);
}

console.log(`Veřejná adresa (Base Sepolia): ${address}

Soukromý klíč je v ${target} (oprávnění 600, v .gitignore). Nikam ho nekopírujte do repa.

Další kroky:
1. Na faucetu Circle pro Base Sepolia vyžádejte testovací USDC na tuto adresu
   (aktuální URL faucetu si ověřte, může se změnit).
2. Nastavte PAY_TO_ADDRESS=${address} v deploy/.env na serveru.
3. Pro testovacího agenta načtěte AGENT_PRIVATE_KEY do prostředí
   (např. 'set -a; . ./.env.wallet; set +a'), nikdy do repa.
`);
