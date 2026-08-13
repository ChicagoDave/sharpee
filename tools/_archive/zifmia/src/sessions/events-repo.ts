/**
 * Session-events repository — append-only audit log per ADR-177 §6.
 *
 * Public interface: {@link SessionEventsRepository},
 * {@link createSessionEventsRepository}.
 * Owner: zifmia server, sessions domain.
 *
 * Contract:
 *   - Append-only: no UPDATE or DELETE methods. CASCADE on room delete
 *     is the only path that removes rows.
 *   - `payload` is opaque JSON; callers serialize their own kind-
 *     specific shapes. The repo handles `JSON.stringify` /
 *     `JSON.parse` so the public interface trades in unknown values.
 *   - `listByRoom` is the source of the welcome-backlog `transcript_backlog`
 *     surfaced in `GET /api/rooms/:id/state` per ADR-164 carry-forward
 *     (cap at 1000).
 *   - Touches `rooms.last_activity_at` on every append so the recycle
 *     sweeper sees the room as live whenever there's audit activity.
 */

import { randomUUID } from 'node:crypto';
import type { ZifmiaDatabase } from '../db/connect.js';
import type { RoomsRepository } from '../rooms/repository.js';
import type { SessionEvent, SessionEventKind } from './types.js';

export interface AppendInput {
  roomId: string;
  participantId?: string | null;
  kind: SessionEventKind;
  payload: unknown;
}

export interface ListByRoomOptions {
  /** Restrict to these kinds (e.g., ['command','output'] for transcript backlog). */
  kinds?: readonly SessionEventKind[];
  /** Cap row count returned. Default 1000 per ADR-164. */
  limit?: number;
  /** Only events at or after this timestamp (ms). */
  sinceTs?: number;
}

export interface SessionEventsRepositoryOptions {
  now?: () => number;
  idFactory?: () => string;
}

export interface SessionEventsRepository {
  append(input: AppendInput): SessionEvent;
  listByRoom(roomId: string, options?: ListByRoomOptions): SessionEvent[];
  countByRoom(roomId: string): number;
}

interface SessionEventRow {
  event_id: string;
  room_id: string;
  participant_id: string | null;
  ts: number;
  kind: string;
  payload: string;
}

function rowToEvent(row: SessionEventRow): SessionEvent {
  return {
    event_id: row.event_id,
    room_id: row.room_id,
    participant_id: row.participant_id,
    ts: row.ts,
    kind: row.kind as SessionEventKind,
    payload: row.payload ? JSON.parse(row.payload) : null
  };
}

const TRANSCRIPT_BACKLOG_DEFAULT_LIMIT = 1000;

export function createSessionEventsRepository(
  db: ZifmiaDatabase,
  rooms: RoomsRepository,
  options: SessionEventsRepositoryOptions = {}
): SessionEventsRepository {
  const now = options.now ?? Date.now;
  const idFactory = options.idFactory ?? randomUUID;

  const insertStmt = db.prepare<[string, string, string | null, number, string, string]>(
    `INSERT INTO session_events (event_id, room_id, participant_id, ts, kind, payload)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const selectAllStmt = db.prepare<[string, number], SessionEventRow>(
    `SELECT * FROM session_events WHERE room_id = ? ORDER BY ts ASC, rowid ASC LIMIT ?`
  );

  const countStmt = db.prepare<[string], { c: number }>(
    `SELECT COUNT(*) AS c FROM session_events WHERE room_id = ?`
  );

  function selectFiltered(
    roomId: string,
    kinds: readonly SessionEventKind[],
    limit: number,
    sinceTs: number
  ): SessionEventRow[] {
    const placeholders = kinds.map(() => '?').join(', ');
    const sql =
      `SELECT * FROM session_events
        WHERE room_id = ? AND kind IN (${placeholders}) AND ts >= ?
        ORDER BY ts ASC, rowid ASC
        LIMIT ?`;
    return db.prepare<unknown[], SessionEventRow>(sql).all(roomId, ...kinds, sinceTs, limit);
  }

  return {
    append(input) {
      const id = idFactory();
      const ts = now();
      const payloadJson = JSON.stringify(input.payload ?? null);
      insertStmt.run(id, input.roomId, input.participantId ?? null, ts, input.kind, payloadJson);
      // Touch room last_activity_at so recycle sees activity. No-op
      // if the room is already soft-deleted (touchLastActivity gates
      // on deleted_at IS NULL).
      rooms.touchLastActivity(input.roomId);
      return {
        event_id: id,
        room_id: input.roomId,
        participant_id: input.participantId ?? null,
        ts,
        kind: input.kind,
        payload: input.payload ?? null
      };
    },

    listByRoom(roomId, options = {}) {
      const limit = options.limit ?? TRANSCRIPT_BACKLOG_DEFAULT_LIMIT;
      const sinceTs = options.sinceTs ?? 0;
      if (options.kinds && options.kinds.length > 0) {
        return selectFiltered(roomId, options.kinds, limit, sinceTs).map(rowToEvent);
      }
      // No kind filter: simple ordered query.
      const rows = selectAllStmt.all(roomId, limit);
      return rows.filter((r) => r.ts >= sinceTs).map(rowToEvent);
    },

    countByRoom(roomId) {
      return countStmt.get(roomId)?.c ?? 0;
    }
  };
}

export const TRANSCRIPT_BACKLOG_LIMIT = TRANSCRIPT_BACKLOG_DEFAULT_LIMIT;
