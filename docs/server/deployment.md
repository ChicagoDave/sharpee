# Sharpee Multiuser Server — Public Deployment Guide

Expose a running Sharpee multiuser server on the public internet with TLS, a real CAPTCHA provider, and a proper reverse proxy.

This guide picks up where [install-guide.md](./install-guide.md) leaves off. Do not attempt public deployment until the basic install and smoke test (Section 5.4 of the install guide) pass.

Not part of ADR-153 AC9 — the AC9 scope is internal install verification. This document covers the next step: taking that working instance public.

---

## 1. Prerequisites

- A working Sharpee server, verified against `localhost:8080/health` per the install guide.
- A domain you control. Examples in this guide use `play.sharpee.net` — substitute your own.
- A public IP that reaches your host. Cloud VPS: already have one. Home server: needs router port forwarding (not covered here — varies by router).
- Shell access on the host.

**CAPTCHA providers** — pick one before you start, because the rest of the config depends on which:

| Provider | Signup | Cost | Notes |
|---|---|---|---|
| **Cloudflare Turnstile** | <https://www.cloudflare.com/application-services/products/turnstile/> | Free | Recommended default — lowest-friction setup and the least user-hostile widget. |
| **hCaptcha** | <https://www.hcaptcha.com/> | Free tier | Works; widget is more visible. |
| **Friendly Captcha** | <https://friendlycaptcha.com/> | Paid | Puzzle-based, no tracking. |

This guide uses Turnstile throughout. hCaptcha and Friendly follow the same YAML shape — just swap the `provider` value.

---

## 2. DNS

Add an `A` record pointing `play.sharpee.net` (or your chosen subdomain) at the host's public IP.

```
Type   Name   Value
A      play   203.0.113.42
```

Verify from somewhere other than the host:

```bash
dig +short play.sharpee.net
# Expect: your public IP.
```

DNS changes can take a few minutes to propagate. Do not proceed until `dig` returns the right answer.

---

## 3. Firewall

