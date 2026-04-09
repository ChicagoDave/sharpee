/**
 * Unit tests for ACL — anti-corruption layer (ADR-142)
 *
 * Verifies buildResponseIntent, mood variant selection,
 * and cognitive coloring.
 */

import { describe, it, expect } from 'vitest';
import {
  buildResponseIntent,
  selectMoodVariant,
  applyCognitiveColoring,
} from '../../src/conversation/acl';
import { ResponseCandidate, ResponseIntent } from '../../src/conversation/response-types';
import { CharacterModelTrait, STABLE_COGNITIVE_PROFILE } from '@sharpee/world-model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrait(overrides?: Record<string, unknown>): CharacterModelTrait {
  return new CharacterModelTrait(overrides as any);
}

function makeCandidate(overrides?: Partial<ResponseCandidate>): ResponseCandidate {
  return {
    action: 'tell',
    messageId: 'murder-truth',
    constraints: [],
    ...overrides,
  };
}

// ===========================================================================
// selectMoodVariant
// ===========================================================================

describe('selectMoodVariant', () => {
  it('should return base message ID for calm mood', () => {
    expect(selectMoodVariant('murder-truth', 'calm')).toBe('murder-truth');
  });

  it('should append mood suffix for non-calm moods', () => {
    expect(selectMoodVariant('murder-truth', 'nervous')).toBe('murder-truth.nervous');
    expect(selectMoodVariant('murder-truth', 'panicked')).toBe('murder-truth.panicked');
    expect(selectMoodVariant('murder-truth', 'furious')).toBe('murder-truth.furious');
  });
});

// ===========================================================================
// applyCognitiveColoring
// ===========================================================================

describe('applyCognitiveColoring', () => {
  it('should not modify intent for stable cognitive profile', () => {
    const intent: ResponseIntent = {
      action: 'tell',
      topic: 'murder',
      messageId: 'murder-truth',
      mood: 'calm',
      coherence: 'focused',
    };

    const result = applyCognitiveColoring(intent, STABLE_COGNITIVE_PROFILE);
    expect(result.messageId).toBe('murder-truth');
  });

  it('should append #detached marker for fractured selfModel', () => {
    const intent: ResponseIntent = {
      action: 'tell',
      topic: 'murder',
      messageId: 'murder-truth',
      mood: 'calm',
      coherence: 'focused',
    };

    const profile = { ...STABLE_COGNITIVE_PROFILE, selfModel: 'fractured' as const };
    const result = applyCognitiveColoring(intent, profile);
    expect(result.messageId).toBe('murder-truth#detached');
  });

  it('should append #hallucinating marker for augmented perception', () => {
    const intent: ResponseIntent = {
      action: 'tell',
      topic: 'murder',
      messageId: 'murder-truth',
      mood: 'calm',
      coherence: 'focused',
    };

    const profile = { ...STABLE_COGNITIVE_PROFILE, perception: 'augmented' as const };
    const result = applyCognitiveColoring(intent, profile);
    expect(result.messageId).toBe('murder-truth#hallucinating');
  });

  it('should combine markers for fractured + augmented', () => {
    const intent: ResponseIntent = {
      action: 'tell',
      topic: 'murder',
      messageId: 'murder-truth',
      mood: 'calm',
      coherence: 'focused',
    };

    const profile = {
      ...STABLE_COGNITIVE_PROFILE,
      selfModel: 'fractured' as const,
      perception: 'augmented' as const,
    };
    const result = applyCognitiveColoring(intent, profile);
    expect(result.messageId).toBe('murder-truth#detached#hallucinating');
  });

  it('should preserve coherence from the intent', () => {
    const intent: ResponseIntent = {
      action: 'confabulate',
      topic: 'murder',
      messageId: 'murder-fragments',
      mood: 'confused',
      coherence: 'fragmented',
    };

    const result = applyCognitiveColoring(intent, STABLE_COGNITIVE_PROFILE);
    expect(result.coherence).toBe('fragmented');
  });
});

// ===========================================================================
// buildResponseIntent
// ===========================================================================

describe('buildResponseIntent', () => {
  it('should construct intent with mood and coherence from trait', () => {
    const trait = makeTrait({ mood: 'nervous' });
    const candidate = makeCandidate({ action: 'tell', messageId: 'murder-truth' });

    const intent = buildResponseIntent(candidate, 'murder', trait);

    expect(intent.action).toBe('tell');
    expect(intent.topic).toBe('murder');
    expect(intent.mood).toBe('nervous');
    expect(intent.coherence).toBe('focused'); // default cognitive profile
    // Mood variant: nervous suffix
    expect(intent.messageId).toBe('murder-truth.nervous');
  });

  it('should use base message ID for calm mood', () => {
    const trait = makeTrait({ mood: 'calm' });
    const candidate = makeCandidate({ messageId: 'murder-truth' });

    const intent = buildResponseIntent(candidate, 'murder', trait);
    expect(intent.messageId).toBe('murder-truth');
  });

  it('should resolve params from resolver functions', () => {
    const trait = makeTrait();
    const candidate = makeCandidate({
      messageId: 'saw-murder',
      params: {
        murderer: () => 'Colonel Mustard',
        room: () => 'Library',
      },
    });

    const intent = buildResponseIntent(candidate, 'murder', trait);
    expect(intent.params).toEqual({
      murderer: 'Colonel Mustard',
      room: 'Library',
    });
  });

  it('should include context label when provided', () => {
    const trait = makeTrait();
    const candidate = makeCandidate();

    const intent = buildResponseIntent(candidate, 'murder', trait, 'confessing');
    expect(intent.context).toBe('confessing');
  });

  it('should apply cognitive coloring for fractured selfModel', () => {
    const trait = makeTrait({
      cognitiveProfile: { ...STABLE_COGNITIVE_PROFILE, selfModel: 'fractured' },
    });
    const candidate = makeCandidate({ messageId: 'murder-truth' });

    const intent = buildResponseIntent(candidate, 'murder', trait);
    expect(intent.messageId).toContain('#detached');
  });

  it('should set coherence from cognitive profile', () => {
    const trait = makeTrait({
      cognitiveProfile: { ...STABLE_COGNITIVE_PROFILE, coherence: 'fragmented' },
    });
    const candidate = makeCandidate();

    const intent = buildResponseIntent(candidate, 'murder', trait);
    expect(intent.coherence).toBe('fragmented');
  });

  it('should omit params when candidate has none', () => {
    const trait = makeTrait();
    const candidate = makeCandidate();

    const intent = buildResponseIntent(candidate, 'murder', trait);
    expect(intent.params).toBeUndefined();
  });
});
