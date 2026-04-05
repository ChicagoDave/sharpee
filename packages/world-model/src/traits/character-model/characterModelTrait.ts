/**
 * Character model trait (ADR-141)
 *
 * Rich internal state for NPCs: personality, disposition, mood, threat,
 * cognitive profile, knowledge, beliefs, and goals. Opt-in — only NPCs
 * that need behavioral depth carry this trait alongside NpcTrait.
 *
 * Public interface: ICharacterModelData, CharacterModelTrait, CharacterPredicate.
 * Owner context: world-model / character-model trait
 */

import { ITrait } from '../trait';
import {
  PersonalityTrait,
  PersonalityExpr,
  parsePersonalityExpr,
  DispositionWord,
  dispositionToValue,
  valueToDisposition,
  Mood,
  MOOD_AXES,
  nearestMood,
  ThreatLevel,
  THREAT_VALUES,
  valueToThreat,
  CognitiveProfile,
  STABLE_COGNITIVE_PROFILE,
  ConfidenceWord,
  Fact,
  FactSource,
  Belief,
  ResistanceMode,
  Goal,
  LucidityConfig,
  PerceptionFilterConfig,
  PerceivedEvent,
} from './character-vocabulary';

// ---------------------------------------------------------------------------
// Data interface
// ---------------------------------------------------------------------------

/** Serializable data for constructing a CharacterModelTrait. */
export interface ICharacterModelData {
  /** Personality traits with intensity values (0-1). */
  personality?: Record<PersonalityTrait, number>;

  /** Disposition toward specific entities (numeric, -100 to 100). */
  dispositions?: Record<string, number>;

  /** Current mood (valence-arousal stored internally). */
  mood?: Mood;
  moodValence?: number;
  moodArousal?: number;

  /** Current threat level (numeric, 0-100). */
  threat?: ThreatLevel;
  threatValue?: number;

  /** Five-dimensional cognitive profile. */
  cognitiveProfile?: Partial<CognitiveProfile>;

  /** Knowledge base: topic -> fact. */
  knowledge?: Record<string, Fact>;

  /** Beliefs: topic -> belief. */
  beliefs?: Record<string, Belief>;

  /** Goals ordered by priority. */
  goals?: Goal[];

  /** Lucidity window configuration. */
  lucidityConfig?: LucidityConfig;

  /** Current lucidity state name (e.g., 'lucid', 'hallucinating', baseline). */
  currentLucidityState?: string;

  /** Turns remaining in current lucidity window. -1 = no active window. */
  lucidityWindowTurns?: number;

  /** Perception filter configuration. */
  perceptionFilters?: PerceptionFilterConfig;

  /** Hallucinated perceived events. */
  perceivedEvents?: Record<string, PerceivedEvent>;

  /** Custom story-defined predicates are registered at runtime, not serialized. */
}

// ---------------------------------------------------------------------------
// Predicate type
// ---------------------------------------------------------------------------

/** A predicate function that evaluates character state. */
export type CharacterPredicate = (trait: CharacterModelTrait) => boolean;

// ---------------------------------------------------------------------------
// Trait implementation
// ---------------------------------------------------------------------------

/**
 * CharacterModelTrait — rich internal state for NPCs.
 *
 * All state is stored as plain properties so JSON serialization survives.
 * Predicate functions are registered at runtime and live in a transient map
 * that is rebuilt after deserialization by the builder or story setup code.
 */
export class CharacterModelTrait implements ITrait {
  static readonly type = 'characterModel' as const;
  readonly type = 'characterModel' as const;

  // -- Personality (fixed at creation) --
  personality: Record<string, number>;

  // -- Disposition (per-entity, directed) --
  dispositions: Record<string, number>;

  // -- Mood (transient, undirected, valence-arousal internally) --
  moodValence: number;
  moodArousal: number;

  // -- Threat (situational, 0-100) --
  threatValue: number;

  // -- Cognitive profile --
  cognitiveProfile: CognitiveProfile;

  // -- Knowledge --
  knowledge: Record<string, Fact>;

  // -- Beliefs --
  beliefs: Record<string, Belief>;

  // -- Goals --
  goals: Goal[];

  // -- Lucidity --
  lucidityConfig?: LucidityConfig;
  currentLucidityState: string;
  lucidityWindowTurns: number;

  // -- Perception --
  perceptionFilters?: PerceptionFilterConfig;
  perceivedEvents: Record<string, PerceivedEvent>;

  // -- Predicates (transient, not serialized) --
  private predicates: Map<string, CharacterPredicate> = new Map();

