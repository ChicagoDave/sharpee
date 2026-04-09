/**
 * Unit tests for CharacterBuilder (ADR-141)
 *
 * Verifies the fluent API, compilation to trait data, trigger chains,
 * cognitive presets, vocabulary extension, and custom predicates.
 */

import { describe, it, expect } from 'vitest';
import {
  CharacterBuilder,
  TriggerBuilder,
  CompiledCharacter,
} from '../src/character-builder';
import { COGNITIVE_PRESETS, isCognitivePreset } from '../src/cognitive-presets';
import { VocabularyExtension } from '../src/vocabulary-extension';
import { applyCharacter } from '../src/apply';
import {
  CharacterModelTrait,
  ICharacterModelData,
  MOOD_AXES,
  THREAT_VALUES,
  STABLE_COGNITIVE_PROFILE,
  CognitiveProfile,
} from '@sharpee/world-model';

// ===========================================================================
// Builder basics
// ===========================================================================

describe('CharacterBuilder', () => {
  it('should store and return the character ID', () => {
    const builder = new CharacterBuilder('margaret');
    expect(builder.id).toBe('margaret');
  });

  it('should compile with default values', () => {
    const compiled = new CharacterBuilder('npc').compile();

    expect(compiled.id).toBe('npc');
    expect(compiled.traitData.mood).toBe('calm');
    expect(compiled.traitData.threat).toBe('safe');
    expect(compiled.traitData.cognitiveProfile).toEqual(STABLE_COGNITIVE_PROFILE);
    expect(compiled.traitData.goals).toEqual([]);
    expect(compiled.triggers).toEqual([]);
  });

  // =========================================================================
  // Personality
  // =========================================================================

  describe('personality', () => {
    it('should compile personality expressions to numeric values', () => {
      const compiled = new CharacterBuilder('margaret')
        .personality('very honest', 'cowardly', 'slightly paranoid')
        .compile();

      expect(compiled.traitData.personality?.honest).toBe(0.8);
      expect(compiled.traitData.personality?.cowardly).toBe(0.6);
      expect(compiled.traitData.personality?.paranoid).toBe(0.2);
    });
  });

  // =========================================================================
  // Disposition
  // =========================================================================

  describe('disposition', () => {
    it('should compile disposition shortcuts to numeric values', () => {
      const compiled = new CharacterBuilder('margaret')
        .loyalTo('lady-grey')
        .likes('player')
        .dislikes('villain')
        .compile();

      // 'devoted to' midpoint = 90
      expect(compiled.traitData.dispositions?.['lady-grey']).toBe(90);
      // 'likes' midpoint = 40
      expect(compiled.traitData.dispositions?.['player']).toBe(40);
      // 'dislikes' midpoint = -60
      expect(compiled.traitData.dispositions?.['villain']).toBe(-60);
    });

    it('should compile trusts and distrusts', () => {
      const compiled = new CharacterBuilder('james')
        .trusts('ally')
        .distrusts('stranger')
        .compile();

      // 'trusts' midpoint = 60
      expect(compiled.traitData.dispositions?.['ally']).toBe(60);
      // 'wary of' midpoint = -30
      expect(compiled.traitData.dispositions?.['stranger']).toBe(-30);
    });
  });

  // =========================================================================
  // Mood and threat
  // =========================================================================

  describe('mood and threat', () => {
    it('should compile mood word', () => {
      const compiled = new CharacterBuilder('npc')
        .mood('nervous')
        .compile();

      expect(compiled.traitData.mood).toBe('nervous');
    });

    it('should compile threat level', () => {
      const compiled = new CharacterBuilder('npc')
        .threat('wary')
        .compile();

      expect(compiled.traitData.threat).toBe('wary');
    });
  });

  // =========================================================================
  // Cognitive profile
  // =========================================================================

  describe('cognitiveProfile', () => {
    it('should compile from named preset', () => {
      const compiled = new CharacterBuilder('eleanor')
        .cognitiveProfile('schizophrenic')
        .compile();

      expect(compiled.traitData.cognitiveProfile).toEqual(COGNITIVE_PRESETS.schizophrenic);
    });

    it('should compile from partial override', () => {
      const compiled = new CharacterBuilder('james')
        .cognitiveProfile({ perception: 'filtered', coherence: 'drifting' })
        .compile();

      expect(compiled.traitData.cognitiveProfile?.perception).toBe('filtered');
      expect(compiled.traitData.cognitiveProfile?.coherence).toBe('drifting');
      expect(compiled.traitData.cognitiveProfile?.beliefFormation).toBe('flexible');
    });

    it('should throw on unknown preset name', () => {
      expect(() =>
        new CharacterBuilder('npc').cognitiveProfile('nonexistent')
      ).toThrow("Unknown cognitive preset: 'nonexistent'");
    });
  });

  // =========================================================================
  // Knowledge and beliefs
  // =========================================================================

  describe('knowledge and beliefs', () => {
    it('should compile knowledge facts', () => {
      const compiled = new CharacterBuilder('margaret')
        .knows('murder', { witnessed: true, confidence: 'certain' })
        .knows('weapon')
        .compile();

      expect(compiled.traitData.knowledge?.['murder']).toEqual({
        source: 'witnessed', confidence: 'certain', turnLearned: 0,
      });
      expect(compiled.traitData.knowledge?.['weapon']).toEqual({
        source: 'assumed', confidence: 'believes', turnLearned: 0,
      });
    });

    it('should compile beliefs', () => {
      const compiled = new CharacterBuilder('margaret')
        .believes('lady-grey-innocent', { strength: 'certain', resistance: 'reinterprets' })
        .believes('weather-nice')
        .compile();

      expect(compiled.traitData.beliefs?.['lady-grey-innocent']).toEqual({
        strength: 'certain', resistance: 'reinterprets',
      });
      expect(compiled.traitData.beliefs?.['weather-nice']).toEqual({
        strength: 'believes', resistance: 'none',
      });
    });
  });

  // =========================================================================
  // Goals
  // =========================================================================

  describe('goals', () => {
    it('should compile goals sorted by priority', () => {
      const compiled = new CharacterBuilder('margaret')
        .goal('protect-lady-grey', 10)
        .goal('survive', 5)
        .goal('find-evidence', 3)
        .compile();

      expect(compiled.traitData.goals).toEqual([
        { id: 'protect-lady-grey', priority: 10 },
        { id: 'survive', priority: 5 },
        { id: 'find-evidence', priority: 3 },
      ]);
    });
  });

  // =========================================================================
  // Lucidity
  // =========================================================================

  describe('lucidity', () => {
    it('should compile lucidity config', () => {
      const config = {
        baseline: 'fragmented' as const,
        triggers: {
          'player is calm': { target: 'lucid', transition: 'next turn' as const },
          'loud noise': { target: 'dissociative', transition: 'immediate' as const },
        },
        decay: 'gradual' as const,
        decayRate: 'slow' as const,
      };

      const compiled = new CharacterBuilder('eleanor')
        .lucidity(config)
        .compile();

      expect(compiled.traitData.lucidityConfig).toEqual(config);
      expect(compiled.traitData.currentLucidityState).toBe('fragmented');
    });
  });

  // =========================================================================
  // Perception
  // =========================================================================

  describe('perception', () => {
    it('should compile perception filters', () => {
      const compiled = new CharacterBuilder('james')
        .cognitiveProfile('ptsd')
        .filters({ misses: ['quiet actions'], amplifies: ['sudden movements'] })
        .compile();

      expect(compiled.traitData.perceptionFilters).toEqual({
        misses: ['quiet actions'],
        amplifies: ['sudden movements'],
      });
    });

    it('should compile perceived events (hallucinations)', () => {
      const compiled = new CharacterBuilder('eleanor')
        .cognitiveProfile('schizophrenic')
        .perceives('shadow-figure', { when: 'hallucinating', as: 'witnessed', content: 'shadow-figure' })
        .compile();

      expect(compiled.traitData.perceivedEvents?.['shadow-figure']).toEqual({
        when: 'hallucinating', as: 'witnessed', content: 'shadow-figure',
      });
    });
  });

  // =========================================================================
  // Trigger chains
  // =========================================================================

  describe('triggers', () => {
    it('should compile .on() trigger with mutations', () => {
      const compiled = new CharacterBuilder('margaret')
        .on('player threatens')
          .becomes('panicked')
          .feelsAbout('player', 'wary of')
          .done()
        .compile();

      expect(compiled.triggers.length).toBe(1);
      expect(compiled.triggers[0].triggerName).toBe('player threatens');
      expect(compiled.triggers[0].mutations).toEqual([
        { type: 'setMood', mood: 'panicked' },
        { type: 'setDisposition', entityId: 'player', word: 'wary of' },
      ]);
    });

    it('should compile trigger with condition', () => {
      const compiled = new CharacterBuilder('margaret')
        .on('player shows evidence')
          .if('lied about murder')
          .becomes('cornered')
          .shift('threat', 'threatened')
          .done()
        .compile();

      expect(compiled.triggers[0].condition).toBe('lied about murder');
      expect(compiled.triggers[0].mutations).toEqual([
        { type: 'setMood', mood: 'cornered' },
        { type: 'setThreat', level: 'threatened' },
      ]);
    });

    it('should compile becomesLucid mutation', () => {
      const compiled = new CharacterBuilder('eleanor')
        .on('player gives medication')
          .becomesLucid()
          .becomes('calm')
          .done()
        .compile();

      expect(compiled.triggers[0].mutations).toEqual([
        { type: 'becomesLucid' },
        { type: 'setMood', mood: 'calm' },
      ]);
    });

    it('should auto-finalize pending trigger on compile', () => {
      const compiled = new CharacterBuilder('margaret')
        .on('player threatens')
          .becomes('panicked')
        // no .done() — compile auto-finalizes
        .compile();

      expect(compiled.triggers.length).toBe(1);
      expect(compiled.triggers[0].triggerName).toBe('player threatens');
    });

    it('should auto-finalize pending trigger on new .on()', () => {
      const compiled = new CharacterBuilder('margaret')
        .on('player threatens')
          .becomes('panicked')
        .on('player is kind')
          .feelsAbout('player', 'trusts')
          .done()
        .compile();

      expect(compiled.triggers.length).toBe(2);
      expect(compiled.triggers[0].triggerName).toBe('player threatens');
      expect(compiled.triggers[1].triggerName).toBe('player is kind');
    });
  });

  // =========================================================================
  // Custom predicates
  // =========================================================================

  describe('custom predicates', () => {
    it('should compile custom predicate functions', () => {
      const drunkFn = (t: CharacterModelTrait) => t.knows('consumed-wine');

      const compiled = new CharacterBuilder('npc')
        .definePredicate('drunk', drunkFn)
        .compile();

      expect(compiled.customPredicates.has('drunk')).toBe(true);
      expect(compiled.customPredicates.get('drunk')).toBe(drunkFn);
    });
  });

  // =========================================================================
  // Full ADR-141 example: Margaret
  // =========================================================================

  describe('full Margaret example from ADR-141', () => {
    it('should compile the complete Margaret character', () => {
      const compiled = new CharacterBuilder('margaret')
        .personality('very honest', 'very loyal', 'cowardly')
        .knows('murder', { witnessed: true })
        .loyalTo('lady-grey')
        .likes('player')
        .mood('nervous')

        .on('player threatens')
          .becomes('panicked')
          .feelsAbout('player', 'wary of')

        .on('player is kind')
          .feelsAbout('player', 'trusts')

        .on('lady-grey arrested')
          .becomes('grieving')
          .shift('threat', 'cornered')

        .compile();

      // Personality
      expect(compiled.traitData.personality?.honest).toBe(0.8);
      expect(compiled.traitData.personality?.loyal).toBe(0.8);
      expect(compiled.traitData.personality?.cowardly).toBe(0.6);

      // Knowledge
      expect(compiled.traitData.knowledge?.['murder']?.source).toBe('witnessed');

      // Dispositions
      expect(compiled.traitData.dispositions?.['lady-grey']).toBe(90);
      expect(compiled.traitData.dispositions?.['player']).toBe(40);

      // Mood
      expect(compiled.traitData.mood).toBe('nervous');

      // Triggers
      expect(compiled.triggers.length).toBe(3);
    });
  });

  // =========================================================================
  // Full ADR-141 example: Eleanor (schizophrenic)
  // =========================================================================

  describe('full Eleanor example from ADR-141', () => {
    it('should compile the complete Eleanor character with cognitive profile', () => {
      const compiled = new CharacterBuilder('eleanor')
        .personality('very curious', 'honest', 'slightly paranoid')
        .cognitiveProfile('schizophrenic')
        .likes('player')
        .mood('anxious')
        .knows('murder', { witnessed: true })

        .lucidity({
          baseline: 'fragmented',
          triggers: {
            'player is calm': { target: 'lucid', transition: 'next turn' },
            'loud noise': { target: 'dissociative', transition: 'immediate' },
            'alone too long': { target: 'hallucinating', transition: 'next turn' },
            'feels safe': { target: 'lucid', transition: 'next turn' },
          },
          decay: 'gradual',
          decayRate: 'slow',
        })

        .perceives('shadow-figure-in-library', {
          when: 'hallucinating',
          as: 'witnessed',
          content: 'shadow-figure',
        })

        .on('loud noise')
          .becomes('panicked')

        .on('player gives medication')
          .becomesLucid()
          .becomes('calm')

        .compile();

      // Cognitive profile
      expect(compiled.traitData.cognitiveProfile).toEqual(COGNITIVE_PRESETS.schizophrenic);

      // Lucidity
      expect(compiled.traitData.lucidityConfig?.baseline).toBe('fragmented');
      expect(compiled.traitData.currentLucidityState).toBe('fragmented');
      expect(Object.keys(compiled.traitData.lucidityConfig!.triggers)).toHaveLength(4);

      // Hallucination
      expect(compiled.traitData.perceivedEvents?.['shadow-figure-in-library']).toBeDefined();

      // Triggers
      expect(compiled.triggers.length).toBe(2);
    });
  });
});

