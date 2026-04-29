# @sharpee/e2e — Playwright End-to-End Tests

End-to-end tests for the sharpee multi-user web client (`tools/server/client/`).

## Targets

| `PLAYWRIGHT_TARGET` | Base URL                              | Test subset           |
| ------------------- | ------------------------------------- | --------------------- |
| unset / `local`     | `http://localhost:8080`               | full suite            |
| `live`              | `https://sharpee.net/play/dungeo/`    | only `@smoke`-tagged  |

The `@smoke` subset is intentionally read-mostly — anything that creates a real
room or otherwise mutates production state must NOT carry the `@smoke` tag.

## Prerequisites

A running multi-user server. The default local target expects the docker
container `server-server-1` to be up and healthy:

```bash
cd tools/server
CAPTCHA_BYPASS=1 RATE_LIMIT_BYPASS=1 docker compose up -d --build
```

- `CAPTCHA_BYPASS=1` is required for tests that create rooms. Without it,
  `/api/rooms` POST calls return 403.
- `RATE_LIMIT_BYPASS=1` disables the per-IP `/api/identities` rate limiter
  (10 / minute). Without it, back-to-back e2e runs from a single IP trip
  429 responses on identity registration. Both env vars MUST be unset in
  production.

Then install Playwright + Chromium browser (one-time):

```bash
pnpm install
pnpm --filter @sharpee/e2e exec playwright install chromium
```

## Run

```bash
# Default — full suite against local container
pnpm --filter @sharpee/e2e test

# Smoke subset against the live URL
pnpm --filter @sharpee/e2e test:smoke
```

## Tags

- `@smoke` — safe against the live URL; read-mostly
- `@reconnect` — exercises WS reconnect via Playwright network emulation; local only
