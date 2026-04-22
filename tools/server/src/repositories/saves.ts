/**
 * Saves repository — opaque save blobs, one timeline per room.
 *
 * Public interface: {@link SavesRepository}, {@link createSavesRepository}.
 * Bounded context: persistence layer (ADR-153 Decision 10).
 *
 * The server never inspects the blob — it stores and returns the bytes verbatim.
 * `listForRoom` deliberately omits the blob column to keep the roster query cheap.
 */

import type { Database, Statement } from 'better-sqlite3';
import type { Save, SaveSummary } from './types.js';

export interface SavesRepository {
  /**
   * Persist a save blob. The `save_id` is supplied by the caller because it
   * is used to correlate with the sandbox's SAVE/SAVED round-trip — the id
   * must be stable across the wire exchange, the session_events row, and
   * the broadcast. SaveService owns generation.
   */
  create(input: {
    save_id: string;
    room_id: string;
    actor_id: string;
    name: string;
    blob: Buffer;
  }): Save;
  findById(save_id: string): Save | null;
  /** Returns summaries (no blob bytes) ordered oldest-first. */
  listForRoom(room_id: string): SaveSummary[];
}

interface SaveRow {
  save_id: string;
  room_id: string;
  actor_id: string;
  name: string;
  blob: Buffer;
  created_at: string;
}

export function createSavesRepository(db: Database): SavesRepository {
  const insert: Statement = db.prepare(`
    INSERT INTO saves (save_id, room_id, actor_id, name, blob, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const selectById: Statement = db.prepare(`SELECT * FROM saves WHERE save_id = ?`);

  const selectSummariesForRoom: Statement = db.prepare(`
    SELECT save_id, room_id, actor_id, name, created_at
    FROM saves
    WHERE room_id = ?
    ORDER BY created_at ASC
  `);

  return {
    create(input) {
      const created_at = new Date().toISOString();
      insert.run(
        input.save_id,
        input.room_id,
        input.actor_id,
        input.name,
        input.blob,
        created_at
      );
      return {
        save_id: input.save_id,
        room_id: input.room_id,
        actor_id: input.actor_id,
        name: input.name,
        blob: input.blob,
        created_at,
      };
    },

    findById(save_id) {
      const row = selectById.get(save_id) as SaveRow | undefined;
      if (!row) return null;
      return {
        save_id: row.save_id,
        room_id: row.room_id,
        actor_id: row.actor_id,
        name: row.name,
        blob: row.blob,
        created_at: row.created_at,
      };
    },

    listForRoom(room_id) {
      return selectSummariesForRoom.all(room_id) as SaveSummary[];
    },
  };
}
