/**
 * Session-event types — public shape returned by the repository.
 *
 * Public interface: {@link SessionEventKind}, {@link SessionEvent}.
 * Owner: zifmia server, sessions domain.
 */

export const SESSION_EVENT_KINDS = [
  'chat', 'dm', 'command', 'output',
  'role_change', 'mute_state',
  'pin', 'unpin',
  'save_created', 'restored',
  'nominated_successor',
  'join', 'disconnect',
  'lifecycle', 'recording_notice'
] as const;

export type SessionEventKind = typeof SESSION_EVENT_KINDS[number];

export interface SessionEvent {
  readonly event_id: string;
  readonly room_id: string;
  readonly participant_id: string | null;
  readonly ts: number;
  readonly kind: SessionEventKind;
  /** JSON payload — shape depends on `kind`. */
  readonly payload: unknown;
}
