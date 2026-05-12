/**
 * @module @sharpee/zifmia/storage/adapter
 * @purpose The `StorageAdapter` contract that every persistence backend
 *   (SQLite, Postgres) implements identically. Zifmia's request handlers,
 *   turn executor, admin routes, and compaction job depend on this
 *   interface — never on a concrete adapter.
 * @owner Zifmia server — authoritative-state boundary (ADR-175 invariant:
 *   the server holds all authoritative state through the adapter).
 *
 * Every method returns a `Promise` even though the SQLite adapter is
 * synchronous internally — the Postgres adapter is async, and callers
 * must not couple to one or the other.
 *
 * Method groupings:
 * - Identity ............ ADR-161 `{id, handle, passcode}` triple.
 * - Room ................ Room CRUD, soft-close for admin kill.
 * - Save blobs .......... Per-turn append-only stream (one row per turn).
 * - Named saves ......... Pointers into the save_blob stream.
 * - Chat ................ Per-room append log.
 * - Audit ............... Admin event log.
 * - Story library ....... Metadata + bundle blob storage.
 * - Lease ............... Per-room exclusive turn lock (ADR-164 single-
 *                         writer invariant).
 * - Lifecycle ........... Adapter open/close + self-description.
 */

import type {
  AdapterDescription,
  AuditEntry,
  ChatMessage,
  Identity,
  NamedSave,
  Room,
  SaveBlob,
  Session,
  StoryLibraryEntry
} from './types';

export interface RoomLease {
  /** Release the lease. Idempotent — calling twice is a no-op. */
  release(): Promise<void>;
}

export interface StorageAdapter {
  // ── Identity ──────────────────────────────────────────────────
  createIdentity(input: {
    handle: string;
    passcodeHash: string;
  }): Promise<Identity>;
  getIdentityByHandle(handle: string): Promise<Identity | null>;
  getIdentityById(id: string): Promise<Identity | null>;
  updateIdentityPasscode(id: string, passcodeHash: string): Promise<void>;
  /** Flip the `is_admin` bit on an existing identity. Silent if the id
   * does not match any row — the bootstrap CLI validates the handle
   * before calling. Per ADR-175 §Resolved OQ-3 (2026-05-11). */
  setIdentityAdmin(id: string, isAdmin: boolean): Promise<void>;

  // ── Session ───────────────────────────────────────────────────
  /** Insert a session row. Throws if `identityId` does not exist. */
  createSession(input: {
    token: string;
    identityId: string;
    expiresAt: number;
  }): Promise<Session>;
  /** Return the row or `null`. The middleware checks `expiresAt`
   * against the current clock; the adapter does not. */
  getSessionByToken(token: string): Promise<Session | null>;
  /** Remove the row by token. Idempotent — no-op if absent. */
  deleteSession(token: string): Promise<void>;
  /** Remove every session whose `expiresAt < now`. Used by a periodic
   * sweep; safe to call from any context. */
  deleteExpiredSessions(now: number): Promise<void>;
  /** Remove every session belonging to an identity. Used by the
   * passcode-reset path so prior tokens stop authenticating
   * immediately. Idempotent. */
  deleteSessionsForIdentity(identityId: string): Promise<void>;

  // ── Room ──────────────────────────────────────────────────────
  createRoom(input: {
    storyId: string;
    bundleVersion: string;
    title: string;
    public: boolean;
    createdBy: string;
  }): Promise<Room>;
  getRoom(id: string): Promise<Room | null>;
  listRooms(options?: { publicOnly?: boolean }): Promise<Room[]>;
  /** Soft-close: marks the room with `closedAt`. Existing data remains
   * for audit / replay. */
  closeRoom(id: string): Promise<void>;

  // ── Save blobs ────────────────────────────────────────────────
  /** Append a new save_blob row. Throws if a row already exists for
   * `(roomId, turn)` — the turn lifecycle is single-writer per ADR-164. */
  appendSaveBlob(input: {
    roomId: string;
    turn: number;
    formatVersion: number;
    bundleVersion: string;
    payload: Uint8Array;
  }): Promise<void>;
  getSaveBlobAt(roomId: string, turn: number): Promise<SaveBlob | null>;
  getLatestSaveBlob(roomId: string): Promise<SaveBlob | null>;
  /** Turn numbers present in `save_blobs` for the room, ascending.
   * Used by the compaction job (Phase 4). */
  listSaveBlobTurns(roomId: string): Promise<number[]>;
  deleteSaveBlob(roomId: string, turn: number): Promise<void>;

