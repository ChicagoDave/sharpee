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
import type { SessionEventsRepository } from '../repositories/session-events.js';
import type {
  ChatEntry,
  ParticipantSummary,
  RoomSnapshot,
} from '../wire/browser-server.js';
import type { Room } from '../repositories/types.js';

/**
 * Cap on the chat history bundled with each welcome. Kept small so the
 * handshake stays compact on slow networks; longer history is recoverable
 * via the session event log if a future plan surfaces that UI.
 */
export const WELCOME_CHAT_BACKLOG_LIMIT = 50;

export interface SnapshotDeps {
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  /** Optional — when absent, `saves` is always []. Phase 6 wires this in. */
  saves?: SavesRepository;
  /** Optional — when absent, `chat_backlog` is always []. */
  sessionEvents?: SessionEventsRepository;
}

export function buildRoomSnapshot(
  room: Room,
  deps: SnapshotDeps,
): {
  snapshot: RoomSnapshot;
  participants: ParticipantSummary[];
  chat_backlog: ChatEntry[];
} {
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

  const chat_backlog: ChatEntry[] = deps.sessionEvents
    ? deps.sessionEvents
        .listRecentChat(room.room_id, WELCOME_CHAT_BACKLOG_LIMIT)
        .filter((e) => e.participant_id !== null && e.payload.kind === 'chat')
        .map((e) => ({
          event_id: e.event_id,
          from: e.participant_id as string,
          text: (e.payload as { kind: 'chat'; text: string }).text,
          ts: e.ts,
        }))
    : [];

  return { snapshot, participants, chat_backlog };
}
