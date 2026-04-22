# Sharpee Multiuser Server — Configuration Reference

Every configurable field in `sharpee-platform.yaml` and the corresponding environment variable. The server loads config at startup and freezes it — changes require a restart.

Referenced by ADR-153 Decisions 14 and 15 (configuration and environment). Authoritative source: `tools/server/src/config.ts`.

---

## Precedence

Lowest to highest (later wins):

1. Built-in defaults (compiled into the server)
2. YAML file at `$CONFIG_FILE` — defaults to `/etc/sharpee-platform.yaml` inside the container
3. Environment variables

Set a YAML field to omit it and the default applies. Set an environment variable to override whatever the YAML (or default) says.

---

## Special Environment Variables

These control config loading itself rather than any application setting.

| Variable | Default | Purpose |
|---|---|---|
| `CONFIG_FILE` | `/etc/sharpee-platform.yaml` | Path the server reads YAML from. If the path does not exist, the server silently falls back to defaults + env. Set this if you bind-mount the YAML somewhere other than `/etc/`. |
| `NODE_ENV` | *(unset)* | Standard Node.js env marker. The reference Dockerfile sets `NODE_ENV=production`. Does not change Sharpee behavior directly; may be read by dependencies. |

---

## `server`

### `server.port` / `PORT`

- **Type**: integer
- **Default**: `8080`
- **Description**: Single port for HTTP and WebSocket traffic. The server multiplexes both on this port — operators front it with their own reverse proxy for TLS.

```yaml
server:
  port: 8080
```

```bash
PORT=8080
```

---

## `storage`

### `storage.db_path` / `DB_PATH`

- **Type**: string (filesystem path)
- **Default**: `./data/sharpee.db` (standalone); `/data/db/sharpee.db` (reference Dockerfile sets the env var)
- **Description**: SQLite database file. Created on first start if missing. WAL mode is enabled automatically — expect `<name>.db`, `<name>.db-wal`, and `<name>.db-shm` side-by-side at runtime. The parent directory must exist and be writable by the server process (uid `node` / 1000 in the reference image).

```yaml
storage:
  db_path: /data/db/sharpee.db
```

```bash
DB_PATH=/data/db/sharpee.db
```

### `storage.stories_dir` / `STORIES_DIR`

- **Type**: string (directory path)
- **Default**: `./data/stories` (standalone); `/data/stories` (reference Dockerfile)
- **Description**: Directory scanned at startup for `.sharpee` story files. The filename (without extension) becomes the story slug returned by `GET /api/stories`. The server does **not** accept story uploads over the API — operators place files here manually or via a deploy process. The directory is bind-mounted read-only in the reference compose file.

```yaml
storage:
  stories_dir: /data/stories
```

```bash
STORIES_DIR=/data/stories
```

---

## `rooms`

### `rooms.idle_recycle_days` / `ROOMS_IDLE_RECYCLE_DAYS`

- **Type**: integer (days)
- **Default**: `14`
- **Description**: Threshold for the idle-room sweeper. Rooms with no activity in this window are cascade-deleted (participants, session events, and saves go with them — see schema `ON DELETE CASCADE`). Pinned rooms are exempt — they are never recycled regardless of idle time. Set low (e.g. `1`) only for test environments; production defaults are a reasonable starting point.

```yaml
rooms:
  idle_recycle_days: 14
```

```bash
ROOMS_IDLE_RECYCLE_DAYS=14
```

---

## `captcha`

CAPTCHA is required for `POST /api/rooms` to prevent abuse. Pick one provider and configure both keys. Setting `provider: none` disables validation — intended **only** for private, authenticated test instances.

### `captcha.provider` / `CAPTCHA_PROVIDER`

- **Type**: enum — `turnstile` | `hcaptcha` | `friendly` | `none`
- **Default**: `none`
- **Description**: Which upstream CAPTCHA service to verify tokens against. `turnstile` = Cloudflare Turnstile. `hcaptcha` = hCaptcha. `friendly` = Friendly Captcha. `none` skips verification entirely. The client must embed the widget matching whichever provider you pick.

```yaml
captcha:
  provider: turnstile
```

```bash
CAPTCHA_PROVIDER=turnstile
```

### `captcha.site_key` / `CAPTCHA_SITE_KEY`

- **Type**: string
- **Default**: `""` (empty)
- **Description**: Public site key issued by the provider. Surfaced to the browser client so it can render the widget. Required whenever `provider` is anything other than `none`.

```yaml
captcha:
  site_key: "0x4AAAAAAABkMYinukE8nzYS"
```

