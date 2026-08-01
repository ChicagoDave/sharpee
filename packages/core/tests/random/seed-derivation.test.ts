/**
 * Seed Derivation Tests (ADR-293 D3)
 *
 * `deriveStreamSeed` is a compatibility surface: saves depend on its output never
 * changing within a SEED_DERIVATION_VERSION. The pinned values below were generated
 * by running the real function (2026-08-01, esbuild-compiled source); if any pin
 * fails, the fix is to bump SEED_DERIVATION_VERSION, never to update the pin.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveStreamSeed,
  SEED_DERIVATION_VERSION,
} from '../../src/random/seed-derivation';

describe('deriveStreamSeed', () => {
  describe('compatibility surface (pinned values, version 1)', () => {
    it('matches the pinned values recorded for version 1', () => {
      // These pins are valid for version 1 only — a version bump must fail here
      // and regenerate the pin set rather than silently keeping stale values.
      expect(SEED_DERIVATION_VERSION).toBe(1);
      expect(deriveStreamSeed(0, 'dungeo.melee.blow.hero')).toBe(652761327);
      expect(deriveStreamSeed(0, 'dungeo.melee.blow.villain')).toBe(290600602);
      expect(deriveStreamSeed(42, 'dungeo.melee.blow.hero')).toBe(4289069093);
      expect(deriveStreamSeed(42, 'stdlib.throwing.breaks')).toBe(277289843);
      expect(deriveStreamSeed(42, 'stdlib.throwing.break')).toBe(4260123754);
      expect(deriveStreamSeed(43, 'dungeo.melee.blow.hero')).toBe(2943992084);
      expect(deriveStreamSeed(4294967295, 'family-zoo.parrot.squawk')).toBe(748692200);
      expect(deriveStreamSeed(123456789, 'a')).toBe(4281063252);
    });
  });

  describe('properties (D3)', () => {
    it('is a pure function of (masterSeed, pointName)', () => {
      expect(deriveStreamSeed(7, 'dungeo.thief.steal')).toBe(
        deriveStreamSeed(7, 'dungeo.thief.steal')
      );
    });

    it('decorrelates nearby names under the same master seed', () => {
      // Pins above already show break/breaks differ; assert the general property
      // across a batch of near names too.
      const seeds = ['dungeo.point.a', 'dungeo.point.b', 'dungeo.point.c'].map(
        (name) => deriveStreamSeed(1000, name)
      );
      expect(new Set(seeds).size).toBe(seeds.length);
    });

    it('decorrelates nearby master seeds for the same name', () => {
      const a = deriveStreamSeed(42, 'dungeo.melee.blow.hero');
      const b = deriveStreamSeed(43, 'dungeo.melee.blow.hero');
      expect(a).not.toBe(b);
    });

    it('returns an unsigned 32-bit integer', () => {
      const value = deriveStreamSeed(4294967295, 'dungeo.melee.blow.hero');
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(4294967295);
    });

    it('normalizes the master seed to unsigned 32-bit (−1 ≡ 0xffffffff)', () => {
      expect(deriveStreamSeed(-1, 'family-zoo.parrot.squawk')).toBe(
        deriveStreamSeed(4294967295, 'family-zoo.parrot.squawk')
      );
    });
  });
});
