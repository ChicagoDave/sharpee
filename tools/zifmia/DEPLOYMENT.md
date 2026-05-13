# Zifmia — Deployment Guide

Zifmia is the multi-user web product for Sharpee (ADR-177). It ships
as a **self-contained Docker container** so anyone can run their own
instance. This guide walks through building the image, configuring it,
and operating it.

> **Status (2026-05-13):** Phase 8 complete. The full HTTP + WS surface
> covered by [ADR-177] is implemented and validated by a real-path
> Playwright suite (31 specs, all green).

[ADR-177]: ../../docs/architecture/adrs/adr-177-multiuser-corrected.md

---

## Contents

1. [Prerequisites](#prerequisites)
2. [Quick start](#quick-start)
3. [Build the image](#build-the-image)
4. [Run with docker compose](#run-with-docker-compose)
5. [Run with docker run](#run-with-docker-run)
6. [Configuration](#configuration)
7. [Persistent state](#persistent-state)
8. [Operating the instance](#operating-the-instance)
9. [TLS + reverse proxy](#tls--reverse-proxy)
10. [Updates](#updates)
11. [Backup / restore](#backup--restore)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Docker 24+** and (for the compose path) **Docker Compose v2**.
- ~2 GB RAM available to the container for comfortable headroom; the
  steady-state process is small (single-digit MB) but the engine
  manifest cache and SQLite page cache grow with active rooms.
- A directory of `.sharpee` story bundles (or the included `dungeo`
  bundle, copied in by the Quick start path).
- Outbound HTTPS for the build only (pnpm pulls deps). The running
  container needs no internet.

---

## Quick start

```bash
# From the repo root:
cd tools/zifmia
docker compose up --build
```

The first build takes 3–8 minutes (npm registry + pnpm install +
TypeScript compile + vite bundle). Subsequent rebuilds reuse cached
layers.

When the healthcheck flips to `healthy`:

```bash
curl http://localhost:3000/api/stories
# → {"stories":[]}   (no bundles dropped in yet)
```

Open `http://localhost:3000/` in a browser to load the web client.

---

## Build the image

```bash
# From the repo root.
docker build -f tools/zifmia/Dockerfile -t sharpee/zifmia:latest .
```

The build context is the **repo root** because the Dockerfile reaches
into `packages/` to compile the workspace dependencies (`@sharpee/core`,
`@sharpee/engine`, `@sharpee/world-model`, etc.). The repo-root
`.dockerignore` keeps the context minimal — only `packages/` and
`tools/zifmia/` are shipped to the daemon.

To tag for a registry:

```bash
docker tag sharpee/zifmia:latest registry.example.com/sharpee/zifmia:1.0.0
docker push registry.example.com/sharpee/zifmia:1.0.0
```

---

## Run with docker compose

The bundled `docker-compose.yml` provisions named volumes for the
SQLite database and the stories directory, restarts on failure, and
configures a healthcheck.

```bash
cd tools/zifmia
cp .env.example .env       # optional — edit to tune
docker compose up -d
docker compose logs -f zifmia
```

To drop a story bundle into the running instance:

```bash
docker cp my-game.sharpee zifmia:/stories/my-game.sharpee
docker kill -s HUP zifmia  # SIGHUP triggers a rescan
curl http://localhost:3000/api/stories
# → {"stories":[{"slug":"my-game"}]}
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

For setups that don't use compose:

```bash
docker volume create zifmia-data
docker volume create zifmia-stories

docker run -d --name zifmia \
  -p 3000:3000 \
  -v zifmia-data:/data \
  -v zifmia-stories:/stories \
  --restart unless-stopped \
  sharpee/zifmia:latest
```

Bind-mount a host directory of stories instead of using a named volume:

```bash
docker run -d --name zifmia \
  -p 3000:3000 \
  -v zifmia-data:/data \
  -v /srv/sharpee/stories:/stories:ro \
  sharpee/zifmia:latest
```

The `:ro` flag is safe — Zifmia never writes to the stories directory
at runtime; operators manage it externally.

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

Returns `200 OK` with `{"stories":[...]}` when ready. The container's
built-in `HEALTHCHECK` hits the same endpoint every 30 s.

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

To pull a new Zifmia version:

```bash
cd tools/zifmia
git pull
docker compose build --pull
docker compose up -d
```

The named volumes `zifmia-data` and `zifmia-stories` persist across
restarts. **There is no schema migration step** — per project policy
(no backwards compatibility on infra owned by the server admin),
schema changes are one-shot cutovers, and the DB layer creates any
missing tables on boot. If a release explicitly breaks schema, the
release notes will say so.

Rolling back is symmetric: `git checkout <prev-sha>`, rebuild, restart.

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
