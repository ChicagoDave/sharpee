# Deploying the Sharpee website

The documentation site (`website/`) is a Next.js 16 app. In production it runs
via `next start` as a systemd service on port **3017**, reverse-proxied by
Apache — the same pattern as `devarch.ai`, `nomare`, and the other Next.js sites
on this server (`66.228.55.224`).

```
Internet ──▶ Apache :443 (sharpee.net) ──proxy──▶ localhost:3017 (next start / systemd)
```

## Files

| File                                | Installed to                                  | Purpose                          |
| ----------------------------------- | --------------------------------------------- | -------------------------------- |
| `deploy/sharpee-website.service`    | `/etc/systemd/system/`                        | runs `npm start` on port 3017    |
| `deploy/sharpee.net.conf`           | `/etc/apache2/sites-available/`               | HTTP vhost → localhost:3017      |
| `../deploy.sh`                      | (run in place)                                | pull + build + restart           |

## First-time setup

1. **Install the unit + vhost** (idempotent):

   ```bash
   ./website/deploy.sh --setup
   ```

   This copies the systemd unit and Apache vhost into place, enables both, and
   reloads Apache. It does **not** start the app or fetch a cert yet.

2. **Repoint DNS** (manual, at the registrar). `sharpee.net` and
   `www.sharpee.net` currently point at GitHub Pages
   (`185.199.108–111.153`). Change their **A records to `66.228.55.224`**.
   Wait for propagation (`dig +short sharpee.net` should return
   `66.228.55.224`).

3. **Build and start the app:**

   ```bash
   ./website/deploy.sh
   ```

4. **Get the TLS cert** (after DNS resolves here — Let's Encrypt HTTP-01
   validates against this server):

   ```bash
   sudo certbot --apache -d sharpee.net -d www.sharpee.net
   ```

   certbot writes `sharpee.net-le-ssl.conf` (port 443) and rewrites the port-80
   vhost to redirect to HTTPS.

   > **Gotcha (observed 2026-07-21):** certbot's `--apache` installer may
   > generate the 443 vhost with a static `DocumentRoot` instead of the
   > reverse proxy — in this case it pulled a stale path
   > (`/home/dave/repos/sharpee/website/dist`, the old repo) that doesn't
   > exist, so Apache served **403 Forbidden** on `https://sharpee.net`.
   > Fix by copying the canonical proxy vhost over certbot's version:
   >
   > ```bash
   > sudo cp website/deploy/sharpee.net-le-ssl.conf /etc/apache2/sites-available/
   > sudo apache2ctl configtest && sudo systemctl reload apache2
   > ```

## Routine deploys

After pushing website changes to `main`:

```bash
./website/deploy.sh          # git pull + npm ci + build + restart
./website/deploy.sh --no-pull  # build the current working tree instead
```

## Health checks

```bash
sudo systemctl status sharpee-website
sudo journalctl -u sharpee-website -n 50
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:3017/
```

## Retiring the GitHub Pages site

Once the apex serves from here, disable the GitHub Pages deployment for the
repo (or the Pages workflow) so the two don't fight over the domain. The
`demos.sharpee.net` and `play.sharpee.net` vhosts are unaffected — they already
live on this server and keep their own ports.
