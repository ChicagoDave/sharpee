/**
 * Unit tests for propagation visibility (ADR-144)
 *
 * Verifies visibility determination for absent, present, and
 * concealed player states.
 */

import { describe, it, expect } from 'vitest';
import {
  getVisibilityResult,
  getVisibilityResults,
  PROPAGATION_WITNESSED_DEFAULTS,
} from '../../src/propagation/visibility';
import { PropagationTransfer } from '../../src/propagation/propagation-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTransfer(overrides?: Partial<PropagationTransfer>): PropagationTransfer {
  return {
    speakerId: 'maid',
    listenerId: 'cook',
    topic: 'murder',
    version: 'truth',
    coloring: 'dramatic',
    ...overrides,
  };
}

// ===========================================================================
// Absent (offscreen)
// ===========================================================================

describe('Propagation visibility — absent', () => {
  it('should produce no message and no player learning', () => {
    const result = getVisibilityResult(makeTransfer(), 'absent');

    expect(result.presence).toBe('absent');
    expect(result.messageId).toBeUndefined();
    expect(result.playerLearns).toBe(false);
  });
});

// ===========================================================================
// Present (witnessed)
// ===========================================================================

describe('Propagation visibility — present', () => {
  it('should produce platform default message based on coloring', () => {
    const result = getVisibilityResult(makeTransfer({ coloring: 'dramatic' }), 'present');

    expect(result.presence).toBe('present');
    expect(result.messageId).toBe(PROPAGATION_WITNESSED_DEFAULTS.dramatic);
    expect(result.playerLearns).toBe(false);
  });

  it('should use author override when provided', () => {
    const result = getVisibilityResult(
      makeTransfer({ witnessedOverride: 'maid-whispers-about-murder' }),
      'present',
    );

    expect(result.messageId).toBe('maid-whispers-about-murder');
  });

  it('should select correct default for each coloring', () => {
    for (const coloring of ['neutral', 'dramatic', 'vague', 'fearful', 'conspiratorial'] as const) {
      const result = getVisibilityResult(makeTransfer({ coloring }), 'present');
      expect(result.messageId).toBe(PROPAGATION_WITNESSED_DEFAULTS[coloring]);
    }
  });
});

// ===========================================================================
// Concealed (eavesdropped)
// ===========================================================================

describe('Propagation visibility — concealed', () => {
  it('should produce message and player learns the fact', () => {
    const result = getVisibilityResult(makeTransfer(), 'concealed');

    expect(result.presence).toBe('concealed');
    expect(result.messageId).toBeDefined();
    expect(result.playerLearns).toBe(true);
  });
});

// ===========================================================================
// Batch evaluation
// ===========================================================================

describe('getVisibilityResults — batch', () => {
  it('should evaluate multiple transfers', () => {
    const results = getVisibilityResults(
      [
        makeTransfer({ topic: 'murder' }),
        makeTransfer({ topic: 'weapon', coloring: 'vague' }),
      ],
      'present',
    );

    expect(results).toHaveLength(2);
    expect(results[0].transfer.topic).toBe('murder');
    expect(results[1].transfer.topic).toBe('weapon');
    expect(results[1].messageId).toBe(PROPAGATION_WITNESSED_DEFAULTS.vague);
  });
});