  constructor(data: ICharacterModelData = {}) {
    // Personality
    this.personality = data.personality ? { ...data.personality } : {};

    // Dispositions
    this.dispositions = data.dispositions ? { ...data.dispositions } : {};

    // Mood — accept either word or raw axes
    if (data.moodValence !== undefined && data.moodArousal !== undefined) {
      this.moodValence = data.moodValence;
      this.moodArousal = data.moodArousal;
    } else if (data.mood) {
      const axes = MOOD_AXES[data.mood];
      this.moodValence = axes.valence;
      this.moodArousal = axes.arousal;
    } else {
      // Default: calm
      this.moodValence = MOOD_AXES.calm.valence;
      this.moodArousal = MOOD_AXES.calm.arousal;
    }

    // Threat — accept either word or raw value
    if (data.threatValue !== undefined) {
      this.threatValue = data.threatValue;
    } else if (data.threat) {
      this.threatValue = THREAT_VALUES[data.threat];
    } else {
      this.threatValue = THREAT_VALUES.safe;
    }

    // Cognitive profile
    this.cognitiveProfile = {
      ...STABLE_COGNITIVE_PROFILE,
      ...(data.cognitiveProfile ?? {}),
    };

    // Knowledge
    this.knowledge = data.knowledge ? { ...data.knowledge } : {};

    // Beliefs
    this.beliefs = data.beliefs ? { ...data.beliefs } : {};

    // Goals
    this.goals = data.goals ? [...data.goals] : [];

    // Lucidity
    this.lucidityConfig = data.lucidityConfig;
    this.currentLucidityState = data.currentLucidityState ?? (data.lucidityConfig?.baseline ?? 'stable');
    this.lucidityWindowTurns = data.lucidityWindowTurns ?? -1;

    // Perception
    this.perceptionFilters = data.perceptionFilters;
    this.perceivedEvents = data.perceivedEvents ? { ...data.perceivedEvents } : {};

    // Register platform predicates
    this.registerPlatformPredicates();
  }

  // =========================================================================
  // Personality (read-only after creation)
  // =========================================================================

  /**
   * Set personality from expression array. Typically called once at creation.
   *
   * @param exprs - Personality expressions like 'very honest', 'cowardly'
   */
  setPersonality(...exprs: PersonalityExpr[]): void {
    for (const expr of exprs) {
      const [trait, value] = parsePersonalityExpr(expr);
      this.personality[trait] = value;
    }
  }

  /**
   * Get the intensity value for a personality trait.
   *
   * @param trait - The personality trait to query
   * @returns The intensity value (0-1), or 0 if the trait is not set
   */
  getPersonality(trait: PersonalityTrait): number {
    return this.personality[trait] ?? 0;
  }

  // =========================================================================
  // Disposition
  // =========================================================================

  /**
   * Set disposition toward an entity using a word.
   *
   * @param entityId - The entity this disposition is directed at
   * @param word - A disposition word like 'trusts' or 'wary of'
   */
  setDisposition(entityId: string, word: DispositionWord): void {
    this.dispositions[entityId] = dispositionToValue(word);
  }

  /**
   * Adjust disposition toward an entity by a numeric delta.
   * Clamps to -100..100.
   *
   * @param entityId - The entity to adjust disposition for
   * @param delta - Amount to add (positive = warmer, negative = colder)
   */
  adjustDisposition(entityId: string, delta: number): void {
    const current = this.dispositions[entityId] ?? 0;
    this.dispositions[entityId] = Math.max(-100, Math.min(100, current + delta));
  }

  /**
   * Get the numeric disposition value toward an entity.
   *
   * @param entityId - The entity to query
   * @returns Numeric disposition (-100 to 100), defaults to 0 (neutral)
   */
  getDispositionValue(entityId: string): number {
    return this.dispositions[entityId] ?? 0;
  }

  /**
   * Get the disposition word toward an entity.
   *
   * @param entityId - The entity to query
   * @returns The disposition word
   */
  getDispositionWord(entityId: string): DispositionWord {
    return valueToDisposition(this.getDispositionValue(entityId));
  }

  // =========================================================================
  // Mood
  // =========================================================================

  /**
   * Set mood by word. Translates to internal valence-arousal axes.
   *
   * @param word - A mood word like 'nervous' or 'cheerful'
   */
  setMood(word: Mood): void {
    const axes = MOOD_AXES[word];
    this.moodValence = axes.valence;
    this.moodArousal = axes.arousal;
  }

  /**
   * Adjust mood axes by deltas. Clamps valence to -1..1 and arousal to 0..1.
   *
   * @param valenceDelta - Change in valence
   * @param arousalDelta - Change in arousal
   */
  adjustMood(valenceDelta: number, arousalDelta: number): void {
    this.moodValence = Math.max(-1, Math.min(1, this.moodValence + valenceDelta));
    this.moodArousal = Math.max(0, Math.min(1, this.moodArousal + arousalDelta));
  }

