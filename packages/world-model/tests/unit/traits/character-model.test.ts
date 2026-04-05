/**
 * Unit tests for CharacterModelTrait (ADR-141)
 *
 * Verifies vocabulary parsing, state mutation methods, and predicate evaluation.
 */

import { CharacterModelTrait, ICharacterModelData } from '../../../src/traits/character-model/characterModelTrait';
import {
  parsePersonalityExpr,
  dispositionToValue,
  valueToDisposition,
  nearestMood,
  valueToThreat,
  INTENSITY_VALUES,
  DISPOSITION_RANGES,
  MOOD_AXES,
  THREAT_VALUES,
  CONFIDENCE_VALUES,
  STABLE_COGNITIVE_PROFILE,
} from '../../../src/traits/character-model/character-vocabulary';
import { TraitType } from '../../../src/traits/trait-types';

// ===========================================================================
// Vocabulary parsing
// ===========================================================================

describe('character-vocabulary', () => {
  describe('parsePersonalityExpr', () => {
    it('should parse bare trait to default intensity', () => {
      const [trait, value] = parsePersonalityExpr('honest');
      expect(trait).toBe('honest');
      expect(value).toBe(INTENSITY_VALUES.bare);
    });

    it('should parse intensity-qualified trait', () => {
      const [trait, value] = parsePersonalityExpr('very honest');
      expect(trait).toBe('honest');
      expect(value).toBe(INTENSITY_VALUES.very);
    });

    it('should parse all intensity levels', () => {
      expect(parsePersonalityExpr('slightly cowardly')).toEqual(['cowardly', 0.2]);
      expect(parsePersonalityExpr('somewhat cunning')).toEqual(['cunning', 0.4]);
      expect(parsePersonalityExpr('loyal')).toEqual(['loyal', 0.6]);
      expect(parsePersonalityExpr('very paranoid')).toEqual(['paranoid', 0.8]);
      expect(parsePersonalityExpr('extremely cruel')).toEqual(['cruel', 0.95]);
    });
  });

  describe('dispositionToValue / valueToDisposition', () => {
    it('should resolve each word to its midpoint', () => {
      expect(dispositionToValue('neutral')).toBe(0);
      expect(dispositionToValue('trusts')).toBe(60);
      expect(dispositionToValue('hates')).toBe(-80);
      expect(dispositionToValue('devoted to')).toBe(90);
    });

    it('should resolve numeric values back to words', () => {
      expect(valueToDisposition(0)).toBe('neutral');
      expect(valueToDisposition(60)).toBe('trusts');
      expect(valueToDisposition(-80)).toBe('hates');
      expect(valueToDisposition(90)).toBe('devoted to');
    });

    it('should handle boundary values', () => {
      expect(valueToDisposition(-100)).toBe('despises');
      expect(valueToDisposition(100)).toBe('devoted to');
      expect(valueToDisposition(-90)).toBe('despises');
      expect(valueToDisposition(10)).toBe('neutral');
      expect(valueToDisposition(11)).toBe('likes');
    });
  });

  describe('nearestMood', () => {
    it('should return exact mood when coordinates match', () => {
      const { valence, arousal } = MOOD_AXES.panicked;
      expect(nearestMood(valence, arousal)).toBe('panicked');
    });

    it('should return nearest mood for intermediate coordinates', () => {
      // Close to calm
      expect(nearestMood(0.3, 0.1)).toBe('calm');
      // Close to furious
      expect(nearestMood(-0.9, 0.95)).toBe('furious');
    });
  });

  describe('valueToThreat', () => {
    it('should resolve boundary values correctly', () => {
      expect(valueToThreat(0)).toBe('safe');
      expect(valueToThreat(10)).toBe('safe');
      expect(valueToThreat(11)).toBe('uneasy');
      expect(valueToThreat(50)).toBe('wary');
      expect(valueToThreat(70)).toBe('threatened');
      expect(valueToThreat(85)).toBe('cornered');
      expect(valueToThreat(86)).toBe('desperate');
      expect(valueToThreat(100)).toBe('desperate');
    });
  });
});

// ===========================================================================
// CharacterModelTrait construction
// ===========================================================================

