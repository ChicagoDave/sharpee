/**
 * WebSocket `pin` / `unpin` handler.
 *
 * Public interface: {@link handlePin}, {@link PinDeps}.
 * Bounded context: room lifecycle (ADR-153 Decision 12).
 *
 * Pinning exempts a room from the idle-recycle sweep. Only the Primary Host
 * may flip the bit in either direction. Every flip is persisted to the
 * session log so export/replay can reconstruct the room's lifetime.
 *
 * Idempotent-reject: if the room is already in the requested state, the
 * handler returns `already_pinned` / `already_unpinned` without writing
 * anything — keeps the log free of no-op lifecycle rows.
 */

import type { WebSocket } from 'ws';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { RoomsRepository } from '../../repositories/rooms.js';
import type { SessionEventsRepository } from '../../repositories/session-events.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { ClientMsg } from '../../wire/browser-server.js';
import { sendErr } from '../error-response.js';

export interface PinDeps {
  participants: ParticipantsRepository;
  rooms: RoomsRepository;
  sessionEvents: SessionEventsRepository;
  connections: ConnectionManager;
}

/**
 * Process a `pin` or `unpin` frame. The frame's `kind` selects the target
 * state (`pin` → pinned=true, `unpin` → pinned=false); both go through the
 * same authority + state-check pipeline.
 *
 * Order of checks:
 *   1. sender exists
 *   2. sender.tier == primary_host
 *   3. room still exists
 *   4. current pinned != desired (otherwise already_* rejection)
 *   5. setPinned + lifecycle event + room_state broadcast
 */
export function handlePin(
  deps: PinDeps,
  ws: WebSocket,
  actor: { participant_id: string; room_id: string },
  msg: Extract<ClientMsg, { kind: 'pin' } | { kind: 'unpin' }>
): void {
  const desired = msg.kind === 'pin';

  const sender = deps.participants.findById(actor.participant_id);
  if (!sender) {
    sendErr(ws, 'unknown_participant', 'participant no longer exists');
    return;
  }
  if (sender.tier !== 'primary_host') {
    sendErr(
      ws,
      'insufficient_authority',
      `tier ${sender.tier} may not ${msg.kind}; requires primary_host`
    );
    return;
  }

  const room = deps.rooms.findById(actor.room_id);
  if (!room) {
    sendErr(ws, 'room_not_found', 'room no longer exists');
    return;
  }

  if (room.pinned === desired) {
    sendErr(
      ws,
      desired ? 'already_pinned' : 'already_unpinned',
      `room is already ${desired ? 'pinned' : 'unpinned'}`
    );
    return;
  }

  deps.rooms.setPinned(actor.room_id, desired);
  deps.sessionEvents.append({
    room_id: actor.room_id,
    participant_id: actor.participant_id,
    kind: 'lifecycle',
    payload: {
      kind: 'lifecycle',
      op: desired ? 'pinned' : 'unpinned',
    },
  });

  // Re-read after setPinned so the broadcast carries the canonical
  // last_activity_at straight from the repository.
  const refreshed = deps.rooms.findById(actor.room_id);
  const last_activity_at = refreshed?.last_activity_at ?? room.last_activity_at;
  const title = refreshed?.title ?? room.title;

  deps.connections.broadcast(actor.room_id, {
    kind: 'room_state',
    pinned: desired,
    last_activity_at,
    title,
  });
}