  /**
   * Get the current mood as a word (nearest match to valence-arousal position).
   *
   * @returns The mood word
   */
  getMood(): Mood {
    return nearestMood(this.moodValence, this.moodArousal);
  }

  // =========================================================================
  // Threat
  // =========================================================================

  /**
   * Set threat level by word.
   *
   * @param level - A threat level word
   */
  setThreat(level: ThreatLevel): void {
    this.threatValue = THREAT_VALUES[level];
  }

  /**
   * Adjust threat level by a numeric delta. Clamps to 0..100.
   *
   * @param delta - Amount to add (positive = more threatened)
   */
  adjustThreat(delta: number): void {
    this.threatValue = Math.max(0, Math.min(100, this.threatValue + delta));
  }

  /**
   * Get the current threat level as a word.
   *
   * @returns The threat level word
   */
  getThreat(): ThreatLevel {
    return valueToThreat(this.threatValue);
  }

  // =========================================================================
  // Knowledge
  // =========================================================================

  /**
   * Add or update a fact in the NPC's knowledge base.
   *
   * @param topic - The topic this fact is about
   * @param source - How the NPC learned this fact
   * @param confidence - How confident the NPC is
   * @param turn - The turn number when the fact was learned
   */
  addFact(topic: string, source: FactSource, confidence: ConfidenceWord, turn: number): void {
    this.knowledge[topic] = { source, confidence, turnLearned: turn };
  }

  /**
   * Check whether the NPC knows about a topic.
   *
   * @param topic - The topic to check
   * @returns True if the NPC has any fact about this topic
   */
  knows(topic: string): boolean {
    return topic in this.knowledge;
  }

  /**
   * Get a fact from the knowledge base.
   *
   * @param topic - The topic to query
   * @returns The fact, or undefined if unknown
   */
  getFact(topic: string): Fact | undefined {
    return this.knowledge[topic];
  }

  // =========================================================================
  // Beliefs
  // =========================================================================

  /**
   * Add or update a belief.
   *
   * @param topic - What the belief is about
   * @param strength - How strongly held
   * @param resistance - How resistant to counter-evidence
   */
  addBelief(topic: string, strength: ConfidenceWord, resistance: ResistanceMode = 'none'): void {
    this.beliefs[topic] = { strength, resistance };
  }

  /**
   * Check whether the NPC holds a belief about a topic.
   *
   * @param topic - The topic to check
   * @returns True if the NPC has a belief about this topic
   */
  hasBelief(topic: string): boolean {
    return topic in this.beliefs;
  }

  /**
   * Get a belief.
   *
   * @param topic - The topic to query
   * @returns The belief, or undefined
   */
  getBelief(topic: string): Belief | undefined {
    return this.beliefs[topic];
  }

  // =========================================================================
  // Goals
  // =========================================================================

