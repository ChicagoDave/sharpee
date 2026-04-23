/**
 * Typed helpers that emit WebSocket ClientMsg intents.
 *
 * Public interface: {@link sendMute}, {@link sendUnmute},
 * {@link sendPromote}, {@link sendDemote}, {@link Sender}.
 *
 * Bounded context: client WS layer (ADR-153 Interface Contracts). These
 * are thin wrappers over the raw `send` returned by `useWebSocket` — they
 * exist so call sites don't repeat the `{kind: '...', target_participant_id}`
 * shape and so future protocol changes have a single choke point.
 */

import type { DemoteToTier, PromoteToTier } from '../state/authority';
import type { ClientMsg } from '../types/wire';

export type Sender = (msg: ClientMsg) => void;

export function sendMute(send: Sender, target_participant_id: string): void {
  send({ kind: 'mute', target_participant_id });
}

export function sendUnmute(send: Sender, target_participant_id: string): void {
  send({ kind: 'unmute', target_participant_id });
}

export function sendPromote(
  send: Sender,
  target_participant_id: string,
  to_tier: PromoteToTier,
): void {
  send({ kind: 'promote', target_participant_id, to_tier });
}

export function sendDemote(
  send: Sender,
  target_participant_id: string,
  to_tier: DemoteToTier,
): void {
  send({ kind: 'demote', target_participant_id, to_tier });
}

export function sendPin(send: Sender): void {
  send({ kind: 'pin' });
}

export function sendUnpin(send: Sender): void {
  send({ kind: 'unpin' });
}

export function sendNominateSuccessor(
  send: Sender,
  target_participant_id: string,
): void {
  send({ kind: 'nominate_successor', target_participant_id });
}

/**
 * Delete the current room. `confirm_title` must exactly match the room's
 * current server-side title — the server validates at receipt and rejects
 * mismatches without mutation (ADR-153 Decision 12).
 */
export function sendDeleteRoom(send: Sender, confirm_title: string): void {
  send({ kind: 'delete_room', confirm_title });
}

/**
 * Trigger a SAVE round-trip. Authority: command_entrant or higher. The
 * server generates the save name (story-slug / turn / timestamp) and
 * broadcasts `save_created` on success.
 */
export function sendSave(send: Sender): void {
  send({ kind: 'save' });
}

/** Restore a prior save by id. Broadcasts `restored` to all participants. */
export function sendRestore(send: Sender, save_id: string): void {
  send({ kind: 'restore', save_id });
}

/**
 * Send a direct message to `to_participant_id`. ADR-153 D8 restricts DMs
 * to the PH↔Co-Host axis; the server enforces this — the client only
 * offers the UI affordance to entitled viewers, but any accidental
 * caller here is just a harmless no-op (the server will reject).
 */
export function sendDm(
  send: Sender,
  to_participant_id: string,
  text: string,
): void {
  send({ kind: 'dm', to_participant_id, text });
}
