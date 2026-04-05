/**
 * Tests for character observation handler and lucidity decay (ADR-141)
 *
 * Verifies cognitive filtering, state transitions, hallucination injection,
 * lucidity decay, and observable behavior event emission.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ISemanticEvent } from '@sharpee/core';
import {
  IFEntity,
  WorldModel,
  TraitType,
  CharacterModelTrait,
  ICharacterModelData,
} from '@sharpee/world-model';
import {
  observeEvent,
  filterPerception,
  injectHallucinations,
  DefaultStateTransitions,
} from '../../../src/npc/character-observer';
import {
  processLucidityDecay,
  enterLucidityWindow,
  DECAY_RATE_TURNS,
} from '../../../src/npc/lucidity-decay';
import { CharacterMessages } from '../../../src/npc/character-messages';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createTestEvent(type: string, actorId?: string, tags?: string[]): ISemanticEvent {
  return {
    id: `test_${Date.now()}`,
    type,
    timestamp: Date.now(),
    entities: actorId ? { actor: actorId } : {},
    ...(tags ? { tags } : {}),
  };
}

function createNpcWithCharacter(data: ICharacterModelData = {}): {
  npc: IFEntity;
  trait: CharacterModelTrait;
} {
  const trait = new CharacterModelTrait(data);
  const traits = new Map<string, unknown>();
  traits.set(TraitType.CHARACTER_MODEL, trait);

  const npc = {
    id: 'npc-margaret',
    name: 'Margaret',
    has: (type: string) => traits.has(type),
    get: (type: string) => traits.get(type),
  } as unknown as IFEntity;

  return { npc, trait };
}

function createNpcWithoutCharacter(): IFEntity {
  return {
    id: 'npc-guard',
    name: 'Guard',
    has: () => false,
    get: () => undefined,
  } as unknown as IFEntity;
}

function createMockWorld(): WorldModel {
  return {} as unknown as WorldModel;
}

// ===========================================================================
// filterPerception
// ===========================================================================

describe('filterPerception', () => {
  it('should pass events with accurate perception', () => {
    const { trait } = createNpcWithCharacter();
    const event = createTestEvent('npc.attacked');

    expect(filterPerception(trait, event)).toBe('pass');
  });

  it('should miss filtered event categories', () => {
    const { trait } = createNpcWithCharacter({
      cognitiveProfile: { perception: 'filtered' },
      perceptionFilters: {
        misses: ['quiet'],
        amplifies: ['loud'],
      },
    });

    const quietEvent = createTestEvent('quiet actions');
    expect(filterPerception(trait, quietEvent)).toBe('miss');
  });

  it('should amplify matching event categories', () => {
    const { trait } = createNpcWithCharacter({
      cognitiveProfile: { perception: 'filtered' },
      perceptionFilters: {
        misses: ['quiet'],
        amplifies: ['loud'],
      },
    });

    const loudEvent = createTestEvent('loud sounds');
    expect(filterPerception(trait, loudEvent)).toBe('amplify');
  });

  it('should pass events that match no filter patterns', () => {
    const { trait } = createNpcWithCharacter({
      cognitiveProfile: { perception: 'filtered' },
      perceptionFilters: {
        misses: ['quiet'],
        amplifies: ['loud'],
      },
    });

    const normalEvent = createTestEvent('npc.spoke');
    expect(filterPerception(trait, normalEvent)).toBe('pass');
  });

  it('should pass events with filtered perception but no filter config', () => {
    const { trait } = createNpcWithCharacter({
      cognitiveProfile: { perception: 'filtered' },
    });

    const event = createTestEvent('npc.attacked');
    expect(filterPerception(trait, event)).toBe('pass');
  });

  it('should pass events through augmented perception', () => {
    const { trait } = createNpcWithCharacter({
      cognitiveProfile: { perception: 'augmented' },
    });

    const event = createTestEvent('npc.attacked');
    expect(filterPerception(trait, event)).toBe('pass');
  });

  it('should match filter patterns against event tags', () => {
    const { trait } = createNpcWithCharacter({
      cognitiveProfile: { perception: 'filtered' },
      perceptionFilters: {
        misses: ['behind him'],
        amplifies: [],
      },
    });

    const event = { ...createTestEvent('npc.moved'), tags: ['behind him'] };
    expect(filterPerception(trait, event as ISemanticEvent)).toBe('miss');
  });
});

// ===========================================================================
// injectHallucinations
// ===========================================================================

describe('injectHallucinations', () => {
  it('should inject hallucinated facts when lucidity state matches', () => {
    const { npc, trait } = createNpcWithCharacter({
      cognitiveProfile: { perception: 'augmented' },
      perceivedEvents: {
        'shadow-figure': { when: 'hallucinating', as: 'witnessed', content: 'shadow-figure' },
      },
    });
    trait.enterLucidityState('hallucinating');

    const events = injectHallucinations(trait, npc.id, 5);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe(CharacterMessages.HALLUCINATION_ONSET);
    expect(trait.knows('shadow-figure')).toBe(true);
    expect(trait.getFact('shadow-figure')?.source).toBe('hallucinated');
  });

  it('should not inject when lucidity state does not match', () => {
    const { npc, trait } = createNpcWithCharacter({
      cognitiveProfile: { perception: 'augmented' },
      perceivedEvents: {
        'shadow-figure': { when: 'hallucinating', as: 'witnessed', content: 'shadow-figure' },
      },
    });
    trait.enterLucidityState('lucid');

    const events = injectHallucinations(trait, npc.id, 5);
    expect(events.length).toBe(0);
    expect(trait.knows('shadow-figure')).toBe(false);
  });

  it('should not re-inject already known hallucinated facts', () => {
    const { npc, trait } = createNpcWithCharacter({
      cognitiveProfile: { perception: 'augmented' },
      perceivedEvents: {
        'shadow-figure': { when: 'hallucinating', as: 'witnessed', content: 'shadow-figure' },
      },
    });
    trait.enterLucidityState('hallucinating');
    trait.addFact('shadow-figure', 'hallucinated', 'certain', 3);

    const events = injectHallucinations(trait, npc.id, 5);
    expect(events.length).toBe(0);
  });

  it('should return empty for non-augmented perception', () => {
    const { npc, trait } = createNpcWithCharacter({
      cognitiveProfile: { perception: 'accurate' },
    });

    const events = injectHallucinations(trait, npc.id, 5);
    expect(events.length).toBe(0);
  });
});

// ===========================================================================
// observeEvent
// ===========================================================================

describe('observeEvent', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = createMockWorld();
  });

  it('should return empty for NPC without CharacterModelTrait', () => {
    const npc = createNpcWithoutCharacter();
    const event = createTestEvent('npc.attacked');

    const events = observeEvent(npc, event, world, 1);
    expect(events).toEqual([]);
  });

  it('should add witnessed fact to knowledge', () => {
    const { npc, trait } = createNpcWithCharacter();
    const event = createTestEvent('npc.attacked', 'player');

    observeEvent(npc, event, world, 5);

    expect(trait.knows('npc.attacked')).toBe(true);
    expect(trait.getFact('npc.attacked')?.source).toBe('witnessed');
    expect(trait.getFact('npc.attacked')?.turnLearned).toBe(5);
  });

  it('should increase threat when violence event observed', () => {
    const { npc, trait } = createNpcWithCharacter({ threat: 'safe' });
    const event = createTestEvent('npc.attacked', 'player');

    observeEvent(npc, event, world, 1);

    // Default rule: npc.attacked adds +30 threat
    expect(trait.threatValue).toBe(30);
    expect(trait.getThreat()).toBe('uneasy');
  });

  it('should adjust mood on violence event', () => {
    const { npc, trait } = createNpcWithCharacter({ mood: 'calm' });
    const event = createTestEvent('npc.attacked', 'player');

    const previousValence = trait.moodValence;
    observeEvent(npc, event, world, 1);

    // Violence moves mood toward negative valence and higher arousal
    expect(trait.moodValence).toBeLessThan(previousValence);
  });

  it('should apply amplification for filtered+amplified events', () => {
    const { npc, trait } = createNpcWithCharacter({
      cognitiveProfile: { perception: 'filtered' },
      perceptionFilters: {
        misses: [],
        amplifies: ['attacked'],
      },
      threat: 'safe',
    });
    const event = createTestEvent('npc.attacked', 'player');

    observeEvent(npc, event, world, 1);

    // Amplified (2x): 30 * 2 = 60
    expect(trait.threatValue).toBe(60);
  });

  it('should skip missed events entirely', () => {
    const { npc, trait } = createNpcWithCharacter({
      cognitiveProfile: { perception: 'filtered' },
      perceptionFilters: {
        misses: ['quiet'],
        amplifies: [],
      },
      threat: 'safe',
    });
    const event = createTestEvent('quiet actions');

    const events = observeEvent(npc, event, world, 1);

    expect(events).toEqual([]);
    expect(trait.threatValue).toBe(0);
    expect(trait.knows('quiet actions')).toBe(false);
  });

  it('should emit mood change event when mood word changes', () => {
    const { npc } = createNpcWithCharacter({ mood: 'calm' });
    const event = createTestEvent('npc.attacked', 'player');

    const events = observeEvent(npc, event, world, 1);

    const moodEvent = events.find(e => e.type === CharacterMessages.MOOD_CHANGED);
    expect(moodEvent).toBeDefined();
    expect(moodEvent?.data).toHaveProperty('from', 'calm');
  });

  it('should emit threat change event when threat word changes', () => {
    const { npc } = createNpcWithCharacter({ threat: 'safe' });
    const event = createTestEvent('npc.attacked', 'player');

    const events = observeEvent(npc, event, world, 1);

    const threatEvent = events.find(e => e.type === CharacterMessages.THREAT_CHANGED);
    expect(threatEvent).toBeDefined();
    expect(threatEvent?.data).toHaveProperty('from', 'safe');
  });

  it('should emit fact learned event', () => {
    const { npc } = createNpcWithCharacter();
    const event = createTestEvent('npc.attacked', 'player');

    const events = observeEvent(npc, event, world, 1);

    const factEvent = events.find(e => e.type === CharacterMessages.FACT_LEARNED);
    expect(factEvent).toBeDefined();
    expect(factEvent?.data).toHaveProperty('topic', 'npc.attacked');
  });

  it('should adjust disposition toward event actor on giving', () => {
    const { npc, trait } = createNpcWithCharacter();
    const event = createTestEvent('if.action.giving', 'player');

    observeEvent(npc, event, world, 1);

    // Default rule: giving adds +10 disposition
    expect(trait.getDispositionValue('player')).toBe(10);
  });

  it('should trigger lucidity state change on matching event', () => {
    const { npc, trait } = createNpcWithCharacter({
      lucidityConfig: {
        baseline: 'fragmented',
        triggers: {
          'npc.attacked': { target: 'dissociative', transition: 'immediate' },
        },
        decay: 'gradual',
        decayRate: 'fast',
      },
    });
    trait.enterLucidityState('fragmented');

    const event = createTestEvent('npc.attacked', 'player');
    const events = observeEvent(npc, event, world, 1);

    expect(trait.currentLucidityState).toBe('dissociative');
    const lucidityEvent = events.find(e => e.type === CharacterMessages.LUCIDITY_SHIFT);
    expect(lucidityEvent).toBeDefined();
    expect(lucidityEvent?.data).toHaveProperty('from', 'fragmented');
    expect(lucidityEvent?.data).toHaveProperty('to', 'dissociative');
  });

  it('should accept custom state transition rules', () => {
    const { npc, trait } = createNpcWithCharacter({ threat: 'safe' });
    const customRules = [
      { eventType: 'custom.explosion', threatDelta: 50 },
    ];
    const event = createTestEvent('custom.explosion');

    observeEvent(npc, event, world, 1, customRules);

    expect(trait.threatValue).toBe(50);
  });

  it('should inject hallucinations during observation for augmented perception', () => {
    const { npc, trait } = createNpcWithCharacter({
      cognitiveProfile: { perception: 'augmented' },
      perceivedEvents: {
        'shadow-figure': { when: 'hallucinating', as: 'witnessed', content: 'shadow-figure' },
      },
    });
    trait.enterLucidityState('hallucinating');

    const event = createTestEvent('npc.spoke');
    const events = observeEvent(npc, event, world, 5);

    const hallucinationEvent = events.find(e => e.type === CharacterMessages.HALLUCINATION_ONSET);
    expect(hallucinationEvent).toBeDefined();
    expect(trait.knows('shadow-figure')).toBe(true);
  });
});

// ===========================================================================
// processLucidityDecay
// ===========================================================================

describe('processLucidityDecay', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = createMockWorld();
  });

  it('should return empty for NPC without CharacterModelTrait', () => {
    const npc = createNpcWithoutCharacter();
    expect(processLucidityDecay(npc, world, 1)).toEqual([]);
  });

  it('should return empty when no lucidity config', () => {
    const { npc } = createNpcWithCharacter();
    expect(processLucidityDecay(npc, world, 1)).toEqual([]);
  });

  it('should return empty when no active window', () => {
    const { npc } = createNpcWithCharacter({
      lucidityConfig: {
        baseline: 'fragmented',
        triggers: {},
        decay: 'gradual',
        decayRate: 'slow',
      },
    });
    expect(processLucidityDecay(npc, world, 1)).toEqual([]);
  });

  it('should decay window and emit event when baseline restored', () => {
    const { npc, trait } = createNpcWithCharacter({
      lucidityConfig: {
        baseline: 'fragmented',
        triggers: {},
        decay: 'gradual',
        decayRate: 'slow',
      },
    });

    trait.enterLucidityState('lucid', 2);

    // Turn 1: decay from 2 to 1
    let events = processLucidityDecay(npc, world, 1);
    expect(events.length).toBe(0);
    expect(trait.currentLucidityState).toBe('lucid');

    // Turn 2: decay from 1 to 0, baseline restored
    events = processLucidityDecay(npc, world, 2);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe(CharacterMessages.LUCIDITY_BASELINE_RESTORED);
    expect(events[0].data).toHaveProperty('from', 'lucid');
    expect(events[0].data).toHaveProperty('to', 'fragmented');
    expect(trait.currentLucidityState).toBe('fragmented');
  });

  it('should verify actual trait field mutation after decay', () => {
    const { npc, trait } = createNpcWithCharacter({
      lucidityConfig: {
        baseline: 'fragmented',
        triggers: {},
        decay: 'gradual',
        decayRate: 'fast',
      },
    });

    trait.enterLucidityState('lucid', 1);

    // Precondition
    expect(trait.currentLucidityState).toBe('lucid');
    expect(trait.lucidityWindowTurns).toBe(1);

    processLucidityDecay(npc, world, 1);

    // Postcondition — actual field mutations
    expect(trait.currentLucidityState).toBe('fragmented');
    expect(trait.lucidityWindowTurns).toBe(-1);
  });
});

// ===========================================================================
// enterLucidityWindow
// ===========================================================================

describe('enterLucidityWindow', () => {
  it('should set window turns based on decay rate', () => {
    const { trait } = createNpcWithCharacter({
      lucidityConfig: {
        baseline: 'fragmented',
        triggers: {},
        decay: 'gradual',
        decayRate: 'slow',
      },
    });

    enterLucidityWindow(trait, 'lucid');

    expect(trait.currentLucidityState).toBe('lucid');
    expect(trait.lucidityWindowTurns).toBe(DECAY_RATE_TURNS.slow);
  });

  it('should use fast decay rate', () => {
    const { trait } = createNpcWithCharacter({
      lucidityConfig: {
        baseline: 'fragmented',
        triggers: {},
        decay: 'gradual',
        decayRate: 'fast',
      },
    });

    enterLucidityWindow(trait, 'lucid');
    expect(trait.lucidityWindowTurns).toBe(DECAY_RATE_TURNS.fast);
  });

  it('should enter state without window when no config', () => {
    const { trait } = createNpcWithCharacter();

    enterLucidityWindow(trait, 'lucid');

    expect(trait.currentLucidityState).toBe('lucid');
    expect(trait.lucidityWindowTurns).toBe(-1); // no timed window
  });
});

// ===========================================================================
// DECAY_RATE_TURNS
// ===========================================================================

describe('DECAY_RATE_TURNS', () => {
  it('should have increasing turn counts from fast to slow', () => {
    expect(DECAY_RATE_TURNS.fast).toBeLessThan(DECAY_RATE_TURNS.moderate);
    expect(DECAY_RATE_TURNS.moderate).toBeLessThan(DECAY_RATE_TURNS.slow);
  });
});

// ===========================================================================
// Multi-turn scenario (state mutation verification)
// ===========================================================================

describe('multi-turn observation scenario', () => {
  it('should track cumulative state changes across multiple events', () => {
    const { npc, trait } = createNpcWithCharacter({
      mood: 'calm',
      threat: 'safe',
      cognitiveProfile: { perception: 'augmented' },
      lucidityConfig: {
        baseline: 'fragmented',
        triggers: {
          'npc.attacked': { target: 'dissociative', transition: 'immediate' },
        },
        decay: 'gradual',
        decayRate: 'fast',
      },
      perceivedEvents: {
        'shadow-figure': { when: 'dissociative', as: 'witnessed', content: 'shadow-figure' },
      },
    });
    trait.enterLucidityState('fragmented');
    const world = createMockWorld();

    // Turn 1: NPC witnesses an attack
    const attackEvent = createTestEvent('npc.attacked', 'player');
    const turn1Events = observeEvent(npc, attackEvent, world, 1);

    // Verify: threat increased, mood shifted, lucidity changed to dissociative
    expect(trait.threatValue).toBeGreaterThan(0);
    expect(trait.getMood()).not.toBe('calm');
    expect(trait.currentLucidityState).toBe('dissociative');

    // Shadow hallucination should have been injected (dissociative matches)
    expect(trait.knows('shadow-figure')).toBe(true);
    expect(trait.getFact('shadow-figure')?.source).toBe('hallucinated');

    // Turn 2: Lucidity decay
    trait.enterLucidityState('dissociative', 1); // set window for decay test
    const decayEvents = processLucidityDecay(npc, world, 2);

    // Verify: baseline restored after window expires
    expect(trait.currentLucidityState).toBe('fragmented');
    expect(decayEvents.some(e => e.type === CharacterMessages.LUCIDITY_BASELINE_RESTORED)).toBe(true);
  });
});
