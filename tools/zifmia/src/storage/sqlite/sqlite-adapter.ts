/**
 * @module @sharpee/zifmia/storage/sqlite/sqlite-adapter
 * @purpose `StorageAdapter` implementation backed by better-sqlite3. The
 *   default storage for single-container Zifmia deployments. Per ADR-175
 *   §Decision 7, this adapter pairs with an in-process async queue for
 *   the room lease — SQLite cannot horizontally scale, so cross-process
 *   coordination is moot.
 * @owner Zifmia server — authoritative state holder (ADR-175 invariant).
 *
 * Implementation notes:
 *
 * - better-sqlite3 is synchronous; the adapter wraps every return in
 *   `Promise.resolve` to match the async interface contract.
 * - WAL mode is enabled at open time for concurrent readers + a single
 *   writer (matches Zifmia's per-room single-writer invariant).
 * - Foreign keys are enabled (`PRAGMA foreign_keys = ON`) so the
 *   `named_saves → save_blobs` and `story_bundles → story_library`
 *   relationships are enforced.
 */

import { randomUUID } from 'node:crypto';
import Database, { type Database as BetterSqliteDatabase } from 'better-sqlite3';

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
} from '../types';
import type { RoomLease, StorageAdapter } from '../adapter';
import { SQLITE_SCHEMA } from './schema';

export interface SqliteAdapterOptions {
  /** Path to the SQLite database file. Use `:memory:` for tests. */
  filename: string;
  /** Override the wall clock (tests pin time). */
  now?: () => number;
  /** Override the UUID generator (tests pin IDs). */
  idFactory?: () => string;
}

interface DeferredLease {
  promise: Promise<void>;
  resolve: () => void;
}

/**
 * SQLite-backed storage adapter. Construct, call `migrate()` once on
 * startup, then use the adapter directly. `close()` releases the
 * underlying file handle.
 */
export class SqliteAdapter implements StorageAdapter {
  private readonly db: BetterSqliteDatabase;
  private readonly now: () => number;
  private readonly idFactory: () => string;
  private readonly leaseQueue = new Map<string, DeferredLease>();

  constructor(options: SqliteAdapterOptions) {
    this.db = new Database(options.filename);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.now = options.now ?? Date.now;
    this.idFactory = options.idFactory ?? randomUUID;
  }

  describe(): AdapterDescription {
    const result = this.db
      .prepare<unknown[], { v: string }>('SELECT sqlite_version() AS v')
      .get();
    return {
      kind: 'sqlite',
      driverVersion: result?.v ?? 'unknown'
    };
  }

  async migrate(): Promise<void> {
    this.db.exec(SQLITE_SCHEMA);
  }

  async close(): Promise<void> {
    this.db.close();
  }

  // ── Identity ──────────────────────────────────────────────────

