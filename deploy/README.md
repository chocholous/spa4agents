# Nasazení SPA4Agents (Hetzner Cloud, Docker Compose)

Balíček: gateway (Node 22, neběží jako root, read-only rootfs, bez datových svazků) + Caddy
(reverse proxy a statický web z `web/dist`). Žádné ceny serverů zde neuvádíme; vyberte
nejmenší dostupný typ a ověřte si ceník u Hetzneru.

Obsah: `Dockerfile`, `docker-compose.yml`, `caddy/Caddyfile.ip`, `caddy/Caddyfile.domain`, `.env.example`.

## Dva režimy (jediný přepínač `SITE_MODE` v `.env`)

| `SITE_MODE` | Caddyfile | Chování |
|---|---|---|
| `ip` (výchozí) | `Caddyfile.ip` | HTTP na portu 80 podle IP serveru. **Jen pro testy na testnetu.** MCP klienti a x402 mohou vyžadovat HTTPS, takže ostrý provoz takto nefunguje. |
| `domain` | `Caddyfile.domain` | Automatické TLS pro `SITE_ADDRESS` (výchozí `spagents.com`); `relaxingagents.com`, `www.relaxingagents.com` a `www.spagents.com` se přesměrují 301 na `spagents.com`. |

## 1. Příprava lokálně

```bash
cd web && npm install && npm run build   # vytvoří web/dist (Caddy ho mountuje read-only)
```

Katalog `catalog/catalog.yaml` se mountuje read-only do gateway (není v image).

## 2. Server na Hetzner Cloud

1. V Hetzner Cloud Console vytvořte projekt a server: image Ubuntu LTS, typ podle ceníku
   (stačí malý), lokalitu dle preference.
2. SSH klíč: lokálně `ssh-keygen -t ed25519`, veřejnou část (`~/.ssh/id_ed25519.pub`) nahrajte
   v Console (Security, SSH keys) a vyberte ji při vytváření serveru. Heslové přihlášení nepoužívejte.
3. Firewall (Console, Firewalls): příchozí jen TCP 22, TCP 80, TCP 443 (a UDP 443 pro HTTP/3,
   volitelně). Přiřaďte ho k serveru.
4. Přihlaste se: `ssh root@<IP>` (nebo vytvořte běžného uživatele se sudo).
5. Docker (oficiální návod: https://docs.docker.com/engine/install/ubuntu/ , ověřte aktuální postup):
   po instalaci `docker compose version` musí fungovat.

## 3. Nahrání kódu

Z lokálního počítače (kořen repa), např.:

```bash
rsync -azR --exclude node_modules --exclude '.env*' \
  deploy gateway/ catalog/catalog.yaml web/dist <uživatel>@<IP>:/opt/spa4agents/
```

Zachovejte strukturu `deploy/`, `gateway/`, `catalog/catalog.yaml`, `web/dist/` vedle sebe
(compose odkazuje na `../catalog`, `../web/dist`). Případně `git clone` repa na serveru a
`web/dist` nahrát zvlášť.

## 4. Konfigurace a start

```bash
cd /opt/spa4agents/deploy
cp .env.example .env
chmod 600 .env
nano .env        # SITE_MODE=ip, BASE_URL=http://<IP>, PAY_TO_ADDRESS=... (viz ../scripts/README.md)
docker compose up -d --build
docker compose ps
```

Klíče CDP a podobné tajné hodnoty patří jen do `.env` na serveru, nikdy do gitu.
Soukromý klíč testovací peněženky (`AGENT_PRIVATE_KEY`) na server nepatří.

## 5. Kontrola

```bash
curl -i http://<IP>/healthz          # 200 {"ok":true}
curl -I http://<IP>/                 # statický web
docker compose ps                    # oba kontejnery healthy
docker compose logs --tail=100 gateway
```

## 6. Přepnutí z IP na doménu (bez změny kódu)

1. U registrátora nastavte DNS A záznamy (a případně AAAA) pro `spagents.com`, `www.spagents.com`,
   `relaxingagents.com` a `www.relaxingagents.com` na IP serveru. Počkejte na propagaci.
2. V `deploy/.env`: `SITE_MODE=domain`, `SITE_ADDRESS=spagents.com`, `BASE_URL=https://spagents.com`.
3. `docker compose up -d` (Caddy se znovu vytvoří, získá certifikáty; porty 80/443 musí být otevřené).
4. `curl -I https://spagents.com/healthz` a `curl -I https://www.spagents.com/` (očekává 301 na spagents.com).

Certifikáty jsou ve svazku `caddy_data` (jediný perzistentní stav; nemažte ho, ať nenarazíte
na limity Let's Encrypt).

## 7. Aktualizace

```bash
# nahrajte nový kód (rsync/git pull), případně znovu build webu a nahrání web/dist
cd /opt/spa4agents/deploy
docker compose up -d --build
docker image prune -f
```

Změna jen `web/dist` nebo `catalog.yaml`: statický web se načte hned, gateway po
`docker compose restart gateway`.

## 8. Zdraví a diagnostika

- `docker compose ps` (stav a healthcheck), `docker compose logs -f gateway caddy`.
- Gateway: `GET /healthz`. Caddy healthcheck běží proti admin rozhraní uvnitř kontejneru.
- Restart: `docker compose restart`; zastavení: `docker compose down` (svazek s certifikáty zůstane).

## Poznámky

- Gateway dnes ještě nečte `BASE_URL`, `PAY_TO_ADDRESS`, `X402_*`, `CDP_*` (platby se
  teprve doplňují); proměnné jsou připravené a předávají se do kontejneru.
- Image obsahuje i vývojové závislosti (viem, tsx), protože platby mohou viem importovat za běhu.
