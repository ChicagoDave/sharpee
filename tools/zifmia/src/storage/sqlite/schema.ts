/**
 * @module @sharpee/zifmia/storage/sqlite/schema
 * @purpose SQL DDL for the SQLite adapter — every table in ADR-175 §3's
 *   state inventory. Loaded once on adapter startup; each statement is
 *   `IF NOT EXISTS`, so re-running on a populated DB is a no-op.
 * @owner Zifmia server (tools/zifmia/storage).
 *
 * The same logical schema is mirrored in the Postgres adapter (Phase 7);
 * keep this file as the canonical reference when authoring that one.
 */

export const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS identities (
  id            TEXT PRIMARY KEY,
  handle        TEXT NOT NULL UNIQUE,
  passcode_hash TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  id             TEXT PRIMARY KEY,
  story_id       TEXT NOT NULL,
  bundle_version TEXT NOT NULL,
  title          TEXT NOT NULL,
  public         INTEGER NOT NULL DEFAULT 0,
  created_by     TEXT NOT NULL,
  created_at     INTEGER NOT NULL,
  closed_at      INTEGER,
  FOREIGN KEY (created_by) REFERENCES identities(id)
);

CREATE INDEX IF NOT EXISTS idx_rooms_public_open
  ON rooms(public) WHERE closed_at IS NULL;

CREATE TABLE IF NOT EXISTS save_blobs (
  room_id        TEXT NOT NULL,
  turn           INTEGER NOT NULL,
  format_version INTEGER NOT NULL,
  bundle_version TEXT NOT NULL,
  payload        BLOB NOT NULL,
  created_at     INTEGER NOT NULL,
  PRIMARY KEY (room_id, turn),
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE INDEX IF NOT EXISTS idx_save_blobs_room_turn
  ON save_blobs(room_id, turn DESC);

CREATE TABLE IF NOT EXISTS named_saves (
  save_id     TEXT PRIMARY KEY,
  room_id     TEXT NOT NULL,
  at_turn     INTEGER NOT NULL,
  label       TEXT NOT NULL,
  created_by  TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (room_id, at_turn) REFERENCES save_blobs(room_id, turn),
  FOREIGN KEY (created_by) REFERENCES identities(id)
);

CREATE INDEX IF NOT EXISTS idx_named_saves_room_created
  ON named_saves(room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id          TEXT PRIMARY KEY,
  room_id     TEXT NOT NULL,
  from_id     TEXT NOT NULL,
  from_handle TEXT NOT NULL,
  text        TEXT NOT NULL,
  ts          INTEGER NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (from_id) REFERENCES identities(id)
);

CREATE INDEX IF NOT EXISTS idx_chat_room_ts ON chat_messages(room_id, ts);

CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  ts          INTEGER NOT NULL,
  actor_id    TEXT,
  action      TEXT NOT NULL,
  target_kind TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  detail      TEXT NOT NULL,
  FOREIGN KEY (actor_id) REFERENCES identities(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts DESC);

CREATE TABLE IF NOT EXISTS story_library (
  story_id     TEXT NOT NULL,
  version      TEXT NOT NULL,
  ifid         TEXT NOT NULL,
  title        TEXT NOT NULL,
  installed_by TEXT NOT NULL,
  installed_at INTEGER NOT NULL,
  active       INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (story_id, version),
  FOREIGN KEY (installed_by) REFERENCES identities(id)
);

CREATE INDEX IF NOT EXISTS idx_story_library_active
  ON story_library(active);

CREATE TABLE IF NOT EXISTS story_bundles (
  story_id TEXT NOT NULL,
  version  TEXT NOT NULL,
  bundle   BLOB NOT NULL,
  PRIMARY KEY (story_id, version),
  FOREIGN KEY (story_id, version) REFERENCES story_library(story_id, version)
);
`;