  async createIdentity(input: {
    handle: string;
    passcodeHash: string;
  }): Promise<Identity> {
    const row: Identity = {
      id: this.idFactory(),
      handle: input.handle,
      passcodeHash: input.passcodeHash,
      createdAt: this.now()
    };
    this.db
      .prepare(
        `INSERT INTO identities (id, handle, passcode_hash, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(row.id, row.handle, row.passcodeHash, row.createdAt);
    return row;
  }

  async getIdentityByHandle(handle: string): Promise<Identity | null> {
    const r = this.db
      .prepare<[string], IdentityRow>(
        `SELECT id, handle, passcode_hash, created_at
         FROM identities WHERE handle = ?`
      )
      .get(handle);
    return r ? identityFromRow(r) : null;
  }

  async getIdentityById(id: string): Promise<Identity | null> {
    const r = this.db
      .prepare<[string], IdentityRow>(
        `SELECT id, handle, passcode_hash, created_at
         FROM identities WHERE id = ?`
      )
      .get(id);
    return r ? identityFromRow(r) : null;
  }

  async updateIdentityPasscode(id: string, passcodeHash: string): Promise<void> {
    this.db
      .prepare(`UPDATE identities SET passcode_hash = ? WHERE id = ?`)
      .run(passcodeHash, id);
  }

  // ── Session ───────────────────────────────────────────────────

  async createSession(input: {
    token: string;
    identityId: string;
    expiresAt: number;
  }): Promise<Session> {
    const session: Session = {
      token: input.token,
      identityId: input.identityId,
      createdAt: this.now(),
      expiresAt: input.expiresAt
    };
    this.db
      .prepare(
        `INSERT INTO sessions (token, identity_id, created_at, expires_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(session.token, session.identityId, session.createdAt, session.expiresAt);
    return session;
  }

  async getSessionByToken(token: string): Promise<Session | null> {
    const r = this.db
      .prepare<[string], SessionRow>(
        `SELECT token, identity_id, created_at, expires_at
         FROM sessions WHERE token = ?`
      )
      .get(token);
    return r ? sessionFromRow(r) : null;
  }

  async deleteSession(token: string): Promise<void> {
    this.db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
  }

  async deleteExpiredSessions(now: number): Promise<void> {
    this.db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(now);
  }

  // ── Room ──────────────────────────────────────────────────────

  async createRoom(input: {
    storyId: string;
    bundleVersion: string;
    title: string;
    public: boolean;
    createdBy: string;
  }): Promise<Room> {
    const room: Room = {
      id: this.idFactory(),
      storyId: input.storyId,
      bundleVersion: input.bundleVersion,
      title: input.title,
      public: input.public,
      createdBy: input.createdBy,
      createdAt: this.now()
    };
    this.db
      .prepare(
        `INSERT INTO rooms
           (id, story_id, bundle_version, title, public, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        room.id,
        room.storyId,
        room.bundleVersion,
        room.title,
        room.public ? 1 : 0,
        room.createdBy,
        room.createdAt
      );
    return room;
  }

  async getRoom(id: string): Promise<Room | null> {
    const r = this.db
      .prepare<[string], RoomRow>(
        `SELECT id, story_id, bundle_version, title, public,
                created_by, created_at, closed_at
         FROM rooms WHERE id = ?`
      )
      .get(id);
    return r ? roomFromRow(r) : null;
  }

  async listRooms(options?: { publicOnly?: boolean }): Promise<Room[]> {
    const sql = options?.publicOnly
      ? `SELECT id, story_id, bundle_version, title, public,
                created_by, created_at, closed_at
         FROM rooms WHERE public = 1 AND closed_at IS NULL
         ORDER BY created_at DESC`
      : `SELECT id, story_id, bundle_version, title, public,
                created_by, created_at, closed_at
         FROM rooms WHERE closed_at IS NULL
         ORDER BY created_at DESC`;
    const rows = this.db.prepare<unknown[], RoomRow>(sql).all();
    return rows.map(roomFromRow);
  }

  async closeRoom(id: string): Promise<void> {
    this.db
      .prepare(`UPDATE rooms SET closed_at = ? WHERE id = ? AND closed_at IS NULL`)
      .run(this.now(), id);
  }

  // ── Save blobs ────────────────────────────────────────────────

  async appendSaveBlob(input: {
    roomId: string;
    turn: number;
    formatVersion: number;
    bundleVersion: string;
    payload: Uint8Array;
  }): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO save_blobs
           (room_id, turn, format_version, bundle_version, payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.roomId,
        input.turn,
        input.formatVersion,
        input.bundleVersion,
        Buffer.from(input.payload),
        this.now()
      );
  }

  async getSaveBlobAt(roomId: string, turn: number): Promise<SaveBlob | null> {
    const r = this.db
      .prepare<[string, number], SaveBlobRow>(
        `SELECT room_id, turn, format_version, bundle_version, payload, created_at
         FROM save_blobs WHERE room_id = ? AND turn = ?`
      )
      .get(roomId, turn);
    return r ? saveBlobFromRow(r) : null;
  }

  async getLatestSaveBlob(roomId: string): Promise<SaveBlob | null> {
    const r = this.db
      .prepare<[string], SaveBlobRow>(
        `SELECT room_id, turn, format_version, bundle_version, payload, created_at
         FROM save_blobs WHERE room_id = ? ORDER BY turn DESC LIMIT 1`
      )
      .get(roomId);
    return r ? saveBlobFromRow(r) : null;
  }

  async listSaveBlobTurns(roomId: string): Promise<number[]> {
    const rows = this.db
      .prepare<[string], { turn: number }>(
        `SELECT turn FROM save_blobs WHERE room_id = ? ORDER BY turn ASC`
      )
      .all(roomId);
    return rows.map((r) => r.turn);
  }

  async deleteSaveBlob(roomId: string, turn: number): Promise<void> {
    this.db
      .prepare(`DELETE FROM save_blobs WHERE room_id = ? AND turn = ?`)
      .run(roomId, turn);
  }

  // ── Named saves ───────────────────────────────────────────────

  async createNamedSave(input: {
    roomId: string;
    atTurn: number;
    label: string;
    createdBy: string;
  }): Promise<NamedSave> {
    const save: NamedSave = {
      saveId: this.idFactory(),
      roomId: input.roomId,
      atTurn: input.atTurn,
      label: input.label,
      createdBy: input.createdBy,
      createdAt: this.now()
    };
    this.db
      .prepare(
        `INSERT INTO named_saves
           (save_id, room_id, at_turn, label, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        save.saveId,
        save.roomId,
        save.atTurn,
        save.label,
        save.createdBy,
        save.createdAt
      );
    return save;
  }

  async listNamedSaves(roomId: string): Promise<NamedSave[]> {
    const rows = this.db
      .prepare<[string], NamedSaveRow>(
        `SELECT save_id, room_id, at_turn, label, created_by, created_at
         FROM named_saves WHERE room_id = ? ORDER BY created_at DESC`
      )
      .all(roomId);
    return rows.map(namedSaveFromRow);
  }

  async getNamedSave(saveId: string): Promise<NamedSave | null> {
    const r = this.db
      .prepare<[string], NamedSaveRow>(
        `SELECT save_id, room_id, at_turn, label, created_by, created_at
         FROM named_saves WHERE save_id = ?`
      )
      .get(saveId);
    return r ? namedSaveFromRow(r) : null;
  }

  async deleteNamedSave(saveId: string): Promise<void> {
    this.db.prepare(`DELETE FROM named_saves WHERE save_id = ?`).run(saveId);
  }

  async compactRoomSaveBlobs(roomId: string): Promise<{ deleted: number }> {
    // Atomic compaction. The subquery `MAX(turn)` and the DELETE run
    // in the same transaction so a concurrent `appendSaveBlob` can't
    // make the new latest turn eligible for deletion mid-statement.
    //
    // Preserved rows: (a) the latest-turn row, and (b) any turn that
    // a `named_saves` row points at. Everything else is unreachable —
    // intermediate per-turn snapshots are read only by restore, and
    // restore goes through a named save.
    let deleted = 0;
    const tx = this.db.transaction(() => {
      const result = this.db
        .prepare(
          `DELETE FROM save_blobs
           WHERE room_id = ?
             AND turn != (
               SELECT MAX(turn) FROM save_blobs WHERE room_id = ?
             )
             AND turn NOT IN (
               SELECT at_turn FROM named_saves WHERE room_id = ?
             )`,
        )
        .run(roomId, roomId, roomId);
      deleted = Number(result.changes ?? 0);
    });
    tx();
    return { deleted };
  }

  async truncateRoomHistory(input: {
    roomId: string;
    keepThroughTurn: number;
  }): Promise<void> {
    const { roomId, keepThroughTurn } = input;
    // Single transaction so a partial run can't leave dangling
    // named_saves rows whose target save_blob has already been
    // deleted (or, in the opposite order, FK-violate the delete).
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `DELETE FROM named_saves WHERE room_id = ? AND at_turn > ?`,
        )
        .run(roomId, keepThroughTurn);
      this.db
        .prepare(`DELETE FROM save_blobs WHERE room_id = ? AND turn > ?`)
        .run(roomId, keepThroughTurn);
    });
    tx();
  }

