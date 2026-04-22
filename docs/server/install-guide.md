# Sharpee Multiuser Server — Install Guide

Stand up a fresh Sharpee multiuser server on a Linux host. This guide takes you from an empty machine with Docker installed to a working instance serving a room.

Referenced by ADR-153 Acceptance Criterion 9 (operator documentation).

---

## 1. Prerequisites

| Requirement | Minimum | Notes |
|---|---|---|
| Host OS | Ubuntu 24.04 LTS (or any Linux with Docker support) | Tested target; other distros should work but are not part of the acceptance gate. |
| Docker Engine | 24+ | Must include the `docker compose` plugin (v2). `docker-compose` (v1, hyphenated) is not supported. |
| Disk | ~500 MB free under `/var/lib/docker/volumes` for the DB volume, plus room for story files. | Story `.sharpee` files are typically a few hundred KB each. |
| Open port | 8080 (default) | Configurable. Operators are expected to front this with their own reverse proxy (nginx, Caddy) for TLS. |

Tools used during install:
- `git` (to clone the repo)
- `curl` (for the `/health` probe and smoke test)
- `jq` (only for the optional smoke test script)

Verify Docker is ready:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

If any of those fail, install Docker per the official docs (<https://docs.docker.com/engine/install/>) before continuing.

---

## 2. Get the Server

Clone the Sharpee repository. The compose file and Dockerfile build the server from source — there is no published image for v0.1.

```bash
git clone https://github.com/ChicagoDave/sharpee.git
cd sharpee/tools/server
```

All commands in this guide are run from `tools/server/` unless noted.

---

## 3. Configure the Server

Two operator-local files are required. Neither is tracked in git.

### 3.1 Create `sharpee-platform.yaml`

Copy the template and edit as needed:

```bash
cp sharpee-platform.yaml.example sharpee-platform.yaml
```

The defaults in the example work for local testing. Change at minimum:

- `captcha.provider` — set to `turnstile`, `hcaptcha`, or `friendly` for production. Leave as `none` **only** for private test instances behind your own auth.
- `captcha.site_key` and `captcha.secret_key` — required if a real provider is configured.

Full field reference: see [config-reference.md](./config-reference.md).

### 3.2 Provision the Stories Directory

Create the directory the compose file bind-mounts into the container:

```bash
mkdir -p stories
```

Drop one or more `.sharpee` story files into it. The server lists exactly these at `GET /api/stories`.

Where do `.sharpee` files come from? They are built by the Sharpee authoring toolchain (see the root `build.sh`, e.g. `./build.sh -s dungeo` produces `dist/stories/dungeo.sharpee`). For operators, a story author or release will provide the file directly. Any file with a `.sharpee` extension works; the filename (minus extension) becomes the story slug.

Verify:

```bash
ls stories/
# Expect at least one .sharpee file.
```

---

## 4. Start the Server

From `tools/server/`:

```bash
docker compose up -d --build
```

First run takes several minutes — the builder stage compiles the server, runs the full in-container test suite (the build fails if any test fails), and downloads the Deno runtime.

Check status:

```bash
docker compose ps
# Expect the 'server' service with STATUS = 'Up' and (healthy) once the healthcheck settles.
```

Follow logs:

```bash
docker compose logs -f server
```

---

## 5. Verify the Installation

### 5.1 Health Check

```bash
curl -fsS http://localhost:8080/health
# Expect: {"status":"ok"} or equivalent 200 response.
```

The Docker healthcheck has a 30s `start_period`, so immediately after `up` the container may be `(health: starting)` for up to 30 seconds. That is normal.

### 5.2 List Stories

```bash
curl -fsS http://localhost:8080/api/stories | jq
# Expect: {"stories":[{"slug":"<your-story>","title":"..."}]}
```

If the list is empty, your `stories/` directory is not mounted correctly or contains no `.sharpee` files. See [Troubleshooting](#7-troubleshooting).

### 5.3 Create a Room (Optional — Requires CAPTCHA)

With a real CAPTCHA provider configured, room creation is best verified from a browser (the client widget produces the token). For a command-line check, the server accepts a bypass when `CAPTCHA_BYPASS=1` is set in the container environment — intended for smoke tests and local dev only.

To test with bypass:

```bash
docker compose down
CAPTCHA_BYPASS=1 docker compose up -d
curl -fsS -H 'Content-Type: application/json' \
  -d '{"story_slug":"<your-slug>","display_name":"tester","captcha_token":"bypass"}' \
  http://localhost:8080/api/rooms | jq
# Expect: {"room_id":"...", "join_code":"XXXXXX", ...}
```

Remember to restart without `CAPTCHA_BYPASS` for any real deployment.

### 5.4 Full Smoke Test (Optional)

The repository ships an end-to-end smoke script that exercises health, room creation, and persistence across a compose restart. This is the same script used for ADR-153 AC8 verification.

```bash
CAPTCHA_BYPASS=1 ./scripts/smoke-test.sh
```

Expected final line: `[smoke] PASS: room <id> survived docker compose down/up`.

The script runs `docker compose down` on exit (success or failure), so it is safe to run repeatedly.

---

## 6. Next Steps

- **TLS termination**: Put a reverse proxy (nginx, Caddy, Traefik) in front of port 8080. Sharpee serves HTTP and WebSocket on a single port; forward both.
- **Real CAPTCHA**: Register with Turnstile, hCaptcha, or Friendly Captcha and configure site + secret keys in `sharpee-platform.yaml`. See [config-reference.md](./config-reference.md).
- **Backups**: Set up a nightly backup of the SQLite database. See [backup-restore.md](./backup-restore.md).
- **Upgrades**: See [upgrade-guide.md](./upgrade-guide.md) for the image-rebuild and migration flow.

---

## 7. Troubleshooting

### Container starts but `/health` never returns 200

Check logs: `docker compose logs server`. Common causes:

- Migration failure — the server refuses to start on a broken DB. Errors include the migration filename.
- YAML parse error in `sharpee-platform.yaml` — the server logs a line from the `yaml` parser naming the offending key.

### `POST /api/rooms` returns `story_load_failed`

The most common cause is a missing or misbuilt `.sharpee` file. Verify:

```bash
docker compose exec server ls /data/stories
```

If the directory is empty inside the container, the bind mount is wrong — check that `tools/server/stories/` contains the file and that you ran `docker compose up` from `tools/server/`.

If the file exists but loading fails, it was likely built against a different Sharpee platform version. Rebuild the story with the matching version.

### Port 8080 already in use

Either stop the conflicting process, or change the published port in `docker-compose.yml`:

```yaml
ports:
  - "9090:8080"   # host:container
```

The internal container port stays 8080 because other defaults (`CONFIG_FILE`, the healthcheck URL) depend on it. Only change the left side.

### `docker compose up` fails during build with a test failure

The Dockerfile runs the server's full test suite during the builder stage (`RUN npm test`) — this is intentional fail-fast behavior. If tests fail, the image build fails. Check the build output for the failing test name; this almost always indicates a bug in the committed code rather than an environment issue. Report it with the failing test name.

### `docker compose up` fails during build with a package version mismatch

The build copies `packages/core` from the repo root. Make sure you cloned the full repo (not just the `tools/server/` directory) and did not modify `packages/core` since cloning.

### The CAPTCHA widget shows but room creation still fails

- `captcha.provider` must match the widget you embed in your client.
- `captcha.secret_key` must match the provider account that issued the site key.
- Provider outages show up as 5xx on `/api/rooms` with a CAPTCHA-specific error in the server log.

### Data disappears after `docker compose down`

`docker compose down` preserves named volumes. `docker compose down -v` **deletes** them — including `db-data`. Never use `-v` against a production instance without taking a backup first. See [backup-restore.md](./backup-restore.md).

---

## Appendix: What Gets Created

After a successful first start:

| Location | Managed by | Persists across `down`/`up` |
|---|---|---|
| Docker named volume `tools_server_db-data` (or similar) → container `/data/db` | Docker | Yes (unless `down -v`) |
| `tools/server/stories/` bind-mounted read-only → `/data/stories` | Operator | Yes (is on the host) |
| `tools/server/sharpee-platform.yaml` bind-mounted read-only → `/etc/sharpee-platform.yaml` | Operator | Yes (is on the host) |

The named volume name is prefixed by the compose project name, which defaults to the containing directory name (`server`). Verify with `docker volume ls`.
