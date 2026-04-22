/**
 * WebSocket `mute` handler.
 *
 * Public interface: {@link handleMute}, {@link MuteDeps}.
 * Bounded context: moderation (ADR-153 Decision 9, Decision 11).
 *
 * Authority matrix:
 *   actor = primary_host       → may mute co_host, command_entrant, participant
 *   actor = co_host            → may mute command_entrant, participant
 *                                (NOT another co_host, NOT the primary_host)
 *   actor = command_entrant    → may not mute
 *   actor = participant        → may not mute
 *
 * The matrix naturally prevents self-mute: at every authority tier, the
 * actor's own tier is excluded from the "can mute" column.
 *
 * Muted senders retain role/command authority (Decision 9), so a muted PH or
 * Co-Host may still invoke mute — only outbound chat and dm are gated.
 */

import type { WebSocket } from 'ws';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { SessionEventsRepository } from '../../repositories/session-events.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { ClientMsg } from '../../wire/browser-server.js';
import type { Tier } from '../../repositories/types.js';
import { sendErr } from '../error-response.js';

export interface MuteDeps {
  participants: ParticipantsRepository;
  sessionEvents: SessionEventsRepository;
  connections: ConnectionManager;
}

/**
 * Return true when `actor` is allowed to mute `target`. Implements the
 * Decision 9 authority matrix exactly — no implicit self-exclusion is
 * needed because the matrix already forbids PH→PH and co_host→co_host.
 */
function isMuteAuthorized(actor: Tier, target: Tier): boolean {
  if (actor === 'primary_host') {
    return target === 'co_host' || target === 'command_entrant' || target === 'participant';
  }
  if (actor === 'co_host') {
    return target === 'command_entrant' || target === 'participant';
  }
  return false;
}

/**
 * Process a `mute` frame.
 *
 * Order of checks:
 *   1. target_participant_id present
 *   2. sender exists
 *   3. target exists and is in the same room
 *   4. actor tier authorises muting target tier
 *   5. target not already muted (idempotent no-op rejection)
 *   6. commit setMuted + role event; broadcast mute_state
 */
export function handleMute(
  deps: MuteDeps,
  ws: WebSocket,
  actor: { participant_id: string; room_id: string },
  msg: Extract<ClientMsg, { kind: 'mute' }>
): void {
  if (typeof msg.target_participant_id !== 'string' || msg.target_participant_id.length === 0) {
    sendErr(ws, 'bad_target', 'mute.target_participant_id must be a non-empty string');
    return;
  }

  const sender = deps.participants.findById(actor.participant_id);
  if (!sender) {
    sendErr(ws, 'unknown_participant', 'participant no longer exists');
    return;
  }

  const target = deps.participants.findById(msg.target_participant_id);
  if (!target || target.room_id !== actor.room_id) {
    sendErr(ws, 'unknown_target_participant', 'target is not a member of this room');
    return;
  }

  if (!isMuteAuthorized(sender.tier, target.tier)) {
    sendErr(
      ws,
      'insufficient_authority',
      `tier ${sender.tier} may not mute tier ${target.tier}`
    );
    return;
  }

  if (target.muted) {
    sendErr(ws, 'already_muted', 'target is already muted');
    return;
  }

  deps.participants.setMuted(target.participant_id, true, actor.participant_id);
  deps.sessionEvents.append({
    room_id: actor.room_id,
    participant_id: actor.participant_id,
    kind: 'role',
    payload: {
      kind: 'role',
      op: 'mute',
      target_participant_id: target.participant_id,
      from_tier: target.tier,
    },
  });

  deps.connections.broadcast(actor.room_id, {
    kind: 'mute_state',
    participant_id: target.participant_id,
    muted: true,
    actor_id: actor.participant_id,
  });
}
