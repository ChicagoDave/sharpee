/**
 * GET /api/rooms — lists rooms that currently have at least one connected
 * participant. Used by the multi-user client landing page as a discovery
 * signal (NOT a join affordance; the passcode gate remains authoritative).
 *
 * Public interface: {@link registerListRoomsRoute}, {@link ListRoomsDeps}.
 * Wire types (`RoomSummary`, `ListRoomsResponse`) live in
 * `../../wire/http-api.ts` — shared with the browser client.
 *
 * Bounded context: HTTP layer (ADR-153 frontend addendum — public discovery
 * of active rooms; code-gating preserves privacy).
 *
 * Security: the response MUST NOT include `join_code`, tokens, primary_host_id,
 * or any per-participant identifier. Only aggregate, non-secret metadata.
 */

import type { Hono } from 'hono';
import type { Database } from 'better-sqlite3';
import type { ListRoomsResponse } from '../../wire/http-api.js';

export interface ListRoomsDeps {
  db: Database;
}

interface ListRoomRow {
  room_id: string;
  title: string;
  story_slug: string;
  last_activity_at: string;
  /**
   * SQLite `json_group_array` produces a JSON-encoded string of the
   * grouped values. Parsed to `string[]` once per row in the route
   * handler. Inner sort is by handle ASC for stable rendering — the
   * landing page roster preview is alphabetised regardless of join
   * order.
   */
  handles_json: string;
}

export function registerListRoomsRoute(app: Hono, deps: ListRoomsDeps): void {
  const stmt = deps.db.prepare<[], ListRoomRow>(`
    SELECT
      r.room_id,
      r.title,
      r.story_slug,
      r.last_activity_at,
      json_group_array(i.handle) AS handles_json
    FROM rooms r
    INNER JOIN participants p
      ON p.room_id = r.room_id
      AND p.connected = 1
    INNER JOIN identities i
      ON i.id = p.identity_id
    GROUP BY r.room_id
    ORDER BY r.last_activity_at DESC
  `);

  app.get('/api/rooms', (c) => {
    const rows = stmt.all();
    const response: ListRoomsResponse = {
      rooms: rows.map((row) => {
        const handles = (JSON.parse(row.handles_json) as string[]).slice().sort();
        return {
          room_id: row.room_id,
          title: row.title,
          story_slug: row.story_slug,
          participants: handles.map((handle) => ({ handle })),
          last_activity_at: row.last_activity_at,
        };
      }),
    };
    return c.json(response, 200);
  });
}
