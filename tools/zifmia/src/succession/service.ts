/**
 * SuccessionService — cascading PH succession per ADR-177 AC-5 +
 * §Carries forward.
 *
 * Public interface: {@link SuccessionService},
 * {@link createSuccessionService}, {@link DEFAULT_GRACE_MS}.
 * Owner: zifmia server, succession domain.
 *
 * Contract:
 *   - Listens to hub presence transitions. When a participant with
 *     `tier='primary_host'` disconnects, a grace timer starts and a
 *     supplemental `presence {connected:false, graceDeadline}` frame
 *     is broadcast.
 *   - If the same PH reconnects before the deadline, the timer is
 *     cancelled silently — the hub's regular `presence {connected:true}`
 *     already announced the reconnect.
 *   - On expiry: pick the next PH candidate by
 *     `(is_successor DESC, tier rank DESC, joined_at ASC)` filtered
 *     to currently-connected non-PH participants. If a candidate is
 *     found:
 *       - new PH's tier := primary_host
 *       - old PH's tier := participant
 *       - rooms.primary_host_id := new PH's identity_id
 *       - is_successor cleared on new PH; next-in-line inherits the
 *         flag (if any non-PH participants remain).
 *       - role_change broadcast for old + new participant.
 *     If no candidate: chain dies (room effectively empty; recycle
 *     sweeper handles cleanup).
 *
 * Tier transitions are wrapped in a single SQL transaction to keep
 * the (rooms.primary_host_id, participants.tier) pair consistent.
 *
 * Tests inject `now` + `scheduleGrace` so the grace timer is
 * deterministic without real-time waits.
 */

import type { ZifmiaDatabase } from '../db/connect.js';
import type { RoomsRepository } from '../rooms/repository.js';
import type { ParticipantsRepository } from '../rooms/participants.js';
import type { Participant, Tier } from '../rooms/types.js';
import { tierRank } from '../rooms/types.js';
import type { RoomsHub, PresenceTransition } from '../ws/rooms-hub.js';
import type { PresenceFrame, RoleChangeFrame } from '../ws/types.js';
import type { SessionEventsRepository } from '../sessions/events-repo.js';

export const DEFAULT_GRACE_MS = 30_000;

export interface GraceTimerHandle {
  cancel(): void;
}

export interface CreateSuccessionServiceOptions {
  db: ZifmiaDatabase;
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  hub: RoomsHub;
  /** Optional session-events repo for audit row persistence on succession. */
  sessionEvents?: SessionEventsRepository;
  /** Default 30s; tests pass a small value. */
  graceMs?: number;
  now?: () => number;
  scheduleGrace?: (ms: number, cb: () => void) => GraceTimerHandle;
}

export interface SuccessionService {
  /** Manually trigger succession on a room (skipping the grace timer). Used by tests + the recycle path. */
  runSuccessionNow(roomId: string): void;
  /** Whether the room currently has a grace timer pending. */
  isGracePending(roomId: string): boolean;
  /** Tear down all pending timers (server shutdown). */
  dispose(): void;
}

interface GraceState {
  timer: GraceTimerHandle;
  deadline: number;
  /** The PH whose disconnect started this grace. */
  participantId: string;
}

function defaultScheduleGrace(ms: number, cb: () => void): GraceTimerHandle {
  const id = setTimeout(cb, ms);
  if (typeof id === 'object' && id !== null && 'unref' in id) {
    (id as { unref: () => void }).unref();
  }
  return { cancel: () => clearTimeout(id) };
}

/** Lookup the current PH participant for a room, or undefined if none. */
function findCurrentPh(
  participants: ParticipantsRepository,
  roomId: string
): Participant | undefined {
  return participants.listByRoom(roomId).find((p) => p.tier === 'primary_host');
}

/**
 * Pick the best succession candidate from a room's participants.
 * Returns `undefined` when no connected non-PH participant exists.
 */
function pickNextPh(
  participants: ParticipantsRepository,
  hub: RoomsHub,
  roomId: string
): Participant | undefined {
  const connected = new Set(hub.connectedParticipants(roomId));
  const candidates = participants
    .listByRoom(roomId)
    .filter((p) => p.tier !== 'primary_host')
    .filter((p) => connected.has(p.id));

  if (candidates.length === 0) return undefined;

  candidates.sort((a, b) => {
    // is_successor first (true before false).
    if (a.is_successor !== b.is_successor) return a.is_successor ? -1 : 1;
    // higher tier rank first (co_host > command_entrant > participant).
    const rankDelta = tierRank(b.tier) - tierRank(a.tier);
    if (rankDelta !== 0) return rankDelta;
    // earliest-joined first.
    return a.joined_at - b.joined_at;
  });
  return candidates[0];
}

/**
 * Pick the next-in-line successor candidate, EXCLUDING `excludeId`
 * (the just-promoted participant). Prefers connected non-PH
 * candidates; falls back to the highest-rank non-PH overall (so the
 * room always has a documented next-in-line if any non-PH exists).
 */
