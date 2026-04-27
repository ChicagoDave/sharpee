/**
 * PATCH /api/rooms/:room_id — the Primary Host renames their room.
 *
 * Public interface: {@link registerRenameRoomRoute}, {@link RenameRoomDeps}.
 * Wire types (`RenameRoomRequest`, `RenameRoomResponse`) live in
 * `../../wire/http-api.ts` — shared with the browser client.
 *
 * Bounded context: HTTP layer (ADR-153 Decision 3).
 *
 * Title validation mirrors `POST /api/rooms` so a rename can never produce
 * a title the initial create would have rejected. Auth uses the same Bearer
 * token scheme as `POST /api/rooms/:id/join` — the token must identify a
 * participant in the target room whose tier is `primary_host`.
 *
 * On success the new title is persisted and a `room_state` push is broadcast
 * to every connected socket of the room so other clients' headers re-render
 * without waiting for the next natural snapshot.
 */

import type { Hono } from 'hono';
import type { RoomsRepository } from '../../repositories/rooms.js';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { SessionEventsRepository } from '../../repositories/session-events.js';
import type { ConnectionManager } from '../../ws/connection-manager.js';
import { HttpError } from '../middleware/error-envelope.js';
import { parseBearer } from '../tokens.js';
import type { RenameRoomResponse } from '../../wire/http-api.js';

export interface RenameRoomDeps {
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  sessionEvents: SessionEventsRepository;
  /**
   * Optional. When absent, the rename still persists but no broadcast is
   * sent — acceptable in HTTP-only tests; the production wiring always
   * supplies one.
   */
  connections?: ConnectionManager;
}

interface RenameBody {
  title?: unknown;
}

const TITLE_MAX = 80;

export function registerRenameRoomRoute(app: Hono, deps: RenameRoomDeps): void {
  app.patch('/api/rooms/:room_id', async (c) => {
    const room_id = c.req.param('room_id');

    const body = (await c.req.json().catch(() => null)) as RenameBody | null;
    if (!body) throw new HttpError(400, 'bad_request', 'JSON body required');

    const raw = typeof body.title === 'string' ? body.title.trim() : '';
    if (!raw) throw new HttpError(400, 'missing_field', 'title is required');
    if (raw.length > TITLE_MAX) {
      throw new HttpError(
        400,
        'invalid_title',
        `title must be ${TITLE_MAX} characters or fewer`,
      );
    }

    const presented = parseBearer(c.req.header('authorization'));
    if (!presented) {
      throw new HttpError(401, 'unauthorized', 'Bearer token required');
    }
    const actor = deps.participants.findByToken(presented);
    if (!actor || actor.room_id !== room_id) {
      throw new HttpError(401, 'unauthorized', 'invalid or mismatched token');
    }
    if (actor.tier !== 'primary_host') {
      throw new HttpError(
        403,
        'insufficient_authority',
        'only the Primary Host may rename a room',
      );
    }

    const room = deps.rooms.findById(room_id);
    if (!room) throw new HttpError(404, 'room_not_found', `No room with id ${room_id}`);

    // No-op renames: same title (post-trim) — return 200 without touching the
    // DB or broadcasting, same spirit as the pin handler's already_* check.
    if (room.title === raw) {
      const response: RenameRoomResponse = { room_id, title: room.title };
      return c.json(response, 200);
    }

    deps.rooms.setTitle(room_id, raw);
    deps.sessionEvents.append({
      room_id,
      participant_id: actor.participant_id,
      kind: 'lifecycle',
      payload: { kind: 'lifecycle', op: 'renamed' },
    });

    // Refresh so the broadcast carries the canonical row state.
    const refreshed = deps.rooms.findById(room_id);
    const canonicalTitle = refreshed?.title ?? raw;
    const last_activity_at = refreshed?.last_activity_at ?? room.last_activity_at;
    const pinned = refreshed?.pinned ?? room.pinned;

    deps.connections?.broadcast(room_id, {
      kind: 'room_state',
      pinned,
      last_activity_at,
      title: canonicalTitle,
    });

    const response: RenameRoomResponse = { room_id, title: canonicalTitle };
    return c.json(response, 200);
  });
}
