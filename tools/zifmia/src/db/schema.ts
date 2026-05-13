/**
 * Zifmia v1 schema — greenfield per ADR-177 §6.
 *
 * Public interface: {@link SCHEMA_V1_DDL} (string), {@link applySchemaV1} (executes against a db handle).
 * Owner: zifmia server, single-process. SQLite is the authoritative state store.
 *
 * No data migration is owed from `tools/shite/` or prior `tools/server/`
 * — both lived in separate SQLite files and the corrected build starts
 * from a fresh DB per ADR-177 greenfield policy.
 *
 * Tables added per phase (this file grows; no ALTER migrations in v1):
 *   Phase 1 — identities ✓
 *   Phase 2 — rooms, participants ✓ (mute/connected/is_successor columns
 *             reserved for Phase 3/4/6 — the columns exist now to keep
 *             the schema stable; only the routes that use them ship later)
 *   Phase 5a — session_events, saves ✓ (saves table is forward-compat;
 *             routes ship in 5b with the engine integration)
 *   Phase 6 — config
 *
 * Each phase appends to this DDL. There are no ALTER migrations in v1
 * (no live deployments to migrate); subsequent schema versions follow
 * the project's no-backcompat policy.
 */

import type { Database as BetterSqliteDatabase } from 'better-sqlite3';

/**
 * The full v1 schema DDL. Executed once on fresh-boot.
 *
 * Conventions:
 *   - All IDs are `TEXT` (UUID v4 via `crypto.randomUUID()`).
 *   - Timestamps are `INTEGER` (ms since epoch).
 *   - `is_admin` is `INTEGER` (0/1) — SQLite has no bool.
 *   - Handle uniqueness is case-insensitive via `COLLATE NOCASE`;
 *     display case is preserved in the stored value.
 */
export const SCHEMA_V1_DDL = `
CREATE TABLE IF NOT EXISTS identities (
  id          TEXT PRIMARY KEY NOT NULL,
  handle      TEXT NOT NULL COLLATE NOCASE,
  is_admin    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_identities_handle_nocase
  ON identities(handle COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS rooms (
  id                TEXT PRIMARY KEY NOT NULL,
  join_code         TEXT NOT NULL,
  title             TEXT NOT NULL,
  story_slug        TEXT NOT NULL,
  pinned            INTEGER NOT NULL DEFAULT 0,
  last_activity_at  INTEGER NOT NULL,
  created_at        INTEGER NOT NULL,
  primary_host_id   TEXT NOT NULL,
  deleted_at        INTEGER,
  FOREIGN KEY (primary_host_id) REFERENCES identities(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_join_code ON rooms(join_code);
CREATE INDEX IF NOT EXISTS idx_rooms_lobby
  ON rooms(deleted_at, pinned DESC, last_activity_at DESC);

CREATE TABLE IF NOT EXISTS participants (
  id             TEXT PRIMARY KEY NOT NULL,
  room_id        TEXT NOT NULL,
  identity_id    TEXT NOT NULL,
  tier           TEXT NOT NULL,
  muted          INTEGER NOT NULL DEFAULT 0,
  connected      INTEGER NOT NULL DEFAULT 0,
  is_successor   INTEGER NOT NULL DEFAULT 0,
  joined_at      INTEGER NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (identity_id) REFERENCES identities(id) ON DELETE CASCADE,
  CHECK (tier IN ('primary_host', 'co_host', 'command_entrant', 'participant'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_room_identity
  ON participants(room_id, identity_id);
CREATE INDEX IF NOT EXISTS idx_participants_room ON participants(room_id);

CREATE TABLE IF NOT EXISTS session_events (
  event_id        TEXT PRIMARY KEY NOT NULL,
  room_id         TEXT NOT NULL,
  participant_id  TEXT,
  ts              INTEGER NOT NULL,
  kind            TEXT NOT NULL,
  payload         TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE SET NULL,
  CHECK (kind IN (
    'chat', 'dm', 'command', 'output',
    'role_change', 'mute_state',
    'pin', 'unpin',
    'save_created', 'restored',
    'nominated_successor',
    'join', 'disconnect',
    'lifecycle', 'recording_notice'
  ))
);

CREATE INDEX IF NOT EXISTS idx_session_events_room_ts
  ON session_events(room_id, ts);
CREATE INDEX IF NOT EXISTS idx_session_events_room_kind_ts
  ON session_events(room_id, kind, ts);

CREATE TABLE IF NOT EXISTS saves (
  save_id     TEXT PRIMARY KEY NOT NULL,
  room_id     TEXT NOT NULL,
  actor_id    TEXT NOT NULL,
  name        TEXT NOT NULL,
  blob        BLOB NOT NULL,
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES identities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_saves_room_created
  ON saves(room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS room_state (
  room_id     TEXT PRIMARY KEY NOT NULL,
  blob        BLOB NOT NULL,
  updated_at  INTEGER NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS config (
  key    TEXT PRIMARY KEY NOT NULL,
  value  TEXT NOT NULL
);
`;

/**
 * Apply the v1 schema to a connected better-sqlite3 database. Idempotent.
 *
 * @param db An open better-sqlite3 database handle.
 */
export function applySchemaV1(db: BetterSqliteDatabase): void {
  db.exec(SCHEMA_V1_DDL);
}
