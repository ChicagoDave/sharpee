-- Sharpee Multiuser Server — initial schema.
--
-- Reference: ADR-153 Decisions 3, 4, 5, 10, 11, 12; ADR-161 Identity Model
-- `(Id, Handle, passcode)` (supersedes ADR-159).
--
-- Foreign keys are declared with ON DELETE CASCADE so that a single
-- `DELETE FROM rooms WHERE room_id = ?` fans out to participants,
-- session_events, and saves — satisfying atomicity requirement #1
-- (room delete cascade in one transaction; see ADR-153 Atomicity).
--
-- The `identities` table is a stable interface for admin tooling. Per
-- ADR-161 "Constrains Future Sessions": new columns may be added; the
-- existing `id`, `handle`, and `passcode_hash` columns must not be
-- renamed or have semantics shifted without updating admin tooling in
-- the same change. Erase is hard-delete (no `deleted_at` soft-delete);
-- a freed Handle is reclaimable by another user.
--
-- Booleans are SQLite INTEGER (0 | 1). Timestamps are ISO-8601 TEXT.
-- JSON payloads are stored as TEXT and parsed at the repository boundary.

CREATE TABLE identities (
    id              TEXT PRIMARY KEY,           -- Crockford base32, 8 chars formatted XXXX-XXXX (ADR-161)
    handle          TEXT NOT NULL,              -- preserved case; uniqueness enforced on LOWER(handle) below; 3–12 alpha
    passcode_hash   TEXT NOT NULL,              -- argon2id; never stores plaintext
    created_at      TEXT NOT NULL,
    last_seen_at    TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_identities_handle_lower ON identities(LOWER(handle));

CREATE TABLE rooms (
    room_id           TEXT PRIMARY KEY,
    join_code         TEXT UNIQUE NOT NULL,
    title             TEXT NOT NULL,
    story_slug        TEXT NOT NULL,
    pinned            INTEGER NOT NULL DEFAULT 0,
    last_activity_at  TEXT NOT NULL,
    created_at        TEXT NOT NULL,
    primary_host_id   TEXT    -- set once the first participant joins
);

CREATE TABLE participants (
    participant_id  TEXT PRIMARY KEY,
    room_id         TEXT NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    identity_id     TEXT NOT NULL REFERENCES identities(id),  -- column name keeps "identity_id"; the value is now Crockford-format
    token           TEXT UNIQUE NOT NULL,
    -- display_name dropped per ADR-161: Handle replaces it. The participant's
    -- display name is the joined identity's handle, looked up at read time.
    tier            TEXT NOT NULL DEFAULT 'participant',
    muted           INTEGER NOT NULL DEFAULT 0,
    connected       INTEGER NOT NULL DEFAULT 0,
    is_successor    INTEGER NOT NULL DEFAULT 0,
    joined_at       TEXT NOT NULL
);

CREATE INDEX idx_participants_room ON participants(room_id);
CREATE INDEX idx_participants_identity ON participants(identity_id);

CREATE TABLE session_events (
    event_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id         TEXT NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    participant_id  TEXT,            -- nullable for lifecycle/system events
    ts              TEXT NOT NULL,
    kind            TEXT NOT NULL,
    payload         TEXT NOT NULL    -- JSON-encoded EventPayload
);

CREATE INDEX idx_session_events_room_ts ON session_events(room_id, ts);
CREATE INDEX idx_session_events_room_kind ON session_events(room_id, kind);

CREATE TABLE saves (
    save_id     TEXT PRIMARY KEY,
    room_id     TEXT NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    actor_id    TEXT NOT NULL,
    name        TEXT NOT NULL,
    blob        BLOB NOT NULL,
    created_at  TEXT NOT NULL
);

CREATE INDEX idx_saves_room ON saves(room_id);

CREATE TABLE config (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
);
