/**
 * Builds a RoomSnapshot + ParticipantSummary[] from current DB state.
 *
 * Public interface: {@link buildRoomSnapshot}.
 * Bounded context: WebSocket presence layer. Used by the `hello` handler to
 * compose a fresh welcome payload on connect and reconnect (ADR-153
 * Interface Contracts — ServerMsg `welcome`, RoomSnapshot shape).
 *
 * The snapshot is a point-in-time read: the server re-issues a fresh one on
 * every reconnect rather than tracking a diff. Lock-holder and saves fields
 * are populated fully in Phase 5 / Phase 6; they are returned here as the
 * correct empty / null values so the shape is stable from Phase 3 onward.
 */

import type { RoomsRepository } from '../repositories/rooms.js';
import type { ParticipantsRepository } from '../repositories/participants.js';
import type { SavesRepository } from '../repositories/saves.js';
import type { RoomSnapshot, ParticipantSummary } from '../wire/browser-server.js';
import type { Room } from '../repositories/types.js';

export interface SnapshotDeps {
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  /** Optional — when absent, `saves` is always []. Phase 6 wires this in. */
  saves?: SavesRepository;
}

export function buildRoomSnapshot(
  room: Room,
  deps: SnapshotDeps
): { snapshot: RoomSnapshot; participants: ParticipantSummary[] } {
  const savesList = deps.saves
    ? deps.saves.listForRoom(room.room_id).map((s) => ({
        save_id: s.save_id,
        name: s.name,
        created_at: s.created_at,
      }))
    : [];

  const snapshot: RoomSnapshot = {
    room_id: room.room_id,
    title: room.title,
    story_slug: room.story_slug,
    pinned: room.pinned,
    last_activity_at: room.last_activity_at,
    lock_holder_id: null, // Phase 5 will populate from the lock service.
    saves: savesList,
  };

  const participants = deps.participants.listForRoom(room.room_id).map<ParticipantSummary>((p) => ({
    participant_id: p.participant_id,
    display_name: p.display_name,
    tier: p.tier,
    connected: p.connected,
    muted: p.muted,
  }));

  return { snapshot, participants };
}
