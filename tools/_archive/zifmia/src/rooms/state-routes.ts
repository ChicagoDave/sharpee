/**
 * Room state hydration route — `GET /api/rooms/:id/state`.
 *
 * Public interface: {@link registerRoomStateRoute},
 * {@link DEFAULT_RECORDING_NOTICE}.
 * Owner: zifmia server, HTTP surface.
 *
 * Returns the typed `RoomStateResponse` shape from ADR-177 §4:
 *   - room metadata (id, title, join_code, story_slug, pinned,
 *     primary_host_id, recording_notice)
 *   - cmgt (channel manifest from ADR-163) — Phase-5a placeholder; the
 *     real manifest is produced by the engine in Phase 5b
 *   - transcript_backlog (capped at 1000 turns) — built from
 *     session_events of kind 'command' / 'output' ordered by ts asc
 *   - roster (participants with handle + tier + flags)
 *   - lock state (from the WS hub)
 *   - grace state (when the PH is in their grace window)
 *
 * `recording_notice` reads from the operator's `config` table per
 * ADR-177 §8. Phase 5a uses a hardcoded default; Phase 6 wires the
 * config table.
 */

import type { FastifyInstance } from 'fastify';
import type { IdentityRepository } from '../identity/repository.js';
import type { RoomsRepository } from './repository.js';
import type { ParticipantsRepository } from './participants.js';
import type { RoomsHub } from '../ws/rooms-hub.js';
import type { SessionEventsRepository } from '../sessions/events-repo.js';
import type { SuccessionService } from '../succession/service.js';
import type { ManifestCache } from '../engine/manifest-cache.js';
import type { ConfigRepository } from '../config/repo.js';
import { loadCaller } from './tier-gate.js';
import { TRANSCRIPT_BACKLOG_LIMIT } from '../sessions/events-repo.js';
import type { Tier } from './types.js';

export const DEFAULT_RECORDING_NOTICE =
  'Conversations in this room may be recorded for audit and replay.';

export interface RoomStateRouteDeps {
  identities: IdentityRepository;
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  hub: RoomsHub;
  sessionEvents: SessionEventsRepository;
  succession: SuccessionService;
  /** Optional: when set, GET /state returns the engine's real cmgt for the room's story. */
  manifestCache?: ManifestCache;
  /** Optional config repo. When present, recording_notice reads from `config.recording_notice`. */
  config?: ConfigRepository;
  /** Static fallback recording notice (used when `config` is absent or key is missing). */
  recordingNotice?: string;
}

interface IdParam { id: string; }
interface StateQuery { handle?: string; }

interface TurnPacketPayload {
  turnId: string;
  /** Wall-clock at the time the engine produced the output (ms epoch). */
  ts: number;
  /** Submitter handle for the player command. Empty string when unknown. */
  submitter: { id: string; handle: string } | null;
  /** Raw command text the submitter typed (echoed in the client). */
  text: string;
  channels: Record<string, unknown[]>;
}

function gateFailureToStatus(reason: 'unknown_handle' | 'room_not_found' | 'not_in_room'): number {
  if (reason === 'unknown_handle') return 401;
  if (reason === 'room_not_found') return 404;
  return 403;
}

