/**
 * Rooms repository — the only writer to the `rooms` table.
 *
 * Public interface: {@link RoomsRepository}, {@link createRoomsRepository}.
 * Owner: zifmia server, single-process. SQLite is canonical.
 *
 * Contract per ADR-177:
 *   - `primary_host_id` references `identities.id` and is sticky on the
 *     row; it only changes via the succession path (Phase 4).
 *   - `join_code` is unique across all non-deleted rooms; the
 *     repository owns generation + retry.
 *   - `last_activity_at` is touched by every state-changing operation
 *     (writes here, participant joins, command submission Phase 3+).
 *   - `deleted_at` is non-null when the room has been soft-deleted
 *     (Phase 6); routes that operate on live rooms must filter on
 *     `deleted_at IS NULL`.
 */

import { randomUUID } from 'node:crypto';
import type { ZifmiaDatabase } from '../db/connect.js';
import type { Room, RoomError, RoomSummary } from './types.js';
import { generateJoinCode } from './join-code.js';

export interface RoomsRepositoryOptions {
  now?: () => number;
  idFactory?: () => string;
  joinCodeFactory?: () => string;
  /** Maximum attempts to resolve a join-code collision before giving up. */
  joinCodeRetries?: number;
}

export interface CreateRoomInput {
  identityId: string;
  storySlug: string;
  title: string;
}

export type CreateRoomResult =
  | { ok: true; room: Room }
  | { ok: false; error: Extract<RoomError, 'invalid_title' | 'join_code_unavailable'> };

export type RenameRoomResult =
  | { ok: true; room: Room }
  | { ok: false; error: Extract<RoomError, 'invalid_title' | 'room_not_found'> };

export type PinRoomResult =
  | { ok: true; room: Room }
  | { ok: false; error: Extract<RoomError, 'room_not_found'> };

export interface RoomsRepository {
  createRoom(input: CreateRoomInput): CreateRoomResult;
  getRoom(id: string): Room | undefined;
  getByJoinCode(joinCode: string): Room | undefined;
  /** Live rooms (deleted_at IS NULL), pinned first, then most-recent-active. */
  listLobby(): RoomSummary[];
  renameRoom(id: string, title: string): RenameRoomResult;
  pinRoom(id: string, pinned: boolean): PinRoomResult;
  touchLastActivity(id: string): void;
  /** Move PH-ness to a different identity (succession). Single SQL update. */
  setPrimaryHost(roomId: string, identityId: string): void;
  /** Mark `deleted_at = now()` for every live room whose `last_activity_at < cutoff`. Returns affected count. */
  sweepIdle(cutoff: number): number;
  /** Mark the room soft-deleted. Returns true iff a live row was updated. */
  softDelete(roomId: string): boolean;
}

interface RoomRow {
  id: string;
  join_code: string;
  title: string;
  story_slug: string;
  pinned: number;
  last_activity_at: number;
  created_at: number;
  primary_host_id: string;
  deleted_at: number | null;
}

function rowToRoom(row: RoomRow): Room {
  return {
    id: row.id,
    join_code: row.join_code,
    title: row.title,
    story_slug: row.story_slug,
    pinned: row.pinned === 1,
    last_activity_at: row.last_activity_at,
    created_at: row.created_at,
    primary_host_id: row.primary_host_id,
    deleted_at: row.deleted_at
  };
}

const MAX_TITLE_LENGTH = 80;

function validateTitle(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_TITLE_LENGTH) return undefined;
  return trimmed;
}