  /**
   * Add a goal with priority. Higher priority = more important.
   *
   * @param id - Goal identifier
   * @param priority - Numeric priority (higher = more important)
   */
  addGoal(id: string, priority: number): void {
    const existing = this.goals.findIndex(g => g.id === id);
    if (existing >= 0) {
      this.goals[existing].priority = priority;
    } else {
      this.goals.push({ id, priority });
    }
    this.goals.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a goal by id.
   *
   * @param id - Goal identifier to remove
   */
  removeGoal(id: string): void {
    this.goals = this.goals.filter(g => g.id !== id);
  }

  /**
   * Get the highest-priority goal, or undefined if none.
   *
   * @returns The top goal, or undefined
   */
  getTopGoal(): Goal | undefined {
    return this.goals[0];
  }

  /**
   * Check whether the NPC has a specific goal.
   *
   * @param id - Goal identifier to check
   * @returns True if the goal exists
   */
  hasGoal(id: string): boolean {
    return this.goals.some(g => g.id === id);
  }

  /**
   * Update the priority of an existing goal.
   *
   * @param id - Goal identifier
   * @param priority - New priority value
   */
  updateGoalPriority(id: string, priority: number): void {
    const goal = this.goals.find(g => g.id === id);
    if (goal) {
      goal.priority = priority;
      this.goals.sort((a, b) => b.priority - a.priority);
    }
  }

  // =========================================================================
  // Lucidity
  // =========================================================================

  /**
   * Transition to a new lucidity state.
   *
   * @param state - The target lucidity state name
   * @param windowTurns - How many turns this window lasts (-1 = indefinite)
   */
  enterLucidityState(state: string, windowTurns: number = -1): void {
    this.currentLucidityState = state;
    this.lucidityWindowTurns = windowTurns;
  }

  /**
   * Decay the lucidity window by one turn. Returns to baseline when expired.
   *
   * @returns True if the window expired and baseline was restored
   */
  decayLucidity(): boolean {
    if (this.lucidityWindowTurns <= 0) return false;
    this.lucidityWindowTurns--;
    if (this.lucidityWindowTurns === 0) {
      this.currentLucidityState = this.lucidityConfig?.baseline ?? 'stable';
      this.lucidityWindowTurns = -1;
      return true;
    }
    return false;
  }

  // =========================================================================
  // Predicates
  // =========================================================================

  /**
   * Register a named predicate function.
   *
   * @param name - Predicate name (e.g., 'trusts player', 'threatened')
   * @param fn - Function that evaluates against this trait's state
   */
  registerPredicate(name: string, fn: CharacterPredicate): void {
    this.predicates.set(name, fn);
  }

  /**
   * Evaluate a named predicate against current state.
   * Supports 'not X' negation.
   *
   * @param predicate - The predicate name to evaluate
   * @returns True if the predicate is satisfied
   * @throws Error if the predicate is not registered
   */
  evaluate(predicate: string): boolean {
    // Handle negation
    if (predicate.startsWith('not ')) {
      const inner = predicate.slice(4);
      return !this.evaluate(inner);
    }

    const fn = this.predicates.get(predicate);
    if (!fn) {
      throw new Error(`Unknown character predicate: '${predicate}'`);
    }
    return fn(this);
  }

  /**
   * Check if a predicate is registered.
   *
   * @param name - Predicate name
   * @returns True if registered
   */
  hasPredicate(name: string): boolean {
    return this.predicates.has(name);
  }

  // =========================================================================
  // Platform predicates
  // =========================================================================

  /** Register all built-in predicates defined by ADR-141. */
  private registerPlatformPredicates(): void {
    // --- Disposition (parameterized) ---
    this.registerPredicate('trusts player', (t) => t.getDispositionValue('player') > 50);
    this.registerPredicate('dislikes player', (t) => t.getDispositionValue('player') < -30);
    this.registerPredicate('likes player', (t) => t.getDispositionValue('player') > 30);

    // --- Threat (>= thresholds match THREAT_VALUES so word and predicate align) ---
    this.registerPredicate('safe', (t) => t.threatValue <= 10);
    this.registerPredicate('threatened', (t) => t.threatValue >= THREAT_VALUES.threatened);
    this.registerPredicate('cornered', (t) => t.threatValue >= THREAT_VALUES.cornered);

    // --- Personality ---
    this.registerPredicate('cowardly', (t) => t.getPersonality('cowardly') > 0.4);
    this.registerPredicate('honest', (t) => t.getPersonality('honest') > 0.4);
    this.registerPredicate('loyal', (t) => t.getPersonality('loyal') > 0.4);
    this.registerPredicate('cunning', (t) => t.getPersonality('cunning') > 0.4);
    this.registerPredicate('paranoid', (t) => t.getPersonality('paranoid') > 0.4);
    this.registerPredicate('cruel', (t) => t.getPersonality('cruel') > 0.4);
    this.registerPredicate('curious', (t) => t.getPersonality('curious') > 0.4);
    this.registerPredicate('stubborn', (t) => t.getPersonality('stubborn') > 0.4);
    this.registerPredicate('generous', (t) => t.getPersonality('generous') > 0.4);
    this.registerPredicate('vain', (t) => t.getPersonality('vain') > 0.4);
    this.registerPredicate('devout', (t) => t.getPersonality('devout') > 0.4);
    this.registerPredicate('impulsive', (t) => t.getPersonality('impulsive') > 0.4);

    // --- Mood ---
    for (const mood of ['calm', 'content', 'cheerful', 'nervous', 'anxious', 'panicked',
      'angry', 'furious', 'sad', 'grieving', 'suspicious', 'confused', 'resigned'] as const) {
      this.registerPredicate(mood, (t) => t.getMood() === mood);
    }

    // --- Cognitive state ---
    this.registerPredicate('lucid', (t) =>
      t.currentLucidityState === 'lucid' || t.currentLucidityState === 'stable');
    this.registerPredicate('hallucinating', (t) =>
      t.cognitiveProfile.perception === 'augmented' && t.currentLucidityState !== 'lucid');
    this.registerPredicate('fragmented', (t) =>
      t.cognitiveProfile.coherence === 'fragmented');
    this.registerPredicate('dissociative', (t) =>
      t.cognitiveProfile.selfModel === 'fractured');
    this.registerPredicate('belief resistant', (t) =>
      t.cognitiveProfile.beliefFormation === 'resistant');
  }
}
