/**
 * barrel-surface.test.ts — the values a consumer can import from
 * `@sharpee/event-processor` are exactly the ones that have a consumer
 * outside the package. A value added to the barrel without one, or one of
 * these removed, fails here.
 *
 * Type exports are erased before this test runs, so it cannot see them: a
 * type removed from the barrel fails its importers' type checks, and a type
 * added to it is caught by nothing but review.
 *
 * Owner context: event-processor test suite.
 */
import { describe, it, expect } from 'vitest';
import * as barrel from '../../src/index';

describe('the package barrel', () => {
  it('exports exactly the values that have a consumer outside the package', () => {
    expect(Object.keys(barrel).sort()).toEqual(['EffectProcessor', 'EventProcessor']);
  });
});
