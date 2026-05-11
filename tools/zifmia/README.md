# @sharpee/zifmia

Zifmia is the multi-user Sharpee web product (ADR-175). It ships as a single Docker image that runs the Sharpee engine in-process per ADR-164 and serves a v1 product surface scoped to "watching IF together" — admin-installed stories, room-scoped participants sharing a single PC.

## Deploy

```bash
docker compose up
```

After the container reaches `/health`, an admin uploads a `.sharpee` bundle via the admin UI (Phase 5) and the bundle becomes joinable in the lobby.

## Storage Adapters

- **SQLite (default)** — single-container deployments. The lease is an in-process async queue.
- **Postgres (optional)** — horizontally scaled deployments. The lease is a Postgres advisory lock. Selected via the `ZIFMIA_DB_URL` environment variable.

## Status

Phase 1 — scaffolding, storage adapter foundation, and `/health` endpoint. The full implementation plan lives at `docs/work/zifmia/plan-20260511-adr-175.md`.

## Reference

- ADR-175 — Zifmia product surface and rebuild
- ADR-164 — Stateless multi-user server (engine invariants)
- ADR-163 — Channel-service platform (wire protocol)
- ADR-161 — Persistent identity model
- ADR-165 — Renderer architecture
