/**
 * Wire protocol between the browser client and the Node server.
 *
 * Public interface: {@link ClientMsg}, {@link ServerMsg}, {@link RoomSnapshot},
 * {@link ParticipantSummary}, {@link ChatEntry}, {@link DmThreadEntry},
 * {@link Tier}, {@link TextBlock}.
 *
 * Bounded context: client-facing WebSocket protocol (ADR-153 Interface Contracts).
 * Every message is a JSON object with a `kind` discriminator.
 * The server is authoritative; the client issues intents and renders pushes.
 */

import type { DomainEvent, TextBlock, Tier } from './primitives.js';

export type { Tier, TextBlock, DomainEvent };

/** Summary fields a participant shows in the room roster. */
export interface ParticipantSummary {
  participant_id: string;
  display_name: string;
  tier: Tier;
  connected: boolean;
  muted: boolean;
}

/**
 * One room-chat event, as carried by a `chat` ServerMsg or the welcome
 * backlog. Shape mirrors the `chat` push minus its `kind` discriminator
 * so a single renderer can handle both forms.
 */
/**
 * One entry in the transcript backlog carried by `welcome`. Either an output
 * entry (story text from the engine) or a command-echo entry (what a
 * participant typed). Shape matches the runtime `state.transcript` entry
 * shape so the reducer can set `state.transcript = welcome.transcript_backlog`
 * directly without remapping.
 */
export interface TranscriptBacklogEntry {
  turn_id: string;
  text_blocks: TextBlock[];
  events: DomainEvent[];
  /** Set on command-echo entries (no text_blocks / events). */
  command?: { actor_id: string; text: string; ts: string };
}

export interface ChatEntry {
  event_id: number;
  from: string;
  text: string;
  ts: string;
}

/**
 * One DM event as carried in the welcome snapshot's `dm_threads`. Mirrors
 * the live `dm` ServerMsg shape minus the `kind` discriminator — the kind
 * is implied by being inside `dm_threads`.
 */
export interface DmThreadEntry {
  event_id: number;
  from: string;
  to: string;
  text: string;
  ts: string;
}

/** Point-in-time room snapshot delivered on `welcome` (connect or reconnect). */
export interface RoomSnapshot {
  room_id: string;
  title: string;
  story_slug: string;
  pinned: boolean;
  last_activity_at: string;
  lock_holder_id: string | null;
  saves: Array<{ save_id: string; name: string; created_at: string }>;
}

// ---------- Client → Server intents ----------

export type ClientMsg =
  // First frame on every WS connection. Carries the persistent identity
  // credentials per ADR-159; the per-room token is no longer the WS hello
  // credential — it survives only as an HTTP-side session marker.
  | { kind: 'hello'; username: string; secret: string }
  | { kind: 'draft_delta'; seq: number; text: string }
  | { kind: 'submit_command'; text: string }
  | { kind: 'release_lock' }
  | { kind: 'chat'; text: string }
  | { kind: 'dm'; to_participant_id: string; text: string }
  | { kind: 'promote'; target_participant_id: string; to_tier: 'co_host' | 'command_entrant' }
  | {
      kind: 'demote';
      target_participant_id: string;
      to_tier: 'participant' | 'command_entrant' | 'co_host';
    }
  | { kind: 'mute'; target_participant_id: string }
  | { kind: 'unmute'; target_participant_id: string }
  | { kind: 'force_release'; target_participant_id: string }
  | { kind: 'save' }
  | { kind: 'restore'; save_id: string }
  | { kind: 'pin' }
  | { kind: 'unpin' }
  | { kind: 'delete_room'; confirm_title: string }
  | { kind: 'nominate_successor'; target_participant_id: string };

// ---------- Server → Client pushes ----------