export function createRoomsRepository(
  db: ZifmiaDatabase,
  options: RoomsRepositoryOptions = {}
): RoomsRepository {
  const now = options.now ?? Date.now;
  const idFactory = options.idFactory ?? randomUUID;
  const joinCodeFactory = options.joinCodeFactory ?? (() => generateJoinCode());
  const joinCodeRetries = options.joinCodeRetries ?? 8;

  const insertStmt = db.prepare<
    [string, string, string, string, number, number, number, string]
  >(
    `INSERT INTO rooms (id, join_code, title, story_slug, pinned, last_activity_at, created_at, primary_host_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const selectByIdStmt = db.prepare<[string], RoomRow>(
    `SELECT * FROM rooms WHERE id = ?`
  );

  const selectByJoinCodeStmt = db.prepare<[string], RoomRow>(
    `SELECT * FROM rooms WHERE join_code = ? AND deleted_at IS NULL`
  );

  const selectLobbyStmt = db.prepare<[], RoomRow>(
    `SELECT * FROM rooms WHERE deleted_at IS NULL ORDER BY pinned DESC, last_activity_at DESC`
  );

  const selectParticipantsForLobbyStmt = db.prepare<
    [string],
    { identity_id: string; handle: string; tier: string }
  >(
    `SELECT p.identity_id AS identity_id, i.handle AS handle, p.tier AS tier
       FROM participants p
       JOIN identities i ON i.id = p.identity_id
      WHERE p.room_id = ?
      ORDER BY p.joined_at ASC`
  );

  const updateTitleStmt = db.prepare<[string, number, string]>(
    `UPDATE rooms SET title = ?, last_activity_at = ? WHERE id = ? AND deleted_at IS NULL`
  );

  const updatePinnedStmt = db.prepare<[number, number, string]>(
    `UPDATE rooms SET pinned = ?, last_activity_at = ? WHERE id = ? AND deleted_at IS NULL`
  );

  const touchStmt = db.prepare<[number, string]>(
    `UPDATE rooms SET last_activity_at = ? WHERE id = ? AND deleted_at IS NULL`
  );

  const setPrimaryHostStmt = db.prepare<[string, number, string]>(
    `UPDATE rooms SET primary_host_id = ?, last_activity_at = ? WHERE id = ? AND deleted_at IS NULL`
  );

  const sweepIdleStmt = db.prepare<[number, number]>(
    `UPDATE rooms SET deleted_at = ? WHERE deleted_at IS NULL AND last_activity_at < ?`
  );

  const softDeleteStmt = db.prepare<[number, string]>(
    `UPDATE rooms SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`
  );

  return {
    createRoom(input) {
      const title = validateTitle(input.title);
      if (!title) return { ok: false, error: 'invalid_title' };

      const id = idFactory();
      const createdAt = now();

      for (let attempt = 0; attempt < joinCodeRetries; attempt += 1) {
        const code = joinCodeFactory();
        try {
          insertStmt.run(id, code, title, input.storySlug, 0, createdAt, createdAt, input.identityId);
        } catch (err) {
          if (err instanceof Error && /UNIQUE/i.test(err.message) && /join_code/i.test(err.message)) {
            continue;
          }
          throw err;
        }
        return {
          ok: true,
          room: {
            id,
            join_code: code,
            title,
            story_slug: input.storySlug,
            pinned: false,
            last_activity_at: createdAt,
            created_at: createdAt,
            primary_host_id: input.identityId,
            deleted_at: null
          }
        };
      }
      return { ok: false, error: 'join_code_unavailable' };
    },

    getRoom(id) {
      const row = selectByIdStmt.get(id);
      return row ? rowToRoom(row) : undefined;
    },

    getByJoinCode(joinCode) {
      const row = selectByJoinCodeStmt.get(joinCode);
      return row ? rowToRoom(row) : undefined;
    },

    listLobby() {
      const rows = selectLobbyStmt.all();
      return rows.map((row) => {
        const ptRows = selectParticipantsForLobbyStmt.all(row.id);
        return {
          id: row.id,
          join_code: row.join_code,
          title: row.title,
          story_slug: row.story_slug,
          pinned: row.pinned === 1,
          last_activity_at: row.last_activity_at,
          participants: ptRows.map((p) => ({
            identity_id: p.identity_id,
            handle: p.handle,
            tier: p.tier as RoomSummary['participants'][number]['tier']
          }))
        };
      });
    },

    renameRoom(id, title) {
      const cleaned = validateTitle(title);
      if (!cleaned) return { ok: false, error: 'invalid_title' };
      const result = updateTitleStmt.run(cleaned, now(), id);
      if (result.changes === 0) return { ok: false, error: 'room_not_found' };
      const row = selectByIdStmt.get(id);
      if (!row) return { ok: false, error: 'room_not_found' };
      return { ok: true, room: rowToRoom(row) };
    },

    pinRoom(id, pinned) {
      const result = updatePinnedStmt.run(pinned ? 1 : 0, now(), id);
      if (result.changes === 0) return { ok: false, error: 'room_not_found' };
      const row = selectByIdStmt.get(id);
      if (!row) return { ok: false, error: 'room_not_found' };
      return { ok: true, room: rowToRoom(row) };
    },

    touchLastActivity(id) {
      touchStmt.run(now(), id);
    },

    setPrimaryHost(roomId, identityId) {
      setPrimaryHostStmt.run(identityId, now(), roomId);
    },

    sweepIdle(cutoff) {
      const result = sweepIdleStmt.run(now(), cutoff);
      return result.changes;
    },

    softDelete(roomId) {
      const result = softDeleteStmt.run(now(), roomId);
      return result.changes > 0;
    }
  };
}