// ===========================================================================
// Cognitive presets
// ===========================================================================

describe('COGNITIVE_PRESETS', () => {
  it('should have all eight presets from ADR-141', () => {
    expect(Object.keys(COGNITIVE_PRESETS)).toHaveLength(8);
    expect(isCognitivePreset('stable')).toBe(true);
    expect(isCognitivePreset('schizophrenic')).toBe(true);
    expect(isCognitivePreset('ptsd')).toBe(true);
    expect(isCognitivePreset('dementia')).toBe(true);
    expect(isCognitivePreset('dissociative')).toBe(true);
    expect(isCognitivePreset('tbi')).toBe(true);
    expect(isCognitivePreset('obsessive')).toBe(true);
    expect(isCognitivePreset('intoxicated')).toBe(true);
  });

  it('should match ADR-141 condition table for schizophrenic', () => {
    const p = COGNITIVE_PRESETS.schizophrenic;
    expect(p.perception).toBe('augmented');
    expect(p.beliefFormation).toBe('resistant');
    expect(p.coherence).toBe('fragmented');
    expect(p.lucidity).toBe('episodic');
    expect(p.selfModel).toBe('uncertain');
  });

  it('should match ADR-141 condition table for PTSD', () => {
    const p = COGNITIVE_PRESETS.ptsd;
    expect(p.perception).toBe('filtered');
    expect(p.beliefFormation).toBe('rigid');
    expect(p.coherence).toBe('drifting');
    expect(p.lucidity).toBe('episodic');
    expect(p.selfModel).toBe('uncertain');
  });

  it('should match ADR-141 condition table for dementia', () => {
    const p = COGNITIVE_PRESETS.dementia;
    expect(p.perception).toBe('filtered');
    expect(p.beliefFormation).toBe('rigid');
    expect(p.coherence).toBe('fragmented');
    expect(p.lucidity).toBe('fluctuating');
    expect(p.selfModel).toBe('fractured');
  });

  it('should reject unknown preset name', () => {
    expect(isCognitivePreset('alien')).toBe(false);
  });
});

