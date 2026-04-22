/**
 * Succession state machine — the atomic promotion chain that keeps exactly
 * one Primary Host per room.
 *
 * Public interface: {@link performSuccession}, {@link SuccessionDeps},
 * {@link SuccessionOutcome}.
 *
 * Bounded context: room lifecycle (ADR-153 Decision 6 — cascading succession
 * invariant; Decision 11 — role events logged for every transition).
 *
 * Invariants (post-condition of a `succeeded` outcome):
 *   - Exactly one participant in the room has `tier = primary_host`.
 *   - `rooms.primary_host_id` points at that participant.
 *   - At most one participant has `is_successor = 1`.
 *   - The old PH's `tier` is `participant` — a reconnecting welcome resolves
 *     them as such, not as the (now-promoted) Primary Host.
 *
 * All mutations run in a single `db.transaction(...)`. A crash mid-tx rolls
 * back; post-commit broadcasts are the caller's responsibility.
 */

import type { Database } from 'better-sqlite3';
import type { ParticipantsRepository } from '../repositories/participants.js';
import type { RoomsRepository } from '../repositories/rooms.js';
import type { SessionEventsRepository } from '../repositories/session-events.js';

export interface SuccessionDeps {
  db: Database;
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  sessionEvents: SessionEventsRepository;
}

/**
 * Discriminated result. `succeeded` carries the ids so the caller can drive
 * the post-commit broadcast triple (role_change for PH, role_change for new
 * Co-Host, successor push). `no_successor` is the documented edge case in
 * plan §7 — log and no-op.
 */
export type SuccessionOutcome =
  | {
      kind: 'succeeded';
      /** The demoted participant. null if the room had no prior primary_host_id. */
      old_ph_id: string | null;
      new_ph_id: string;
      /** null when no other connected participant exists to take the co_host slot. */
      new_co_host_id: string | null;
    }
  | { kind: 'no_successor'; reason: 'no_designated_successor' | 'unknown_room' };

/**
 * Run the succession chain for `room_id` atomically.
 *
 * Called by the PH grace timer (5-minute timeout elapsed with PH still
 * disconnected). Also callable on explicit trigger — the machine is a pure
 * state transition; it does not check whether the current PH is actually
 * offline. The caller is responsible for that precondition.
 *
 * Post-condition on `succeeded`:
 *   - `participants.findById(new_ph_id).tier === 'primary_host'`
 *   - `participants.findById(new_ph_id).is_successor === false`
 *   - `rooms.findById(room_id).primary_host_id === new_ph_id`
 *   - old PH's `tier === 'participant'` (when one existed)
 *   - if `new_co_host_id` non-null: that participant's `tier === 'co_host'`
 *     and `is_successor === true`
 *   - session_events has 2 or 4 new `role` rows, in order:
 *       [ demote old_ph? , promote new_ph , promote new_co_host? , nominate new_co_host? ]
 *     (the demote is skipped when `old_ph_id` is null.)
 */
export function performSuccession(
  deps: SuccessionDeps,
  room_id: string
): SuccessionOutcome {
  const room = deps.rooms.findById(room_id);
  if (!room) return { kind: 'no_successor', reason: 'unknown_room' };

  const all = deps.participants.listForRoom(room_id);
  const successor = all.find((p) => p.is_successor);
  if (!successor) {
    return { kind: 'no_successor', reason: 'no_designated_successor' };
  }

  const old_ph_id = room.primary_host_id && room.primary_host_id !== '' ? room.primary_host_id : null;
  const new_ph_id = successor.participant_id;

  let new_co_host_id: string | null = null;

  const tx = deps.db.transaction(() => {
    // 1. Demote the outgoing PH, if any.
    if (old_ph_id) {
      deps.participants.setTier(old_ph_id, 'participant', new_ph_id);
      deps.sessionEvents.append({
        room_id,
        // participant_id on a succession event is null — this is the system
        // acting, not a user-initiated demote.
        participant_id: null,
        kind: 'role',
        payload: {
          kind: 'role',
          op: 'demote',
          target_participant_id: old_ph_id,
          from_tier: 'primary_host',
          to_tier: 'participant',
        },
      });
    }

    // 2. Promote the designated successor to PH; clear their successor flag.
    deps.participants.setTier(new_ph_id, 'primary_host', new_ph_id);
    deps.participants.setIsSuccessor(new_ph_id, false);
    deps.rooms.updatePrimaryHost(room_id, new_ph_id);
    deps.sessionEvents.append({
      room_id,
      participant_id: null,
      kind: 'role',
      payload: {
        kind: 'role',
        op: 'promote',
        target_participant_id: new_ph_id,
        from_tier: successor.tier,
        to_tier: 'primary_host',
      },
    });

    // 3. Find the next Co-Host (earliest connected participant, excluding
    //    the new PH) and promote + nominate.
    const nextCoHost = deps.participants.earliestConnectedParticipant(room_id, new_ph_id);
    if (nextCoHost) {
      new_co_host_id = nextCoHost.participant_id;
      deps.participants.setTier(new_co_host_id, 'co_host', new_ph_id);
      deps.participants.setIsSuccessor(new_co_host_id, true);
      deps.sessionEvents.append({
        room_id,
        participant_id: null,
        kind: 'role',
        payload: {
          kind: 'role',
          op: 'promote',
          target_participant_id: new_co_host_id,
          from_tier: nextCoHost.tier,
          to_tier: 'co_host',
        },
      });
      deps.sessionEvents.append({
        room_id,
        participant_id: null,
        kind: 'role',
        payload: {
          kind: 'role',
          op: 'nominate',
          target_participant_id: new_co_host_id,
        },
      });
    }
  });

  tx();

  return { kind: 'succeeded', old_ph_id, new_ph_id, new_co_host_id };
}
