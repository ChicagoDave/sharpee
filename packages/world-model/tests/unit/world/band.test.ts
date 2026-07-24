/**
 * bandOf — the pure band lookup at the heart of the ADR-262 crossing engine.
 *
 * Invariants under test:
 *  1. the reached band is the highest threshold <= value,
 *  2. a value below every threshold resolves to -1,
 *  3. boundaries are inclusive (threshold <= value),
 *  4. it is a pure function of (value, thresholds) with no stored state.
 *
 * Covers ADR-262 acceptance #1 (the lookup ScoreLedger.getRank now delegates to).
 */

import { describe, it, expect } from 'vitest';
import { bandOf } from '../../../src/world/band';

describe('bandOf (ADR-262 D1)', () => {
  const THRESHOLDS = [0, 30, 60, 90]; // peckish/hungry/starving-style ascending bands

  it('places a value in the highest band whose threshold it has reached', () => {
    expect(bandOf(0, THRESHOLDS)).toBe(0);
    expect(bandOf(29, THRESHOLDS)).toBe(0);
    expect(bandOf(30, THRESHOLDS)).toBe(1);
    expect(bandOf(59, THRESHOLDS)).toBe(1);
    expect(bandOf(60, THRESHOLDS)).toBe(2);
    expect(bandOf(89, THRESHOLDS)).toBe(2);
    expect(bandOf(90, THRESHOLDS)).toBe(3);
    expect(bandOf(1000, THRESHOLDS)).toBe(3);
  });

  it('returns -1 when the value is below every band', () => {
    expect(bandOf(-1, THRESHOLDS)).toBe(-1);
    expect(bandOf(9, [10, 20, 30])).toBe(-1);
  });

  it('treats the boundary as inclusive (threshold <= value)', () => {
    expect(bandOf(50, [50])).toBe(0);
    expect(bandOf(49, [50])).toBe(-1);
  });

  it('handles an empty band set as "below all"', () => {
    expect(bandOf(100, [])).toBe(-1);
  });

  it('handles a single band', () => {
    expect(bandOf(0, [0])).toBe(0);
    expect(bandOf(1000, [0])).toBe(0);
  });

  it('is pure — repeated calls with the same args are identical and order-independent of prior calls', () => {
    expect(bandOf(45, THRESHOLDS)).toBe(1);
    expect(bandOf(95, THRESHOLDS)).toBe(3);
    expect(bandOf(45, THRESHOLDS)).toBe(1);
  });
});