// ===========================================================================
// VocabularyExtension
// ===========================================================================

describe('VocabularyExtension', () => {
  it('should register and retrieve custom moods', () => {
    const ext = new VocabularyExtension();
    ext.defineMood('lovesick', 0.3, 0.6);

    expect(ext.hasCustomMood('lovesick')).toBe(true);
    expect(ext.getCustomMood('lovesick')).toEqual({
      name: 'lovesick', valence: 0.3, arousal: 0.6,
    });
  });

  it('should register and retrieve custom personality traits', () => {
    const ext = new VocabularyExtension();
    ext.definePersonality('righteous');

    expect(ext.hasCustomPersonality('righteous')).toBe(true);
  });

  it('should list registered names', () => {
    const ext = new VocabularyExtension();
    ext.defineMood('lovesick', 0.3, 0.6);
    ext.defineMood('vengeful', -0.7, 0.8);
    ext.definePersonality('righteous');

    expect(ext.getCustomMoodNames()).toEqual(['lovesick', 'vengeful']);
    expect(ext.getCustomPersonalityNames()).toEqual(['righteous']);
  });

  it('should compile custom mood through builder', () => {
    const ext = new VocabularyExtension();
    ext.defineMood('lovesick', 0.3, 0.6);

    const compiled = new CharacterBuilder('npc')
      .withVocabulary(ext)
      .mood('lovesick')
      .compile();

    // Custom mood uses raw axes, not mood word
    expect(compiled.traitData.moodValence).toBe(0.3);
    expect(compiled.traitData.moodArousal).toBe(0.6);
  });
});