describe('CharacterModelTrait', () => {
  describe('construction', () => {
    it('should have the correct trait type', () => {
      const trait = new CharacterModelTrait();
      expect(trait.type).toBe(TraitType.CHARACTER_MODEL);
      expect(CharacterModelTrait.type).toBe('characterModel');
    });

    it('should initialize with sensible defaults', () => {
      const trait = new CharacterModelTrait();
      expect(trait.personality).toEqual({});
      expect(trait.dispositions).toEqual({});
      expect(trait.getMood()).toBe('calm');
      expect(trait.getThreat()).toBe('safe');
      expect(trait.cognitiveProfile).toEqual(STABLE_COGNITIVE_PROFILE);
      expect(trait.knowledge).toEqual({});
      expect(trait.beliefs).toEqual({});
      expect(trait.goals).toEqual([]);
      expect(trait.currentLucidityState).toBe('stable');
      expect(trait.lucidityWindowTurns).toBe(-1);
    });

    it('should accept full initialization data', () => {
      const data: ICharacterModelData = {
        personality: { honest: 0.8, loyal: 0.6 },
        dispositions: { player: 40 },
        mood: 'nervous',
        threat: 'wary',
        cognitiveProfile: { perception: 'filtered', coherence: 'drifting' },
        knowledge: { murder: { source: 'witnessed', confidence: 'certain', turnLearned: 1 } },
        beliefs: { 'lady-grey-innocent': { strength: 'believes', resistance: 'reinterprets' } },
        goals: [{ id: 'protect-lady-grey', priority: 10 }],
      };
      const trait = new CharacterModelTrait(data);

      expect(trait.getPersonality('honest')).toBe(0.8);
      expect(trait.getPersonality('loyal')).toBe(0.6);
      expect(trait.getDispositionValue('player')).toBe(40);
      expect(trait.getMood()).toBe('nervous');
      expect(trait.getThreat()).toBe('wary');
      expect(trait.cognitiveProfile.perception).toBe('filtered');
      expect(trait.cognitiveProfile.coherence).toBe('drifting');
      // Unspecified dimensions fall back to stable defaults
      expect(trait.cognitiveProfile.beliefFormation).toBe('flexible');
      expect(trait.knows('murder')).toBe(true);
      expect(trait.hasBelief('lady-grey-innocent')).toBe(true);
      expect(trait.hasGoal('protect-lady-grey')).toBe(true);
    });

    it('should accept raw mood axes instead of mood word', () => {
      const trait = new CharacterModelTrait({ moodValence: -0.5, moodArousal: 0.8 });
      expect(trait.moodValence).toBe(-0.5);
      expect(trait.moodArousal).toBe(0.8);
    });

    it('should accept raw threat value instead of threat word', () => {
      const trait = new CharacterModelTrait({ threatValue: 65 });
      expect(trait.threatValue).toBe(65);
      expect(trait.getThreat()).toBe('threatened');
    });
  });

  // =========================================================================
  // Personality
  // =========================================================================

  describe('personality', () => {
    it('should set personality from expressions', () => {
      const trait = new CharacterModelTrait();
      trait.setPersonality('very honest', 'cowardly', 'slightly paranoid');

      expect(trait.getPersonality('honest')).toBe(0.8);
      expect(trait.getPersonality('cowardly')).toBe(0.6);
      expect(trait.getPersonality('paranoid')).toBe(0.2);
    });

    it('should return 0 for unset traits', () => {
      const trait = new CharacterModelTrait();
      expect(trait.getPersonality('cruel')).toBe(0);
    });
  });

  // =========================================================================
  // Disposition
  // =========================================================================

  describe('disposition', () => {
    it('should set disposition by word', () => {
      const trait = new CharacterModelTrait();
      trait.setDisposition('player', 'trusts');

      expect(trait.getDispositionValue('player')).toBe(60);
      expect(trait.getDispositionWord('player')).toBe('trusts');
    });

    it('should adjust disposition by delta', () => {
      const trait = new CharacterModelTrait();
      trait.setDisposition('player', 'neutral');
      trait.adjustDisposition('player', 30);

      expect(trait.getDispositionValue('player')).toBe(30);
      expect(trait.getDispositionWord('player')).toBe('likes');
    });

    it('should clamp disposition to -100..100', () => {
      const trait = new CharacterModelTrait();
      trait.setDisposition('player', 'devoted to');
      trait.adjustDisposition('player', 50);
      expect(trait.getDispositionValue('player')).toBe(100);

      trait.setDisposition('villain', 'despises');
      trait.adjustDisposition('villain', -50);
      expect(trait.getDispositionValue('villain')).toBe(-100);
    });

    it('should default to neutral (0) for unknown entities', () => {
      const trait = new CharacterModelTrait();
      expect(trait.getDispositionValue('stranger')).toBe(0);
      expect(trait.getDispositionWord('stranger')).toBe('neutral');
    });
  });

  // =========================================================================
  // Mood
  // =========================================================================

  describe('mood', () => {
    it('should set mood by word', () => {
      const trait = new CharacterModelTrait();
      trait.setMood('panicked');

      expect(trait.getMood()).toBe('panicked');
      expect(trait.moodValence).toBe(MOOD_AXES.panicked.valence);
      expect(trait.moodArousal).toBe(MOOD_AXES.panicked.arousal);
    });

    it('should adjust mood axes by delta', () => {
      const trait = new CharacterModelTrait();
      trait.setMood('calm');
      trait.adjustMood(-0.5, 0.5);

      // Moved from calm toward negative valence, higher arousal
      expect(trait.moodValence).toBeCloseTo(-0.2);
      expect(trait.moodArousal).toBeCloseTo(0.6);
    });

    it('should clamp mood axes', () => {
      const trait = new CharacterModelTrait();
      trait.setMood('calm');
      trait.adjustMood(5, 5);
      expect(trait.moodValence).toBe(1);
      expect(trait.moodArousal).toBe(1);

      trait.adjustMood(-10, -10);
      expect(trait.moodValence).toBe(-1);
      expect(trait.moodArousal).toBe(0);
    });
  });

  // =========================================================================
  // Threat
  // =========================================================================

  describe('threat', () => {
    it('should set threat by word', () => {
      const trait = new CharacterModelTrait();
      trait.setThreat('cornered');

      expect(trait.threatValue).toBe(THREAT_VALUES.cornered);
      expect(trait.getThreat()).toBe('cornered');
    });

    it('should adjust threat by delta', () => {
      const trait = new CharacterModelTrait();
      trait.setThreat('safe');
      trait.adjustThreat(65);

      expect(trait.threatValue).toBe(65);
      expect(trait.getThreat()).toBe('threatened');
    });

    it('should clamp threat to 0..100', () => {
      const trait = new CharacterModelTrait();
      trait.setThreat('desperate');
      trait.adjustThreat(50);
      expect(trait.threatValue).toBe(100);

      trait.adjustThreat(-200);
      expect(trait.threatValue).toBe(0);
    });
  });

  // =========================================================================
  // Knowledge
  // =========================================================================

  describe('knowledge', () => {
    it('should add and retrieve facts', () => {
      const trait = new CharacterModelTrait();
      trait.addFact('murder', 'witnessed', 'certain', 5);

      expect(trait.knows('murder')).toBe(true);
      expect(trait.getFact('murder')).toEqual({
        source: 'witnessed',
        confidence: 'certain',
        turnLearned: 5,
      });
    });

    it('should return false for unknown topics', () => {
      const trait = new CharacterModelTrait();
      expect(trait.knows('weapon')).toBe(false);
      expect(trait.getFact('weapon')).toBeUndefined();
    });

    it('should overwrite existing facts', () => {
      const trait = new CharacterModelTrait();
      trait.addFact('murder', 'told', 'suspects', 1);
      trait.addFact('murder', 'witnessed', 'certain', 5);

      expect(trait.getFact('murder')?.source).toBe('witnessed');
      expect(trait.getFact('murder')?.confidence).toBe('certain');
    });
  });

  // =========================================================================
  // Beliefs
  // =========================================================================

  describe('beliefs', () => {
    it('should add and retrieve beliefs', () => {
      const trait = new CharacterModelTrait();
      trait.addBelief('lady-grey-innocent', 'believes', 'reinterprets');

      expect(trait.hasBelief('lady-grey-innocent')).toBe(true);
      expect(trait.getBelief('lady-grey-innocent')).toEqual({
        strength: 'believes',
        resistance: 'reinterprets',
      });
    });

    it('should default resistance to none', () => {
      const trait = new CharacterModelTrait();
      trait.addBelief('earth-is-flat', 'certain');

      expect(trait.getBelief('earth-is-flat')?.resistance).toBe('none');
    });
  });

  // =========================================================================
  // Goals
  // =========================================================================

  describe('goals', () => {
    it('should add goals sorted by priority', () => {
      const trait = new CharacterModelTrait();
      trait.addGoal('survive', 5);
      trait.addGoal('protect-lady-grey', 10);
      trait.addGoal('find-evidence', 3);

      expect(trait.getTopGoal()?.id).toBe('protect-lady-grey');
      expect(trait.goals).toEqual([
        { id: 'protect-lady-grey', priority: 10 },
        { id: 'survive', priority: 5 },
        { id: 'find-evidence', priority: 3 },
      ]);
    });

    it('should update existing goal priority', () => {
      const trait = new CharacterModelTrait();
      trait.addGoal('survive', 5);
      trait.addGoal('protect-lady-grey', 10);
      trait.addGoal('survive', 15); // re-add with higher priority

      expect(trait.getTopGoal()?.id).toBe('survive');
      expect(trait.goals.length).toBe(2);
    });

    it('should remove goals', () => {
      const trait = new CharacterModelTrait();
      trait.addGoal('survive', 5);
      trait.addGoal('protect-lady-grey', 10);
      trait.removeGoal('protect-lady-grey');

      expect(trait.hasGoal('protect-lady-grey')).toBe(false);
      expect(trait.getTopGoal()?.id).toBe('survive');
    });

    it('should update goal priority', () => {
      const trait = new CharacterModelTrait();
      trait.addGoal('survive', 5);
      trait.addGoal('protect-lady-grey', 10);
      trait.updateGoalPriority('survive', 20);

      expect(trait.getTopGoal()?.id).toBe('survive');
    });

    it('should return undefined for empty goals', () => {
      const trait = new CharacterModelTrait();
      expect(trait.getTopGoal()).toBeUndefined();
    });
  });

  // =========================================================================
  // Lucidity
  // =========================================================================

  describe('lucidity', () => {
    it('should enter a lucidity state with window duration', () => {
      const trait = new CharacterModelTrait({
        lucidityConfig: {
          baseline: 'fragmented',
          triggers: {},
          decay: 'gradual',
          decayRate: 'slow',
        },
      });

      trait.enterLucidityState('lucid', 3);
      expect(trait.currentLucidityState).toBe('lucid');
      expect(trait.lucidityWindowTurns).toBe(3);
    });

    it('should decay lucidity window and return to baseline', () => {
      const trait = new CharacterModelTrait({
        lucidityConfig: {
          baseline: 'fragmented',
          triggers: {},
          decay: 'gradual',
          decayRate: 'slow',
        },
      });

      trait.enterLucidityState('lucid', 2);

      expect(trait.decayLucidity()).toBe(false); // 2 -> 1, not expired
      expect(trait.currentLucidityState).toBe('lucid');

      expect(trait.decayLucidity()).toBe(true); // 1 -> 0, expired
      expect(trait.currentLucidityState).toBe('fragmented');
      expect(trait.lucidityWindowTurns).toBe(-1);
    });

    it('should not decay when no active window', () => {
      const trait = new CharacterModelTrait();
      expect(trait.decayLucidity()).toBe(false);
    });
  });

  // =========================================================================
  // Predicates
  // =========================================================================

  describe('predicates', () => {
    describe('platform predicates', () => {
      it('should evaluate disposition predicates', () => {
        const trait = new CharacterModelTrait();
        trait.setDisposition('player', 'trusts');

        expect(trait.evaluate('trusts player')).toBe(true);
        expect(trait.evaluate('dislikes player')).toBe(false);
        expect(trait.evaluate('likes player')).toBe(true);
      });

      it('should evaluate threat predicates', () => {
        const trait = new CharacterModelTrait();
        trait.setThreat('cornered');

        expect(trait.evaluate('threatened')).toBe(true);
        expect(trait.evaluate('cornered')).toBe(true);
        expect(trait.evaluate('safe')).toBe(false);
      });

      it('should evaluate personality predicates', () => {
        const trait = new CharacterModelTrait();
        trait.setPersonality('very honest', 'slightly cowardly');

        expect(trait.evaluate('honest')).toBe(true);
        expect(trait.evaluate('cowardly')).toBe(false); // 0.2 < 0.4 threshold
      });

      it('should evaluate mood predicates', () => {
        const trait = new CharacterModelTrait();
        trait.setMood('panicked');

        expect(trait.evaluate('panicked')).toBe(true);
        expect(trait.evaluate('calm')).toBe(false);
      });

      it('should evaluate cognitive state predicates', () => {
        const trait = new CharacterModelTrait({
          cognitiveProfile: {
            perception: 'augmented',
            coherence: 'fragmented',
            selfModel: 'fractured',
            beliefFormation: 'resistant',
          },
        });

        expect(trait.evaluate('fragmented')).toBe(true);
        expect(trait.evaluate('dissociative')).toBe(true);
        expect(trait.evaluate('belief resistant')).toBe(true);
        // hallucinating requires non-lucid state
        expect(trait.evaluate('hallucinating')).toBe(true);
      });

      it('should evaluate lucidity predicates', () => {
        const trait = new CharacterModelTrait({
          cognitiveProfile: { perception: 'augmented' },
          lucidityConfig: { baseline: 'fragmented', triggers: {}, decay: 'gradual', decayRate: 'slow' },
        });

        // Start in baseline state
        trait.enterLucidityState('fragmented');
        expect(trait.evaluate('lucid')).toBe(false);
        expect(trait.evaluate('hallucinating')).toBe(true);

        // Enter lucid window
        trait.enterLucidityState('lucid', 3);
        expect(trait.evaluate('lucid')).toBe(true);
        expect(trait.evaluate('hallucinating')).toBe(false);
      });
    });

    describe('negation', () => {
      it('should negate with "not" prefix', () => {
        const trait = new CharacterModelTrait();
        trait.setThreat('safe');

        expect(trait.evaluate('not threatened')).toBe(true);
        expect(trait.evaluate('not safe')).toBe(false);
      });
    });

    describe('custom predicates', () => {
      it('should register and evaluate custom predicates', () => {
        const trait = new CharacterModelTrait();
        trait.addFact('consumed-wine', 'witnessed', 'certain', 1);

        trait.registerPredicate('drunk', (t) => t.knows('consumed-wine'));
        expect(trait.evaluate('drunk')).toBe(true);
      });

      it('should throw on unknown predicate', () => {
        const trait = new CharacterModelTrait();
        expect(() => trait.evaluate('flying')).toThrow("Unknown character predicate: 'flying'");
      });

      it('should report predicate existence', () => {
        const trait = new CharacterModelTrait();
        expect(trait.hasPredicate('threatened')).toBe(true);
        expect(trait.hasPredicate('flying')).toBe(false);
      });
    });
  });

  // =========================================================================
  // Cognitive profile
  // =========================================================================

  describe('cognitive profile', () => {
    it('should default to stable profile', () => {
      const trait = new CharacterModelTrait();
      expect(trait.cognitiveProfile).toEqual(STABLE_COGNITIVE_PROFILE);
    });

    it('should merge partial profile with stable defaults', () => {
      const trait = new CharacterModelTrait({
        cognitiveProfile: { perception: 'augmented', coherence: 'fragmented' },
      });

      expect(trait.cognitiveProfile.perception).toBe('augmented');
      expect(trait.cognitiveProfile.coherence).toBe('fragmented');
      expect(trait.cognitiveProfile.beliefFormation).toBe('flexible');
      expect(trait.cognitiveProfile.lucidity).toBe('stable');
      expect(trait.cognitiveProfile.selfModel).toBe('intact');
    });

    it('should accept a full schizophrenic profile', () => {
      const trait = new CharacterModelTrait({
        cognitiveProfile: {
          perception: 'augmented',
          beliefFormation: 'resistant',
          coherence: 'fragmented',
          lucidity: 'episodic',
          selfModel: 'uncertain',
        },
      });

      expect(trait.cognitiveProfile.perception).toBe('augmented');
      expect(trait.cognitiveProfile.beliefFormation).toBe('resistant');
      expect(trait.cognitiveProfile.coherence).toBe('fragmented');
      expect(trait.cognitiveProfile.lucidity).toBe('episodic');
      expect(trait.cognitiveProfile.selfModel).toBe('uncertain');
    });

    it('should accept a PTSD profile', () => {
      const trait = new CharacterModelTrait({
        cognitiveProfile: {
          perception: 'filtered',
          beliefFormation: 'rigid',
          coherence: 'drifting',
          lucidity: 'episodic',
          selfModel: 'uncertain',
        },
      });

      expect(trait.cognitiveProfile.perception).toBe('filtered');
      expect(trait.cognitiveProfile.beliefFormation).toBe('rigid');
      expect(trait.cognitiveProfile.coherence).toBe('drifting');
    });
  });

  // =========================================================================
  // State mutation verification
  // =========================================================================

  describe('state mutation verification', () => {
    it('should track multiple state changes across a scenario', () => {
      // Simulate: NPC starts calm, witnesses violence, gets threatened, then comforted
      const trait = new CharacterModelTrait({
        personality: { honest: 0.8, cowardly: 0.6 },
        mood: 'calm',
        threat: 'safe',
      });

      // Verify initial state
      expect(trait.getMood()).toBe('calm');
      expect(trait.getThreat()).toBe('safe');
      expect(trait.evaluate('cowardly')).toBe(true);

      // Violence event — threat increases, mood shifts to anxious
      trait.adjustThreat(65);
      trait.setMood('anxious');
      expect(trait.getThreat()).toBe('threatened');
      expect(trait.evaluate('threatened')).toBe(true);
      expect(trait.getMood()).toBe('anxious');

      // Player is kind — disposition improves
      trait.adjustDisposition('player', 40);
      expect(trait.getDispositionWord('player')).toBe('likes');

      // Player comforts — threat decreases, mood calms
      trait.adjustThreat(-50);
      trait.setMood('nervous');
      expect(trait.getThreat()).toBe('uneasy');
      expect(trait.evaluate('threatened')).toBe(false);
    });
  });
});
