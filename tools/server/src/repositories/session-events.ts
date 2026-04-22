/**
 * Session events repository — append-only unified event log.
 *
 * Public interface: {@link SessionEventsRepository}, {@link createSessionEventsRepository}.
 * Bounded context: persistence layer (ADR-153 Decision 11).
 *
 * Design: one table keeps export and replay trivial; JSON payloads keep the
 * schema stable as event kinds evolve. The `kind` column is indexed so the
 * common "give me all role changes for this room" query stays cheap.
 */

import type { Database, Statement } from 'better-sqlite3';
import type { EventKind, EventPayload, SessionEvent } from './types.js';

export interface SessionEventsRepository {
  /**
   * Append a row to the unified event log. Returns the generated `event_id`.
   *
   * If `ts` is supplied, it is persisted verbatim — used by chat/dm handlers
   * that need to echo the exact timestamp on the wire. If omitted, the
   * repository generates `new Date().toISOString()`.
   */
  append(input: {
    room_id: string;
    participant_id: string | null;
    kind: EventKind;
    payload: EventPayload;
    ts?: string;
  }): number;
  listForRoom(
    room_id: string,
    opts?: { since_event_id?: number; limit?: number; kinds?: EventKind[] }
  ): SessionEvent[];
}

interface SessionEventRow {
  event_id: number;
  room_id: string;
  participant_id: string | null;
  ts: string;
  kind: string;
  payload: string;
}

function rowToEvent(row: SessionEventRow): SessionEvent {
  return {
    event_id: row.event_id,
    room_id: row.room_id,
    participant_id: row.participant_id,
    ts: row.ts,
    kind: row.kind as EventKind,
    payload: JSON.parse(row.payload) as EventPayload,
  };
}

export function createSessionEventsRepository(db: Database): SessionEventsRepository {
  const insert: Statement = db.prepare(`
    INSERT INTO session_events (room_id, participant_id, ts, kind, payload)
    VALUES (?, ?, ?, ?, ?)
  `);

  return {
    append(input) {
      const ts = input.ts ?? new Date().toISOString();
      const info = insert.run(
        input.room_id,
        input.participant_id,
        ts,
        input.kind,
        JSON.stringify(input.payload)
      );
      return Number(info.lastInsertRowid);
    },

    listForRoom(room_id, opts = {}) {
      const { since_event_id, limit, kinds } = opts;
      const clauses: string[] = ['room_id = ?'];
      const params: unknown[] = [room_id];

      if (since_event_id !== undefined) {
        clauses.push('event_id > ?');
        params.push(since_event_id);
      }
      if (kinds && kinds.length > 0) {
        clauses.push(`kind IN (${kinds.map(() => '?').join(', ')})`);
        params.push(...kinds);
      }

      let sql = `SELECT * FROM session_events WHERE ${clauses.join(' AND ')} ORDER BY event_id ASC`;
      if (limit !== undefined) {
        sql += ' LIMIT ?';
        params.push(limit);
      }

      const rows = db.prepare(sql).all(...params) as SessionEventRow[];
      return rows.map(rowToEvent);
    },
  };
}
