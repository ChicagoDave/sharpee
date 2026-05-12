// @vitest-environment happy-dom
/**
 * @module tests/web/admin-routing.test
 * @purpose Routing tests for the `#admin` hash route extension. The
 *   non-admin redirect path is covered indirectly in
 *   `admin-manager.test.ts` (via the `onAccessDenied` callback);
 *   this file pins the pure parser surface.
 * @owner Zifmia web client tests.
 */

import { describe, expect, it } from 'vitest';

import { parseHash } from '../../web/src/routing';

describe('parseHash — #admin extension (Phase 6f-admin)', () => {
  it('routes #admin to the admin dashboard', () => {
    expect(parseHash('#admin')).toEqual({ kind: 'admin' });
  });

  it('does NOT confuse #admin with #admin/* (no nested admin routes in v1)', () => {
    expect(parseHash('#admin/stories')).toEqual({ kind: 'lobby' });
  });

  it('still recognizes #lobby, #room/:id, and falls back on garbage', () => {
    expect(parseHash('')).toEqual({ kind: 'lobby' });
    expect(parseHash('#lobby')).toEqual({ kind: 'lobby' });
    expect(parseHash('#room/abc')).toEqual({ kind: 'room', roomId: 'abc' });
    expect(parseHash('#garbage')).toEqual({ kind: 'lobby' });
  });
});