export function registerRoomStateRoute(app: FastifyInstance, deps: RoomStateRouteDeps): void {
  const staticFallback = deps.recordingNotice ?? DEFAULT_RECORDING_NOTICE;
  const readRecordingNotice = (): string =>
    deps.config?.getOr('recording_notice', staticFallback) ?? staticFallback;

  app.get<{ Params: IdParam; Querystring: StateQuery }>(
    '/api/rooms/:id/state',
    async (request, reply) => {
      const gate = loadCaller(
        deps.identities,
        deps.rooms,
        deps.participants,
        request.params.id,
        request.query.handle
      );
      if (!gate.ok) {
        return reply.code(gateFailureToStatus(gate.reason)).send({ error: gate.reason });
      }

      const room = gate.room;
      const rosterRows = deps.participants.listByRoom(room.id);

      // Resolve identity_id → handle via the lobby join (existing
      // SQL joins identities + participants for the lobby projection).
      const lobbySummary = deps.rooms.listLobby().find((r) => r.id === room.id);
      const handleByIdentity = new Map<string, string>();
      if (lobbySummary) {
        for (const p of lobbySummary.participants) handleByIdentity.set(p.identity_id, p.handle);
      }

      const connectedIds = new Set(deps.hub.connectedParticipants(room.id));
      const roster = rosterRows.map((p) => ({
        participant_id: p.id,
        identity_id: p.identity_id,
        handle: handleByIdentity.get(p.identity_id) ?? '',
        tier: p.tier as Tier,
        muted: p.muted,
        connected: connectedIds.has(p.id),
        is_successor: p.is_successor
      }));

      const lockState = deps.hub.lock(room.id).state();

      const transcriptEvents = deps.sessionEvents.listByRoom(room.id, {
        kinds: ['command', 'output'],
        limit: TRANSCRIPT_BACKLOG_LIMIT
      });
      // Pair `command` (text + submitter) with the matching `output`
      // (channels) by turnId. Replay order follows the `output` event so
      // empty turns are dropped from the backlog (the wire packet's
      // submitter/text/ts ride on the broadcast frame; backlog has to
      // reconstruct them from the event log).
      const commandByTurn = new Map<string, { ts: number; text: string; submitter: { id: string; handle: string } | null }>();
      const transcript_backlog: TurnPacketPayload[] = [];
      for (const ev of transcriptEvents) {
        const payload = ev.payload as
          | { turnId?: string; channels?: Record<string, unknown[]>; text?: string; handle?: string }
          | null;
        if (!payload || typeof payload.turnId !== 'string') continue;
        if (ev.kind === 'command') {
          const handle = typeof payload.handle === 'string' ? payload.handle : '';
          const submitter = ev.participant_id && handle
            ? { id: ev.participant_id, handle }
            : null;
          const text = typeof payload.text === 'string' ? payload.text : '';
          commandByTurn.set(payload.turnId, { ts: ev.ts, text, submitter });
        } else if (ev.kind === 'output') {
          const cmd = commandByTurn.get(payload.turnId);
          transcript_backlog.push({
            turnId: payload.turnId,
            ts: cmd?.ts ?? ev.ts,
            submitter: cmd?.submitter ?? null,
            text: cmd?.text ?? '',
            channels: payload.channels ?? {}
          });
        }
      }

      // Grace state: surface only when this room currently has a
      // pending grace timer.
      const gracePending = deps.succession.isGracePending(room.id);
      // We don't currently expose the deadline timestamp through the
      // SuccessionService public surface; surfaces as a flag only in 5a.
      // Phase 5b can expose the precise deadline if a client needs it
      // beyond what the supplemental `presence` frame already carries.
      const grace = gracePending ? { pending: true } : undefined;

      // Real CmgtPacket when the manifest cache is available (engine
      // router boot path); falls back to an empty manifest placeholder
      // otherwise (Phase-3 echo path, tests with fake bundles).
      let cmgt: unknown = { channels: [] };
      if (deps.manifestCache) {
        const captured = await deps.manifestCache.get(room.story_slug);
        if (captured) cmgt = captured;
      }

      return reply.code(200).send({
        room: {
          id: room.id,
          title: room.title,
          join_code: room.join_code,
          story_slug: room.story_slug,
          pinned: room.pinned,
          primary_host_id: room.primary_host_id,
          recording_notice: readRecordingNotice()
        },
        cmgt,
        transcript_backlog,
        roster,
        lock: {
          holder: lockState.holder,
          expiresAt: lockState.expiresAt
        },
        grace
      });
    }
  );
}
