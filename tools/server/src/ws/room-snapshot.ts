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
  DmThreadEntry,
  ParticipantSummary,
  RoomSnapshot,
  TranscriptBacklogEntry,
} from '../wire/browser-server.js';
import type { TextBlock, DomainEvent } from '../wire/primitives.js';
import type { Room, Tier } from '../repositories/types.js';

/**
 * Cap on the chat history bundled with each welcome. Kept small so the
 * handshake stays compact on slow networks; longer history is recoverable
 * via the session event log if a future plan surfaces that UI.
 */
export const WELCOME_CHAT_BACKLOG_LIMIT = 50;

/**
 * Cap on the DM events the welcome carries for the viewer. Kept generous
 * (200 across all the viewer's threads) since DMs are typically lower-volume
 * than chat and losing thread history on reconnect is a worse UX than
 * losing room-chat tail. Per-thread distribution is whatever falls out of
 * "most recent N events the viewer was party to."
 */
export const WELCOME_DM_BACKLOG_LIMIT = 200;

export interface SnapshotDeps {
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  /** Optional — when absent, `saves` is always []. Phase 6 wires this in. */
  saves?: SavesRepository;
  /** Optional — when absent, `chat_backlog` is always []. */
  sessionEvents?: SessionEventsRepository;
}

/**
 * Identity of the viewer the welcome is being assembled for. Used to scope
 * `dm_threads` to threads this viewer is entitled to see (PH↔Co-Host axis,
 * ADR-153 Decision 8). Participants and Command Entrants always see `{}`.
 */
export interface SnapshotViewer {
  participant_id: string;
  tier: Tier;
}

export function buildRoomSnapshot(
  room: Room,
  deps: SnapshotDeps,
  viewer: SnapshotViewer,
): {
  snapshot: RoomSnapshot;
  participants: ParticipantSummary[];
  chat_backlog: ChatEntry[];
  transcript_backlog: TranscriptBacklogEntry[];
  dm_threads: Record<string, DmThreadEntry[]>;
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

  // Transcript backlog — replay all command + output events so a reconnect or
  // late-joiner's view seeds `state.transcript` with the story so far. Rows
  // are ordered by event_id ASC (listForRoom's default), which preserves turn
  // sequence. System-initiated commands (opening-scene look) are omitted from
  // the echo stream — the opening OUTPUT carries the context already, and a
  // "> look (by System)" line at the top would be noise for joiners.
  const transcript_backlog: TranscriptBacklogEntry[] = deps.sessionEvents
    ? deps.sessionEvents
        .listForRoom(room.room_id, { kinds: ['command', 'output'] })
        .flatMap((e): TranscriptBacklogEntry[] => {
          if (e.kind === 'command' && e.payload.kind === 'command') {
            const p = e.payload as { kind: 'command'; input: string; turn_id: string };
            // Skip system-originated commands (initial look).
            if (!e.participant_id || e.participant_id === 'system') return [];
            return [
              {
                turn_id: `${p.turn_id}:echo`,
                text_blocks: [] as TextBlock[],
                events: [] as DomainEvent[],
                command: { actor_id: e.participant_id, text: p.input, ts: e.ts },
              },
            ];
          }
          if (e.kind === 'output' && e.payload.kind === 'output') {
            const p = e.payload as {
              kind: 'output';
              turn_id: string;
              text_blocks: TextBlock[];
              events: DomainEvent[];
            };
            return [
              {
                turn_id: p.turn_id,
                text_blocks: p.text_blocks,
                events: p.events,
              },
            ];
          }
          return [];
        })
    : [];

  // DM threads are visible only to PH and CoHost (ADR-153 Decision 8).
  // Other tiers always receive an empty map regardless of any DM events
  // their participant_id might appear in (defense in depth — the dm
  // handler already enforces the axis on send).
  const dm_threads: Record<string, DmThreadEntry[]> = {};
  if (
    deps.sessionEvents &&
    (viewer.tier === 'primary_host' || viewer.tier === 'co_host')
  ) {
    const events = deps.sessionEvents.listRecentDmsForParticipant(
      room.room_id,
      viewer.participant_id,
      WELCOME_DM_BACKLOG_LIMIT,
    );
    for (const e of events) {
      if (e.payload.kind !== 'dm' || e.participant_id === null) continue;
      const from = e.participant_id;
      const to = (e.payload as { kind: 'dm'; to_participant_id: string }).to_participant_id;
      const text = (e.payload as { kind: 'dm'; text: string }).text;
      const peer = from === viewer.participant_id ? to : from;
      const entry: DmThreadEntry = { event_id: e.event_id, from, to, text, ts: e.ts };
      const bucket = dm_threads[peer];
      if (bucket) bucket.push(entry);
      else dm_threads[peer] = [entry];
    }
  }

  return { snapshot, participants, chat_backlog, transcript_backlog, dm_threads };
}
