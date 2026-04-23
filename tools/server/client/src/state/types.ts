/**
 * `RoomState` — the UI-consumable projection of a room's authoritative server
 * state, assembled from the stream of `ServerMsg` pushes.
 *
 * Public interface: {@link RoomState}, {@link DraftFrameState},
 * {@link TranscriptEntry}, {@link RoomClosedState}, {@link RoomError},
 * {@link initialRoomState}.
 *
 * Bounded context: client state layer (ADR-153 Interface Contracts). This
 * module is intentionally free of React types — it's consumed by the
 * reducer and the `useWebSocket` hook, but nothing React-specific leaks in.
 * That keeps a hypothetical future non-React client (Plan 06+ accessibility
 * variant) cheap to stand up.
 */

import type {
  ChatEntry,
  DomainEvent,
  ParticipantSummary,
  RoomSnapshot,
  TextBlock,
} from '../types/wire';

/** One direct-message event, as pushed by a `dm` ServerMsg. */
export interface DmEntry {
  event_id: number;
  from: string;
  to: string;
  text: string;
  ts: string;
}

/**
 * A side-panel tab. Plan 04 Phase 1 ships with only `{kind:'room'}`;
 * Phase 2 adds `{kind:'dm', peer_participant_id}` for DM threads.
 *
 * Discriminated by `kind` so the UI can resolve labels (the DM tab uses
 * the peer's display name from the participants list) and dispatch
 * actions per-kind.
 */
export type TabDef =
  | { kind: 'room' }
  | { kind: 'dm'; peer_participant_id: string };

export interface DraftFrameState {
  typist_id: string;
  seq: number;
  text: string;
}

export interface TranscriptEntry {
  turn_id: string;
  text_blocks: TextBlock[];
  events: DomainEvent[];
  /**
   * Set when this entry came from a `restored` ServerMsg rather than a
   * regular `story_output`. The renderer surfaces it as a distinct block
   * with the save's name so restorations are obvious in the transcript.
   */
  restored?: { save_id: string; save_name: string };
}

export interface RoomClosedState {
  reason: 'deleted' | 'recycled';
  message?: string;
}

export interface RoomError {
  code: string;
  detail: string;
  turn_id?: string;
}

/**
 * Cap on the in-memory chat list. Older messages fall off once the list
 * grows beyond this; they still exist server-side in the session event log.
 * Kept small enough that a lively 8-person room doesn't push us into many MB
 * of React state, and large enough that nothing visible scrolls off on a
 * typical session.
 */
export const CHAT_IN_MEMORY_LIMIT = 500;

export interface RoomState {
  /**
   * Whether the WS has delivered a `welcome` snapshot yet. The hook tracks
   * raw socket connection separately; this flag only flips true on welcome.
   */
  hydrated: boolean;
  /** This client's participant_id, set from the welcome message. */
  selfId: string | null;
  room: RoomSnapshot | null;
  recordingNotice: string;
  participants: ParticipantSummary[];
  lockHolderId: string | null;
  /** Current draft being typed by the lock holder, or null when no lock. */
  draft: DraftFrameState | null;
  /**
   * Participant currently nominated to take over the Primary Host role if
   * the PH's grace period expires (ADR-153 Decision 6). Server pushes this
   * via the `successor` ServerMsg — the welcome snapshot does not carry it,
   * so this field is `null` until the first `successor` arrives.
   */
  designatedSuccessorId: string | null;
  /**
   * ISO timestamp after which the server will auto-promote the successor
   * if the Primary Host has not reconnected. Set by a `presence
   * (connected=false, grace_deadline)` push whose target is the current PH;
   * cleared on any PH reconnect, on a `role_change` promoting a new PH, or
   * on a fresh welcome. The UI's countdown banner ticks locally toward this
   * deadline — the server owns the authoritative value.
   */
  phGraceDeadline: string | null;
  transcript: TranscriptEntry[];
  /**
   * Room-wide chat history, oldest → newest, capped at
   * {@link CHAT_IN_MEMORY_LIMIT}. Seeded from welcome.chat_backlog on
   * connect/reconnect and appended from `chat` ServerMsg pushes.
   */
  chatMessages: ChatEntry[];
  /**
   * DM threads indexed by peer participant id. The PH keys by the Co-Host's
   * id; a Co-Host keys by the PH's id. Participants and Command Entrants
   * never have entries (reducer drops any `dm` push that reaches them).
   *
   * Ordered oldest → newest per thread. Populated by `dm` ServerMsg pushes
   * and by the welcome snapshot's `dm_threads` backlog (Plan 04 Phase 4).
   */
  dmThreads: Record<string, DmEntry[]>;
  /**
   * Per-thread "last read" pointer, keyed by peer participant id. The value
   * is the highest `event_id` the local user has acknowledged seeing in that
   * thread. Unread count = strictly-greater event_ids in `dmThreads[peer]`.
   *
   * Advanced exclusively by the `ui:dm_read` synthetic action — never by
   * incoming `dm` ServerMsgs, so messages arriving while the tab is
   * inactive accumulate as unread. Reset on welcome (every rehydrated
   * message is treated as "already seen": cursor jumps to the per-thread
   * max event_id once Phase 4 lands the server backlog; until then the map
   * stays empty on welcome and unread = thread length until the user opens
   * the tab).
   *
   * This is per-client/per-session state, not per-render — every component
   * in the same browser sees the same cursors. Two browsers in the same
   * room legitimately disagree on cursors, which is the intended semantics.
   */
  dmReadCursors: Record<string, number>;
  /** Last room-scope error pushed by the server, or null. */
  lastError: RoomError | null;
  /** Populated when the server sends `room_closed`. */
  closed: RoomClosedState | null;
  /**
   * Set true when the server reports an `error` with code `runtime_crash`,
   * indicating the Deno story subprocess exited unexpectedly (ADR-153 AC7).
   * Cleared on a successful `restored` (server has re-initialized the
   * sandbox with the save blob) and on a fresh welcome.
   */
  sandboxCrashed: boolean;
}

export const initialRoomState: RoomState = {
  hydrated: false,
  selfId: null,
  room: null,
  recordingNotice: '',
  participants: [],
  lockHolderId: null,
  draft: null,
  designatedSuccessorId: null,
  phGraceDeadline: null,
  transcript: [],
  chatMessages: [],
  dmThreads: {},
  dmReadCursors: {},
  lastError: null,
  closed: null,
  sandboxCrashed: false,
};
