/**
 * Room HTTP routes per ADR-177 §4.
 *
 * Public interface: {@link registerRoomRoutes}.
 * Owner: zifmia server, HTTP surface.
 *
 * Phase 2 routes shipped here:
 *   GET  /api/rooms                        — public lobby list (optionally `?code=`)
 *   POST /api/rooms                        — create as PH
 *   POST /api/rooms/:id/join               — join as participant
 *   POST /api/rooms/:id/rename             — PH-only
 *   POST /api/rooms/:id/pin                — PH-only
 *   POST /api/rooms/:id/nominate-successor — PH-only
 *   POST /api/rooms/:id/promote            — PH-only
 *   POST /api/rooms/:id/demote             — PH/CoHost
 *   GET  /api/code/:join_code              — code → room resolver
 *
 * Phase 6 will add /delete and /mute; Phase 3 adds /force-release.
 */

import type { FastifyInstance } from 'fastify';
import type { IdentityRepository } from '../identity/repository.js';
import type { RoomsRepository } from './repository.js';
import type { ParticipantsRepository } from './participants.js';
import { randomUUID } from 'node:crypto';
import type { StoryScanner } from '../stories/scanner.js';
import type { RoomsHub } from '../ws/rooms-hub.js';
import type { Participant } from './types.js';
import type { RoleChangeFrame, MuteStateFrame, DmMessageFrame } from '../ws/types.js';
import type { SessionEventsRepository } from '../sessions/events-repo.js';
import { CLOSE_CODES } from '../ws/types.js';
import { loadCaller } from './tier-gate.js';
import { isTier, tierRank, type Tier } from './types.js';
import { normalizeJoinCode } from './join-code.js';

export interface RoomRoutesDeps {
  identities: IdentityRepository;
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  stories: StoryScanner;
  /** Optional WS hub. When present, tier-changing routes broadcast role_change. */
  hub?: RoomsHub;
  /** Optional session-events repo. When present, governance routes append audit rows. */
  sessionEvents?: SessionEventsRepository;
}

function broadcastRoleChange(
  hub: RoomsHub | undefined,
  roomId: string,
  target: Participant,
  actorIdentityId: string
): void {
  if (!hub) return;
  const frame: RoleChangeFrame = {
    type: 'role_change',
    roomId,
    participantId: target.id,
    tier: target.tier,
    actorId: actorIdentityId
  };
  hub.broadcast(roomId, frame);
}

interface CreateRoomBody { handle?: unknown; story_slug?: unknown; title?: unknown; }
interface JoinBody { handle?: unknown; }
interface RenameBody { handle?: unknown; title?: unknown; }
interface PinBody { handle?: unknown; pinned?: unknown; }
interface NominateBody { handle?: unknown; target?: unknown; }
interface TierChangeBody { handle?: unknown; target?: unknown; to_tier?: unknown; }
interface DeleteBody { handle?: unknown; confirm_title?: unknown; }
interface MuteBody { handle?: unknown; target?: unknown; muted?: unknown; }
interface DmBody { handle?: unknown; text?: unknown; }
interface IdParam { id: string; }
interface CodeParam { join_code: string; }
interface RoomsQuery { code?: string; }

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function gateFailureToStatus(reason: 'unknown_handle' | 'room_not_found' | 'not_in_room'): number {
  if (reason === 'unknown_handle') return 401;
  if (reason === 'room_not_found') return 404;
  return 403;
}

