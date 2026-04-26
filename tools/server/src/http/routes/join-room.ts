/**
 * POST /api/rooms/:room_id/join — joins an existing room or reconnects.
 *
 * Public interface: {@link registerJoinRoomRoute}, {@link JoinRoomDeps},
 * {@link JoinRoomResponse}.
 * Bounded context: HTTP layer (ADR-153 Decision 4, Decision 11; ADR-161
 * auth uniformity).
 *
 * Auth contract (ADR-161 Phase B): the body carries `(handle, passcode)`,
 * not a bare `identity_id`. Resolution mirrors create-room and the WS
 * hello handler. `id` is server-internal and never accepted from the
 * client. Display name is sourced from the resolved `identity.handle`.
 *
 * Reconnect contract: if the request carries a valid `Authorization: Bearer <token>`
 * header AND the token resolves to a participant in the same room, the server
 * reuses that participant_id and refreshes `connected=1`. If the token
 * resolves to a different room, the server returns 401 rather than
 * silently creating a new participant — the client is expected to drop
 * the stale token.
 */

import type { Hono } from 'hono';
import type { Database } from 'better-sqlite3';
import type { RoomsRepository } from '../../repositories/rooms.js';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { IdentitiesRepository } from '../../repositories/identities.js';
import type { SessionEventsRepository } from '../../repositories/session-events.js';
import type { HashService } from '../../auth/hash-service.js';
import type { CaptchaVerifier } from '../middleware/captcha.js';
import { HttpError } from '../middleware/error-envelope.js';
import { generateToken, parseBearer } from '../tokens.js';

export interface JoinRoomDeps {
  db: Database;
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  identities: IdentitiesRepository;
  hashService: HashService;
  sessionEvents: SessionEventsRepository;
  captcha: CaptchaVerifier;
}

export interface JoinRoomResponse {
  participant_id: string;
  token: string;
  tier: 'participant' | 'command_entrant' | 'co_host' | 'primary_host';
}

interface JoinBody {
  handle?: unknown;
  passcode?: unknown;
  captcha_token?: unknown;
}

export function registerJoinRoomRoute(app: Hono, deps: JoinRoomDeps): void {
  app.post('/api/rooms/:room_id/join', async (c) => {
    const room_id = c.req.param('room_id');
    const room = deps.rooms.findById(room_id);
    if (!room) throw new HttpError(404, 'room_not_found', `No room with id ${room_id}`);

    const body = (await c.req.json().catch(() => null)) as JoinBody | null;
    if (!body) throw new HttpError(400, 'bad_request', 'JSON body required');

    const handle = typeof body.handle === 'string' ? body.handle : '';
    const passcode = typeof body.passcode === 'string' ? body.passcode : '';
    const captchaToken = typeof body.captcha_token === 'string' ? body.captcha_token : undefined;
    if (!handle) throw new HttpError(400, 'missing_field', 'handle is required');
    if (!passcode) throw new HttpError(400, 'missing_field', 'passcode is required');

    await deps.captcha.verify(captchaToken);

    // ADR-161 auth uniformity — same flow as create-room and WS hello.
    const auth = deps.identities.findHashByHandle(handle);
    if (!auth) {
      throw new HttpError(404, 'unknown_handle', 'no identity with that handle');
    }
    const verified = await deps.hashService.verify(passcode, auth.passcode_hash);
    if (!verified) {
      throw new HttpError(401, 'bad_passcode', 'incorrect passcode for that handle');
    }
    const identity = deps.identities.findById(auth.id);
    if (!identity) {
      throw new HttpError(500, 'internal_error', 'identity vanished mid-request');
    }

    const presented = parseBearer(c.req.header('authorization'));
    if (presented) {
      const existing = deps.participants.findByToken(presented);
      if (existing && existing.room_id !== room_id) {
        throw new HttpError(401, 'token_wrong_room', 'token does not belong to this room');
      }
    }

    const token = presented ?? generateToken();
    const now = new Date().toISOString();
    const display_name = identity.handle;

    const tx = deps.db.transaction(() => {
      const participant = deps.participants.createOrReconnect({
        room_id,
        identity_id: identity.id,
        token,
      });
      const isReconnect = participant.joined_at !== now && presented !== null;
      deps.sessionEvents.append({
        room_id,
        participant_id: participant.participant_id,
        kind: 'join',
        payload: { kind: 'join', display_name, reconnect: isReconnect },
      });
      deps.rooms.updateLastActivity(room_id, now);
      return participant;
    });
    const participant = tx();

    const response: JoinRoomResponse = {
      participant_id: participant.participant_id,
      token,
      tier: participant.tier,
    };
    return c.json(response, 200);
  });
}
