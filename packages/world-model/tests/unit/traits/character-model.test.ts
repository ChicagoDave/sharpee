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
  PERSONALITY_TRAITS,
  INTENSITY_WORDS,
  DISPOSITION_WORDS,
  MOODS,
  THREAT_LEVELS,
  FACT_SOURCES,
  CONFIDENCE_WORDS,
  RESISTANCE_MODES,
  COGNITIVE_DIMENSIONS,
  FORCES,
  ACT_CATEGORIES,
  OBLIGATION_WORDS,
  FACE_ACTS,
  PRESSURE_BANDS,
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

  // ADR-310 Phase 3: the runtime word arrays feed the generated Chord
  // character manifest (`repokit manifest`). Each array must stay in
  // lockstep with the value Record it mirrors — a word added to one side
  // only would ship a vocabulary the compiler and runtime disagree on.
  describe('vocabulary arrays (Chord manifest source)', () => {
    it('INTENSITY_WORDS matches INTENSITY_VALUES keys (minus internal bare)', () => {
      expect([...INTENSITY_WORDS].sort()).toEqual(
        Object.keys(INTENSITY_VALUES).filter((w) => w !== 'bare').sort(),
      );
    });

    it('DISPOSITION_WORDS matches DISPOSITION_RANGES keys', () => {
      expect([...DISPOSITION_WORDS].sort()).toEqual(Object.keys(DISPOSITION_RANGES).sort());
    });

    it('MOODS matches MOOD_AXES keys', () => {
      expect([...MOODS].sort()).toEqual(Object.keys(MOOD_AXES).sort());
    });

    it('THREAT_LEVELS matches THREAT_VALUES keys', () => {
      expect([...THREAT_LEVELS].sort()).toEqual(Object.keys(THREAT_VALUES).sort());
    });

    it('CONFIDENCE_WORDS matches CONFIDENCE_VALUES keys', () => {
      expect([...CONFIDENCE_WORDS].sort()).toEqual(Object.keys(CONFIDENCE_VALUES).sort());
    });

    it('COGNITIVE_DIMENSIONS covers the five profile dimensions with three values each', () => {
      expect(Object.keys(COGNITIVE_DIMENSIONS).sort()).toEqual(
        ['belief-formation', 'coherence', 'lucidity', 'perception', 'self-model'],
      );
      for (const values of Object.values(COGNITIVE_DIMENSIONS)) {
        expect(values).toHaveLength(3);
      }
      // The default profile's values are all drawn from the declared sets
      // (kebab key ↔ camelCase field, same order as the declaration).
      expect(COGNITIVE_DIMENSIONS['perception']).toContain(STABLE_COGNITIVE_PROFILE.perception);
      expect(COGNITIVE_DIMENSIONS['belief-formation']).toContain(STABLE_COGNITIVE_PROFILE.beliefFormation);
      expect(COGNITIVE_DIMENSIONS['coherence']).toContain(STABLE_COGNITIVE_PROFILE.coherence);
      expect(COGNITIVE_DIMENSIONS['lucidity']).toContain(STABLE_COGNITIVE_PROFILE.lucidity);
      expect(COGNITIVE_DIMENSIONS['self-model']).toContain(STABLE_COGNITIVE_PROFILE.selfModel);
    });

    it('PERSONALITY_TRAITS, FACT_SOURCES, RESISTANCE_MODES carry the frozen list sizes', () => {
      // Type-only unions have no Record to diff against; pin the frozen
      // counts (contracts.md §6) so silent shrinkage fails loudly.
      expect(PERSONALITY_TRAITS).toHaveLength(14);
      expect(FACT_SOURCES).toHaveLength(5);
      expect(RESISTANCE_MODES).toHaveLength(3);
      expect(new Set(PERSONALITY_TRAITS).size).toBe(14);
    });

    it('normative arrays (ADR-318) carry the frozen list sizes', () => {
      // Same rule as above: these unions have no Record to diff against;
      // pin the frozen counts (contracts.md §6). Forces D1, act categories
      // and obligations D4, face-acts D7, bands D8.
      expect(FORCES).toEqual(['fear', 'desire', 'duty', 'honor', 'love']);
      expect(ACT_CATEGORIES).toHaveLength(7);
      expect(OBLIGATION_WORDS).toEqual(['protects', 'answers honestly']);
      expect(FACE_ACTS).toHaveLength(6);
      expect(PRESSURE_BANDS).toEqual(['clear', 'burdened', 'breaking']);
      expect(new Set(ACT_CATEGORIES).size).toBe(7);
      expect(new Set(FACE_ACTS).size).toBe(6);
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
      expect(trait.schemaVersion).toBe(1);
      expect(trait.personality).toEqual({});
      expect(trait.dispositions).toEqual({});
      expect(trait.getMood()).toBe('calm');
      expect(trait.getThreat()).toBe('safe');
      expect(trait.cognitiveProfile).toEqual(STABLE_COGNITIVE_PROFILE);
      expect(trait.knowledge).toEqual({});
      expect(trait.factBeliefs).toEqual({});
      expect(trait.told).toEqual({});
      expect(trait.goals).toEqual([]);
      expect(trait.goalState).toEqual({});
      expect(trait.influencesInForce).toEqual([]);
      expect(trait.temperaments).toEqual([]);
      expect(trait.principles).toEqual([]);
      expect(trait.obligations).toEqual([]);
      expect(trait.honor).toBeUndefined();
      expect(trait.pressure).toEqual({ value: 0, band: 'clear' });
      expect(trait.burdenedBy).toEqual([]);
      expect(trait.ledger).toEqual([]);
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
        factBeliefs: {
          'the-killer': {
            value: 'the-butler', confidence: 'believes', source: 'told',
            turnLearned: 2, resistance: 'reinterprets',
          },
        },
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
      expect(trait.hasFactBelief('the-killer')).toBe(true);
      expect(trait.getFactBelief('the-killer')?.value).toBe('the-butler');
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
  // Valued beliefs (ADR-310 D14)
  // =========================================================================

  describe('valued beliefs', () => {
    it('should store what the character thinks a fact value is', () => {
      const trait = new CharacterModelTrait();
      trait.setFactBelief('the-killer', {
        value: 'the-colonel', confidence: 'certain', source: 'witnessed',
        turnLearned: 3, resistance: 'none',
      });

      expect(trait.hasFactBelief('the-killer')).toBe(true);
      expect(trait.getFactBelief('the-killer')).toEqual({
        value: 'the-colonel', confidence: 'certain', source: 'witnessed',
        turnLearned: 3, resistance: 'none',
      });
    });

    it('should replace the whole belief when the character changes its mind', () => {
      const trait = new CharacterModelTrait();
      trait.setFactBelief('the-killer', {
        value: 'the-butler', confidence: 'suspects', source: 'told',
        turnLearned: 1, resistance: 'none',
      });
      trait.setFactBelief('the-killer', {
        value: 'nobody', confidence: 'believes', source: 'inferred',
        turnLearned: 9, resistance: 'reinterprets',
      });

      expect(trait.getFactBelief('the-killer')).toEqual({
        value: 'nobody', confidence: 'believes', source: 'inferred',
        turnLearned: 9, resistance: 'reinterprets',
      });
    });

    it('should let two traits disagree about the same fact', () => {
      const maid = new CharacterModelTrait();
      const cook = new CharacterModelTrait();
      maid.setFactBelief('the-killer', {
        value: 'the-colonel', confidence: 'certain', source: 'witnessed',
        turnLearned: 1, resistance: 'none',
      });
      cook.setFactBelief('the-killer', {
        value: 'the-butler', confidence: 'suspects', source: 'told',
        turnLearned: 1, resistance: 'none',
      });

      expect(maid.getFactBelief('the-killer')?.value).toBe('the-colonel');
      expect(cook.getFactBelief('the-killer')?.value).toBe('the-butler');
    });

    it('should carry folded resistance on valueless facts', () => {
      const trait = new CharacterModelTrait();
      trait.addFact('lady-grey-innocent', 'assumed', 'believes', 2, 'reinterprets');
      trait.addFact('murder', 'witnessed', 'certain', 5);

      expect(trait.getFact('lady-grey-innocent')?.resistance).toBe('reinterprets');
      expect(trait.getFact('murder')?.resistance).toBeUndefined();
    });
  });

  // =========================================================================
  // Told-record (ADR-310 D10/D17)
  // =========================================================================

  describe('told-record', () => {
    it('should record and report told topics per listener', () => {
      const trait = new CharacterModelTrait();
      trait.recordTold('npc-cook', 'murder');

      expect(trait.hasTold('npc-cook', 'murder')).toBe(true);
      expect(trait.hasTold('npc-cook', 'weapon')).toBe(false);
      expect(trait.hasTold('npc-maid', 'murder')).toBe(false);
      expect(trait.told['npc-cook']).toEqual(['murder']);
    });

    it('should be idempotent for repeat tells', () => {
      const trait = new CharacterModelTrait();
      trait.recordTold('npc-cook', 'murder');
      trait.recordTold('npc-cook', 'murder');

      expect(trait.told['npc-cook']).toEqual(['murder']);
    });
  });

  // =========================================================================
  // Goal runtime state (ADR-310 D17)
  // =========================================================================

  describe('goal runtime state', () => {
    it('should create and persist default state on first access', () => {
      const trait = new CharacterModelTrait();
      const state = trait.getGoalState('eliminate-player');

      expect(state).toEqual({ active: false, currentStep: 0, paused: false, interrupted: false });
      expect(trait.goalState['eliminate-player']).toBe(state);
    });

    it('should persist mutations through the returned reference', () => {
      const trait = new CharacterModelTrait();
      const state = trait.getGoalState('eliminate-player');
      state.currentStep = 2;
      state.paused = true;

      expect(trait.goalState['eliminate-player']).toEqual({
        active: false, currentStep: 2, paused: true, interrupted: false,
      });
      expect(trait.getGoalState('eliminate-player').currentStep).toBe(2);
    });
  });

  // =========================================================================
  // Influences in force (ADR-310 D17)
  // =========================================================================

  describe('influences in force', () => {
    it('should record applied influence effects on the target trait', () => {
      const trait = new CharacterModelTrait();
      trait.addInfluenceInForce({
        influenceName: 'seduction', influencerId: 'npc-ginger',
        effect: { focus: 'clouded', mood: 'distracted' },
        duration: 'while present', appliedAtTurn: 4,
      });

      expect(trait.influencesInForce).toHaveLength(1);
      expect(trait.influencesInForce[0].influencerId).toBe('npc-ginger');
      expect(trait.influencesInForce[0].effect.mood).toBe('distracted');
    });
  });

  // =========================================================================
  // Normative layer (ADR-318)
  // =========================================================================

  describe('temperament resolution', () => {
    it('should pick the binding bound to a current state over the unconditional one', () => {
      const trait = new CharacterModelTrait({
        temperaments: [
          { name: 'timid' },
          { name: 'steadfast', while: 'resolute' },
        ],
      });

      expect(trait.activeTemperament(['resolute'])).toBe('steadfast');
      expect(trait.activeTemperament(['cowed'])).toBe('timid');
      expect(trait.activeTemperament([])).toBe('timid');
    });

    it('should return undefined with no bindings', () => {
      const trait = new CharacterModelTrait();
      expect(trait.activeTemperament(['anything'])).toBeUndefined();
    });
  });

  describe('conscience pressure', () => {
    it('should store value and band together', () => {
      const trait = new CharacterModelTrait();
      trait.setPressure(42, 'burdened');

      expect(trait.pressure).toEqual({ value: 42, band: 'burdened' });
    });

    it('should clamp negative values to zero', () => {
      const trait = new CharacterModelTrait();
      trait.setPressure(-5, 'clear');

      expect(trait.pressure.value).toBe(0);
    });

    it('should gate band predicates exactly as mood words do', () => {
      const trait = new CharacterModelTrait();
      expect(trait.evaluate('clear')).toBe(true);
      expect(trait.evaluate('burdened')).toBe(false);

      trait.setPressure(70, 'breaking');
      expect(trait.evaluate('breaking')).toBe(true);
      expect(trait.evaluate('clear')).toBe(false);
    });
  });

  describe('lie ledger', () => {
    it('should mint entries and return the active pin for an audience and fact', () => {
      const trait = new CharacterModelTrait();
      trait.mintLedgerEntry({
        kind: 'claim', audience: 'player', factId: 'the-killer',
        claimedValue: 'nobody', turnMinted: 6, pinned: true,
      });

      const pin = trait.getActivePin('player', 'the-killer');
      expect(pin?.claimedValue).toBe('nobody');
      expect(trait.getActivePin('npc-cook', 'the-killer')).toBeUndefined();
      expect(trait.getActivePin('player', 'the-weapon')).toBeUndefined();
    });

    it('should return the most recent pinned claim when re-minted', () => {
      const trait = new CharacterModelTrait();
      trait.mintLedgerEntry({
        kind: 'claim', audience: 'player', factId: 'the-killer',
        claimedValue: 'nobody', turnMinted: 6, pinned: true,
      });
      trait.mintLedgerEntry({
        kind: 'claim', audience: 'player', factId: 'the-killer',
        claimedValue: 'the-maid', turnMinted: 9, pinned: true,
      });

      expect(trait.getActivePin('player', 'the-killer')?.claimedValue).toBe('the-maid');
    });

    it('should skip promises when resolving a pin', () => {
      const trait = new CharacterModelTrait();
      trait.mintLedgerEntry({
        kind: 'promise', audience: 'player', factId: 'the-killer',
        claimedValue: 'will-confess', turnMinted: 6, pinned: true,
      });

      expect(trait.getActivePin('player', 'the-killer')).toBeUndefined();
    });

    it('should release pins on discharge while keeping ledger history', () => {
      const trait = new CharacterModelTrait();
      trait.mintLedgerEntry({
        kind: 'claim', audience: 'player', factId: 'the-killer',
        claimedValue: 'nobody', turnMinted: 6, pinned: true,
      });
      trait.mintLedgerEntry({
        kind: 'claim', audience: 'npc-cook', factId: 'the-killer',
        claimedValue: 'nobody', turnMinted: 7, pinned: true,
      });

      trait.unpinLedger({ audience: 'player' });
      expect(trait.getActivePin('player', 'the-killer')).toBeUndefined();
      expect(trait.getActivePin('npc-cook', 'the-killer')?.claimedValue).toBe('nobody');
      expect(trait.ledger).toHaveLength(2);

      trait.unpinLedger();
      expect(trait.getActivePin('npc-cook', 'the-killer')).toBeUndefined();
      expect(trait.ledger).toHaveLength(2);
    });
  });

  // =========================================================================
  // Serialization round-trip (ADR-310 D17)
  // =========================================================================

  describe('serialization round-trip', () => {
    it('should carry all mutable state through JSON and back', () => {
      const trait = new CharacterModelTrait({
        personality: { honest: 0.8 },
        temperaments: [{ name: 'steadfast', while: 'resolute' }],
        principles: [{ category: 'lie', except: 'to protect the children' }],
        obligations: [{ kind: 'protects', scope: 'the children' }],
        honor: { scope: 'the regiment', faceActs: ['backs down', 'shows fear'] },
        burdenedBy: ['the-first-lie'],
      });
      trait.setFactBelief('the-killer', {
        value: 'the-butler', confidence: 'suspects', source: 'told',
        turnLearned: 2, resistance: 'none',
      });
      trait.recordTold('npc-cook', 'murder');
      trait.getGoalState('flee').currentStep = 1;
      trait.addInfluenceInForce({
        influenceName: 'intimidation', influencerId: 'npc-colonel',
        effect: { mood: 'nervous' }, duration: 'lingering',
        appliedAtTurn: 3, expiresAtTurn: 8,
      });
      trait.setPressure(55, 'burdened');
      trait.mintLedgerEntry({
        kind: 'claim', audience: 'player', factId: 'the-killer',
        claimedValue: 'nobody', turnMinted: 6, pinned: true,
      });

      const restored = new CharacterModelTrait(
        JSON.parse(JSON.stringify(trait)) as ICharacterModelData,
      );

      expect(restored.schemaVersion).toBe(1);
      expect(restored.getFactBelief('the-killer')?.value).toBe('the-butler');
      expect(restored.hasTold('npc-cook', 'murder')).toBe(true);
      expect(restored.getGoalState('flee').currentStep).toBe(1);
      expect(restored.influencesInForce).toHaveLength(1);
      expect(restored.influencesInForce[0].expiresAtTurn).toBe(8);
      expect(restored.activeTemperament(['resolute'])).toBe('steadfast');
      expect(restored.principles[0].except).toBe('to protect the children');
      expect(restored.obligations[0].scope).toBe('the children');
      expect(restored.honor?.faceActs).toContain('shows fear');
      expect(restored.pressure).toEqual({ value: 55, band: 'burdened' });
      expect(restored.burdenedBy).toEqual(['the-first-lie']);
      expect(restored.getActivePin('player', 'the-killer')?.claimedValue).toBe('nobody');
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

  // =========================================================================
  // Rehydration (ADR-310 Phase 5 — the engine save/restore trait path)
  // =========================================================================

  describe('rehydration through IFEntity.toJSON/fromJSON (D17)', () => {
    it('a rehydrated trait keeps every mutable field and evaluates predicates', async () => {
      // The real save path: entity.toJSON → JSON text → IFEntity.fromJSON
      // (Object.create + Object.assign — the constructor never runs).
      const { IFEntity } = await import('../../../src/entities/if-entity');
      // Importing the barrel registers the trait rehydrator (leaf-module seam).
      await import('../../../src/index');

      const entity = new IFEntity('npc-1', 'actor');
      const trait = new CharacterModelTrait({
        personality: { cowardly: 0.8 },
        mood: 'nervous',
        threat: 'uneasy',
        knowledge: { murder: { source: 'witnessed', confidence: 'certain', turnLearned: 2 } },
        factBeliefs: { 'weapon.location': { value: 'cellar', confidence: 'believes', source: 'told', turnLearned: 3, resistance: 'none' } },
        goalState: { flee: { active: true, currentStep: 1, paused: false, interrupted: false } },
        pressure: { value: 40, band: 'burdened' },
        burdenedBy: ['secret'],
        ledger: [{ kind: 'claim', audience: 'player', factId: 'weapon.location', claimedValue: 'attic', turnMinted: 4, pinned: true }],
        told: { maid: ['murder'] },
      });
      trait.registerPredicate('story-custom', () => true);
      entity.add(trait);

      const restored = IFEntity.fromJSON(JSON.parse(JSON.stringify(entity.toJSON())));
      const rt = restored.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;

      // Every mutable field survives byte-faithfully
      expect(rt.getMood()).toBe('nervous');
      expect(rt.getThreat()).toBe('uneasy');
      expect(rt.knowledge).toEqual(trait.knowledge);
      expect(rt.factBeliefs).toEqual(trait.factBeliefs);
      expect(rt.goalState).toEqual(trait.goalState);
      expect(rt.pressure).toEqual({ value: 40, band: 'burdened' });
      expect(rt.burdenedBy).toEqual(['secret']);
      expect(rt.ledger).toEqual(trait.ledger);
      expect(rt.told).toEqual({ maid: ['murder'] });

      // Platform predicates rebuild lazily on the rehydrated instance —
      // the old own-field Map came back as a plain object and threw here.
      expect(rt.evaluate('cowardly')).toBe(true);
      expect(rt.evaluate('burdened')).toBe(true);
      expect(rt.evaluate('not threatened')).toBe(true);

      // Load-time registrations are transient by design: gone after
      // restore until the loader re-registers them.
      expect(() => rt.evaluate('story-custom')).toThrow(/Unknown character predicate/);

      // And registration on the rehydrated instance works.
      rt.registerPredicate('story-custom', () => true);
      expect(rt.evaluate('story-custom')).toBe(true);
    });
  });
});
