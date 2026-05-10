# Sharpee Multiuser Server — Backup & Restore

All persistent state lives in the SQLite database and the operator-managed stories directory. This runbook covers both.

Referenced by ADR-153 AC9 (operator documentation) and Decision 4 (SQLite WAL persistence).

---

## What To Back Up

| Artifact | Location (in container) | Location (on host, default compose) | Change rate |
|---|---|---|---|
| SQLite database | `/data/db/sharpee.db` (+ `-wal`, `-shm`) | Docker named volume `db-data` | High — every room action writes |
| Story files | `/data/stories/*.sharpee` | `tools/server/stories/` (bind mount) | Low — operator-managed |
| Config file | `/etc/sharpee-platform.yaml` | `tools/server/sharpee-platform.yaml` (bind mount) | Low — edited at deploy time |

The named volume name as rendered by `docker compose` is typically `server_db-data` (project-name prefix). Verify with `docker volume ls`.

**You do not need to back up**: the Docker image (rebuildable from the repo), `node_modules`, or the TypeScript source. Only runtime state.

---

## Database Backups (Primary Concern)

SQLite runs in **WAL mode** (enabled at startup — `journal_mode = WAL`, `foreign_keys = ON`, `synchronous = NORMAL`). This means writes land in `sharpee.db-wal` before being merged into `sharpee.db`. **Never copy `sharpee.db` alone** while the server is running — you will get an inconsistent snapshot missing any in-flight writes.

Three supported backup methods, in order of preference.

### Method 1: `sqlite3 .backup` (Hot Backup — Recommended)

This uses SQLite's online backup API. Safe to run against a live database; the server continues serving traffic during the copy.

From the host:

```bash
docker compose exec server sqlite3 /data/db/sharpee.db \
  ".backup '/data/db/backup-$(date +%Y%m%d-%H%M%S).db'"

# Copy the backup file out of the volume to the host.
docker compose cp server:/data/db/backup-*.db ./backups/

# Optionally compress and remove the in-container copy.
gzip ./backups/backup-*.db
docker compose exec server rm /data/db/backup-*.db
```

The output is a single consolidated `.db` file — no WAL sidecar needed. Restore is a single-file copy.

Why it's preferred: atomic, consistent, and does not block writers.

### Method 2: File Copy With All WAL Sidecars (When `sqlite3` Is Unavailable)

If the `sqlite3` CLI is not present in the container, copy all three files together while the database is quiesced. This is most cleanly done against a stopped server:

```bash
docker compose down

# Archive the volume's contents.
docker run --rm \
  -v server_db-data:/data/db \
  -v "$(pwd)/backups:/backup" \
  alpine tar czf "/backup/db-$(date +%Y%m%d-%H%M%S).tar.gz" -C / data/db

docker compose up -d
```

Adjust the volume name (`server_db-data`) to match `docker volume ls` output for your deployment.

Why it's less preferred: requires downtime.

### Method 3: Volume Snapshot (Hot, But Less Consistent)

Only use if Method 1 is not available and you cannot tolerate downtime. Use SQLite's `PRAGMA wal_checkpoint(TRUNCATE)` first to flush the WAL into the main DB, then `tar` the volume. Readers and writers may still interact with the DB during the tar, so this can produce an inconsistent archive. Prefer Method 1.

### Automating Nightly Backups

A minimal cron entry on the host running Docker:

```cron
# /etc/cron.d/sharpee-backup
15 3 * * * root cd /opt/sharpee/tools/server && \
  docker compose exec -T server sqlite3 /data/db/sharpee.db \
    ".backup '/data/db/nightly.db'" && \
  docker compose cp server:/data/db/nightly.db /var/backups/sharpee/nightly-$(date +\%Y\%m\%d).db && \
  docker compose exec -T server rm /data/db/nightly.db && \
  find /var/backups/sharpee -name 'nightly-*.db' -mtime +30 -delete
```

Adjust `/opt/sharpee`, `/var/backups/sharpee`, and the retention window (30 days above) to your policy.

