/**
 * Token storage behaviour tests.
 *
 * Behavior Statement — token storage
 *   DOES: writeToken(roomId, t) sets `localStorage['sharpee.token.<roomId>']`
 *         to t; readToken(roomId) returns the persisted value; clearToken
 *         removes it. Empty/undefined roomIds and tokens are ignored on
 *         write.
 *   WHEN: the create-room / join-room flow receives a token.
 *   BECAUSE: tokens authorise WebSocket connects and survive reload
 *            (ADR-153 Decision 5); keys are per-room so the browser can
 *            hold tokens for multiple rooms at once.
 *   REJECTS WHEN: storage access throws — the helpers swallow errors so
 *                 the surrounding flow keeps working.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearToken, readToken, writeToken } from './token';

describe('storage/token', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('roundtrips a token under a per-room key', () => {
    writeToken('room-A', 'tok-A');
    expect(readToken('room-A')).toBe('tok-A');
    expect(window.localStorage.getItem('sharpee.token.room-A')).toBe('tok-A');
  });

  it('isolates tokens per room (different rooms do not collide)', () => {
    writeToken('room-A', 'tok-A');
    writeToken('room-B', 'tok-B');
    expect(readToken('room-A')).toBe('tok-A');
    expect(readToken('room-B')).toBe('tok-B');
  });

  it('returns null when no token exists', () => {
    expect(readToken('never-written')).toBeNull();
  });

  it('clearToken removes the entry', () => {
    writeToken('room-A', 'tok-A');
    clearToken('room-A');
    expect(readToken('room-A')).toBeNull();
    expect(window.localStorage.getItem('sharpee.token.room-A')).toBeNull();
  });

  it('writeToken ignores empty roomId or empty token', () => {
    writeToken('', 'tok');
    writeToken('room-X', '');
    expect(window.localStorage.length).toBe(0);
  });

  it('swallows storage exceptions in read/write/clear', () => {
    const throwing = () => {
      throw new Error('quota exceeded');
    };
    const spyGet = vi.spyOn(window.localStorage, 'getItem').mockImplementation(throwing);
    const spySet = vi.spyOn(window.localStorage, 'setItem').mockImplementation(throwing);
    const spyRemove = vi
      .spyOn(window.localStorage, 'removeItem')
      .mockImplementation(throwing);

    expect(() => writeToken('room', 'tok')).not.toThrow();
    expect(readToken('room')).toBeNull();
    expect(() => clearToken('room')).not.toThrow();

    spyGet.mockRestore();
    spySet.mockRestore();
    spyRemove.mockRestore();
  });
});