  // ── Named saves ───────────────────────────────────────────────
  /** Throws if no save_blob exists at `atTurn` for the room. */
  createNamedSave(input: {
    roomId: string;
    atTurn: number;
    label: string;
    createdBy: string;
  }): Promise<NamedSave>;
  listNamedSaves(roomId: string): Promise<NamedSave[]>;
  getNamedSave(saveId: string): Promise<NamedSave | null>;
  deleteNamedSave(saveId: string): Promise<void>;

  // ── Destructive truncation (ADR-175 §4 — restore rollback) ────
  /**
   * Roll back a room's persistent history to `keepThroughTurn`. Used
   * exclusively by `POST /rooms/:id/restore` under the per-room
   * lease. Deletes (atomically in one transaction):
   *  - every `named_saves` row with `atTurn > keepThroughTurn` (must
   *    precede save_blob delete because of the FK).
   *  - every `save_blobs` row with `turn > keepThroughTurn`.
   *
   * Idempotent: if no rows match, no-op. Does not touch chat
   * messages, audit entries, identities, sessions, or rooms — those
   * outlive the engine state per ADR-175.
   */
  truncateRoomHistory(input: {
    roomId: string;
    keepThroughTurn: number;
  }): Promise<void>;

  // ── Compaction (Phase 4d — periodic GC) ──────────────────────
  /**
   * Reclaim unreachable per-turn snapshots for a single room. Deletes
   * `save_blobs` rows that are NOT (a) the room's latest turn AND
   * NOT (b) referenced by any `named_saves` row.
   *
   * Atomic: the latest-turn lookup and the deletes run in a single
   * transaction so a concurrent `appendSaveBlob` cannot leave the
   * room with no recoverable blob.
   *
   * Does NOT acquire the per-room lease — `appendSaveBlob` and this
   * method are both atomic at the storage layer, so they serialize
   * naturally without forcing turn execution to wait on maintenance.
   *
   * Returns the count of `save_blobs` rows deleted. Idempotent: a
   * room with only its latest blob plus named-save targets returns 0.
   */
  compactRoomSaveBlobs(roomId: string): Promise<{ deleted: number }>;

  // ── Chat ──────────────────────────────────────────────────────
  appendChatMessage(input: {
    roomId: string;
    fromId: string;
    fromHandle: string;
    text: string;
    ts: number;
  }): Promise<ChatMessage>;
  listChatMessages(
    roomId: string,
    options?: { sinceTs?: number; limit?: number }
  ): Promise<ChatMessage[]>;

  // ── Audit ─────────────────────────────────────────────────────
  appendAuditEntry(input: {
    actorId: string | null;
    action: string;
    targetKind: AuditEntry['targetKind'];
    targetId: string;
    detail: string;
  }): Promise<AuditEntry>;
  listAuditEntries(options?: {
    sinceTs?: number;
    limit?: number;
  }): Promise<AuditEntry[]>;

  // ── Story library ─────────────────────────────────────────────
  installStoryBundle(input: {
    storyId: string;
    version: string;
    ifid: string;
    title: string;
    installedBy: string;
    bundle: Uint8Array;
  }): Promise<StoryLibraryEntry>;
  getStoryLibraryEntry(
    storyId: string,
    version: string
  ): Promise<StoryLibraryEntry | null>;
  getStoryBundle(storyId: string, version: string): Promise<Uint8Array | null>;
  listStories(options?: { activeOnly?: boolean }): Promise<StoryLibraryEntry[]>;
  /** Soft-removal: marks every version of the story inactive. Existing
   * rooms continue per ADR-175 §AC-5. */
  removeStory(storyId: string): Promise<void>;

  // ── Lease ─────────────────────────────────────────────────────
  /** Acquire exclusive write access to a room's turn lifecycle.
   * Returns when the lease is held. The caller releases it via
   * `lease.release()`. */
  acquireRoomLease(roomId: string): Promise<RoomLease>;

  // ── Lifecycle ─────────────────────────────────────────────────
  describe(): AdapterDescription;
  /** Apply schema migrations idempotently. Called on startup for
   * SQLite; called explicitly via `zifmia-migrate` for Postgres. */
  migrate(): Promise<void>;
  close(): Promise<void>;
}
