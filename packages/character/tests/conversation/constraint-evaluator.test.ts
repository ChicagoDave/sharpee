/**
 * Unit tests for constraint evaluation (ADR-142)
 *
 * Verifies constraint evaluation (first-match-wins), .otherwise() fallback,
 * response recording, contradiction detection, and evidence tracking.
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateConstraints,
  ConstraintEvaluator,
} from '../../src/conversation/constraint-evaluator';
import { ResponseCandidate } from '../../src/conversation/response-types';
import { CharacterModelTrait, THREAT_VALUES } from '@sharpee/world-model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrait(overrides?: Record<string, unknown>): CharacterModelTrait {
  return new CharacterModelTrait(overrides as any);
}

function candidate(
  action: ResponseCandidate['action'],
  messageId: string,
  constraints: string[],
  params?: Record<string, () => unknown>,
): ResponseCandidate {
  return { action, messageId, constraints, params };
}

// ===========================================================================
// evaluateConstraints (pure function)
// ===========================================================================

describe('evaluateConstraints', () => {
  it('should select the first candidate whose constraints are all satisfied', () => {
    const trait = makeTrait({
      personality: { honest: 0.8 },
      threat: 'threatened',
    });

    const candidates: ResponseCandidate[] = [
      // First: requires trusts player — will fail (default disposition is neutral)
      candidate('tell', 'murder-truth', ['trusts player', 'not threatened']),
      // Second: requires threatened and cowardly — threatened yes, cowardly no
      candidate('confess', 'murder-breaks-down', ['threatened', 'cowardly']),
      // Third: requires only threatened — yes
      candidate('deflect', 'murder-deflects', ['threatened']),
      // Fallback
      candidate('refuse', 'murder-refuses', []),
    ];

    const result = evaluateConstraints(candidates, trait);
    expect(result).toBeDefined();
    expect(result!.action).toBe('deflect');
    expect(result!.messageId).toBe('murder-deflects');
  });

  it('should fall through to .otherwise() when no constraints match', () => {
    const trait = makeTrait(); // default: calm, safe, no personality

    const candidates: ResponseCandidate[] = [
      candidate('tell', 'truth', ['trusts player']),
      candidate('confess', 'breaks-down', ['threatened', 'cowardly']),
      // .otherwise() — empty constraints
      candidate('deflect', 'default-deflect', []),
    ];

    const result = evaluateConstraints(candidates, trait);
    expect(result).toBeDefined();
    expect(result!.action).toBe('deflect');
    expect(result!.messageId).toBe('default-deflect');
  });

  it('should return undefined when no candidate matches and no fallback', () => {
    const trait = makeTrait();

    const candidates: ResponseCandidate[] = [
      candidate('tell', 'truth', ['trusts player']),
      candidate('confess', 'breaks-down', ['threatened']),
    ];

    const result = evaluateConstraints(candidates, trait);
    expect(result).toBeUndefined();
  });

  it('should return undefined for an empty candidate list', () => {
    const trait = makeTrait();
    const result = evaluateConstraints([], trait);
    expect(result).toBeUndefined();
  });

  it('should respect first-match-wins ordering', () => {
    // Both candidates match, but the first one should win
    const trait = makeTrait({ threat: 'threatened' });

    const candidates: ResponseCandidate[] = [
      candidate('deflect', 'first-deflect', ['threatened']),
      candidate('confess', 'second-confess', ['threatened']),
    ];

    const result = evaluateConstraints(candidates, trait);
    expect(result!.messageId).toBe('first-deflect');
  });

  it('should support negated predicates', () => {
    const trait = makeTrait(); // safe, no personality

    const candidates: ResponseCandidate[] = [
      // 'not threatened' should be true when trait is safe
      candidate('tell', 'safe-response', ['not threatened']),
    ];

    const result = evaluateConstraints(candidates, trait);
    expect(result).toBeDefined();
    expect(result!.action).toBe('tell');
  });

  it('should preserve params on the selected candidate', () => {
    const trait = makeTrait();
    const resolver = () => 'Colonel Mustard';

    const candidates: ResponseCandidate[] = [
      candidate('tell', 'saw-murder', [], { murderer: resolver }),
    ];

    const result = evaluateConstraints(candidates, trait);
    expect(result!.params).toBeDefined();
    expect(result!.params!.murderer()).toBe('Colonel Mustard');
  });
});

// ===========================================================================
// ConstraintEvaluator — response recording
// ===========================================================================

describe('ConstraintEvaluator — response recording', () => {
  it('should record a response and retrieve it', () => {
    const evaluator = new ConstraintEvaluator();

    evaluator.recordResponse('margaret', 'murder', 'tell', 5);

    expect(evaluator.hasDiscussed('margaret', 'murder')).toBe(true);
    expect(evaluator.hasDiscussed('margaret', 'weapon')).toBe(false);

    const entry = evaluator.getLastResponse('margaret', 'murder');
    expect(entry).toBeDefined();
    expect(entry!.action).toBe('tell');
    expect(entry!.turn).toBe(5);
  });

  it('should update the most recent response when topic is discussed again', () => {
    const evaluator = new ConstraintEvaluator();

    evaluator.recordResponse('margaret', 'murder', 'deflect', 3);
    evaluator.recordResponse('margaret', 'murder', 'confess', 8);

    const entry = evaluator.getLastResponse('margaret', 'murder');
    expect(entry!.action).toBe('confess');
    expect(entry!.turn).toBe(8);
  });

  it('should maintain full history per topic', () => {
    const evaluator = new ConstraintEvaluator();

    evaluator.recordResponse('margaret', 'murder', 'deflect', 3);
    evaluator.recordResponse('margaret', 'murder', 'lie', 5);
    evaluator.recordResponse('margaret', 'murder', 'confess', 8);

    const record = evaluator.getRecord('margaret');
    expect(record).toBeDefined();
    const history = record!.history.get('murder');
    expect(history).toHaveLength(3);
    expect(history![0].action).toBe('deflect');
    expect(history![1].action).toBe('lie');
    expect(history![2].action).toBe('confess');
  });

  it('should track conversations per NPC independently', () => {
    const evaluator = new ConstraintEvaluator();

    evaluator.recordResponse('margaret', 'murder', 'tell', 3);
    evaluator.recordResponse('butler', 'murder', 'deflect', 4);

    expect(evaluator.getLastResponse('margaret', 'murder')!.action).toBe('tell');
    expect(evaluator.getLastResponse('butler', 'murder')!.action).toBe('deflect');
  });
});

// ===========================================================================
// ConstraintEvaluator — contradiction detection
// ===========================================================================

describe('ConstraintEvaluator — contradiction detection', () => {
  it('should detect lie → tell as a contradiction', () => {
    const evaluator = new ConstraintEvaluator();

    evaluator.recordResponse('margaret', 'murder', 'lie', 3);
    const contradiction = evaluator.recordResponse('margaret', 'murder', 'tell', 8);

    expect(contradiction).toBeDefined();
    expect(contradiction!.topic).toBe('murder');
    expect(contradiction!.previousAction).toBe('lie');
    expect(contradiction!.currentAction).toBe('tell');
    expect(contradiction!.previousTurn).toBe(3);
    expect(contradiction!.currentTurn).toBe(8);
  });

  it('should detect lie → confess as a contradiction', () => {
    const evaluator = new ConstraintEvaluator();

    evaluator.recordResponse('margaret', 'murder', 'lie', 3);
    const contradiction = evaluator.recordResponse('margaret', 'murder', 'confess', 8);

    expect(contradiction).toBeDefined();
    expect(contradiction!.previousAction).toBe('lie');
    expect(contradiction!.currentAction).toBe('confess');
  });

  it('should detect deflect → confess as a contradiction', () => {
    const evaluator = new ConstraintEvaluator();

    evaluator.recordResponse('margaret', 'murder', 'deflect', 3);
    const contradiction = evaluator.recordResponse('margaret', 'murder', 'confess', 8);

    expect(contradiction).toBeDefined();
  });

  it('should detect omit → tell as a contradiction', () => {
    const evaluator = new ConstraintEvaluator();

    evaluator.recordResponse('margaret', 'murder', 'omit', 3);
    const contradiction = evaluator.recordResponse('margaret', 'murder', 'tell', 8);

    expect(contradiction).toBeDefined();
  });

  it('should not flag same action repeated as a contradiction', () => {
    const evaluator = new ConstraintEvaluator();

    evaluator.recordResponse('margaret', 'murder', 'tell', 3);
    const contradiction = evaluator.recordResponse('margaret', 'murder', 'tell', 8);

    expect(contradiction).toBeUndefined();
  });

  it('should not flag tell → deflect as a contradiction', () => {
    const evaluator = new ConstraintEvaluator();

    evaluator.recordResponse('margaret', 'murder', 'tell', 3);
    const contradiction = evaluator.recordResponse('margaret', 'murder', 'deflect', 8);

    // Tell → deflect is not contradictory (NPC just changes topic)
    expect(contradiction).toBeUndefined();
  });

  it('should not flag first response as a contradiction', () => {
    const evaluator = new ConstraintEvaluator();

    const contradiction = evaluator.recordResponse('margaret', 'murder', 'tell', 3);
    expect(contradiction).toBeUndefined();
  });
});

// ===========================================================================
// ConstraintEvaluator — evidence tracking
// ===========================================================================

describe('ConstraintEvaluator — evidence tracking', () => {
  it('should record evidence presented to an NPC', () => {
    const evaluator = new ConstraintEvaluator();

    evaluator.recordEvidence('margaret', 'bloodstain', 5);

    expect(evaluator.hasPresented('margaret', 'bloodstain')).toBe(true);
    expect(evaluator.hasPresented('margaret', 'weapon')).toBe(false);
    expect(evaluator.hasPresented('butler', 'bloodstain')).toBe(false);
  });

  it('should track multiple evidence items per NPC', () => {
    const evaluator = new ConstraintEvaluator();

    evaluator.recordEvidence('margaret', 'bloodstain', 5);
    evaluator.recordEvidence('margaret', 'weapon', 7);
    evaluator.recordEvidence('margaret', 'letter', 9);

    const evidence = evaluator.getEvidence('margaret');
    expect(evidence).toHaveLength(3);
    expect(evidence[0].topic).toBe('bloodstain');
    expect(evidence[1].topic).toBe('weapon');
    expect(evidence[2].topic).toBe('letter');
  });

  it('should return empty array for NPC with no evidence', () => {
    const evaluator = new ConstraintEvaluator();
    expect(evaluator.getEvidence('nobody')).toEqual([]);
  });
});

// ===========================================================================
// ConstraintEvaluator — serialization
// ===========================================================================

describe('ConstraintEvaluator — serialization', () => {
  it('should round-trip through toJSON/fromJSON', () => {
    const evaluator = new ConstraintEvaluator();

    evaluator.recordResponse('margaret', 'murder', 'lie', 3);
    evaluator.recordResponse('margaret', 'murder', 'confess', 8);
    evaluator.recordResponse('butler', 'weapon', 'tell', 5);
    evaluator.recordEvidence('margaret', 'bloodstain', 6);
    evaluator.recordEvidence('butler', 'letter', 10);

    const serialized = evaluator.toJSON();
    const restored = ConstraintEvaluator.fromJSON(serialized);

    // Verify conversation records survived
    expect(restored.hasDiscussed('margaret', 'murder')).toBe(true);
    expect(restored.getLastResponse('margaret', 'murder')!.action).toBe('confess');
    expect(restored.getLastResponse('butler', 'weapon')!.action).toBe('tell');

    // Verify history survived
    const record = restored.getRecord('margaret');
    expect(record!.history.get('murder')).toHaveLength(2);

    // Verify evidence survived
    expect(restored.hasPresented('margaret', 'bloodstain')).toBe(true);
    expect(restored.hasPresented('butler', 'letter')).toBe(true);
    expect(restored.getEvidence('margaret')).toHaveLength(1);
  });
});
