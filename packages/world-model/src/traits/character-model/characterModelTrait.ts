/**
 * Character model trait (ADR-141, ADR-310, ADR-318)
 *
 * Rich internal state for NPCs: personality, disposition, mood, threat,
 * cognitive profile, knowledge, valued beliefs, goals, and the normative
 * layer (temperaments, principles, obligations, honor, conscience pressure,
 * the lie ledger). Opt-in — only NPCs that need behavioral depth carry this
 * trait alongside NpcTrait.
 *
 * Persistence rule (ADR-310 D17): everything the model remembers rides this
 * trait — no character-model runtime state may live in module-level service
 * state or closures. The serialized shape carries `schemaVersion`; later
 * shape changes add a versioned reader, never a hard break.
 *
 * Public interface: ICharacterModelData, CharacterModelTrait,
 *   CharacterPredicate, CHARACTER_MODEL_SCHEMA_VERSION.
 * Owner context: world-model / character-model trait
 */

import { ITrait } from '../trait.js';
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
  ValuedBelief,
  ResistanceMode,
  Goal,
  GoalRuntimeState,
  InfluenceInForce,
  TemperamentBinding,
  PrincipleDecl,
  ObligationDecl,
  HonorDecl,
  PressureState,
  PressureBand,
  LedgerEntry,
  LucidityConfig,
  PerceptionFilterConfig,
  PerceivedEvent,
} from './character-vocabulary.js';

/** Current serialized shape version (ADR-310 D17 format discipline). */
export const CHARACTER_MODEL_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Data interface
// ---------------------------------------------------------------------------

/** Serializable data for constructing a CharacterModelTrait. */
export interface ICharacterModelData {
  /** Serialized shape version. Absent means pre-versioning data (treated as current). */
  schemaVersion?: number;

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

  /** Knowledge base: topic -> valueless fact (`knows`). */
  knowledge?: Record<string, Fact>;

  /** Valued beliefs: factId -> what this character thinks the value is (`thinks`, ADR-310 D14). */
  factBeliefs?: Record<string, ValuedBelief>;

  /** Propagation record: listenerId -> topics/factIds this character has told them (ADR-310 D17). */
  told?: Record<string, string[]>;

  /** Goals ordered by priority. */
  goals?: Goal[];

  /** Per-goal mutable pursuit state: goalId -> runtime state (ADR-310 D17). */
  goalState?: Record<string, GoalRuntimeState>;

  /** Influence effects currently applied to this character (ADR-310 D17). */
  influencesInForce?: InfluenceInForce[];

  /** Temperament bindings — static or state-bound orderings (ADR-318 D3). */
  temperaments?: TemperamentBinding[];

  /** Principle lines — `never` categories with scope/except (ADR-318 D4). */
  principles?: PrincipleDecl[];

  /** Obligation lines — compile to standing goals (ADR-318 D5). */
  obligations?: ObligationDecl[];

  /** Honor declaration — audience scope and bound face-acts (ADR-318 D7). */
  honor?: HonorDecl;

  /** Conscience pressure: curve value and band (ADR-318 D8). */
  pressure?: PressureState;

  /** Pre-story guilt seeds — topics must be held (compile-checked) (ADR-318 D8). */
  burdenedBy?: string[];

  /** The lie ledger: own claims and promises per audience (ADR-318 D9). */
  ledger?: LedgerEntry[];

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
 * Transient per-instance predicate registries (ADR-310 D17). A WeakMap
 * keyed by instance — never an own field — so nothing about predicates
 * ever reaches the serialized shape, and entries die with their
 * instances. Holds registrations only (platform + load-time), never
 * mutable runtime state.
 */
const PREDICATE_STORE = new WeakMap<CharacterModelTrait, Map<string, CharacterPredicate>>();

/**
 * CharacterModelTrait — rich internal state for NPCs.
 *
 * All state is stored as plain properties so JSON serialization survives.
 * Predicate functions live in a transient module-level store (never an
 * own field), lazily rebuilt — platform predicates included — on first
 * use after construction OR rehydration.
 */
export class CharacterModelTrait implements ITrait {
  static readonly type = 'characterModel' as const;
  readonly type = 'characterModel' as const;

  // -- Serialized shape version (ADR-310 D17) --
  schemaVersion: number;

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

  // -- Knowledge (valueless held topics) --
  knowledge: Record<string, Fact>;

  // -- Valued beliefs (ADR-310 D14): factId -> ValuedBelief --
  factBeliefs: Record<string, ValuedBelief>;

  // -- Propagation told-record (ADR-310 D17): listenerId -> topics --
  told: Record<string, string[]>;

  // -- Goals --
  goals: Goal[];

  // -- Per-goal pursuit state (ADR-310 D17): goalId -> runtime state --
  goalState: Record<string, GoalRuntimeState>;

  // -- Influence effects applied to this character (ADR-310 D17) --
  influencesInForce: InfluenceInForce[];