// ===========================================================================
// applyCharacter
// ===========================================================================

describe('applyCharacter', () => {
  it('should create trait and add it to entity', () => {
    const compiled = new CharacterBuilder('margaret')
      .personality('very honest', 'cowardly')
      .mood('nervous')
      .knows('murder', { witnessed: true })
      .compile();

    const traits = new Map<string, unknown>();
    const entity = {
      id: 'margaret',
      name: 'Margaret',
      has: (type: string) => traits.has(type),
      get: (type: string) => traits.get(type),
      add: (trait: { type: string }) => { traits.set(trait.type, trait); return entity; },
    } as any;

    const { trait } = applyCharacter(entity, compiled);

    expect(trait).toBeInstanceOf(CharacterModelTrait);
    expect(trait.getPersonality('honest')).toBe(0.8);
    expect(trait.getMood()).toBe('nervous');
    expect(trait.knows('murder')).toBe(true);
    expect(traits.has('characterModel')).toBe(true);
  });

  it('should register custom predicates on the trait', () => {
    const compiled = new CharacterBuilder('npc')
      .definePredicate('test-pred', (t) => t.threatValue > 50)
      .compile();

    const traits = new Map<string, unknown>();
    const entity = {
      id: 'npc',
      name: 'NPC',
      has: (type: string) => traits.has(type),
      get: (type: string) => traits.get(type),
      add: (trait: { type: string }) => { traits.set(trait.type, trait); return entity; },
    } as any;

    const { trait } = applyCharacter(entity, compiled);

    expect(trait.hasPredicate('test-pred')).toBe(true);
    expect(trait.evaluate('test-pred')).toBe(false);
    trait.setThreat('cornered');
    expect(trait.evaluate('test-pred')).toBe(true);
  });
});

