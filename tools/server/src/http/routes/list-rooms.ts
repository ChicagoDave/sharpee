/**
 * GET /api/rooms — lists rooms that currently have at least one connected
 * participant. Used by the multi-user client landing page as a discovery
 * signal (NOT a join affordance; the passcode gate remains authoritative).
 *
 * Public interface: {@link registerListRoomsRoute}, {@link ListRoomsDeps},
 * {@link ListRoomsResponse}, {@link RoomSummary}.
 * Bounded context: HTTP layer (ADR-153 frontend addendum — public discovery
 * of active rooms; code-gating preserves privacy).
 *
 * Security: the response MUST NOT include `join_code`, tokens, primary_host_id,
 * or any per-participant identifier. Only aggregate, non-secret metadata.
 */

import type { Hono } from 'hono';
import type { Database } from 'better-sqlite3';

export interface ListRoomsDeps {
  db: Database;
}

/** Public, non-secret room summary returned to the landing page. */
export interface RoomSummary {
  room_id: string;
  title: string;
  story_slug: string;
  participant_count: number;
  last_activity_at: string;
}

export interface ListRoomsResponse {
  rooms: RoomSummary[];
}

interface ListRoomRow {
  room_id: string;
  title: string;
  story_slug: string;
  last_activity_at: string;
  participant_count: number;
}

export function registerListRoomsRoute(app: Hono, deps: ListRoomsDeps): void {
  const stmt = deps.db.prepare<[], ListRoomRow>(`
    SELECT
      r.room_id,
      r.title,
      r.story_slug,
      r.last_activity_at,
      COUNT(p.participant_id) AS participant_count
    FROM rooms r
    INNER JOIN participants p
      ON p.room_id = r.room_id
      AND p.connected = 1
    GROUP BY r.room_id
    ORDER BY r.last_activity_at DESC
  `);

  app.get('/api/rooms', (c) => {
    const rows = stmt.all();
    const response: ListRoomsResponse = {
      rooms: rows.map((row) => ({
        room_id: row.room_id,
        title: row.title,
        story_slug: row.story_slug,
        participant_count: row.participant_count,
        last_activity_at: row.last_activity_at,
      })),
    };
    return c.json(response, 200);
  });
}
