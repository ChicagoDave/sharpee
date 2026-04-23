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
  /**
   * Return the most recent `limit` chat events for the room in chronological
   * order (oldest → newest). Used to carry a chat backlog on the welcome
   * handshake so reconnects don't lose visible room history.
   */
  listRecentChat(room_id: string, limit: number): SessionEvent[];
  /**
   * Return the most recent `limit` DM events the given participant was
   * party to (sender or recipient), in chronological order (oldest →
   * newest). Used to rehydrate DM threads on welcome (Plan 04 Phase 4).
   *
   * The repository does not enforce DM-axis authority (PH↔Co-Host only) —
   * that's the caller's responsibility. The query simply matches sender
   * or recipient by id.
   */
  listRecentDmsForParticipant(
    room_id: string,
    participant_id: string,
    limit: number,
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

    listRecentChat(room_id, limit) {
      // Take the last `limit` chat rows by event_id, then flip back to
      // chronological order for the client — callers assume oldest-first.
      const rows = db
        .prepare(
          `SELECT * FROM session_events
           WHERE room_id = ? AND kind = 'chat'
           ORDER BY event_id DESC
           LIMIT ?`,
        )
        .all(room_id, limit) as SessionEventRow[];
      return rows.map(rowToEvent).reverse();
    },

    listRecentDmsForParticipant(room_id, participant_id, limit) {
      // Match sender (`participant_id` column) or recipient
      // (`payload.to_participant_id`). JSON_EXTRACT is supported in SQLite
      // 3.38+ which better-sqlite3 ships with. Same pattern as
      // listRecentChat — descending by event_id then flipped to oldest-first.
      const rows = db
        .prepare(
          `SELECT * FROM session_events
           WHERE room_id = ?
             AND kind = 'dm'
             AND (participant_id = ?
                  OR JSON_EXTRACT(payload, '$.to_participant_id') = ?)
           ORDER BY event_id DESC
           LIMIT ?`,
        )
        .all(room_id, participant_id, participant_id, limit) as SessionEventRow[];
      return rows.map(rowToEvent).reverse();
    },
  };
}
