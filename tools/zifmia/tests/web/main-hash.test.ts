// @vitest-environment happy-dom
/**
 * @module tests/web/main-hash.test
 * @purpose Behavior tests for `parseHash` — the single public seam
 *   in `main.ts` that classifies `location.hash` into a route. The
 *   rest of `main.ts` (the bootstrap chain) drives DOM mounting and
 *   is covered indirectly by the IdentityManager / LobbyManager
 *   suites; `parseHash` carries the routing invariants on its own.
 * @owner Zifmia web client tests.
 */

import { describe, expect, it } from 'vitest';

import { parseHash } from '../../web/src/routing';

describe('parseHash', () => {
  it('treats empty hash as lobby', () => {
    expect(parseHash('')).toEqual({ kind: 'lobby' });
  });

  it('treats bare # as lobby', () => {
    expect(parseHash('#')).toEqual({ kind: 'lobby' });
  });

  it('treats #lobby as lobby', () => {
    expect(parseHash('#lobby')).toEqual({ kind: 'lobby' });
  });

  it('routes #room/abc-123 to room view with that id', () => {
    expect(parseHash('#room/abc-123')).toEqual({
      kind: 'room',
      roomId: 'abc-123'
    });
  });

  it('routes #room/uuid-style ids without truncation', () => {
    const id = '7e57c0de-1234-5678-90ab-cdef01234567';
    expect(parseHash(`#room/${id}`)).toEqual({ kind: 'room', roomId: id });
  });

  it('falls back to lobby when room has empty id', () => {
    expect(parseHash('#room/')).toEqual({ kind: 'lobby' });
  });

  it('falls back to lobby on unrecognized hashes', () => {
    expect(parseHash('#about')).toEqual({ kind: 'lobby' });
    expect(parseHash('#admin/dashboard')).toEqual({ kind: 'lobby' });
  });
});
