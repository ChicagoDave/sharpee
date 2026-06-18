# Zifmia — Deployment Guide

Zifmia is the multi-user web product for Sharpee (ADR-177). It ships
as a **self-contained Docker container** so anyone can run their own
instance. This guide walks through building the image, configuring it,
and operating it.

> **Status (2026-05-14):** Phase 8 complete. The full HTTP + WS surface
> covered by [ADR-177] is implemented and validated by a real-path
> Playwright suite (33 specs, all green). The Story Runtime Baseline
> contract — which packages a `.sharpee` bundle may import — is
> defined in [ADR-178]; every image ships baseline v1. Per [ADR-179]
> the image is the release: production deployments **pull**
> `ghcr.io/chicagodave/zifmia:1.0.0` (or `:1.0`, `:1`, `:latest`)
> rather than building from source.

[ADR-177]: ../../docs/architecture/adrs/adr-177-multiuser-corrected.md
[ADR-178]: ../../docs/architecture/adrs/adr-178-story-runtime-baseline.md
[ADR-179]: ../../docs/architecture/adrs/adr-179-zifmia-published-image.md

---

## Contents

1. [Prerequisites](#prerequisites)
2. [Quick start](#quick-start)
3. [Run with docker compose](#run-with-docker-compose)
4. [Run with docker run](#run-with-docker-run)
5. [Build from source (contributors and forks)](#build-from-source-contributors-and-forks)
6. [Running on a Linux host (Ubuntu)](#running-on-a-linux-host-ubuntu)
7. [Configuration](#configuration)
8. [Persistent state](#persistent-state)
9. [Operating the instance](#operating-the-instance)
10. [TLS + reverse proxy](#tls--reverse-proxy)
11. [Updates](#updates)
12. [Backup / restore](#backup--restore)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Docker 24+** and (for the compose path) **Docker Compose v2**.
- ~2 GB RAM available to the container for comfortable headroom; the
  steady-state process is small (single-digit MB) but the engine
  manifest cache and SQLite page cache grow with active rooms.
- A directory of `.sharpee` story bundles. The image ships none — drop
  your own into the `/stories` volume. ([ADR-177] §7 forbids bundling
  stories in the image.)
- Outbound HTTPS for the initial `docker pull` (and for updates).
  The running container needs no internet.

---

## Quick start

Pull the published image and run it. No clone, no build, no
toolchain on the host.

```bash
docker pull ghcr.io/chicagodave/zifmia:1.0.0

docker volume create zifmia-data
docker volume create zifmia-stories

docker run -d --name zifmia \
    -p 3000:3000 \
    -v zifmia-data:/data \
    -v zifmia-stories:/stories \
    --restart unless-stopped \
    ghcr.io/chicagodave/zifmia:1.0.0
```

When the healthcheck flips to `healthy` (a few seconds), reach the API:

```bash
curl http://localhost:3000/api/stories
# → {"baseline_version":1,"stories":[]}   (no bundles dropped in yet)
```

The `baseline_version` field reports the Story Runtime Baseline
([ADR-178]) this image ships. Story authors target it; story bundles
importing packages outside the baseline are rejected at boot.

Open `http://localhost:3000/` in a browser to load the web client.
Drop a `.sharpee` bundle in to start playing:

```bash
docker cp my-game.sharpee zifmia:/stories/my-game.sharpee
docker kill -s HUP zifmia  # SIGHUP triggers a rescan
```

### Image tags

Per [ADR-179] every release publishes immutable plus floating tags:

| Tag                                          | Use                                                 |
| -------------------------------------------- | --------------------------------------------------- |
| `ghcr.io/chicagodave/zifmia:1.0.0`           | Immutable pin. **Recommended for production**.     |
| `ghcr.io/chicagodave/zifmia:1.0`             | Latest 1.0 patch.                                   |
| `ghcr.io/chicagodave/zifmia:1`               | Latest 1.x release.                                 |
| `ghcr.io/chicagodave/zifmia:latest`          | Highest published version overall. Discouraged.    |
| `ghcr.io/chicagodave/zifmia:edge`            | Latest `main` build. Not a release.                |

Floating tags (`:1.0`, `:1`, `:latest`) advance only when a newly
published version is the highest on that pin — a hotfix to an older
major never regresses `:latest`. See [ADR-179] §Invariants for the
precise rules.

### Image labels

Every image carries the Story Runtime Baseline version it ships
([ADR-178] §AC-3):

```bash
docker inspect ghcr.io/chicagodave/zifmia:1.0.0 \
    --format '{{ index .Config.Labels "org.sharpee.story-runtime-baseline" }}'
# → 1
```

Story authors compare this number against the `BASELINE_VERSION` they
built against to know an image is compatible with their bundle.

---

## Run with docker compose

For operators who prefer a compose file, drop the following next to
your `.env` (or copy [`docker-compose.yml`](./docker-compose.yml) from
the repo — it pins the published image). The named volumes carry your
DB and story bundles; the `restart: unless-stopped` policy and
healthcheck handle host reboots and crashes.

```yaml
services:
  zifmia:
    image: ghcr.io/chicagodave/zifmia:1.0.0
    container_name: zifmia
    ports:
      - "${ZIFMIA_PORT:-3000}:3000"
    volumes:
      - zifmia-data:/data
      - zifmia-stories:/stories
    restart: unless-stopped

volumes:
  zifmia-data:
  zifmia-stories:
```

Then:

```bash
docker compose up -d
docker compose logs -f zifmia
```

To drop a story bundle into the running instance:

```bash
docker cp my-game.sharpee zifmia:/stories/my-game.sharpee
docker kill -s HUP zifmia  # SIGHUP triggers a rescan
curl http://localhost:3000/api/stories
# → {"baseline_version":1,"stories":[{"slug":"my-game"}]}
```

Removing a bundle:

```bash
docker exec zifmia rm /stories/my-game.sharpee
docker kill -s HUP zifmia
```

> **Note:** the SIGHUP rescan also clears the in-memory channel-manifest
> cache, so a re-dropped bundle with the same slug picks up code
> changes on the next room boot.

To stop:

```bash
docker compose down       # stops the container, keeps volumes
docker compose down -v    # also deletes the named volumes (DESTRUCTIVE)
```

---

## Run with docker run

The Quick start above is the typical `docker run` invocation. To
bind-mount a host directory of stories instead of using a named
volume:

```bash
docker run -d --name zifmia \
  -p 3000:3000 \
  -v zifmia-data:/data \
  -v /srv/sharpee/stories:/stories:ro \
  --restart unless-stopped \
  ghcr.io/chicagodave/zifmia:1.0.0
```

The `:ro` flag is safe — Zifmia never writes to the stories directory
at runtime; operators manage it externally.

---

## Build from source (contributors and forks)

The repo build path is for contributors changing Zifmia or running a
fork; operators should `docker pull` the published image instead (see
[Quick start](#quick-start)).

```bash
# From the repo root.
docker build -f tools/zifmia/Dockerfile -t sharpee/zifmia:dev .
```

The build context is the **repo root** because the Dockerfile reaches
into `packages/` to compile the workspace dependencies (`@sharpee/core`,
`@sharpee/engine`, `@sharpee/world-model`, etc.). The repo-root
`.dockerignore` keeps the context minimal — only `packages/` and
`tools/zifmia/` are shipped to the daemon. The first build takes 3–8
minutes; subsequent rebuilds reuse cached layers.

To run a compose file that builds from source rather than pulling, use
the contributor variant ([`docker-compose.build.yml`](./docker-compose.build.yml)):

```bash
cd tools/zifmia
docker compose -f docker-compose.build.yml up --build
```

The `BASELINE_VERSION` label is sourced from
`@sharpee/story-runtime-baseline` at build time via
`--build-arg BASELINE_VERSION=<n>`; the compose files pass this
automatically, and the `Dockerfile` defaults to `1` if the arg is
omitted.

---

## Running on a Linux host (Ubuntu)

The Docker compose workflow above runs unchanged on Ubuntu. This
section covers the bits that *only* matter on a Linux host: bringing
Zifmia up at boot, firewalling, and bind-mount permissions.

### Bind-mount uid

The container runs as user `node` (uid 1000). If you bind-mount host
directories instead of named volumes (e.g. you keep stories under
`/srv/sharpee/stories` so they're easy to rsync), the paths must be
writable by uid 1000:

```bash
sudo install -d -o 1000 -g 1000 /srv/sharpee/data /srv/sharpee/stories
```

Then point the compose volumes at the host paths:

```yaml
volumes:
  - /srv/sharpee/data:/data
  - /srv/sharpee/stories:/stories
```

Named volumes (`zifmia-data`, `zifmia-stories`) skip this step
entirely — Docker creates them with the right ownership.

### systemd unit (start at boot)

The compose file's `restart: unless-stopped` handles container crashes,
but systemd is needed to bring the stack back up after a host reboot.
Create `/etc/systemd/system/zifmia.service`:

```ini
[Unit]
Description=Zifmia multi-user Sharpee server
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/srv/sharpee/repo/tools/zifmia
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now zifmia
sudo systemctl status zifmia
journalctl -u zifmia -f       # follow boot-time logs
```

`Type=oneshot` plus `RemainAfterExit=yes` is the right shape for a
`docker compose` orchestrator — the unit itself exits when compose
returns; the containers stay up.

### Firewall (ufw)

Close port 3000 to the outside world and let only the reverse proxy
talk to it. Assuming Apache/nginx terminates TLS on the same host:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Apache Full'      # 80 + 443
sudo ufw enable
sudo ufw status verbose
```

Port 3000 stays bound to `0.0.0.0` *inside* the container, but Docker
publishes it on the host's loopback when you use `-p 127.0.0.1:3000:3000`
(recommended on a Linux host with a local proxy). Update the compose
file's port stanza:

```yaml
ports:
  - "127.0.0.1:${ZIFMIA_PORT:-3000}:3000"
```

This makes the port unreachable from outside the host even with ufw
off, which is the right default when something else fronts it.

---

## Configuration

All knobs are environment variables. The container ships sensible
defaults; override only what you need.

| Variable                  | Default          | Description                                                                     |
| ------------------------- | ---------------- | ------------------------------------------------------------------------------- |
| `ZIFMIA_PORT`             | `3000`           | TCP listen port inside the container.                                           |
| `ZIFMIA_HOST`             | `0.0.0.0`        | Listen address. `0.0.0.0` exposes the port externally inside the container.    |
| `ZIFMIA_DB`               | `/data/zifmia.db`| SQLite file path. Must live on a writable volume for persistence.              |
| `ZIFMIA_STORIES`          | `/stories`       | Directory scanned for `*.sharpee` bundles at boot and on SIGHUP.               |
| `ZIFMIA_WEB_ROOT`         | image-internal   | Override the web bundle dir served at `/`. Usually leave unset.                |
| `ZIFMIA_RECORDING_NOTICE` | built-in default | Banner shown to all participants in every room (ADR-177 §AC-8).                |
| `ZIFMIA_GRACE_MS`         | `30000`          | PH-disconnect grace window before succession fires (ms). Lower → faster swaps. |

Set via compose `environment:` block, `-e` on `docker run`, or a `.env`
file alongside `docker-compose.yml`.

---

## Persistent state

Two volumes carry operator state. Everything else is ephemeral.

### `/data` — SQLite database

Holds:

- `identities` — claimed handles
- `rooms` — every room ever created, including soft-deleted rows
- `participants` — `(room_id, identity_id)` membership rows with tier
- `session_events` — append-only audit log: commands, chat, role
  changes, lifecycle events, DMs, mutes
- `saves` — named saves per room
- `room_state` — engine state blobs (compressed)
- `config` — operator key/value table (e.g., `recording_notice`)

The DB is created on first boot. There are no migrations to run —
schema is built fresh by `openDatabase`.

### `/stories` — Story bundles

Drop `.sharpee` files here. The scanner picks them up at boot and on
SIGHUP. Removing a file makes the slug disappear from
`GET /api/stories` (after SIGHUP). Active rooms continue to play until
their participants leave.

---

## Operating the instance

### Health probe

```bash
curl -f http://localhost:3000/api/stories
```

Returns `200 OK` with `{"baseline_version":1,"stories":[...]}` when
ready. The container's built-in `HEALTHCHECK` hits the same endpoint
every 30 s.

### Logs

```bash
docker logs -f zifmia
```

Fastify logs every HTTP request at info level. WS frames are not
logged by default; set the logger to debug at the source (or proxy
the metrics path) if you need wire-level visibility.

### Story management

Operators control which stories are available. There is no upload
endpoint on purpose (ADR-177 §7).

```bash
# Add a story
docker cp ./new-game.sharpee zifmia:/stories/new-game.sharpee
docker kill -s HUP zifmia

# Remove a story
docker exec zifmia rm /stories/old-game.sharpee
docker kill -s HUP zifmia
```

### Stop / restart

```bash
docker restart zifmia       # graceful: SIGTERM, then SIGKILL after 10 s
docker stop -t 30 zifmia    # extend the grace window
```

Active WS connections are closed when the server shuts down. The
client retries automatically; rooms hydrate from `/state` and resume.

---

## TLS + reverse proxy

The container speaks plain HTTP/1.1 on port 3000. **Always front it
with a reverse proxy that terminates TLS** when exposing publicly.
WebSocket upgrade headers must be passed through.

### Caddy (recommended for solo operators — auto-TLS)

```caddy
zifmia.example.com {
    reverse_proxy localhost:3000
}
```

Caddy forwards `Upgrade: websocket` automatically.

### Apache (httpd)

Apache needs `mod_proxy`, `mod_proxy_http`, and `mod_proxy_wstunnel`.
The WebSocket upgrade goes through a `RewriteRule [P]` because Apache
won't proxy an `Upgrade: websocket` request via `ProxyPass` alone.

```bash
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite ssl headers
```

`/etc/apache2/sites-available/zifmia.conf`:

```apache
<VirtualHost *:443>
    ServerName zifmia.example.com

    SSLEngine on
    SSLCertificateFile     /etc/letsencrypt/live/zifmia.example.com/fullchain.pem
    SSLCertificateKeyFile  /etc/letsencrypt/live/zifmia.example.com/privkey.pem

    ProxyPreserveHost On
    ProxyRequests Off

    # WebSocket upgrade. The RewriteRule [P] is required — ProxyPass
    # alone won't carry `Upgrade: websocket` through.
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule ^/(.*)$ ws://127.0.0.1:3000/$1 [P,L]

    # Plain HTTP (everything that isn't an upgrade).
    ProxyPass         /  http://127.0.0.1:3000/
    ProxyPassReverse  /  http://127.0.0.1:3000/

    RequestHeader set X-Forwarded-Proto "https"

    # Idle WS connections — lock heartbeats are 200 ms; this is a
    # comfortable upper bound that won't churn established sockets.
    ProxyTimeout 300
</VirtualHost>

<VirtualHost *:80>
    ServerName zifmia.example.com
    Redirect permanent / https://zifmia.example.com/
</VirtualHost>
```

```bash
sudo a2ensite zifmia
sudo apachectl configtest
sudo systemctl reload apache2
```

If you use certbot's Apache plugin, run `sudo certbot --apache -d
zifmia.example.com` first and let it generate the `:443` VirtualHost
skeleton, then merge the proxy + rewrite directives above into it.

### nginx

```nginx
server {
    listen 443 ssl http2;
    server_name zifmia.example.com;

    ssl_certificate     /etc/letsencrypt/live/zifmia.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zifmia.example.com/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # Lock heartbeats are 200 ms; long-poll style timeouts not needed.
        # Set a comfortable read timeout for idle WS connections.
        proxy_read_timeout 300s;
    }
}
```

### Traefik

If running in the same Docker network, add labels to the compose
service:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.zifmia.rule=Host(`zifmia.example.com`)"
  - "traefik.http.routers.zifmia.entrypoints=websecure"
  - "traefik.http.routers.zifmia.tls.certresolver=letsencrypt"
  - "traefik.http.services.zifmia.loadbalancer.server.port=3000"
```

---

## Updates

To pull a new Zifmia version, bump the tag in your compose file (or
`docker run` invocation) and recreate the container:

```bash
# If you pinned a specific version, change 1.0.0 → 1.0.1 in compose.yml first.
docker compose pull
docker compose up -d
```

With `docker run`:

```bash
docker pull ghcr.io/chicagodave/zifmia:1.0.1
docker stop zifmia && docker rm zifmia
docker run -d --name zifmia \
    -p 3000:3000 \
    -v zifmia-data:/data \
    -v zifmia-stories:/stories \
    --restart unless-stopped \
    ghcr.io/chicagodave/zifmia:1.0.1
```

The named volumes `zifmia-data` and `zifmia-stories` persist across
restarts. **There is no schema migration step** — per project policy
(no backwards compatibility on infra owned by the server admin),
schema changes are one-shot cutovers, and the DB layer creates any
missing tables on boot. If a release explicitly breaks schema, the
release notes will say so.

Rolling back is symmetric: pull the previous tag, recreate the
container. Pin to immutable `<X.Y.Z>` tags in production so rollback
is just a tag change; floating tags (`:1.0`, `:1`, `:latest`) move
forward only.

---

## Backup / restore

The whole instance state lives in two places.

### Backup

```bash
# Snapshot the DB. SQLite is safe to read while writes are happening
# under WAL mode; use `.backup` for a consistent dump.
docker exec zifmia sqlite3 /data/zifmia.db ".backup /data/zifmia.backup.db"
docker cp zifmia:/data/zifmia.backup.db ./zifmia-$(date +%F).db
docker exec zifmia rm /data/zifmia.backup.db

# Stories are operator-owned. Copy whatever you maintain externally.
docker cp zifmia:/stories ./zifmia-stories-$(date +%F)
```

For automated backups, mount a host directory at `/backups` and run
the same `.backup` command on a cron schedule.

### Restore

```bash
docker compose stop zifmia
docker run --rm -v zifmia-data:/data -v "$PWD":/host alpine \
    cp /host/zifmia-2026-05-13.db /data/zifmia.db
docker compose start zifmia
```

---

## Troubleshooting

### `curl /api/stories` returns 404 or connection refused

The container hasn't finished booting. Check:

```bash
docker compose ps         # STATUS column should read "healthy" within ~20 s
docker compose logs zifmia
```

If the healthcheck never goes green, look for a startup error in the
logs — usually a missing volume or a stale DB on disk.

### Stories don't appear after dropping a file

You forgot the SIGHUP. The scanner is filesystem-eager only on boot
and on signal.

```bash
docker kill -s HUP zifmia
```

If the file is in the volume but the slug still doesn't appear, check
the extension is exactly `.sharpee` (lowercase) and the file is
non-empty:

```bash
docker exec zifmia ls -la /stories
```

### Story is on disk but excluded from `/api/stories`

Every bundle is health-checked at boot ([ADR-178] §AC-6). If the
bundle imports a package outside the Story Runtime Baseline, Zifmia
logs the offender on stderr and silently excludes the story from the
public listing:

```bash
docker logs zifmia 2>&1 | grep 'failed health check'
# → [zifmia] story 'my-game' failed health check — missing package: @some/plugin; excluded from GET /api/stories
```

Fixes, in order of likelihood:

1. **Rebuild the bundle against the current baseline.** The `.sharpee`
   story-bundle builder (with its `validate-bundle-baseline.js` pre-flight) is
   being re-homed into devkit (ADR-180 deferred it); until `devkit bundle:story`
   lands, rebuild from a checkout that still has the legacy bundle builder.
2. **Bundle is built against a newer baseline than the image.**
   Compare `docker inspect … --format '{{ index .Config.Labels
   "org.sharpee.story-runtime-baseline" }}'` with the `BASELINE_VERSION`
   the bundle expects. Either pull a newer image or rebuild the bundle
   for the older baseline.
3. **Story really does need a non-baseline package.** That's an
   ADR-178 amendment proposal — see the ADR.

### WebSocket connection fails behind a proxy

The proxy isn't passing the `Upgrade`/`Connection` headers. See the
[nginx config](#nginx) for the canonical incantation. Caddy and
Traefik handle this automatically.

### Database file growth

`session_events` is append-only. Long-running instances will see the
SQLite file grow with chat + commands. Vacuum is safe to run during
downtime:

```bash
docker compose stop zifmia
docker run --rm -v zifmia-data:/data alpine \
    sh -c 'apk add --no-cache sqlite && sqlite3 /data/zifmia.db "VACUUM;"'
docker compose start zifmia
```

### Container restarts in a loop

Usually a permission issue on the `/data` volume. The container runs
as `node` (uid 1000); if you bind-mount a host directory, make sure
the host path is writable by uid 1000:

```bash
sudo chown -R 1000:1000 /path/to/host/data
```

---

## Architecture pointers

- **Wire protocol:** ADR-177 §3. Three client→server WS frame types,
  nine server→client. HTTP is for everything else.
- **Tier model:** `primary_host` > `co_host` > `command_entrant` >
  `participant`. PH-only routes: `/pin`, `/rename`,
  `/nominate-successor`, `/promote`, `/delete`. PH+CoHost:
  `/demote`, `/mute`, `/dm`, `/force-release`.
- **Locks:** 400 ms expiry, 200 ms heartbeat (ADR-177 §AC-10).
- **Recording notice:** persistent banner shown to every participant
  (ADR-177 §AC-8); operator-configurable via `ZIFMIA_RECORDING_NOTICE`.
- **No upload endpoint:** stories are operator-managed on disk by
  design (ADR-177 §7).
- **No save delete:** named saves persist as long as the room does
  (project memory: room owns save lifecycle).