export function registerRoomRoutes(app: FastifyInstance, deps: RoomRoutesDeps): void {
  const { identities, rooms, participants, stories, hub, sessionEvents } = deps;

  // GET /api/rooms — open lobby list; optional ?code= filter.
  app.get<{ Querystring: RoomsQuery }>('/api/rooms', async (request) => {
    const all = rooms.listLobby();
    if (request.query.code) {
      const normalized = normalizeJoinCode(request.query.code);
      const filtered = normalized
        ? all.filter((r) => r.join_code === normalized)
        : [];
      return { rooms: filtered };
    }
    return { rooms: all };
  });

  // GET /api/code/:join_code — resolve a shareable code to a room id.
  app.get<{ Params: CodeParam }>('/api/code/:join_code', async (request, reply) => {
    const normalized = normalizeJoinCode(request.params.join_code);
    if (!normalized) return reply.code(404).send({ error: 'room_not_found' });
    const room = rooms.getByJoinCode(normalized);
    if (!room) return reply.code(404).send({ error: 'room_not_found' });
    return { id: room.id, join_code: room.join_code, title: room.title };
  });

  // POST /api/rooms — create as PH.
  app.post<{ Body: CreateRoomBody }>('/api/rooms', async (request, reply) => {
    const handle = request.body?.handle;
    const story_slug = request.body?.story_slug;
    const title = request.body?.title;

    const identity = identities.getByHandle(handle);
    if (!identity) return reply.code(401).send({ error: 'unknown_handle' });

    if (!isString(story_slug) || !stories.has(story_slug)) {
      return reply.code(422).send({ error: 'unknown_story' });
    }

    const result = rooms.createRoom({
      identityId: identity.id,
      storySlug: story_slug,
      title: title as string
    });
    if (!result.ok) {
      if (result.error === 'invalid_title') return reply.code(400).send({ error: 'invalid_title' });
      return reply.code(503).send({ error: 'join_code_unavailable' });
    }

    const participant = participants.insertInitial({
      roomId: result.room.id,
      identityId: identity.id,
      tier: 'primary_host'
    });

    sessionEvents?.append({
      roomId: result.room.id,
      participantId: participant.id,
      kind: 'lifecycle',
      payload: { event: 'room_created', title: result.room.title, story_slug: result.room.story_slug }
    });

    return reply.code(201).send({ room: result.room, participant });
  });

  // POST /api/rooms/:id/join — join as participant.
  app.post<{ Body: JoinBody; Params: IdParam }>('/api/rooms/:id/join', async (request, reply) => {
    const handle = request.body?.handle;
    const identity = identities.getByHandle(handle);
    if (!identity) return reply.code(401).send({ error: 'unknown_handle' });

    const room = rooms.getRoom(request.params.id);
    if (!room || room.deleted_at !== null) return reply.code(404).send({ error: 'room_not_found' });

    const { participant, alreadyParticipant } = participants.joinAsParticipant(room.id, identity.id);
    if (!alreadyParticipant) {
      sessionEvents?.append({
        roomId: room.id,
        participantId: participant.id,
        kind: 'join',
        payload: { handle: identity.handle, tier: participant.tier }
      });
    }
    rooms.touchLastActivity(room.id);
    return reply.code(200).send({ participant, already_participant: alreadyParticipant });
  });

  // POST /api/rooms/:id/rename — PH-only.
  app.post<{ Body: RenameBody; Params: IdParam }>('/api/rooms/:id/rename', async (request, reply) => {
    const gate = loadCaller(identities, rooms, participants, request.params.id, request.body?.handle);
    if (!gate.ok) return reply.code(gateFailureToStatus(gate.reason)).send({ error: gate.reason });
    if (gate.caller.tier !== 'primary_host') return reply.code(403).send({ error: 'forbidden' });

    const renamed = rooms.renameRoom(request.params.id, request.body?.title as string);
    if (!renamed.ok) return reply.code(renamed.error === 'invalid_title' ? 400 : 404).send({ error: renamed.error });
    sessionEvents?.append({
      roomId: request.params.id,
      participantId: gate.caller.id,
      kind: 'lifecycle',
      payload: { event: 'renamed', title: renamed.room.title }
    });
    return { room: renamed.room };
  });

  // POST /api/rooms/:id/pin — PH-only.
  app.post<{ Body: PinBody; Params: IdParam }>('/api/rooms/:id/pin', async (request, reply) => {
    const gate = loadCaller(identities, rooms, participants, request.params.id, request.body?.handle);
    if (!gate.ok) return reply.code(gateFailureToStatus(gate.reason)).send({ error: gate.reason });
    if (gate.caller.tier !== 'primary_host') return reply.code(403).send({ error: 'forbidden' });

    const pinned = request.body?.pinned === true;
    const result = rooms.pinRoom(request.params.id, pinned);
    if (!result.ok) return reply.code(404).send({ error: result.error });
    sessionEvents?.append({
      roomId: request.params.id,
      participantId: gate.caller.id,
      kind: pinned ? 'pin' : 'unpin',
      payload: { pinned }
    });
    return { room: result.room };
  });

  // POST /api/rooms/:id/nominate-successor — PH-only.
  app.post<{ Body: NominateBody; Params: IdParam }>('/api/rooms/:id/nominate-successor', async (request, reply) => {
    const gate = loadCaller(identities, rooms, participants, request.params.id, request.body?.handle);
    if (!gate.ok) return reply.code(gateFailureToStatus(gate.reason)).send({ error: gate.reason });
    if (gate.caller.tier !== 'primary_host') return reply.code(403).send({ error: 'forbidden' });

    const targetIdentity = identities.getByHandle(request.body?.target);
    if (!targetIdentity) return reply.code(404).send({ error: 'target_not_in_room' });
    const targetParticipant = participants.getByRoomAndIdentity(request.params.id, targetIdentity.id);
    if (!targetParticipant) return reply.code(404).send({ error: 'target_not_in_room' });
    if (targetParticipant.id === gate.caller.id) return reply.code(400).send({ error: 'cannot_nominate_self' });

    const result = participants.nominateSuccessor(request.params.id, targetParticipant.id);
    if (!result.ok) return reply.code(404).send({ error: result.error });
    rooms.touchLastActivity(request.params.id);
    sessionEvents?.append({
      roomId: request.params.id,
      participantId: gate.caller.id,
      kind: 'nominated_successor',
      payload: { target_participant_id: targetParticipant.id, target_handle: targetIdentity.handle }
    });
    // Nomination doesn't change tier; it only sets is_successor.
    // Phase 4 broadcasts the actual succession event when the grace
    // timer fires. For now, no role_change emission here.
    return { participant: result.participant };
  });

  // POST /api/rooms/:id/promote — PH-only.
  app.post<{ Body: TierChangeBody; Params: IdParam }>('/api/rooms/:id/promote', async (request, reply) => {
    const gate = loadCaller(identities, rooms, participants, request.params.id, request.body?.handle);
    if (!gate.ok) return reply.code(gateFailureToStatus(gate.reason)).send({ error: gate.reason });
    if (gate.caller.tier !== 'primary_host') return reply.code(403).send({ error: 'forbidden' });

    const toTier = request.body?.to_tier;
    if (!isTier(toTier) || toTier === 'primary_host' || toTier === 'participant') {
      return reply.code(400).send({ error: 'invalid_tier_transition' });
    }

    const targetIdentity = identities.getByHandle(request.body?.target);
    if (!targetIdentity) return reply.code(404).send({ error: 'target_not_in_room' });
    const targetParticipant = participants.getByRoomAndIdentity(request.params.id, targetIdentity.id);
    if (!targetParticipant) return reply.code(404).send({ error: 'target_not_in_room' });
    if (targetParticipant.tier === 'primary_host') {
      return reply.code(400).send({ error: 'invalid_tier_transition' });
    }
    if (tierRank(targetParticipant.tier) >= tierRank(toTier as Tier)) {
      return reply.code(400).send({ error: 'invalid_tier_transition' });
    }

    const result = participants.setTier(targetParticipant.id, toTier as Tier);
    if (!result.ok) return reply.code(404).send({ error: result.error });
    rooms.touchLastActivity(request.params.id);
    broadcastRoleChange(hub, request.params.id, result.participant, gate.identity.id);
    sessionEvents?.append({
      roomId: request.params.id,
      participantId: gate.caller.id,
      kind: 'role_change',
      payload: { target_participant_id: result.participant.id, from_tier: targetParticipant.tier, to_tier: result.participant.tier, direction: 'promote' }
    });
    return { participant: result.participant };
  });

  // POST /api/rooms/:id/demote — PH or CoHost.
  app.post<{ Body: TierChangeBody; Params: IdParam }>('/api/rooms/:id/demote', async (request, reply) => {
    const gate = loadCaller(identities, rooms, participants, request.params.id, request.body?.handle);
    if (!gate.ok) return reply.code(gateFailureToStatus(gate.reason)).send({ error: gate.reason });
    if (gate.caller.tier !== 'primary_host' && gate.caller.tier !== 'co_host') {
      return reply.code(403).send({ error: 'forbidden' });
    }

    const toTier = request.body?.to_tier;
    if (!isTier(toTier) || toTier === 'primary_host') {
      return reply.code(400).send({ error: 'invalid_tier_transition' });
    }

    const targetIdentity = identities.getByHandle(request.body?.target);
    if (!targetIdentity) return reply.code(404).send({ error: 'target_not_in_room' });
    const targetParticipant = participants.getByRoomAndIdentity(request.params.id, targetIdentity.id);
    if (!targetParticipant) return reply.code(404).send({ error: 'target_not_in_room' });
    if (targetParticipant.tier === 'primary_host') {
      return reply.code(400).send({ error: 'invalid_tier_transition' });
    }
    if (tierRank(targetParticipant.tier) <= tierRank(toTier as Tier)) {
      return reply.code(400).send({ error: 'invalid_tier_transition' });
    }
    // CoHost may not demote a CoHost (peer-equal); only PH can.
    if (gate.caller.tier === 'co_host' && targetParticipant.tier === 'co_host') {
      return reply.code(403).send({ error: 'forbidden' });
    }

    const result = participants.setTier(targetParticipant.id, toTier as Tier);
    if (!result.ok) return reply.code(404).send({ error: result.error });
    rooms.touchLastActivity(request.params.id);
    broadcastRoleChange(hub, request.params.id, result.participant, gate.identity.id);
    sessionEvents?.append({
      roomId: request.params.id,
      participantId: gate.caller.id,
      kind: 'role_change',
      payload: { target_participant_id: result.participant.id, from_tier: targetParticipant.tier, to_tier: result.participant.tier, direction: 'demote' }
    });
    return { participant: result.participant };
  });

  // POST /api/rooms/:id/delete — PH-only with title-confirmation gate.
  app.post<{ Body: DeleteBody; Params: IdParam }>('/api/rooms/:id/delete', async (request, reply) => {
    const gate = loadCaller(identities, rooms, participants, request.params.id, request.body?.handle);
    if (!gate.ok) return reply.code(gateFailureToStatus(gate.reason)).send({ error: gate.reason });
    if (gate.caller.tier !== 'primary_host') return reply.code(403).send({ error: 'forbidden' });

    const confirmTitle = request.body?.confirm_title;
    if (typeof confirmTitle !== 'string' || confirmTitle !== gate.room.title) {
      return reply.code(422).send({ error: 'title_mismatch' });
    }

    const deleted = rooms.softDelete(request.params.id);
    if (!deleted) return reply.code(404).send({ error: 'room_not_found' });

    sessionEvents?.append({
      roomId: request.params.id,
      participantId: gate.caller.id,
      kind: 'lifecycle',
      payload: { event: 'deleted', by_handle: gate.identity.handle, title: gate.room.title }
    });

    if (hub) {
      hub.closeForRoom(request.params.id, CLOSE_CODES.ROOM_NOT_FOUND);
    }

    return reply.code(200).send({ deleted: true });
  });

  // POST /api/rooms/:id/mute — PH or CoHost.
  app.post<{ Body: MuteBody; Params: IdParam }>('/api/rooms/:id/mute', async (request, reply) => {
    const gate = loadCaller(identities, rooms, participants, request.params.id, request.body?.handle);
    if (!gate.ok) return reply.code(gateFailureToStatus(gate.reason)).send({ error: gate.reason });
    if (gate.caller.tier !== 'primary_host' && gate.caller.tier !== 'co_host') {
      return reply.code(403).send({ error: 'forbidden' });
    }

    const targetIdentity = identities.getByHandle(request.body?.target);
    if (!targetIdentity) return reply.code(404).send({ error: 'target_not_in_room' });
    const targetParticipant = participants.getByRoomAndIdentity(request.params.id, targetIdentity.id);
    if (!targetParticipant) return reply.code(404).send({ error: 'target_not_in_room' });

    if (targetParticipant.tier === 'primary_host') {
      return reply.code(400).send({ error: 'cannot_mute_primary_host' });
    }
    // CoHost may not mute peer CoHost; only PH can.
    if (gate.caller.tier === 'co_host' && targetParticipant.tier === 'co_host') {
      return reply.code(403).send({ error: 'forbidden' });
    }

    const muted = request.body?.muted === true;
    const result = participants.setMuted(targetParticipant.id, muted);
    if (!result.ok) return reply.code(404).send({ error: result.error });

    rooms.touchLastActivity(request.params.id);

    if (hub) {
      const frame: MuteStateFrame = {
        type: 'mute_state',
        roomId: request.params.id,
        participantId: result.participant.id,
        muted,
        actorId: gate.identity.id
      };
      hub.broadcast(request.params.id, frame);
    }
    sessionEvents?.append({
      roomId: request.params.id,
      participantId: gate.caller.id,
      kind: 'mute_state',
      payload: { target_participant_id: result.participant.id, muted }
    });

    return { participant: result.participant };
  });

  // POST /api/rooms/:id/dm — PH or CoHost only.
  app.post<{ Body: DmBody; Params: IdParam }>('/api/rooms/:id/dm', async (request, reply) => {
    const gate = loadCaller(identities, rooms, participants, request.params.id, request.body?.handle);
    if (!gate.ok) return reply.code(gateFailureToStatus(gate.reason)).send({ error: gate.reason });
    if (gate.caller.tier !== 'primary_host' && gate.caller.tier !== 'co_host') {
      return reply.code(403).send({ error: 'forbidden' });
    }
    if (gate.caller.muted) return reply.code(403).send({ error: 'muted' });

    const text = request.body?.text;
    if (typeof text !== 'string' || text.length === 0 || text.length > 1000) {
      return reply.code(400).send({ error: 'invalid_text' });
    }

    rooms.touchLastActivity(request.params.id);
    const id = randomUUID();
    const ts = Date.now();

    sessionEvents?.append({
      roomId: request.params.id,
      participantId: gate.caller.id,
      kind: 'dm',
      payload: { id, fromId: gate.identity.id, fromHandle: gate.identity.handle, text, ts }
    });

    if (hub) {
      const frame: DmMessageFrame = {
        type: 'dm:message',
        id,
        roomId: request.params.id,
        fromId: gate.identity.id,
        fromHandle: gate.identity.handle,
        text,
        ts
      };
      // Filter to PH + CoHost recipients only. Look up tier per
      // socket fresh from the participants table so a recently-demoted
      // CoHost stops seeing DMs in the same turn.
      hub.broadcastWhere(
        request.params.id,
        (s) => {
          const p = participants.getById(s.participantId);
          return p?.tier === 'primary_host' || p?.tier === 'co_host';
        },
        frame
      );
    }

    return reply.code(200).send({ id, ts });
  });
}