// ===========================================================================
// Compilation roundtrip
// ===========================================================================

describe('compilation roundtrip', () => {
  it('should produce a CharacterModelTrait that matches builder declarations', () => {
    const compiled = new CharacterBuilder('margaret')
      .personality('very honest', 'very loyal', 'cowardly')
      .knows('murder', { witnessed: true, confidence: 'certain' })
      .loyalTo('lady-grey')
      .likes('player')
      .mood('nervous')
      .threat('uneasy')
      .goal('protect-lady-grey', 10)
      .goal('survive', 5)
      .compile();

    const trait = new CharacterModelTrait(compiled.traitData);

    expect(trait.getPersonality('honest')).toBe(0.8);
    expect(trait.getPersonality('loyal')).toBe(0.8);
    expect(trait.getPersonality('cowardly')).toBe(0.6);
    expect(trait.knows('murder')).toBe(true);
    expect(trait.getFact('murder')?.source).toBe('witnessed');
    expect(trait.getDispositionWord('lady-grey')).toBe('devoted to');
    expect(trait.getDispositionWord('player')).toBe('likes');
    expect(trait.getMood()).toBe('nervous');
    expect(trait.getThreat()).toBe('uneasy');
    expect(trait.getTopGoal()?.id).toBe('protect-lady-grey');
    expect(trait.goals.length).toBe(2);
  });
});
