/**
 * Shared domain types surfaced by the repository layer.
 *
 * Public interface: {@link Room}, {@link Participant}, {@link SessionEvent},
 * {@link Save}, {@link Tier}, {@link EventKind}, {@link EventPayload}.
 * Bounded context: persistence boundary — the only place where DB rows
 * are shaped into domain records for the rest of the server to consume.
 *
 * Reference: ADR-153 Interface Contracts (Repository Interfaces, Session Event Log Payloads).
 */

export type Tier = 'primary_host' | 'co_host' | 'command_entrant' | 'participant';

export type EventKind =
  | 'command'
  | 'output'
  | 'chat'
  | 'dm'
  | 'role'
  | 'save'
  | 'restore'
  | 'join'
  | 'leave'
  | 'lifecycle';

/** Forward-declared shapes; @sharpee/core versions are used by the wire layer. */
export interface TextBlock {
  kind: string;
  [key: string]: unknown;
}
export interface DomainEvent {
  type: string;
  [key: string]: unknown;
}

export type EventPayload =
  | { kind: 'command'; input: string; turn_id: string }
  | { kind: 'output'; turn_id: string; text_blocks: TextBlock[]; events: DomainEvent[] }
  | { kind: 'chat'; text: string }
  | { kind: 'dm'; to_participant_id: string; text: string }
  | {
      kind: 'role';
      op: 'promote' | 'demote' | 'mute' | 'unmute' | 'nominate' | 'force_release';
      target_participant_id: string;
      from_tier?: Tier;
      to_tier?: Tier;
    }
  | { kind: 'save'; save_id: string; save_name: string }
  | { kind: 'restore'; save_id: string }
  | { kind: 'join'; display_name: string; reconnect: boolean }
  | { kind: 'leave'; reason: 'disconnect' | 'tab_closed' | 'grace_expired' }
  | { kind: 'lifecycle'; op: 'created' | 'pinned' | 'unpinned' | 'deleted' | 'recycled' };

export interface Room {
  room_id: string;
  title: string;
  story_slug: string;
  join_code: string;
  primary_host_id: string;
  pinned: boolean;
  created_at: string;
  last_activity_at: string;
}

export interface Participant {
  participant_id: string;
  room_id: string;
  token: string;
  display_name: string;
  tier: Tier;
  muted: boolean;
  connected: boolean;
  joined_at: string;
  /** True for the one Participant nominated as next-in-line successor. At most one per room. */
  is_successor: boolean;
}

export interface SessionEvent {
  event_id: number;
  room_id: string;
  participant_id: string | null;
  ts: string;
  kind: EventKind;
  payload: EventPayload;
}

export interface Save {
  save_id: string;
  room_id: string;
  actor_id: string;
  name: string;
  blob: Buffer;
  created_at: string;
}

/** Save summary used by listForRoom — omits the blob bytes. */
export type SaveSummary = Omit<Save, 'blob'>;