function pickNextSuccessor(
  participants: ParticipantsRepository,
  hub: RoomsHub,
  roomId: string,
  excludeId: string
): Participant | undefined {
  const connected = new Set(hub.connectedParticipants(roomId));
  const pool = participants
    .listByRoom(roomId)
    .filter((p) => p.tier !== 'primary_host' && p.id !== excludeId);
  if (pool.length === 0) return undefined;

  pool.sort((a, b) => {
    const aConn = connected.has(a.id) ? 1 : 0;
    const bConn = connected.has(b.id) ? 1 : 0;
    if (aConn !== bConn) return bConn - aConn;
    const rankDelta = tierRank(b.tier) - tierRank(a.tier);
    if (rankDelta !== 0) return rankDelta;
    return a.joined_at - b.joined_at;
  });
  return pool[0];
}

export function createSuccessionService(
  options: CreateSuccessionServiceOptions
): SuccessionService {
  const { db, rooms, participants, hub, sessionEvents } = options;
  const graceMs = options.graceMs ?? DEFAULT_GRACE_MS;
  const now = options.now ?? Date.now;
  const scheduleGrace = options.scheduleGrace ?? defaultScheduleGrace;

  const pending = new Map<string, GraceState>();

  function broadcastRoleChange(roomId: string, target: Participant, actorId?: string): void {
    const frame: RoleChangeFrame = {
      type: 'role_change',
      roomId,
      participantId: target.id,
      tier: target.tier,
      actorId
    };
    hub.broadcast(roomId, frame);
  }

  function runSuccession(roomId: string): void {
    pending.delete(roomId);

    const room = rooms.getRoom(roomId);
    if (!room || room.deleted_at !== null) return;

    const oldPh = findCurrentPh(participants, roomId);
    const newPh = pickNextPh(participants, hub, roomId);
    if (!newPh) return; // chain dies — no connected non-PH participants

    // Atomic tier flip + primary_host_id update.
    const tx = db.transaction(() => {
      if (oldPh) participants.setTier(oldPh.id, 'participant');
      participants.setTier(newPh.id, 'primary_host');
      rooms.setPrimaryHost(roomId, newPh.identity_id);
    });
    tx();

    // Re-shuffle is_successor: the new PH should not carry the flag;
    // the next-in-line non-PH participant inherits it. When no other
    // non-PH exists, clear the flag entirely.
    const nextNominee = pickNextSuccessor(participants, hub, roomId, newPh.id);
    if (nextNominee) {
      participants.nominateSuccessor(roomId, nextNominee.id);
    } else {
      participants.clearAllSuccessors(roomId);
    }

    // Re-read post-transaction to get fresh tier values, then broadcast.
    const oldRow = oldPh ? participants.getById(oldPh.id) : undefined;
    const newRow = participants.getById(newPh.id);
    if (oldRow) {
      broadcastRoleChange(roomId, oldRow);
      sessionEvents?.append({
        roomId,
        participantId: oldRow.id,
        kind: 'role_change',
        payload: { target_participant_id: oldRow.id, from_tier: 'primary_host', to_tier: oldRow.tier, direction: 'succession_demote' }
      });
    }
    if (newRow) {
      broadcastRoleChange(roomId, newRow);
      sessionEvents?.append({
        roomId,
        participantId: newRow.id,
        kind: 'role_change',
        payload: { target_participant_id: newRow.id, from_tier: newPh.tier, to_tier: 'primary_host', direction: 'succession_promote' }
      });
    }
  }

  function maybeStartGrace(roomId: string, participantId: string): void {
    if (pending.has(roomId)) return; // already pending
    const room = rooms.getRoom(roomId);
    if (!room || room.deleted_at !== null) return;

    const ph = findCurrentPh(participants, roomId);
    if (!ph || ph.id !== participantId) return; // disconnect was not the PH

    const deadline = now() + graceMs;
    const timer = scheduleGrace(graceMs, () => runSuccession(roomId));
    pending.set(roomId, { timer, deadline, participantId });

    // Supplemental presence frame carrying graceDeadline. The hub
    // already broadcast `presence {connected:false}` (without deadline)
    // before invoking the listener; the client treats the latest
    // presence frame for a participant as authoritative.
    const frame: PresenceFrame = {
      type: 'presence',
      roomId,
      participantId,
      connected: false,
      graceDeadline: deadline
    };
    hub.broadcast(roomId, frame);
  }

  function maybeCancelGrace(roomId: string, participantId: string): void {
    const state = pending.get(roomId);
    if (!state) return;
    if (state.participantId !== participantId) return;
    state.timer.cancel();
    pending.delete(roomId);
  }

  hub.onPresence((input: PresenceTransition) => {
    if (input.connected) {
      maybeCancelGrace(input.roomId, input.participantId);
    } else {
      maybeStartGrace(input.roomId, input.participantId);
    }
  });

  return {
    runSuccessionNow(roomId) {
      const state = pending.get(roomId);
      if (state) state.timer.cancel();
      runSuccession(roomId);
    },
    isGracePending(roomId) {
      return pending.has(roomId);
    },
    dispose() {
      for (const state of pending.values()) state.timer.cancel();
      pending.clear();
    }
  };
}
