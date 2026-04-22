/**
 * WebSocket `unmute` handler.
 *
 * Public interface: {@link handleUnmute}, {@link UnmuteDeps}.
 * Bounded context: moderation (ADR-153 Decision 9, Decision 11).
 *
 * Flat authority: any `primary_host` or `co_host` may unmute any currently
 * muted participant, regardless of who applied the original mute. This is
 * asymmetric with mute (which has a tier matrix) — intentional per
 * Decision 9 so a second Co-Host can always rescue a bad mute.
 *
 * Muted senders retain role/command authority (Decision 9), so a muted PH
 * or Co-Host may still invoke unmute.
 */

import type { WebSocket } from 'ws';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { SessionEventsRepository } from '../../repositories/session-events.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { ClientMsg } from '../../wire/browser-server.js';
import type { Tier } from '../../repositories/types.js';
import { sendErr } from '../error-response.js';

export interface UnmuteDeps {
  participants: ParticipantsRepository;
  sessionEvents: SessionEventsRepository;
  connections: ConnectionManager;
}

/** True when actor tier carries unmute authority (flat PH/Co-Host). */
function isUnmuteAuthorized(actor: Tier): boolean {
  return actor === 'primary_host' || actor === 'co_host';
}

/**
 * Process an `unmute` frame.
 *
 * Order of checks:
 *   1. target_participant_id present
 *   2. sender exists
 *   3. sender tier is PH or Co-Host
 *   4. target exists in the same room
 *   5. target currently muted (otherwise no-op rejection)
 *   6. commit setMuted(false) + role event; broadcast mute_state
 */
export function handleUnmute(
  deps: UnmuteDeps,
  ws: WebSocket,
  actor: { participant_id: string; room_id: string },
  msg: Extract<ClientMsg, { kind: 'unmute' }>
): void {
  if (typeof msg.target_participant_id !== 'string' || msg.target_participant_id.length === 0) {
    sendErr(ws, 'bad_target', 'unmute.target_participant_id must be a non-empty string');
    return;
  }

  const sender = deps.participants.findById(actor.participant_id);
  if (!sender) {
    sendErr(ws, 'unknown_participant', 'participant no longer exists');
    return;
  }

  if (!isUnmuteAuthorized(sender.tier)) {
    sendErr(
      ws,
      'insufficient_authority',
      `tier ${sender.tier} may not unmute; requires primary_host or co_host`
    );
    return;
  }

  const target = deps.participants.findById(msg.target_participant_id);
  if (!target || target.room_id !== actor.room_id) {
    sendErr(ws, 'unknown_target_participant', 'target is not a member of this room');
    return;
  }

  if (!target.muted) {
    sendErr(ws, 'not_muted', 'target is not currently muted');
    return;
  }

  deps.participants.setMuted(target.participant_id, false, actor.participant_id);
  deps.sessionEvents.append({
    room_id: actor.room_id,
    participant_id: actor.participant_id,
    kind: 'role',
    payload: {
      kind: 'role',
      op: 'unmute',
      target_participant_id: target.participant_id,
      from_tier: target.tier,
    },
  });

  deps.connections.broadcast(actor.room_id, {
    kind: 'mute_state',
    participant_id: target.participant_id,
    muted: false,
    actor_id: actor.participant_id,
  });
}
