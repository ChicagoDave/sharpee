/**
 * Socket-close handler — flips connected=0, appends `leave`, broadcasts presence.
 *
 * Public interface: {@link handleDisconnect}, {@link DisconnectDeps}.
 * Bounded context: WebSocket presence (ADR-153 Decision 11 — every lifecycle
 * change is logged).
 */

import type { Database } from 'better-sqlite3';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { SessionEventsRepository } from '../../repositories/session-events.js';
import type { ConnectionManager } from '../connection-manager.js';

export interface DisconnectDeps {
  db: Database;
  participants: ParticipantsRepository;
  sessionEvents: SessionEventsRepository;
  connections: ConnectionManager;
}

/**
 * Called when a registered socket closes for any reason (normal close,
 * client navigation, network drop). Idempotent: calling twice with the
 * same participant_id is a no-op on the second call.
 *
 * @param reason 'disconnect' for normal close, 'tab_closed' when the client
 *               signaled a deliberate exit, 'grace_expired' when a reconnect
 *               window elapsed (Phase 7 uses this).
 */
export function handleDisconnect(
  deps: DisconnectDeps,
  participant_id: string,
  room_id: string,
  reason: 'disconnect' | 'tab_closed' | 'grace_expired' = 'disconnect'
): void {
  const participant = deps.participants.findById(participant_id);
  if (!participant) return;

  // Transactional: presence flag + leave event are committed together.
  const tx = deps.db.transaction(() => {
    deps.participants.setConnected(participant_id, false);
    deps.sessionEvents.append({
      room_id,
      participant_id,
      kind: 'leave',
      payload: { kind: 'leave', reason },
    });
  });
  tx();

  deps.connections.unregisterParticipant(participant_id);

  deps.connections.broadcast(room_id, {
    kind: 'presence',
    participant_id,
    connected: false,
  });
}
