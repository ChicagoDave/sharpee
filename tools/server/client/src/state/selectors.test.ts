/**
 * selectDmUnread tests.
 *
 * Behavior Statement — selectDmUnread
 *   DOES: returns the count of dmThreads[peer] entries whose `event_id` is
 *         strictly greater than `dmReadCursors[peer] ?? 0`.
 *   WHEN: any consumer needs the unread badge count for a DM thread.
 *   BECAUSE: the rendered unread badge IS this count; it's the projection
 *            that turns "raw thread + cursor" into a renderable scalar.
 *   REJECTS WHEN: never. Returns 0 for unknown peer, empty thread, or a
 *                 cursor at or above the latest event_id.
 */

import { describe, expect, it } from 'vitest';
import { selectDmUnread } from './selectors';
import { initialRoomState, type RoomState } from './types';

function withState(overrides: Partial<RoomState>): RoomState {
  return { ...initialRoomState, ...overrides };
}

describe('selectDmUnread', () => {
  it('returns 0 when the peer has no thread', () => {
    expect(selectDmUnread(initialRoomState, 'p-nobody')).toBe(0);
  });

  it('returns 0 when the thread is empty', () => {
    const s = withState({ dmThreads: { 'p-x': [] } });
    expect(selectDmUnread(s, 'p-x')).toBe(0);
  });

  it('counts every entry when no cursor has been set', () => {
    const s = withState({
      dmThreads: {
        'p-x': [
          { event_id: 1, from: 'p-x', to: 'p-self', text: 'a', ts: 't' },
          { event_id: 2, from: 'p-x', to: 'p-self', text: 'b', ts: 't' },
          { event_id: 3, from: 'p-x', to: 'p-self', text: 'c', ts: 't' },
        ],
      },
    });
    expect(selectDmUnread(s, 'p-x')).toBe(3);
  });

  it('counts only entries with event_id > cursor', () => {
    const s = withState({
      dmThreads: {
        'p-x': [
          { event_id: 1, from: 'p-x', to: 'p-self', text: 'a', ts: 't' },
          { event_id: 2, from: 'p-x', to: 'p-self', text: 'b', ts: 't' },
          { event_id: 3, from: 'p-x', to: 'p-self', text: 'c', ts: 't' },
        ],
      },
      dmReadCursors: { 'p-x': 2 },
    });
    expect(selectDmUnread(s, 'p-x')).toBe(1);
  });

  it('returns 0 when cursor is at or above the latest event_id', () => {
    const s = withState({
      dmThreads: {
        'p-x': [
          { event_id: 1, from: 'p-x', to: 'p-self', text: 'a', ts: 't' },
          { event_id: 2, from: 'p-x', to: 'p-self', text: 'b', ts: 't' },
        ],
      },
      dmReadCursors: { 'p-x': 2 },
    });
    expect(selectDmUnread(s, 'p-x')).toBe(0);
    // Cursor strictly greater is also fine (defensive — shouldn't happen
    // via the reducer's monotonic ui:dm_read, but the selector is robust).
    const sHigher = withState({
      dmThreads: s.dmThreads,
      dmReadCursors: { 'p-x': 99 },
    });
    expect(selectDmUnread(sHigher, 'p-x')).toBe(0);
  });

  it('isolates peers — a cursor on one peer does not affect another', () => {
    const s = withState({
      dmThreads: {
        'p-x': [{ event_id: 5, from: 'p-x', to: 'p-self', text: 'a', ts: 't' }],
        'p-y': [{ event_id: 5, from: 'p-y', to: 'p-self', text: 'a', ts: 't' }],
      },
      dmReadCursors: { 'p-x': 5 },
    });
    expect(selectDmUnread(s, 'p-x')).toBe(0);
    expect(selectDmUnread(s, 'p-y')).toBe(1);
  });
});