  // -- Normative layer (ADR-318) --
  temperaments: TemperamentBinding[];
  principles: PrincipleDecl[];
  obligations: ObligationDecl[];
  honor?: HonorDecl;
  pressure: PressureState;
  burdenedBy: string[];
  ledger: LedgerEntry[];

  // -- Lucidity --
  lucidityConfig?: LucidityConfig;
  currentLucidityState: string;
  lucidityWindowTurns: number;

  // -- Perception --
  perceptionFilters?: PerceptionFilterConfig;
  perceivedEvents: Record<string, PerceivedEvent>;

  constructor(data: ICharacterModelData = {}) {
    // Schema version — absent input means pre-versioning data; stamp current.
    this.schemaVersion = CHARACTER_MODEL_SCHEMA_VERSION;

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

    // Valued beliefs
    this.factBeliefs = data.factBeliefs ? { ...data.factBeliefs } : {};

    // Told-record
    this.told = data.told
      ? Object.fromEntries(Object.entries(data.told).map(([k, v]) => [k, [...v]]))
      : {};

    // Goals
    this.goals = data.goals ? [...data.goals] : [];

    // Goal runtime state
    this.goalState = data.goalState ? { ...data.goalState } : {};

    // Influences in force
    this.influencesInForce = data.influencesInForce ? [...data.influencesInForce] : [];

    // Normative layer (ADR-318)
    this.temperaments = data.temperaments ? [...data.temperaments] : [];
    this.principles = data.principles ? [...data.principles] : [];
    this.obligations = data.obligations ? [...data.obligations] : [];
    this.honor = data.honor;
    this.pressure = data.pressure ? { ...data.pressure } : { value: 0, band: 'clear' };
    this.burdenedBy = data.burdenedBy ? [...data.burdenedBy] : [];
    this.ledger = data.ledger ? data.ledger.map(e => ({ ...e })) : [];

    // Lucidity
    this.lucidityConfig = data.lucidityConfig;
    this.currentLucidityState = data.currentLucidityState ?? (data.lucidityConfig?.baseline ?? 'stable');
    this.lucidityWindowTurns = data.lucidityWindowTurns ?? -1;

    // Perception
    this.perceptionFilters = data.perceptionFilters;
    this.perceivedEvents = data.perceivedEvents ? { ...data.perceivedEvents } : {};

    // Predicates are NOT initialized here: they live in the transient
    // module-level store, built lazily on first use — the rehydration path
    // (Object.create + Object.assign, no constructor) gets identical
    // platform predicates that way (ADR-310 D17: the serialized shape
    // carries data only; a restore rebuilds everything transient).
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
   * @param resistance - Optional resistance to counter-evidence (the fold of
   *   the retired standalone belief map, ADR-310 D14)
   */
  addFact(topic: string, source: FactSource, confidence: ConfidenceWord, turn: number,
    resistance?: ResistanceMode): void {
    this.knowledge[topic] = resistance
      ? { source, confidence, turnLearned: turn, resistance }
      : { source, confidence, turnLearned: turn };
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
  // Valued beliefs (ADR-310 D14)
  // =========================================================================

  /**
   * Set what this character thinks a declared fact's value is (`thinks`).
   * Overwrites any prior belief about the same fact — a belief that changes
   * its mind is the point of the value slot.
   *
   * @param factId - The fact declaration's id
   * @param belief - Value, confidence, source, turn, and resistance
   */
  setFactBelief(factId: string, belief: ValuedBelief): void {
    this.factBeliefs[factId] = { ...belief };
  }

  /**
   * Check whether this character holds a valued belief about a fact.
   *
   * @param factId - The fact declaration's id
   * @returns True if a belief exists
   */
  hasFactBelief(factId: string): boolean {
    return factId in this.factBeliefs;
  }

  /**
   * Get this character's valued belief about a fact.
   *
   * @param factId - The fact declaration's id
   * @returns The belief, or undefined
   */
  getFactBelief(factId: string): ValuedBelief | undefined {
    return this.factBeliefs[factId];
  }

  // =========================================================================
  // Told-record (ADR-310 D10/D17)
  // =========================================================================

  /**
   * Check whether this character has already told a listener about a topic.
   *
   * @param listenerId - The listener entity id
   * @param topic - Topic or factId
   * @returns True if already told
   */
  hasTold(listenerId: string, topic: string): boolean {
    return this.told[listenerId]?.includes(topic) ?? false;
  }

  /**
   * Record that this character told a listener about a topic. Idempotent.
   *
   * @param listenerId - The listener entity id
   * @param topic - Topic or factId
   */
  recordTold(listenerId: string, topic: string): void {
    const topics = this.told[listenerId] ?? (this.told[listenerId] = []);
    if (!topics.includes(topic)) topics.push(topic);
  }

  // =========================================================================
  // Goal runtime state (ADR-310 D17)
  // =========================================================================

  /**
   * Get the mutable pursuit state for a goal, defaulting to step zero.
   *
   * @param goalId - Goal identifier
   * @returns The runtime state (a live reference; mutations persist)
   */
  getGoalState(goalId: string): GoalRuntimeState {
    return this.goalState[goalId]
      ?? (this.goalState[goalId] = { active: false, currentStep: 0, paused: false, interrupted: false });
  }

  // =========================================================================
  // Influences in force (ADR-310 D17)
  // =========================================================================

  /**
   * Record an influence effect applied to this character.
   *
   * @param effect - The effect record (influencer, mutations, duration)
   */
  addInfluenceInForce(effect: InfluenceInForce): void {
    this.influencesInForce.push({ ...effect });
  }

  // =========================================================================
  // Normative layer (ADR-318)
  // =========================================================================

  /**
   * Resolve the live temperament binding for the current entity states.
   * A state-bound binding wins over an unconditional one; two live bindings
   * at the same specificity is a compile-time diagnostic, so runtime takes
   * the first (D3).
   *
   * @param activeStates - The owner entity's current state names
   * @returns The live binding's temperament name, or undefined
   */
  activeTemperament(activeStates: readonly string[]): string | undefined {
    const bound = this.temperaments.find(t => t.while !== undefined && activeStates.includes(t.while));
    if (bound) return bound.name;
    return this.temperaments.find(t => t.while === undefined)?.name;
  }

  /**
   * Set conscience pressure. Band computation is runtime-owned (the curve
   * lives in @sharpee/character); the trait stores both so a restore
   * needs no recomputation (ADR-318 D12).
   *
   * @param value - The curve value (>= 0)
   * @param band - The derived band
   */
  setPressure(value: number, band: PressureBand): void {
    this.pressure.value = Math.max(0, value);
    this.pressure.band = band;
  }

  /**
   * Append a ledger entry (a claim or promise minted this turn, ADR-318 D9).
   *
   * @param entry - The entry to mint
   */
  mintLedgerEntry(entry: LedgerEntry): void {
    this.ledger.push({ ...entry });
  }

  /**
   * Get the active pin for an audience and fact: the most recent pinned
   * claim, which the dialogue selector must hold consistent (ADR-318 D9).
   *
   * @param audience - The audience entity id
   * @param factId - The fact the claim is about
   * @returns The pinned entry, or undefined
   */
  getActivePin(audience: string, factId: string): LedgerEntry | undefined {
    for (let i = this.ledger.length - 1; i >= 0; i--) {
      const e = this.ledger[i];
      if (e.pinned && e.kind === 'claim' && e.audience === audience && e.factId === factId) {
        return e;
      }
    }
    return undefined;
  }

  /**
   * Release ledger pins — on an authored break or a `breaking` discharge
   * (ADR-318 D8/D9). With no filter, every pin releases.
   *
   * @param filter - Optional audience and/or fact to narrow the release
   */
  unpinLedger(filter: { audience?: string; factId?: string } = {}): void {
    for (const e of this.ledger) {
      if (filter.audience !== undefined && e.audience !== filter.audience) continue;
      if (filter.factId !== undefined && e.factId !== filter.factId) continue;
      e.pinned = false;
    }
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
   * This instance's predicate registry — transient, never serialized.
   * Lazily built (platform predicates included) on first use, so a
   * rehydrated instance (Object.create path, no constructor) behaves
   * identically to a constructed one. Functions cannot ride a save;
   * anything here is platform- or load-time-registered by definition.
   */
  private predicateMap(): Map<string, CharacterPredicate> {
    let map = PREDICATE_STORE.get(this);
    if (!map) {
      map = new Map();
      PREDICATE_STORE.set(this, map);
      this.registerPlatformPredicates();
    }
    return map;
  }

  /**
   * Register a named predicate function.
   *
   * @param name - Predicate name (e.g., 'trusts player', 'threatened')
   * @param fn - Function that evaluates against this trait's state
   */
  registerPredicate(name: string, fn: CharacterPredicate): void {
    this.predicateMap().set(name, fn);
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

    const fn = this.predicateMap().get(predicate);
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
    return this.predicateMap().has(name);
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
    for (const word of ['cowardly', 'honest', 'loyal', 'cunning', 'paranoid', 'cruel',
      'curious', 'stubborn', 'generous', 'vain', 'devout', 'impulsive',
      'remorseful', 'untroubled'] as const) {
      this.registerPredicate(word, (t) => t.getPersonality(word) > 0.4);
    }

    // --- Mood ---
    for (const mood of ['calm', 'content', 'cheerful', 'nervous', 'anxious', 'panicked',
      'angry', 'furious', 'sad', 'grieving', 'suspicious', 'confused', 'resigned'] as const) {
      this.registerPredicate(mood, (t) => t.getMood() === mood);
    }

    // --- Conscience pressure bands (ADR-318 D8: gate exactly as mood words do) ---
    for (const band of ['clear', 'burdened', 'breaking'] as const) {
      this.registerPredicate(band, (t) => t.pressure.band === band);
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
