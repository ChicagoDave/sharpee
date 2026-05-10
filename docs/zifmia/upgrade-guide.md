# Sharpee Multiuser Server — Upgrade Guide

Upgrade a running Sharpee multiuser server to a newer version. Sharpee uses forward-only schema migrations, applied automatically on startup.

Referenced by ADR-153 AC9 (operator documentation).

---

## Upgrade Model

At this stage of the project (v0.1):

- There is **no published image** on Docker Hub or a registry. Operators upgrade by pulling a new git revision and rebuilding the image locally.
- Migrations are **forward-only**. The server has no `down` migrations — you cannot rollback a schema change by running the server on an older commit after migrations have applied.
- The migration runner is **automatic**. On every startup it scans `migrations/*.sql` in lexicographic order and applies any not yet recorded in `schema_migrations`. Each migration runs inside a transaction; a failure rolls back that one migration and aborts startup.

The authoritative implementation: `tools/server/src/db/migrate.ts`.

---

## Before You Upgrade

1. **Take a backup.** The simplest safety net for a forward-only migration system is a clean DB snapshot you can restore to. See [backup-restore.md](./backup-restore.md).

   ```bash
   docker compose exec server sqlite3 /data/db/sharpee.db \
     ".backup '/data/db/pre-upgrade.db'"
   docker compose cp server:/data/db/pre-upgrade.db ./backups/
   docker compose exec server rm /data/db/pre-upgrade.db
   ```

2. **Read the release notes.** Check the commit range you are pulling (`git log --oneline <current>..<target>`) for anything that lists `BREAKING` or `MIGRATION`. Migrations that change the meaning of existing data are called out there.

3. **Announce downtime.** The upgrade requires a brief restart. Existing WebSocket clients will be disconnected and must reconnect.

---

## Upgrade Procedure

### Step 1 — Update the Source

From `tools/server/`:

```bash
git fetch origin
git log --oneline HEAD..origin/main   # Review what you are about to pull.
git pull origin main
```

If you track a tag or branch other than `main`, adjust accordingly.

### Step 2 — Rebuild the Image

```bash
docker compose build
```

The builder stage runs the full server test suite (`RUN npm test` in the Dockerfile). If the build fails, the new image is **not** published to the local Docker image store, so your running container is unaffected. Investigate the failure, fix it, or roll the source back to the prior commit (see [If Something Goes Wrong](#if-something-goes-wrong)) before proceeding.

### Step 3 — Apply the New Image

```bash
docker compose up -d
```

`docker compose up -d` with a newer image on disk replaces the container in-place. The sequence:

1. New container starts with the new image.
2. Server opens the existing DB volume — same `sharpee.db`, migration history intact.
3. Migration runner applies any pending migrations inside a transaction.
4. If migrations succeed, the server enters the normal startup sequence; `/health` begins returning 200 once ready.
5. If migrations fail, the server exits non-zero. The container enters a restart loop (per `restart: unless-stopped`). Check logs.

### Step 4 — Verify

```bash
curl -fsS http://localhost:8080/health
docker compose logs server | tail -50
```

In the logs you should see:

- Migration lines (if any were applied) — e.g. `applied migration 0002_xxx.sql`.
- Normal startup output: server listening on port, stories loaded, etc.

Check that rooms and participants survived:

```bash
docker compose exec server sqlite3 /data/db/sharpee.db \
  "SELECT COUNT(*) FROM rooms; SELECT COUNT(*) FROM schema_migrations;"
```

Compare the migration count against before — it should be equal (no new migrations) or higher (some applied).

---

## If Something Goes Wrong

### The Build Failed

The image did not change; your old container is still running. Either:

- Fix the problem in the new source and rebuild, or
- Check out the prior commit (`git reset --hard <old-sha>`) and carry on until the next release.

### The New Container Fails to Start

Logs tell you which stage failed:

- **Migration failure** — look for `ERROR applying migration <filename>`. The transaction was rolled back so the DB is unchanged **for that migration**. Any earlier migrations in the same run did commit. This is rare but possible if two migrations depend on each other improperly. Restore from pre-upgrade backup (see [backup-restore.md](./backup-restore.md)) and file a bug.
- **Config failure** — the new version may have introduced a required field. Compare your `sharpee-platform.yaml` against the new `sharpee-platform.yaml.example` and [config-reference.md](./config-reference.md).
- **Story load failure** — a backwards-incompatible platform change may invalidate older `.sharpee` files. Rebuild stories against the matching Sharpee version.

To revert to the previous version while you investigate:

```bash
docker compose down

# Roll source back.
git reset --hard <previous-sha>
docker compose build
docker compose up -d
```

**Important**: if the failed startup **did** apply schema migrations before the crash, rolling the source back will not undo them. The old server will either (a) work fine because migrations are usually additive, or (b) fail because it does not understand a new schema element. If (b), restore from the pre-upgrade DB backup before starting the old version.

### Participants Were Actively Connected During the Upgrade

Connected WebSocket clients see the server drop and should auto-reconnect (they hold their tokens). Any in-flight turn execution may be lost — participants may need to re-issue a command. Chat messages persist in the DB and will be replayed on reconnect.

---

## Zero-Downtime Upgrades

Not supported. Sharpee runs a single server process bound to a single SQLite database. There is no primary/replica story for hot failover. Plan the upgrade for a low-traffic window.

---

## Upgrade Frequency

- **Patch releases** (bug fixes, no schema changes) — upgrade any time.
- **Minor releases** (new features, additive migrations) — upgrade at your convenience; read the release notes first.
- **Major releases** (breaking changes, behavior changes) — read the release notes carefully. Test in a staging environment before production.

---

## Rollback Policy

**There is no supported rollback.** Migrations are forward-only by design — this is ADR-153's chosen simplicity tradeoff.

Your rollback recipe is:

1. Stop the server.
2. Restore the pre-upgrade DB backup (see [backup-restore.md](./backup-restore.md)).
3. Check out the prior source commit and rebuild.
4. Start the older server.

Take the pre-upgrade backup every time. The one time you skip it is the time you need it.
