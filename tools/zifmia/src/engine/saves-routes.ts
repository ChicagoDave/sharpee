/**
 * Saves HTTP routes per ADR-177 §4.
 *
 * Public interface: {@link registerSavesRoutes}.
 * Owner: zifmia server, HTTP surface.
 *
 * Routes:
 *   GET  /api/rooms/:id/saves         — list named saves (caller in room)
 *   POST /api/rooms/:id/saves         — create a named save from room_state
 *   POST /api/rooms/:id/restore       — copy a save's blob into room_state +
 *                                       broadcast `room_restored` WS frame
 *
 * No DELETE endpoint per project policy: saves live as long as the
 * room does. Recycle sweeper / room delete (Phase 6) handles cleanup
 * via CASCADE.
 */

import type { FastifyInstance } from 'fastify';
import type { IdentityRepository } from '../identity/repository.js';
import type { RoomsRepository } from '../rooms/repository.js';
import type { ParticipantsRepository } from '../rooms/participants.js';
import type { RoomsHub } from '../ws/rooms-hub.js';
import type { SessionEventsRepository } from '../sessions/events-repo.js';
import type { RoomStateRepository } from './room-state-repo.js';
import type { SavesRepository } from './saves-repo.js';
import { loadCaller } from '../rooms/tier-gate.js';
import type { RoomRestoredFrame } from '../ws/types.js';

export interface SavesRoutesDeps {
  identities: IdentityRepository;
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  hub: RoomsHub;
  sessionEvents: SessionEventsRepository;
  roomState: RoomStateRepository;
  saves: SavesRepository;
}

interface IdParam { id: string; }
interface SaveCreateBody { handle?: unknown; name?: unknown; }
interface RestoreBody { handle?: unknown; save_id?: unknown; }
interface ListQuery { handle?: string; }

const MAX_SAVE_NAME = 80;

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function gateFailureToStatus(reason: 'unknown_handle' | 'room_not_found' | 'not_in_room'): number {
  if (reason === 'unknown_handle') return 401;
  if (reason === 'room_not_found') return 404;
  return 403;
}

export function registerSavesRoutes(app: FastifyInstance, deps: SavesRoutesDeps): void {
  app.get<{ Params: IdParam; Querystring: ListQuery }>(
    '/api/rooms/:id/saves',
    async (request, reply) => {
      const gate = loadCaller(deps.identities, deps.rooms, deps.participants, request.params.id, request.query.handle);
      if (!gate.ok) return reply.code(gateFailureToStatus(gate.reason)).send({ error: gate.reason });
      const rows = deps.saves.listByRoom(request.params.id);
      return { saves: rows };
    }
  );

  app.post<{ Params: IdParam; Body: SaveCreateBody }>(
    '/api/rooms/:id/saves',
    async (request, reply) => {
      const gate = loadCaller(deps.identities, deps.rooms, deps.participants, request.params.id, request.body?.handle);
      if (!gate.ok) return reply.code(gateFailureToStatus(gate.reason)).send({ error: gate.reason });

      const rawName = request.body?.name;
      if (!isString(rawName)) return reply.code(400).send({ error: 'invalid_name' });
      const name = rawName.trim();
      if (name.length === 0 || name.length > MAX_SAVE_NAME) {
        return reply.code(400).send({ error: 'invalid_name' });
      }

      const blob = deps.roomState.get(request.params.id);
      if (!blob) {
        return reply.code(409).send({ error: 'no_state_yet' });
      }

      const row = deps.saves.create({
        roomId: request.params.id,
        actorId: gate.identity.id,
        name,
        blob
      });
      deps.sessionEvents.append({
        roomId: request.params.id,
        participantId: gate.caller.id,
        kind: 'save_created',
        payload: { save_id: row.save_id, name, actor_handle: gate.identity.handle }
      });
      deps.rooms.touchLastActivity(request.params.id);
      return reply.code(201).send({ save: row });
    }
  );

  app.post<{ Params: IdParam; Body: RestoreBody }>(
    '/api/rooms/:id/restore',
    async (request, reply) => {
      const gate = loadCaller(deps.identities, deps.rooms, deps.participants, request.params.id, request.body?.handle);
      if (!gate.ok) return reply.code(gateFailureToStatus(gate.reason)).send({ error: gate.reason });

      const saveId = request.body?.save_id;
      if (!isString(saveId)) return reply.code(400).send({ error: 'invalid_save_id' });

      const save = deps.saves.getById(saveId);
      if (!save || save.room_id !== request.params.id) {
        return reply.code(404).send({ error: 'save_not_found' });
      }

      deps.roomState.put(request.params.id, save.blob);
      deps.sessionEvents.append({
        roomId: request.params.id,
        participantId: gate.caller.id,
        kind: 'restored',
        payload: { save_id: saveId, by_handle: gate.identity.handle }
      });
      deps.rooms.touchLastActivity(request.params.id);

      // Broadcast room_restored — clients should re-fetch state via
      // GET /state because the transcript anchor has moved.
      const frame: RoomRestoredFrame = {
        type: 'room_restored',
        roomId: request.params.id,
        atSaveId: saveId,
        byHandle: gate.identity.handle
      };
      deps.hub.broadcast(request.params.id, frame);

      return reply.code(200).send({ atSaveId: saveId });
    }
  );
}
