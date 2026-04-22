/**
 * WebSocket `promote` handler.
 *
 * Public interface: {@link handlePromote}, {@link PromoteDeps}.
 * Bounded context: role hierarchy (ADR-153 Decision 5, Decision 11).
 *
 * Authority matrix (plan §Phase 7):
 *   actor = primary_host   → may promote to co_host or command_entrant
 *   actor = co_host        → may promote to command_entrant only
 *   actor = command_entrant, participant → may not promote
 *
 * On success the handler appends a role(promote) row to session_events with
 * actor = sender, target = promoted participant, from_tier = prior tier,
 * to_tier = requested tier; and broadcasts a `role_change` frame to every
 * connection in the room.
 */

import type { WebSocket } from 'ws';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { SessionEventsRepository } from '../../repositories/session-events.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { ClientMsg } from '../../wire/browser-server.js';
import type { Tier } from '../../repositories/types.js';
import { sendErr } from '../error-response.js';

export interface PromoteDeps {
  participants: ParticipantsRepository;
  sessionEvents: SessionEventsRepository;
  connections: ConnectionManager;
}

/** Strict ordering used to reject promotion "downward". */
const TIER_RANK: Record<Tier, number> = {
  participant: 0,
  command_entrant: 1,
  co_host: 2,
  primary_host: 3,
};

/** Tiers a promote message is allowed to target. */
type PromotableTier = 'co_host' | 'command_entrant';

/**
 * Authority matrix for promotion. Returns true if `actor` may move a target
 * to `to_tier`. Non-authority tiers (command_entrant, participant) always
 * return false.
 */
function isPromotionAuthorized(actor: Tier, to_tier: PromotableTier): boolean {
  if (actor === 'primary_host') return true; // PH → co_host or command_entrant
  if (actor === 'co_host') return to_tier === 'command_entrant';
  return false;
}

function isPromotableTier(value: unknown): value is PromotableTier {
  return value === 'co_host' || value === 'command_entrant';
}

/**
 * Process a `promote` frame.
 *
 * Order of checks:
 *   1. target_participant_id present; to_tier valid
 *   2. sender known + not muted
 *   3. sender's tier authorises this (actor, to_tier) combination
 *   4. target exists in the same room
 *   5. target.tier < to_tier (otherwise same_tier / invalid_promotion)
 *   6. commit mutation + event; broadcast role_change
 */
export function handlePromote(
  deps: PromoteDeps,
  ws: WebSocket,
  actor: { participant_id: string; room_id: string },
  msg: Extract<ClientMsg, { kind: 'promote' }>
): void {
  if (typeof msg.target_participant_id !== 'string' || msg.target_participant_id.length === 0) {
    sendErr(ws, 'bad_target', 'promote.target_participant_id must be a non-empty string');
    return;
  }
  if (!isPromotableTier(msg.to_tier)) {
    sendErr(ws, 'bad_tier', 'promote.to_tier must be co_host or command_entrant');
    return;
  }

  const sender = deps.participants.findById(actor.participant_id);
  if (!sender) {
    sendErr(ws, 'unknown_participant', 'participant no longer exists');
    return;
  }
  if (sender.muted) {
    sendErr(ws, 'muted', 'you have been muted');
    return;
  }
  if (!isPromotionAuthorized(sender.tier, msg.to_tier)) {
    sendErr(
      ws,
      'insufficient_authority',
      `tier ${sender.tier} may not promote to ${msg.to_tier}`
    );
    return;
  }

  const target = deps.participants.findById(msg.target_participant_id);
  if (!target || target.room_id !== actor.room_id) {
    sendErr(ws, 'unknown_target_participant', 'target is not a member of this room');
    return;
  }

  if (target.tier === msg.to_tier) {
    sendErr(ws, 'same_tier', `target is already at tier ${msg.to_tier}`);
    return;
  }
  if (TIER_RANK[target.tier] > TIER_RANK[msg.to_tier]) {
    sendErr(
      ws,
      'invalid_promotion',
      `target tier ${target.tier} is higher than ${msg.to_tier}; use demote`
    );
    return;
  }

  const from_tier = target.tier;

  deps.participants.setTier(target.participant_id, msg.to_tier, actor.participant_id);
  deps.sessionEvents.append({
    room_id: actor.room_id,
    participant_id: actor.participant_id,
    kind: 'role',
    payload: {
      kind: 'role',
      op: 'promote',
      target_participant_id: target.participant_id,
      from_tier,
      to_tier: msg.to_tier,
    },
  });

  deps.connections.broadcast(actor.room_id, {
    kind: 'role_change',
    participant_id: target.participant_id,
    tier: msg.to_tier,
    actor_id: actor.participant_id,
  });
}
