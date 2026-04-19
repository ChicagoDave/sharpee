/**
 * GET /r/:code — resolves a join code to room summary metadata.
 *
 * Public interface: {@link registerResolveCodeRoute}, {@link ResolveCodeDeps}.
 * Bounded context: HTTP layer (ADR-153 Decision 3).
 *
 * This endpoint is reached by the join URL in emails / chat links.
 * Clients use the returned `room_id` to call `POST /api/rooms/:room_id/join`.
 */

import type { Hono } from 'hono';
import type { RoomsRepository } from '../../repositories/rooms.js';
import { HttpError } from '../middleware/error-envelope.js';

export interface ResolveCodeDeps {
  rooms: RoomsRepository;
}

export interface ResolveCodeResponse {
  room_id: string;
  title: string;
  story_slug: string;
  pinned: boolean;
}

export function registerResolveCodeRoute(app: Hono, deps: ResolveCodeDeps): void {
  app.get('/r/:code', (c) => {
    const code = c.req.param('code');
    const room = deps.rooms.findByJoinCode(code);
    if (!room) throw new HttpError(404, 'room_not_found', `No room with join code ${code}`);

    const response: ResolveCodeResponse = {
      room_id: room.room_id,
      title: room.title,
      story_slug: room.story_slug,
      pinned: room.pinned,
    };
    return c.json(response, 200);
  });
}
