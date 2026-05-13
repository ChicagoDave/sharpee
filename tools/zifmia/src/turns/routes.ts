/**
 * Turn-submission + force-release HTTP routes per ADR-177 §3, §4.
 *
 * Public interface: {@link registerTurnRoutes}.
 * Owner: zifmia server, HTTP surface.
 *
 * Routes:
 *   POST /api/rooms/:id/command        { handle, text } → 200 { turnId }
 *   POST /api/rooms/:id/force-release  { handle, target? } → 200 (PH/CoHost)
 *
 * The command route is the "process is HTTP" entry point. Its
 * response is ONLY `{ turnId }` — the resulting `TurnPacket` is
 * broadcast over WS to every connected participant (submitter
 * included). See ADR-177 §Invariants: "The submitter is just another
 * subscriber."
 *
 * Phase-3 note: the engine integration is stubbed by
 * `createEchoCommandRouter`. The route is real; the packet content
 * is synthetic. Phase 5 swaps the router for the engine path without
 * touching the HTTP shape.
 */

import type { FastifyInstance } from 'fastify';
import type { IdentityRepository } from '../identity/repository.js';
import type { RoomsRepository } from '../rooms/repository.js';
import type { ParticipantsRepository } from '../rooms/participants.js';
import type { RoomsHub } from '../ws/rooms-hub.js';
import type { CommandRouter } from './command-router.js';
import type { SessionEventsRepository } from '../sessions/events-repo.js';
import { loadCaller } from '../rooms/tier-gate.js';
import type { TurnFrame, LockStateFrame } from '../ws/types.js';

export interface TurnRoutesDeps {
  identities: IdentityRepository;
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  hub: RoomsHub;
  router: CommandRouter;
  sessionEvents?: SessionEventsRepository;
}

interface CommandBody { handle?: unknown; text?: unknown; }
interface ForceReleaseBody { handle?: unknown; target?: unknown; }
interface IdParam { id: string; }

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function gateFailureToStatus(reason: 'unknown_handle' | 'room_not_found' | 'not_in_room'): number {
  if (reason === 'unknown_handle') return 401;
  if (reason === 'room_not_found') return 404;
  return 403;
}

const MAX_COMMAND_LENGTH = 1000;

export function registerTurnRoutes(app: FastifyInstance, deps: TurnRoutesDeps): void {
  const { identities, rooms, participants, hub, router, sessionEvents } = deps;

  // POST /api/rooms/:id/command — submit a turn.
  app.post<{ Body: CommandBody; Params: IdParam }>(
    '/api/rooms/:id/command',
    async (request, reply) => {
      const gate = loadCaller(identities, rooms, participants, request.params.id, request.body?.handle);
      if (!gate.ok) return reply.code(gateFailureToStatus(gate.reason)).send({ error: gate.reason });

      // Muted participants can't submit commands. The column exists
      // (Phase 2 schema) but the /mute route ships in Phase 6; for
      // now the check is defensive.
      if (gate.caller.muted) return reply.code(403).send({ error: 'muted' });

      const text = request.body?.text;
      if (!isString(text) || text.length === 0 || text.length > MAX_COMMAND_LENGTH) {
        return reply.code(400).send({ error: 'invalid_command' });
      }

      let result: { turnId: string; packet: import('../ws/types.js').TurnPacket };
      try {
        result = await router.execute({
          roomId: request.params.id,
          participantId: gate.caller.id,
          identityId: gate.identity.id,
          handle: gate.identity.handle,
          text
        });
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'unknown_story') return reply.code(500).send({ error: 'unknown_story' });
        if (code === 'room_not_found') return reply.code(404).send({ error: 'room_not_found' });
        request.log.error({ err }, 'turn_failed');
        return reply.code(500).send({ error: 'turn_failed' });
      }

      // Persist the command-input row (kind=command) and the engine's
      // TurnPacket as kind=output. Together they form the
      // transcript_backlog surfaced in GET /state.
      sessionEvents?.append({
        roomId: request.params.id,
        participantId: gate.caller.id,
        kind: 'command',
        payload: { turnId: result.turnId, text, handle: gate.identity.handle }
      });
      sessionEvents?.append({
        roomId: request.params.id,
        participantId: gate.caller.id,
        kind: 'output',
        payload: { turnId: result.turnId, channels: result.packet.channels }
      });

      const frame: TurnFrame = {
        type: 'turn',
        roomId: request.params.id,
        turnId: result.turnId,
        submitter: { id: gate.identity.id, handle: gate.identity.handle },
        packet: result.packet
      };
      hub.broadcast(request.params.id, frame);
      rooms.touchLastActivity(request.params.id);

      // ADR-177 §Invariants: response is the acknowledgement only.
      // The TurnPacket arrives on the WS broadcast — do NOT include
      // it in this body.
      return reply.code(200).send({ turnId: result.turnId });
    }
  );

  // POST /api/rooms/:id/force-release — moderation: clear the typing lock.
  app.post<{ Body: ForceReleaseBody; Params: IdParam }>(
    '/api/rooms/:id/force-release',
    async (request, reply) => {
      const gate = loadCaller(identities, rooms, participants, request.params.id, request.body?.handle);
      if (!gate.ok) return reply.code(gateFailureToStatus(gate.reason)).send({ error: gate.reason });
      if (gate.caller.tier !== 'primary_host' && gate.caller.tier !== 'co_host') {
        return reply.code(403).send({ error: 'forbidden' });
      }

      const lock = hub.lock(request.params.id);
      const outcome = lock.forceRelease();
      if (outcome.broadcast) {
        const lf: LockStateFrame = {
          type: 'lock:state',
          roomId: request.params.id,
          holder: null,
          expiresAt: null
        };
        hub.broadcast(request.params.id, lf);
      }
      rooms.touchLastActivity(request.params.id);
      return reply.code(200).send({ released: outcome.broadcast });
    }
  );
}
