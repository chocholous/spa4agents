# scripts/

## make-testnet-wallet.mjs

Vygeneruje novou testovací peněženku pro **Base Sepolia** (testnet, bez reálné hodnoty).

Požadavky: Node 22 a balíček `viem`. Skript ho najde, pokud je dostupný z `scripts/`
(`cd scripts && npm i viem`); jako záložní cestu zkusí `spikes/x402/node_modules`,
kde viem už je.

```bash
node scripts/make-testnet-wallet.mjs
```

- Na výstup se vytiskne **jen veřejná adresa** a další kroky.
- Soukromý klíč se zapíše do `.env.wallet` v kořeni repa (oprávnění 600, v `.gitignore`)
  jako `AGENT_PRIVATE_KEY=...` (a `PAY_TO_ADDRESS=...` s veřejnou adresou).
- Pokud `.env.wallet` už existuje, skript skončí chybou a nic nepřepíše.

### Postup

1. Spusťte skript, zkopírujte vytištěnou adresu.
2. Na faucetu Circle pro Base Sepolia (USDC) si na adresu vyžádejte testovací USDC.
   **Aktuální URL faucetu je třeba ověřit** (hledejte "Circle faucet", síť Base Sepolia).
3. Nastavte `PAY_TO_ADDRESS` v `deploy/.env` na serveru.
4. Testovací agent potřebuje `AGENT_PRIVATE_KEY` v prostředí
   (`set -a; . ./.env.wallet; set +a`).

**Klíč nikdy nepatří do repa, do chatu ani do logů.** Pro mainnet použijte jinou, ručně
vytvořenou peněženku, ne tuto.