  // ── Chat ──────────────────────────────────────────────────────

  async appendChatMessage(input: {
    roomId: string;
    fromId: string;
    fromHandle: string;
    text: string;
    ts: number;
  }): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: this.idFactory(),
      roomId: input.roomId,
      fromId: input.fromId,
      fromHandle: input.fromHandle,
      text: input.text,
      ts: input.ts
    };
    this.db
      .prepare(
        `INSERT INTO chat_messages (id, room_id, from_id, from_handle, text, ts)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        message.id,
        message.roomId,
        message.fromId,
        message.fromHandle,
        message.text,
        message.ts
      );
    return message;
  }

  async listChatMessages(
    roomId: string,
    options?: { sinceTs?: number; limit?: number }
  ): Promise<ChatMessage[]> {
    const conds: string[] = ['room_id = ?'];
    const args: Array<string | number> = [roomId];
    if (typeof options?.sinceTs === 'number') {
      conds.push('ts >= ?');
      args.push(options.sinceTs);
    }
    const limit = options?.limit ?? 1000;
    const sql = `SELECT id, room_id, from_id, from_handle, text, ts
                 FROM chat_messages
                 WHERE ${conds.join(' AND ')}
                 ORDER BY ts ASC LIMIT ?`;
    args.push(limit);
    const rows = this.db
      .prepare<Array<string | number>, ChatRow>(sql)
      .all(...args);
    return rows.map(chatFromRow);
  }

  // ── Audit ─────────────────────────────────────────────────────

  async appendAuditEntry(input: {
    actorId: string | null;
    action: string;
    targetKind: AuditEntry['targetKind'];
    targetId: string;
    detail: string;
  }): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: this.idFactory(),
      ts: this.now(),
      actorId: input.actorId,
      action: input.action,
      targetKind: input.targetKind,
      targetId: input.targetId,
      detail: input.detail
    };
    this.db
      .prepare(
        `INSERT INTO audit_log
           (id, ts, actor_id, action, target_kind, target_id, detail)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entry.id,
        entry.ts,
        entry.actorId,
        entry.action,
        entry.targetKind,
        entry.targetId,
        entry.detail
      );
    return entry;
  }

  async listAuditEntries(options?: {
    sinceTs?: number;
    limit?: number;
  }): Promise<AuditEntry[]> {
    const conds: string[] = [];
    const args: Array<string | number> = [];
    if (typeof options?.sinceTs === 'number') {
      conds.push('ts >= ?');
      args.push(options.sinceTs);
    }
    const limit = options?.limit ?? 200;
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const sql = `SELECT id, ts, actor_id, action, target_kind, target_id, detail
                 FROM audit_log ${where}
                 ORDER BY ts DESC LIMIT ?`;
    args.push(limit);
    const rows = this.db
      .prepare<Array<string | number>, AuditRow>(sql)
      .all(...args);
    return rows.map(auditFromRow);
  }

  // ── Story library ─────────────────────────────────────────────

  async installStoryBundle(input: {
    storyId: string;
    version: string;
    ifid: string;
    title: string;
    installedBy: string;
    bundle: Uint8Array;
  }): Promise<StoryLibraryEntry> {
    const entry: StoryLibraryEntry = {
      storyId: input.storyId,
      version: input.version,
      ifid: input.ifid,
      title: input.title,
      installedBy: input.installedBy,
      installedAt: this.now(),
      active: true
    };
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO story_library
             (story_id, version, ifid, title, installed_by, installed_at, active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`
        )
        .run(
          entry.storyId,
          entry.version,
          entry.ifid,
          entry.title,
          entry.installedBy,
          entry.installedAt
        );
      this.db
        .prepare(
          `INSERT INTO story_bundles (story_id, version, bundle)
           VALUES (?, ?, ?)`
        )
        .run(entry.storyId, entry.version, Buffer.from(input.bundle));
    });
    tx();
    return entry;
  }

  async getStoryLibraryEntry(
    storyId: string,
    version: string
  ): Promise<StoryLibraryEntry | null> {
    const r = this.db
      .prepare<[string, string], StoryLibraryRow>(
        `SELECT story_id, version, ifid, title, installed_by, installed_at, active
         FROM story_library WHERE story_id = ? AND version = ?`
      )
      .get(storyId, version);
    return r ? storyLibraryFromRow(r) : null;
  }

  async getStoryBundle(
    storyId: string,
    version: string
  ): Promise<Uint8Array | null> {
    const r = this.db
      .prepare<[string, string], { bundle: Buffer }>(
        `SELECT bundle FROM story_bundles WHERE story_id = ? AND version = ?`
      )
      .get(storyId, version);
    return r ? new Uint8Array(r.bundle) : null;
  }

  async listStories(options?: {
    activeOnly?: boolean;
  }): Promise<StoryLibraryEntry[]> {
    const sql = options?.activeOnly
      ? `SELECT story_id, version, ifid, title, installed_by, installed_at, active
         FROM story_library WHERE active = 1 ORDER BY installed_at DESC`
      : `SELECT story_id, version, ifid, title, installed_by, installed_at, active
         FROM story_library ORDER BY installed_at DESC`;
    const rows = this.db.prepare<unknown[], StoryLibraryRow>(sql).all();
    return rows.map(storyLibraryFromRow);
  }

  async removeStory(storyId: string): Promise<void> {
    this.db
      .prepare(`UPDATE story_library SET active = 0 WHERE story_id = ?`)
      .run(storyId);
  }

  // ── Lease ─────────────────────────────────────────────────────

  /**
   * In-process FIFO queue keyed by roomId. The first caller acquires
   * immediately. Subsequent callers chain on the prior lease's
   * release. This matches the SQLite-default deployment (single
   * container, no cross-process coordination needed).
   */
  async acquireRoomLease(roomId: string): Promise<RoomLease> {
    const prior = this.leaseQueue.get(roomId);
    let resolveFn!: () => void;
    const ours: Promise<void> = new Promise<void>((resolve) => {
      resolveFn = resolve;
    });
    const deferred: DeferredLease = { promise: ours, resolve: resolveFn };
    this.leaseQueue.set(roomId, deferred);

    if (prior) {
      await prior.promise;
    }

    let released = false;
    return {
      release: async () => {
        if (released) return;
        released = true;
        deferred.resolve();
        // Only clear the slot if no later acquirer has overwritten it.
        if (this.leaseQueue.get(roomId) === deferred) {
          this.leaseQueue.delete(roomId);
        }
      }
    };
  }
}

// ── Row → domain converters ──────────────────────────────────────

interface IdentityRow {
  id: string;
  handle: string;
  passcode_hash: string;
  created_at: number;
}
function identityFromRow(r: IdentityRow): Identity {
  return {
    id: r.id,
    handle: r.handle,
    passcodeHash: r.passcode_hash,
    createdAt: r.created_at
  };
}

interface SessionRow {
  token: string;
  identity_id: string;
  created_at: number;
  expires_at: number;
}
function sessionFromRow(r: SessionRow): Session {
  return {
    token: r.token,
    identityId: r.identity_id,
    createdAt: r.created_at,
    expiresAt: r.expires_at
  };
}

interface RoomRow {
  id: string;
  story_id: string;
  bundle_version: string;
  title: string;
  public: number;
  created_by: string;
  created_at: number;
  closed_at: number | null;
}
function roomFromRow(r: RoomRow): Room {
  const room: Room = {
    id: r.id,
    storyId: r.story_id,
    bundleVersion: r.bundle_version,
    title: r.title,
    public: r.public === 1,
    createdBy: r.created_by,
    createdAt: r.created_at
  };
  if (r.closed_at !== null) room.closedAt = r.closed_at;
  return room;
}

interface SaveBlobRow {
  room_id: string;
  turn: number;
  format_version: number;
  bundle_version: string;
  payload: Buffer;
  created_at: number;
}
function saveBlobFromRow(r: SaveBlobRow): SaveBlob {
  return {
    roomId: r.room_id,
    turn: r.turn,
    formatVersion: r.format_version,
    bundleVersion: r.bundle_version,
    payload: new Uint8Array(r.payload),
    createdAt: r.created_at
  };
}

interface NamedSaveRow {
  save_id: string;
  room_id: string;
  at_turn: number;
  label: string;
  created_by: string;
  created_at: number;
}
function namedSaveFromRow(r: NamedSaveRow): NamedSave {
  return {
    saveId: r.save_id,
    roomId: r.room_id,
    atTurn: r.at_turn,
    label: r.label,
    createdBy: r.created_by,
    createdAt: r.created_at
  };
}

interface ChatRow {
  id: string;
  room_id: string;
  from_id: string;
  from_handle: string;
  text: string;
  ts: number;
}
function chatFromRow(r: ChatRow): ChatMessage {
  return {
    id: r.id,
    roomId: r.room_id,
    fromId: r.from_id,
    fromHandle: r.from_handle,
    text: r.text,
    ts: r.ts
  };
}

interface AuditRow {
  id: string;
  ts: number;
  actor_id: string | null;
  action: string;
  target_kind: AuditEntry['targetKind'];
  target_id: string;
  detail: string;
}
function auditFromRow(r: AuditRow): AuditEntry {
  return {
    id: r.id,
    ts: r.ts,
    actorId: r.actor_id,
    action: r.action,
    targetKind: r.target_kind,
    targetId: r.target_id,
    detail: r.detail
  };
}

interface StoryLibraryRow {
  story_id: string;
  version: string;
  ifid: string;
  title: string;
  installed_by: string;
  installed_at: number;
  active: number;
}
function storyLibraryFromRow(r: StoryLibraryRow): StoryLibraryEntry {
  return {
    storyId: r.story_id,
    version: r.version,
    ifid: r.ifid,
    title: r.title,
    installedBy: r.installed_by,
    installedAt: r.installed_at,
    active: r.active === 1
  };
}
