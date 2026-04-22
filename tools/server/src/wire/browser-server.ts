/**
 * Wire protocol between the browser client and the Node server.
 *
 * Public interface: {@link ClientMsg}, {@link ServerMsg}, {@link RoomSnapshot},
 * {@link ParticipantSummary}, {@link Tier}, {@link TextBlock}.
 *
 * Bounded context: client-facing WebSocket protocol (ADR-153 Interface Contracts).
 * Every message is a JSON object with a `kind` discriminator.
 * The server is authoritative; the client issues intents and renders pushes.
 */

import type { DomainEvent, TextBlock, Tier } from '../repositories/types.js';

export type { Tier, TextBlock, DomainEvent };

/** Summary fields a participant shows in the room roster. */
export interface ParticipantSummary {
  participant_id: string;
  display_name: string;
  tier: Tier;
  connected: boolean;
  muted: boolean;
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
  | { kind: 'hello'; token: string }
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
    }
  | { kind: 'presence'; participant_id: string; connected: boolean }
  | { kind: 'draft_frame'; typist_id: string; seq: number; text: string }
  | { kind: 'lock_state'; holder_id: string | null }
  | { kind: 'story_output'; turn_id: string; text_blocks: TextBlock[]; events: DomainEvent[] }
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
  | { kind: 'room_state'; pinned: boolean; last_activity_at: string }
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
