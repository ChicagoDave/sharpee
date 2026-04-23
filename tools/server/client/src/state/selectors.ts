/**
 * Pure read selectors over `RoomState`. Each selector is a referentially
 * transparent function — same input, same output, no side effects, no
 * React types — so it can be tested directly against fixture state and
 * reused by a hypothetical future non-React client.
 *
 * Public interface: {@link selectDmUnread}.
 *
 * Bounded context: client state layer (ADR-153 Interface Contracts).
 *
 * Selectors live next to the state shape they read from so that adding a
 * new reducer field and the selector that exposes it is a one-folder edit.
 * Component-only derivations (e.g., "tab is currently active") do not
 * belong here — they belong in the component, where the per-render UI
 * state already lives.
 */

import type { RoomState } from './types';

/**
 * Number of DM messages from `peerParticipantId` whose `event_id` is
 * strictly greater than the local "last read" cursor. Returns 0 when the
 * peer has no thread or no cursor advanced past the latest message.
 *
 * Cursor is advanced exclusively by the `ui:dm_read` reducer action; this
 * function never mutates state.
 */
export function selectDmUnread(
  state: RoomState,
  peerParticipantId: string,
): number {
  const thread = state.dmThreads[peerParticipantId];
  if (!thread || thread.length === 0) return 0;
  const cursor = state.dmReadCursors[peerParticipantId] ?? 0;
  let count = 0;
  for (const entry of thread) {
    if (entry.event_id > cursor) count += 1;
  }
  return count;
}
