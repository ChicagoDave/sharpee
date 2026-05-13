/**
 * Room-state repository — owns the `room_state` table (per-room
 * current save blob, separate from named saves).
 *
 * Public interface: {@link RoomStateRepository},
 * {@link createRoomStateRepository}.
 * Owner: zifmia server, engine domain. SQLite canonical.
 *
 * Contract per ADR-177 §1:
 *   - One row per room; replaced (not appended) on every turn.
 *   - `blob` is the gzipped JSON of `ISaveData` (whatever the engine's
 *     SaveRestoreService produces); the repo is opaque to its shape.
 *   - `updated_at` reflects the last turn's wall-clock; useful for
 *     debug + the recycle sweeper's freshness signal.
 */

import type { ZifmiaDatabase } from '../db/connect.js';

export interface RoomStateRepositoryOptions {
  now?: () => number;
}

export interface RoomStateRepository {
  /** Return the current blob for a room, or `undefined` if no turn has been run yet. */
  get(roomId: string): Uint8Array | undefined;
  /** Upsert the room's current blob. */
  put(roomId: string, blob: Uint8Array): void;
  /** Drop the row (e.g., for restore-from-named-save flows). */
  clear(roomId: string): void;
}

export function createRoomStateRepository(
  db: ZifmiaDatabase,
  options: RoomStateRepositoryOptions = {}
): RoomStateRepository {
  const now = options.now ?? Date.now;

  const selectStmt = db.prepare<[string], { blob: Buffer }>(
    `SELECT blob FROM room_state WHERE room_id = ?`
  );
  const upsertStmt = db.prepare<[string, Buffer, number]>(
    `INSERT INTO room_state (room_id, blob, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (room_id) DO UPDATE SET blob = excluded.blob, updated_at = excluded.updated_at`
  );
  const deleteStmt = db.prepare<[string]>(`DELETE FROM room_state WHERE room_id = ?`);

  return {
    get(roomId) {
      const row = selectStmt.get(roomId);
      return row ? new Uint8Array(row.blob) : undefined;
    },
    put(roomId, blob) {
      upsertStmt.run(roomId, Buffer.from(blob), now());
    },
    clear(roomId) {
      deleteStmt.run(roomId);
    }
  };
}