```bash
CAPTCHA_SITE_KEY=0x4AAAAAAABkMYinukE8nzYS
```

### `captcha.secret_key` / `CAPTCHA_SECRET_KEY`

- **Type**: string (secret)
- **Default**: `""` (empty)
- **Description**: Server-side secret used to verify tokens with the provider. **Never commit to git.** Prefer the environment variable form (or a secrets manager that injects it at container start) over putting it in YAML.

```yaml
captcha:
  secret_key: "0x4AAAAAAA..."   # DO NOT COMMIT
```

```bash
CAPTCHA_SECRET_KEY=0x4AAAAAAA...
```

### `captcha.bypass` / `CAPTCHA_BYPASS`

- **Type**: boolean (YAML) / `"1"` to enable (env)
- **Default**: `false` / unset
- **Description**: When true, any token value is accepted for `/api/rooms`. Intended only for smoke tests and local dev. The reference `docker-compose.yml` threads `CAPTCHA_BYPASS` from the host env so `CAPTCHA_BYPASS=1 docker compose up` works for smoke testing. **Never set in production.**

```yaml
captcha:
  bypass: false
```

```bash
CAPTCHA_BYPASS=1   # Set only for tests.
```

---

## `sandbox`

Per-room Deno subprocess limits. Controls resource usage for every concurrent story sandbox.

> **Note**: These two fields are YAML-only at present — no environment variable overrides. Set them in `sharpee-platform.yaml`.

### `sandbox.memory_mb`

- **Type**: integer (MB)
- **Default**: `256`
- **Description**: V8 old-space size cap inside each sandbox (passed as `--v8-flags=--max-old-space-size=N` to Deno). Combined with OS-level rlimits (configured by the server). Raise for story content that manipulates large world models; lower for many concurrent rooms on a small host. Total host memory usage is roughly `memory_mb × (concurrent rooms)`.

```yaml
sandbox:
  memory_mb: 256
```

### `sandbox.turn_timeout_ms`

- **Type**: integer (milliseconds)
- **Default**: `5000`
- **Description**: Wall-clock budget for a single COMMAND → OUTPUT round-trip inside the sandbox. Exceeding it kills the Deno subprocess and surfaces a sandbox crash to connected clients (ADR-153 Decision 1 — sandbox isolation). Long, compute-heavy puzzles may need a higher value; raise cautiously because a stuck sandbox holds a slot until the timeout fires.

```yaml
sandbox:
  turn_timeout_ms: 5000
```

---

## `logging`

### `logging.level`

- **Type**: enum — `trace` | `debug` | `info` | `warn` | `error`
- **Default**: `info`
- **Description**: Minimum log level emitted by the server. `info` is the recommended production default. `debug` and `trace` are verbose; use temporarily for diagnosis. YAML-only (no env var).

```yaml
logging:
  level: info
```

---

## Complete Example

A production-shaped config with CAPTCHA enabled:

```yaml
server:
  port: 8080

storage:
  db_path: /data/db/sharpee.db
  stories_dir: /data/stories

rooms:
  idle_recycle_days: 14

captcha:
  provider: turnstile
  site_key: "0x4AAAAAAABkMYinukE8nzYS"
  secret_key: ""        # Provide via CAPTCHA_SECRET_KEY env, not YAML.
  bypass: false

sandbox:
  memory_mb: 256
  turn_timeout_ms: 5000

logging:
  level: info
```

Matching env overlay (injected at container runtime by your secrets manager):

```bash
CAPTCHA_SECRET_KEY=<the-real-secret>
```

---

## Field Index

| YAML path | Env var | Default |
|---|---|---|
| `server.port` | `PORT` | `8080` |
| `storage.db_path` | `DB_PATH` | `./data/sharpee.db` |
| `storage.stories_dir` | `STORIES_DIR` | `./data/stories` |
| `rooms.idle_recycle_days` | `ROOMS_IDLE_RECYCLE_DAYS` | `14` |
| `captcha.provider` | `CAPTCHA_PROVIDER` | `none` |
| `captcha.site_key` | `CAPTCHA_SITE_KEY` | `""` |
| `captcha.secret_key` | `CAPTCHA_SECRET_KEY` | `""` |
| `captcha.bypass` | `CAPTCHA_BYPASS` (`1` to enable) | `false` |
| `sandbox.memory_mb` | *(yaml only)* | `256` |
| `sandbox.turn_timeout_ms` | *(yaml only)* | `5000` |
| `logging.level` | *(yaml only)* | `info` |
| *(n/a — loader option)* | `CONFIG_FILE` | `/etc/sharpee-platform.yaml` |
