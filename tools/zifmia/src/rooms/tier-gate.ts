/**
 * Tier-gate helper — resolves a `(roomId, handle)` pair to an
 * identified participant for the routes that need authorization.
 *
 * Public interface: {@link loadCaller}, {@link LoadCallerResult},
 * {@link requireMinTier}.
 * Owner: zifmia server, rooms domain. Pure resolution; no I/O beyond
 * repository reads.
 *
 * The gate is intentionally explicit at each route rather than wired
 * as Fastify middleware: every governance route has a different tier
 * requirement, and "ad-hoc preHandler per route" is the same code
 * with more indirection.
 */

import type { IdentityRepository } from '../identity/repository.js';
import type { ParticipantsRepository } from './participants.js';
import type { RoomsRepository } from './repository.js';
import type { Participant, Room, Tier } from './types.js';
import { tierRank } from './types.js';

export type LoadCallerResult =
  | { ok: true; identity: { id: string; handle: string }; room: Room; caller: Participant }
  | { ok: false; reason: 'unknown_handle' | 'room_not_found' | 'not_in_room' };

/**
 * Resolve `(roomId, handle)` to `{ identity, room, caller }`. Returns
 * a discriminated failure when the handle is unknown, the room is
 * missing/deleted, or the caller is not a participant of the room.
 * The caller's tier is on `caller.tier`.
 */
export function loadCaller(
  identities: IdentityRepository,
  rooms: RoomsRepository,
  participants: ParticipantsRepository,
  roomId: string,
  rawHandle: unknown
): LoadCallerResult {
  const identity = identities.getByHandle(rawHandle);
  if (!identity) return { ok: false, reason: 'unknown_handle' };

  const room = rooms.getRoom(roomId);
  if (!room || room.deleted_at !== null) return { ok: false, reason: 'room_not_found' };

  const caller = participants.getByRoomAndIdentity(roomId, identity.id);
  if (!caller) return { ok: false, reason: 'not_in_room' };

  return {
    ok: true,
    identity: { id: identity.id, handle: identity.handle },
    room,
    caller
  };
}

/** True iff `actual` is at least `min` in tier rank. */
export function requireMinTier(actual: Tier, min: Tier): boolean {
  return tierRank(actual) >= tierRank(min);
}
