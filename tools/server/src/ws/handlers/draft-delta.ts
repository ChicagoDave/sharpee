/**
 * WebSocket `draft_delta` handler.
 *
 * Public interface: {@link handleDraftDelta}, {@link DraftDeltaDeps}.
 * Bounded context: lock-on-typing runtime (ADR-153 Decision 7).
 *
 * A `draft_delta` is the client's "I just pressed a key" frame. The server
 * treats the empty-text case as an intent to release the lock; any other
 * text is an intent to hold / keep holding the lock, plus a request to
 * broadcast the in-progress text to every other participant so they can see
 * the sender typing in real time.
 */

import type { WebSocket } from 'ws';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { LockManager } from '../lock-manager.js';
import type { ClientMsg, ServerMsg } from '../../wire/browser-server.js';

export interface DraftDeltaDeps {
  participants: ParticipantsRepository;
  connections: ConnectionManager;
  locks: LockManager;
}

function sendMsg(ws: WebSocket, msg: ServerMsg): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* socket down; close handler will reap */
  }
}

function sendErr(ws: WebSocket, code: string, detail: string): void {
  sendMsg(ws, { kind: 'error', code, detail });
}

/**
 * Process a `draft_delta` frame.
 *
 * Acquisition paths:
 *   - empty text by the current holder  → release lock, broadcast lock_state(null)
 *   - empty text by anyone else         → silent no-op
 *   - non-empty by a free-room caller   → acquire, broadcast lock_state + draft_frame
 *   - non-empty by the current holder   → bump last_keystroke_at (and seq if newer),
 *                                          broadcast draft_frame
 *   - non-empty by another participant  → send lock_state(existing_holder) to sender only
 */
export function handleDraftDelta(
  deps: DraftDeltaDeps,
  ws: WebSocket,
  actor: { participant_id: string; room_id: string },
  msg: Extract<ClientMsg, { kind: 'draft_delta' }>
): void {
  if (typeof msg.seq !== 'number' || !Number.isFinite(msg.seq) || msg.seq < 0) {
    sendErr(ws, 'bad_seq', 'draft_delta.seq must be a non-negative finite number');
    return;
  }
  if (typeof msg.text !== 'string') {
    sendErr(ws, 'bad_text', 'draft_delta.text must be a string');
    return;
  }

  const participant = deps.participants.findById(actor.participant_id);
  if (!participant) {
    sendErr(ws, 'unknown_participant', 'participant no longer exists');
    return;
  }
  if (participant.muted) {
    sendErr(ws, 'muted', 'you have been muted');
    return;
  }

  // Empty text: intent is to release the lock (N-0: empty-input release).
  if (msg.text.length === 0) {
    const released = deps.locks.release(actor.room_id, actor.participant_id);
    if (released) {
      deps.connections.broadcast(actor.room_id, { kind: 'lock_state', holder_id: null });
    }
    return;
  }

  const priorHolder = deps.locks.getState(actor.room_id).holder_id;
  const priorSeq = deps.locks.getState(actor.room_id).draft_seq;

  const result = deps.locks.acquireOrUpdate(actor.room_id, actor.participant_id, msg.seq);

  if (!result.acquired) {
    // Another participant holds the lock. Tell the sender alone so they can
    // reset their local input and show a "too late" indicator (B-1).
    sendMsg(ws, { kind: 'lock_state', holder_id: result.holder_id });
    return;
  }

  // Caller holds the lock (either freshly acquired or continuing to hold).
  if (priorHolder !== actor.participant_id) {
    // Newly acquired — announce the lock transition before the draft frame.
    deps.connections.broadcast(actor.room_id, {
      kind: 'lock_state',
      holder_id: actor.participant_id,
    });
  } else if (msg.seq <= priorSeq) {
    // Out-of-order frame from the same holder (N-7). LockManager bumped
    // last_keystroke_at but kept draft_seq at the higher stored value; we
    // silently swallow the frame rather than broadcast stale text.
    return;
  }

  deps.connections.broadcast(actor.room_id, {
    kind: 'draft_frame',
    typist_id: actor.participant_id,
    seq: result.draft_seq,
    text: msg.text,
  });
}
