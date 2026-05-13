/**
 * Saves repository — named user-initiated saves per ADR-177 §4 + §6.
 *
 * Public interface: {@link SavesRepository}, {@link createSavesRepository}.
 * Owner: zifmia server, engine domain.
 *
 * Contract:
 *   - Each row is a (room_id, actor_id, name, blob, created_at) named save.
 *   - Saves live as long as the room does — there is NO per-save
 *     delete endpoint (per project memory `feedback_no_save_delete`).
 *     CASCADE on room delete and identity delete handles cleanup.
 *   - The blob is the same `room_state` byte format (gzip+JSON
 *     ISaveData); restore copies a save's blob into `room_state`.
 */

import { randomUUID } from 'node:crypto';
import type { ZifmiaDatabase } from '../db/connect.js';

export interface SaveRow {
  readonly save_id: string;
  readonly room_id: string;
  readonly actor_id: string;
  readonly name: string;
  readonly created_at: number;
}

export interface SaveRowWithBlob extends SaveRow {
  readonly blob: Uint8Array;
}

export interface SavesRepositoryOptions {
  now?: () => number;
  idFactory?: () => string;
}

export interface SavesRepository {
  create(input: { roomId: string; actorId: string; name: string; blob: Uint8Array }): SaveRow;
  listByRoom(roomId: string): SaveRow[];
  getById(saveId: string): SaveRowWithBlob | undefined;
}

interface RawRow {
  save_id: string;
  room_id: string;
  actor_id: string;
  name: string;
  created_at: number;
}

interface RawRowWithBlob extends RawRow {
  blob: Buffer;
}

export function createSavesRepository(
  db: ZifmiaDatabase,
  options: SavesRepositoryOptions = {}
): SavesRepository {
  const now = options.now ?? Date.now;
  const idFactory = options.idFactory ?? randomUUID;

  const insertStmt = db.prepare<[string, string, string, string, Buffer, number]>(
    `INSERT INTO saves (save_id, room_id, actor_id, name, blob, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const listStmt = db.prepare<[string], RawRow>(
    `SELECT save_id, room_id, actor_id, name, created_at FROM saves
      WHERE room_id = ? ORDER BY created_at DESC`
  );
  const getStmt = db.prepare<[string], RawRowWithBlob>(
    `SELECT * FROM saves WHERE save_id = ?`
  );

  return {
    create(input) {
      const saveId = idFactory();
      const createdAt = now();
      insertStmt.run(saveId, input.roomId, input.actorId, input.name, Buffer.from(input.blob), createdAt);
      return {
        save_id: saveId,
        room_id: input.roomId,
        actor_id: input.actorId,
        name: input.name,
        created_at: createdAt
      };
    },
    listByRoom(roomId) {
      return listStmt.all(roomId);
    },
    getById(saveId) {
      const row = getStmt.get(saveId);
      if (!row) return undefined;
      return {
        save_id: row.save_id,
        room_id: row.room_id,
        actor_id: row.actor_id,
        name: row.name,
        created_at: row.created_at,
        blob: new Uint8Array(row.blob)
      };
    }
  };
}