Ship `/var/backups/sharpee/` off-host (rsync, S3 sync, Restic, Borg — operator's choice). A backup that lives only on the server it backed up is not a backup.

---

## Story File Backups

`tools/server/stories/` is a plain directory on the host. Back it up the same way you back up any other file tree:

- **Recommended**: track it in its own git repository. `.sharpee` files are binary-ish build artifacts but small; git handles them fine. Commit and push after every deploy.
- Or: include the directory in your general host backup (Restic, Borg, etc.).

There is no hot-vs-cold concern here — the server only reads from this directory at startup (stories are loaded once and held in memory).

---

## Config File Backups

`tools/server/sharpee-platform.yaml` is operator-local and not tracked in the Sharpee repo. Keep it in a private repo or secrets store — it may contain CAPTCHA secrets if you did not use env vars for them (see [config-reference.md](./config-reference.md#captchasecret_key--captcha_secret_key)).

---

## Restore Procedure

### Restoring the Database

1. Stop the server:

   ```bash
   docker compose down
   ```

   Do **not** use `down -v` — that would delete the named volume you are restoring into.

2. Drop the restored `.db` file into the volume. If you used Method 1 (single file):

   ```bash
   # Decompress if needed.
   gunzip ./backups/backup-YYYYMMDD-HHMMSS.db.gz

   docker run --rm \
     -v server_db-data:/data/db \
     -v "$(pwd)/backups:/backup:ro" \
     alpine sh -c "rm -f /data/db/sharpee.db* && \
                   cp /backup/backup-YYYYMMDD-HHMMSS.db /data/db/sharpee.db"
   ```

   The `rm -f /data/db/sharpee.db*` also clears stale `-wal` and `-shm` files. SQLite will recreate them on first open.

   If you used Method 2 (tarball), untar over the volume:

   ```bash
   docker run --rm \
     -v server_db-data:/data/db \
     -v "$(pwd)/backups:/backup:ro" \
     alpine sh -c "rm -f /data/db/* && \
                   tar xzf /backup/db-YYYYMMDD-HHMMSS.tar.gz -C /"
   ```

3. Start the server:

   ```bash
   docker compose up -d
   ```

4. Verify:

   ```bash
   curl -fsS http://localhost:8080/health
   docker compose logs server | tail -20
   ```

   Check that any previously-created room resolves:

   ```bash
   curl -fsS http://localhost:8080/r/<known-join-code>
   ```

### Restoring Story Files

Copy the `.sharpee` files back into `tools/server/stories/` on the host. The bind mount picks them up immediately, but the server only scans the directory at startup — restart the container for new files to become available:

```bash
docker compose restart server
```

### Restoring the Config File

Copy `sharpee-platform.yaml` back into `tools/server/`. Restart to apply:

```bash
docker compose restart server
```

---

## Verification After Restore

Minimum checks:

1. `GET /health` returns 200.
2. `GET /api/stories` returns the expected slugs (confirms stories mount is correct).
3. A previously-known join code resolves via `GET /r/<code>` to the expected `room_id` (confirms DB content is intact).
4. Participants and session events survived:

   ```bash
   docker compose exec server sqlite3 /data/db/sharpee.db \
     "SELECT COUNT(*) FROM rooms; SELECT COUNT(*) FROM participants; SELECT COUNT(*) FROM session_events;"
   ```

   Compare against counts from before the restore.

---

## Known Limitations

- **No point-in-time recovery.** Sharpee does not ship WAL archival. You restore to the exact instant of whichever backup you took. If you need finer granularity, take backups more often or add an out-of-band WAL archiver (not supported by Sharpee today).
- **No built-in backup schedule.** The server does not back itself up. Operators are expected to run the cron example above or an equivalent.
- **Session events grow unbounded.** `session_events` is append-only and not pruned by default. For high-traffic deployments you may want a retention policy; this is not yet configurable in Sharpee and is tracked as follow-on work.
