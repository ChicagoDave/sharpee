/**
 * WebSocket `demote` handler.
 *
 * Public interface: {@link handleDemote}, {@link DemoteDeps}.
 * Bounded context: role hierarchy (ADR-153 Decision 5, Decision 11).
 *
 * Authority: only the Primary Host may demote anyone. Every other tier
 * receives `insufficient_authority`.
 *
 * The Primary Host themselves cannot be demoted via this handler — the
 * only path out of `primary_host` is the succession chain (ADR-153 D6).
 * This keeps the "exactly one PH" invariant stable: any PH change must flow
 * through `performSuccession` so a new PH is installed atomically.
 *
 * Invariant preserved: the designated successor is always a co_host. If a
 * co_host carrying `is_successor = 1` is demoted, the successor flag is
 * cleared in the same mutation so the room does not retain a "phantom"
 * successor at a tier other than co_host.
 */

import type { WebSocket } from 'ws';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { SessionEventsRepository } from '../../repositories/session-events.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { ClientMsg, ServerMsg } from '../../wire/browser-server.js';
import type { Tier } from '../../repositories/types.js';

export interface DemoteDeps {
  participants: ParticipantsRepository;
  sessionEvents: SessionEventsRepository;
  connections: ConnectionManager;
}

function sendErr(ws: WebSocket, code: string, detail: string): void {
  const msg: ServerMsg = { kind: 'error', code, detail };
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* socket down */
  }
}

const TIER_RANK: Record<Tier, number> = {
  participant: 0,
  command_entrant: 1,
  co_host: 2,
  primary_host: 3,
};

type DemotableTier = 'participant' | 'command_entrant' | 'co_host';

function isDemotableTier(value: unknown): value is DemotableTier {
  return value === 'participant' || value === 'command_entrant' || value === 'co_host';
}

/**
 * Process a `demote` frame.
 *
 * Order of checks:
 *   1. target_participant_id non-empty; to_tier valid
 *   2. sender known + not muted
 *   3. sender is primary_host (the only tier that may demote)
 *   4. target exists in the same room
 *   5. target is not the PH themselves (use succession instead)
 *   6. target.tier strictly greater than to_tier (otherwise same_tier or invalid_demotion)
 *   7. commit: setTier; clear is_successor if target had it; append event; broadcast
 */
export function handleDemote(
  deps: DemoteDeps,
  ws: WebSocket,
  actor: { participant_id: string; room_id: string },
  msg: Extract<ClientMsg, { kind: 'demote' }>
): void {
  if (typeof msg.target_participant_id !== 'string' || msg.target_participant_id.length === 0) {
    sendErr(ws, 'bad_target', 'demote.target_participant_id must be a non-empty string');
    return;
  }
  if (!isDemotableTier(msg.to_tier)) {
    sendErr(ws, 'bad_tier', 'demote.to_tier must be participant, command_entrant, or co_host');
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
  if (sender.tier !== 'primary_host') {
    sendErr(ws, 'insufficient_authority', 'only primary_host may demote');
    return;
  }

  const target = deps.participants.findById(msg.target_participant_id);
  if (!target || target.room_id !== actor.room_id) {
    sendErr(ws, 'unknown_target_participant', 'target is not a member of this room');
    return;
  }

  if (target.tier === 'primary_host') {
    sendErr(
      ws,
      'cannot_demote_ph',
      'the primary_host cannot be demoted here; use the succession chain'
    );
    return;
  }

  if (target.tier === msg.to_tier) {
    sendErr(ws, 'same_tier', `target is already at tier ${msg.to_tier}`);
    return;
  }
  if (TIER_RANK[target.tier] < TIER_RANK[msg.to_tier]) {
    sendErr(
      ws,
      'invalid_demotion',
      `target tier ${target.tier} is lower than ${msg.to_tier}; use promote`
    );
    return;
  }

  const from_tier = target.tier;

  deps.participants.setTier(target.participant_id, msg.to_tier, actor.participant_id);

  // Invariant: only co_hosts may be successors. Demoting a co_host below
  // co_host therefore strips the successor flag.
  if (target.is_successor && msg.to_tier !== 'co_host') {
    deps.participants.setIsSuccessor(target.participant_id, false);
  }

  deps.sessionEvents.append({
    room_id: actor.room_id,
    participant_id: actor.participant_id,
    kind: 'role',
    payload: {
      kind: 'role',
      op: 'demote',
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