export type ServerMsg =
  | {
      kind: 'welcome';
      participant_id: string;
      room: RoomSnapshot;
      participants: ParticipantSummary[];
      /**
       * Recording-transparency notice (ADR-153 Decision 8). Always present.
       * Clients are expected to display it once on first join and show a
       * persistent "REC" indicator while in the room.
       */
      recording_notice: string;
      /**
       * Most recent chat events for this room, oldest → newest. Bounded by
       * the server to a small constant (current cap: 50) so reconnects don't
       * lose visible history. Clients seed their chat list from this and
       * then append from subsequent `chat` pushes.
       */
      chat_backlog: ChatEntry[];
      /**
       * Replay of the room's command echoes + story outputs, oldest → newest.
       * Clients seed `state.transcript` from this so a reconnect or late-join
       * immediately sees the story so far without needing the next turn to
       * arrive. Built from session_events rows (kind IN `command`, `output`).
       * System-initiated commands (opening-scene look) are filtered out server-
       * side so joiners don't see noise. Optional for forward/back wire compat
       * with older clients / tests that don't supply it.
       */
      transcript_backlog?: TranscriptBacklogEntry[];
      /**
       * DM threads visible to this viewer, keyed by peer participant_id.
       * Each thread is oldest → newest, bounded server-side. Only Primary
       * Hosts and Co-Hosts ever receive non-empty threads (ADR-153 Decision
       * 8 — DMs are PH↔CoHost only). Participants and Command Entrants
       * always see `{}`.
       *
       * Clients seed `dmThreads` from this on welcome and zero unread
       * counters by jumping `dmReadCursors[peer]` to the per-thread max
       * `event_id` (every rehydrated message is "already seen").
       */
      dm_threads: Record<string, DmThreadEntry[]>;
    }
  | {
      kind: 'presence';
      participant_id: string;
      connected: boolean;
      /**
       * ISO timestamp after which the server will auto-promote the current
       * successor if the PH has not reconnected. Populated only when the
       * disconnecting participant is the current PH; `null` otherwise (including
       * on any reconnect push). Clients render the countdown locally ticking
       * toward this deadline (ADR-153 Decision 6; server source of truth).
       */
      grace_deadline: string | null;
    }
  | { kind: 'draft_frame'; typist_id: string; seq: number; text: string }
  | { kind: 'lock_state'; holder_id: string | null }
  | { kind: 'story_output'; turn_id: string; text_blocks: TextBlock[]; events: DomainEvent[] }
  /**
   * Echo of a player-submitted command. Broadcast immediately on submit so
   * all participants see what was typed before the engine produces OUTPUT.
   * Suppressed for system-initiated commands (e.g., the opening-scene look).
   */
  | { kind: 'player_command'; turn_id: string; actor_id: string; text: string; ts: string }
  | { kind: 'chat'; event_id: number; from: string; text: string; ts: string }
  | { kind: 'dm'; event_id: number; from: string; to: string; text: string; ts: string }
  /**
   * `actor_id` is null when the role change was system-initiated (e.g. the
   * cascading succession chain fired by the PH grace timer). Clients should
   * surface "(system)" or equivalent in that case.
   */
  | { kind: 'role_change'; participant_id: string; tier: Tier; actor_id: string | null }
  | { kind: 'mute_state'; participant_id: string; muted: boolean; actor_id: string }
  | { kind: 'save_created'; save_id: string; name: string; actor_id: string; ts: string }
  | { kind: 'restored'; save_id: string; text_blocks: TextBlock[]; actor_id: string }
  | { kind: 'room_state'; pinned: boolean; last_activity_at: string; title: string }
  | { kind: 'room_closed'; reason: 'deleted' | 'recycled'; message?: string }
  | { kind: 'successor'; participant_id: string }
  | {
      kind: 'error';
      code: string;
      detail: string;
      /**
       * Populated only when the error is scoped to a specific in-flight turn
       * (currently: `runtime_crash` during a command). Clients correlate this
       * with the turn_id they were waiting on so the spinner/lock for that
       * specific turn can be cleared — distinct from room-wide errors.
       */
      turn_id?: string;
    };