The host firewall should:
- Allow 80 and 443 from the world (Caddy needs 80 for the Let's Encrypt HTTP-01 challenge and 443 for user traffic).
- **Not** allow 8080 from the world. The Sharpee container is only reachable via the proxy.

### 3.1 Ubuntu `ufw` Setup

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Confirm `22`, `80`, and `443` are allowed and nothing else public-facing.

### 3.2 Docker Bypasses `ufw` — Important Gotcha

Docker publishes ports via `iptables` rules inserted into the `DOCKER-USER` chain, which **runs before `ufw`**. That means publishing `8080:8080` in `docker-compose.yml` exposes the port to the public internet regardless of what `ufw` says.

**Fix**: bind the container to loopback only. Edit `tools/server/docker-compose.yml`:

```yaml
services:
  server:
    ports:
      - "127.0.0.1:8080:8080"   # Loopback only — not reachable from outside the host.
```

Apply:

```bash
docker compose up -d
```

Verify from another machine:

```bash
curl -m 5 http://<your-public-ip>:8080/health
# Expect: timeout or connection refused. If it returns 200, the bind didn't take effect.
```

Verify locally on the host:

```bash
curl http://localhost:8080/health
# Expect: 200 OK. Caddy will reach it the same way.
```

---

## 4. Install Caddy

Caddy is the recommended reverse proxy: single config file, automatic Let's Encrypt certificates with automatic renewal, WebSocket upgrades work out of the box (Sharpee serves WS on the same port as HTTP).

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
```
```bash
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
```
```bash
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
```
```bash
sudo apt-get update && sudo apt-get install -y caddy
```

Verify:

```bash
caddy version
systemctl status caddy
```

The systemd unit starts Caddy automatically on boot.

---

## 5. Configure Caddy

Edit `/etc/caddy/Caddyfile`:

```caddy
play.sharpee.net {
    reverse_proxy localhost:8080
}
```

That's the whole file. Caddy infers:
- Listen on 443 with TLS.
- Redirect 80 → 443.
- Acquire a Let's Encrypt cert for `play.sharpee.net` and renew automatically.
- Proxy both HTTP and WebSocket traffic to `localhost:8080`.

Reload:

```bash
sudo systemctl reload caddy
```

Watch the log during the first reload — Caddy fetches the cert in real time:

```bash
sudo journalctl -u caddy -f
```

Look for `certificate obtained successfully`. If you see `challenge failed`, the most likely cause is DNS not yet pointing at this host, or port 80 not reachable from the Let's Encrypt servers.

### 5.1 Verify Without CAPTCHA

With `sharpee-platform.yaml` still set to `captcha.provider: none` (the default from install-guide.md):

```bash
curl -fsS https://play.sharpee.net/health
# Expect: 200 OK.
```

```bash
curl -fsS https://play.sharpee.net/api/stories | jq
# Expect: the stories list.
```

If both return correctly, the proxy path works end-to-end. Next we turn on CAPTCHA.

---

## 6. Register With Cloudflare Turnstile

1. Sign in at <https://dash.cloudflare.com/> and open **Turnstile** in the left sidebar (or visit the Turnstile landing page and click "Get started").
2. Add a site:
   - **Site name**: `Sharpee play.sharpee.net`
   - **Hostnames**: `play.sharpee.net`
   - **Widget mode**: Managed (recommended — Cloudflare decides when to show a challenge).
3. Copy the two keys:
   - **Site Key** — public; will be surfaced to the browser.
   - **Secret Key** — private; keep out of git.

For local testing, Cloudflare also offers [always-passes / always-fails dummy keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) — useful if you want to exercise the full flow without human interaction.

---

## 7. Configure Sharpee to Use Turnstile

Edit `tools/server/sharpee-platform.yaml`:

```yaml
captcha:
  provider: turnstile
  site_key: "0x4AAAAAAA..."     # Paste your Turnstile Site Key here.
  secret_key: ""                 # LEAVE EMPTY — provide via env (see below).
  bypass: false
```

Putting the secret in YAML is a committed mistake waiting to happen. Provide it to the container via environment instead. Edit `tools/server/docker-compose.yml`:

```yaml
services:
  server:
    environment:
      NODE_ENV: production
      CAPTCHA_BYPASS: "${CAPTCHA_BYPASS:-}"
      CAPTCHA_SECRET_KEY: "${CAPTCHA_SECRET_KEY:-}"
```

On the host, export the secret in the shell that runs `docker compose`:

```bash
export CAPTCHA_SECRET_KEY='0x4AAAAAAA...'
docker compose up -d
```

For long-term operation, put the export in a systemd unit, an `.env` file outside the repo (load with `set -a; source /etc/sharpee.env; set +a`), or a secrets manager — anywhere but the repo.

Verify:

```bash
docker compose exec server printenv CAPTCHA_SECRET_KEY | head -c 12 ; echo
# Expect: the first 12 chars of your secret. Blank = not set.
```

Restart took effect:

```bash
curl -fsS https://play.sharpee.net/health
```

---

## 8. Browser Smoke Test

Open `https://play.sharpee.net` in a browser. You should be able to:
1. See the landing / room-creation page.
2. Complete the Turnstile challenge (usually invisible in Managed mode).
3. Create a room.
4. Receive a join code.
5. Open the join URL (`https://play.sharpee.net/r/<code>`) in a second browser and see the game session.

Check the Caddy access log during this:

```bash
sudo journalctl -u caddy -f
```

You should see both `GET /` requests and WebSocket `GET /ws` requests with `101 Switching Protocols` responses. The `101` status is what confirms the WebSocket upgrade is flowing end-to-end.

---

## 9. Troubleshooting

### The cert never issues

Check `journalctl -u caddy`. Common causes:
- DNS not pointed at this host. Verify with `dig +short play.sharpee.net` from a remote machine.
- Port 80 not reachable from the public internet (firewall, router port-forward, cloud security group). Let's Encrypt's HTTP-01 challenge requires 80.
- Caddy tried too many times and is now rate-limited. Let's Encrypt has generous but real limits. Wait an hour.

### Cert issues but the site returns 502

Caddy is up and trusted but cannot reach `localhost:8080`. Verify the container is running (`docker compose ps`) and `curl http://localhost:8080/health` from the host works. If the port bind changed to `127.0.0.1:8080:8080`, Caddy (running on the host) still reaches it via loopback.

### Room creation fails with a CAPTCHA error

- `captcha.provider` in YAML must match the widget embedded in the client — if you switched providers, rebuild the client too.
- `CAPTCHA_SECRET_KEY` env var must be the matching secret for the site key. Turnstile shows "Invalid secret" if they don't match.
- Turnstile enforces the hostname list on the site. If you hit the server from `play.sharpee.net` but added only `sharpee.net` to the Turnstile site config, tokens will not verify. Add the exact hostname.

### WebSocket connection fails

- Caddy's default handles the `Upgrade: websocket` header automatically — the single-line `reverse_proxy` directive is enough. If you switched to nginx and see this, you forgot the `proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";` block.
- Corporate proxies between the browser and your server sometimes strip WebSocket upgrades. Test from a different network to isolate.

### Port 8080 is reachable from the public internet

The docker-compose `ports:` entry is still `8080:8080` (all interfaces). Change to `127.0.0.1:8080:8080` per Section 3.2 and re-up the container.

### Something else

- Caddy access + error log: `sudo journalctl -u caddy -f`
- Sharpee server log: `docker compose logs -f server`
- Network-level probe from the host: `curl -v http://localhost:8080/health`
- Network-level probe from outside: `curl -v https://play.sharpee.net/health`

---

## 10. Ongoing Operations

- **Caddy renews certs automatically** — nothing to schedule.
- **Backups** — now is when nightly DB backups actually matter; see [backup-restore.md](./backup-restore.md).
- **Upgrades** — `git pull && docker compose up -d --build` per [upgrade-guide.md](./upgrade-guide.md). Caddy and the DB volume are unaffected.
- **Monitoring** — at minimum, an uptime check against `https://play.sharpee.net/health` from an external service (UptimeRobot, BetterStack, etc.). A CAPTCHA outage at the provider side will surface as 5xx on `/api/rooms`; worth alerting on.

---

## Appendix: nginx Equivalent

If you prefer nginx, the minimal config for the same setup:

```nginx
server {
    listen 80;
    server_name play.sharpee.net;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name play.sharpee.net;

    # Managed by certbot; see https://certbot.eff.org/instructions
    ssl_certificate     /etc/letsencrypt/live/play.sharpee.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/play.sharpee.net/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket upgrade headers — required for the WS channel.
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
    }
}
```

TLS certs via certbot:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d play.sharpee.net
```

nginx gives more tuning knobs but is three times more config to maintain. If you have no existing nginx, pick Caddy.
