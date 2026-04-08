/**
 * Fluent character builder (ADR-141)
 *
 * Authors describe characters in words; the builder accumulates state
 * and compiles it into CharacterModelTrait data, event handlers, and
 * state mutation rules.
 *
 * Public interface: CharacterBuilder, TriggerBuilder.
 * Owner context: @sharpee/character
 */

import {
  PersonalityExpr,
  PersonalityTrait,
  parsePersonalityExpr,
  DispositionWord,
  dispositionToValue,
  Mood,
  MOOD_AXES,
  ThreatLevel,
  THREAT_VALUES,
  CognitiveProfile,
  STABLE_COGNITIVE_PROFILE,
  ConfidenceWord,
  FactSource,
  LucidityConfig,
  PerceptionFilterConfig,
  PerceivedEvent,
  CharacterPredicate,
  ICharacterModelData,
} from '@sharpee/world-model';
import { COGNITIVE_PRESETS, CognitivePresetName, isCognitivePreset } from './cognitive-presets';
import { VocabularyExtension } from './vocabulary-extension';
import { PropagationProfile } from './propagation/propagation-types';
import { PropagationOptions, buildPropagationProfile } from './propagation/builder';
import { GoalDef, MovementProfile } from './goals/goal-types';
import { GoalBuilder } from './goals/builder';
import { InfluenceDef, ResistanceDef } from './influence/influence-types';
import { InfluenceBuilder } from './influence/builder';

// ---------------------------------------------------------------------------
// Trigger builder (fluent chain for .on() rules)
// ---------------------------------------------------------------------------

/** A compiled state mutation triggered by an event or condition. */
export interface CompiledTrigger {
  triggerName: string;
  condition?: string;
  mutations: TriggerMutation[];
}

/** A single mutation within a trigger. */
export type TriggerMutation =
  | { type: 'setMood'; mood: Mood | string }
  | { type: 'setDisposition'; entityId: string; word: DispositionWord }
  | { type: 'setThreat'; level: ThreatLevel }
  | { type: 'adjustThreat'; delta: number }
  | { type: 'becomesLucid' };

/**
 * Fluent chain for defining state transitions on triggers.
 *
 * Usage: `builder.on('player threatens').becomes('panicked').feelsAbout('player', 'wary of')`
 */
export class TriggerBuilder {
  private trigger: CompiledTrigger;
  private parentBuilder: CharacterBuilder;

  constructor(triggerName: string, parent: CharacterBuilder) {
    this.trigger = { triggerName, mutations: [] };
    this.parentBuilder = parent;
  }

  /**
   * Add a condition predicate to this trigger.
   *
   * @param predicate - Predicate name that must be true for this trigger to fire
   * @returns this for chaining
   */
  if(predicate: string): TriggerBuilder {
    this.trigger.condition = predicate;
    return this;
  }

  /**
   * Set the NPC's mood when this trigger fires.
   *
   * @param mood - Mood word
   * @returns this for chaining
   */
  becomes(mood: Mood | string): TriggerBuilder {
    this.trigger.mutations.push({ type: 'setMood', mood });
    return this;
  }

  /**
   * Set the NPC's disposition toward an entity when this trigger fires.
   *
   * @param entityId - Target entity
   * @param word - Disposition word
   * @returns this for chaining
   */
  feelsAbout(entityId: string, word: DispositionWord): TriggerBuilder {
    this.trigger.mutations.push({ type: 'setDisposition', entityId, word });
    return this;
  }

  /**
   * Set the NPC's threat level when this trigger fires.
   *
   * @param level - Threat level word or numeric delta prefixed with + or -
   * @returns this for chaining
   */
  shift(dimension: 'threat', level: ThreatLevel): TriggerBuilder {
    this.trigger.mutations.push({ type: 'setThreat', level });
    return this;
  }

  /**
   * Enter a lucid window when this trigger fires.
   *
   * @returns this for chaining
   */
  becomesLucid(): TriggerBuilder {
    this.trigger.mutations.push({ type: 'becomesLucid' });
    return this;
  }

  /**
   * Finalize this trigger and return the parent builder.
   *
   * @returns The parent CharacterBuilder
   */
  done(): CharacterBuilder {
    this.parentBuilder._finalizeTrigger(this.trigger);
    return this.parentBuilder;
  }

  /**
   * Start a new trigger, auto-finalizing this one.
   * Allows chaining `.on()` directly from a trigger without calling `.done()`.
   *
   * @param triggerName - Event type or condition name for the next trigger
   * @returns A new TriggerBuilder
   */
  on(triggerName: string): TriggerBuilder {
    return this.done().on(triggerName);
  }

  /**
   * Compile the builder, auto-finalizing this trigger.
   * Allows calling `.compile()` directly from a trigger chain.
   *
   * @returns Compiled character data
   */
  compile(): CompiledCharacter {
    return this.done().compile();
  }

  /** @internal Get the compiled trigger without finalizing. */
  _getTrigger(): CompiledTrigger {
    return this.trigger;
  }
}

// ---------------------------------------------------------------------------
// Character builder
// ---------------------------------------------------------------------------

/**
 * Fluent builder for defining NPC characters.
 *
 * Accumulates character state declarations and compiles them into
 * CharacterModelTrait constructor data, event handler functions,
 * and state mutation rules.
 */
export class CharacterBuilder {
  private _id: string;
  private _personality: Map<PersonalityTrait | string, number> = new Map();
  private _dispositions: Map<string, number> = new Map();
  private _mood: Mood | string = 'calm';
  private _threat: ThreatLevel = 'safe';
  private _cognitiveProfile: CognitiveProfile = { ...STABLE_COGNITIVE_PROFILE };
  private _knowledge: Map<string, { source: FactSource; confidence: ConfidenceWord; turn: number }> = new Map();
  private _beliefs: Map<string, { strength: ConfidenceWord; resistance: 'none' | 'reinterprets' | 'ignores' }> = new Map();
  private _goals: Map<string, number> = new Map();
  private _lucidityConfig?: LucidityConfig;
  private _perceptionFilters?: PerceptionFilterConfig;
  private _perceivedEvents: Map<string, PerceivedEvent> = new Map();
  private _triggers: CompiledTrigger[] = [];
  private _customPredicates: Map<string, CharacterPredicate> = new Map();
  private _activeTriggerBuilder?: TriggerBuilder;
  private _vocabExtension?: VocabularyExtension;
  private _propagationProfile?: PropagationProfile;
  private _movementProfile?: MovementProfile;
  private _goalDefs: GoalDef[] = [];
  private _activeGoalBuilder?: GoalBuilder<CharacterBuilder>;
  private _influenceDefs: InfluenceDef[] = [];
  private _resistanceDefs: ResistanceDef[] = [];
  private _activeInfluenceBuilder?: InfluenceBuilder<CharacterBuilder>;

  /**
   * Create a new character builder.
   *
   * @param id - Character identifier (matches the NPC entity ID)
   */
  constructor(id: string) {
    this._id = id;
  }

  /** The character ID. */
  get id(): string {
    return this._id;
  }

  // =========================================================================
  // Personality
  // =========================================================================

  /**
   * Set personality traits.
   *
   * @param traits - Personality expressions like 'very honest', 'cowardly'
   * @returns this for chaining
   */
  personality(...traits: (PersonalityExpr | string)[]): CharacterBuilder {
    for (const expr of traits) {
      const [trait, value] = parsePersonalityExpr(expr as PersonalityExpr);
      this._personality.set(trait, value);
    }
    return this;
  }

  // =========================================================================
  // Disposition shortcuts
  // =========================================================================

  /**
   * Set disposition toward an entity using a word.
   *
   * @param entityId - Target entity
   * @param word - Disposition word
   * @returns this for chaining
   */
  dispositionToward(entityId: string, word: DispositionWord): CharacterBuilder {
    this._dispositions.set(entityId, dispositionToValue(word));
    return this;
  }

  /** Shorthand: set disposition toward entity to 'devoted to'. */
  loyalTo(entityId: string): CharacterBuilder {
    return this.dispositionToward(entityId, 'devoted to');
  }

  /** Shorthand: set disposition toward entity to 'likes'. */
  likes(entityId: string): CharacterBuilder {
    return this.dispositionToward(entityId, 'likes');
  }

  /** Shorthand: set disposition toward entity to 'trusts'. */
  trusts(entityId: string): CharacterBuilder {
    return this.dispositionToward(entityId, 'trusts');
  }

  /** Shorthand: set disposition toward entity to 'dislikes'. */
  dislikes(entityId: string): CharacterBuilder {
    return this.dispositionToward(entityId, 'dislikes');
  }

  /** Shorthand: set disposition toward entity to 'wary of'. */
  distrusts(entityId: string): CharacterBuilder {
    return this.dispositionToward(entityId, 'wary of');
  }

  // =========================================================================
  // Mood
  // =========================================================================

  /**
   * Set the starting mood.
   *
   * @param word - Mood word
   * @returns this for chaining
   */
  mood(word: Mood | string): CharacterBuilder {
    this._mood = word;
    return this;
  }

  // =========================================================================
  // Threat
  // =========================================================================

  /**
   * Set the starting threat level.
   *
   * @param level - Threat level word
   * @returns this for chaining
   */
  threat(level: ThreatLevel): CharacterBuilder {
    this._threat = level;
    return this;
  }

  // =========================================================================
  // Cognitive profile
  // =========================================================================

  /**
   * Set the cognitive profile from a named preset or partial override.
   *
   * @param profile - A preset name string or partial CognitiveProfile object
   * @returns this for chaining
   */
  cognitiveProfile(profile: CognitivePresetName | string | Partial<CognitiveProfile>): CharacterBuilder {
    if (typeof profile === 'string') {
      if (isCognitivePreset(profile)) {
        this._cognitiveProfile = { ...COGNITIVE_PRESETS[profile] };
      } else {
        throw new Error(`Unknown cognitive preset: '${profile}'. Available: ${Object.keys(COGNITIVE_PRESETS).join(', ')}`);
      }
    } else {
      this._cognitiveProfile = { ...STABLE_COGNITIVE_PROFILE, ...profile };
    }
    return this;
  }

  // =========================================================================
  // Knowledge
  // =========================================================================

  /**
   * Declare that the NPC knows about a topic.
   *
   * @param topic - What the NPC knows about
   * @param opts - Optional: how they know and how confident
   * @returns this for chaining
   */
  knows(topic: string, opts?: { witnessed?: boolean; confidence?: ConfidenceWord }): CharacterBuilder {
    this._knowledge.set(topic, {
      source: opts?.witnessed ? 'witnessed' : 'assumed',
      confidence: opts?.confidence ?? 'believes',
      turn: 0,
    });
    return this;
  }

  // =========================================================================
  // Beliefs
  // =========================================================================

  /**
   * Declare a belief the NPC holds (may differ from facts).
   *
   * @param topic - What the belief is about
   * @param opts - Strength and resistance
   * @returns this for chaining
   */
  believes(topic: string, opts?: { strength?: ConfidenceWord; resistance?: 'none' | 'reinterprets' | 'ignores' }): CharacterBuilder {
    this._beliefs.set(topic, {
      strength: opts?.strength ?? 'believes',
      resistance: opts?.resistance ?? 'none',
    });
    return this;
  }

  // =========================================================================
  // Goals (ADR-145)
  // =========================================================================

  /**
   * Define a goal with a fluent builder chain.
   * Returns a GoalBuilder; call .done() to return to this builder.
   *
   * For simple goals (legacy compatibility), pass a numeric priority
   * as the second argument.
   *
   * @param id - Goal identifier
   * @param priority - Optional numeric priority (legacy shorthand)
   * @returns GoalBuilder for fluent chaining, or this if priority provided
   */
  goal(id: string, priority?: number): GoalBuilder<CharacterBuilder> | CharacterBuilder {
    if (priority !== undefined) {
      // Legacy shorthand: .goal(id, priority)
      this._goals.set(id, priority);
      return this;
    }

    // Finalize any pending goal builder
    this._finalizePendingGoalBuilder();

    const gb = new GoalBuilder<CharacterBuilder>(id, this, (def) => {
      this._goalDefs.push(def);
      this._activeGoalBuilder = undefined;
    });
    this._activeGoalBuilder = gb;
    return gb;
  }

  /** @internal Finalize any pending goal builder that wasn't explicitly done(). */
  private _finalizePendingGoalBuilder(): void {
    if (this._activeGoalBuilder) {
      this._goalDefs.push(this._activeGoalBuilder._buildDef());
      this._activeGoalBuilder = undefined;
    }
  }

  // =========================================================================
  // Lucidity
  // =========================================================================

  /**
   * Configure lucidity windows.
   *
   * @param config - Lucidity window configuration
   * @returns this for chaining
   */
  lucidity(config: LucidityConfig): CharacterBuilder {
    this._lucidityConfig = config;
    return this;
  }

  // =========================================================================
  // Perception
  // =========================================================================

  /**
   * Configure perception filters (for filtered perception).
   *
   * @param config - Categories to miss and amplify
   * @returns this for chaining
   */
  filters(config: PerceptionFilterConfig): CharacterBuilder {
    this._perceptionFilters = config;
    return this;
  }

  /**
   * Define a hallucinated perceived event (for augmented perception).
   *
   * @param topic - Topic of the hallucinated event
   * @param opts - When it occurs and how it's stored
   * @returns this for chaining
   */
  perceives(topic: string, opts: PerceivedEvent): CharacterBuilder {
    this._perceivedEvents.set(topic, opts);
    return this;
  }

  // =========================================================================
  // Triggers (.on() chains)
  // =========================================================================

  /**
   * Begin a trigger chain for a named event or condition.
   *
   * @param triggerName - Event type or condition name
   * @returns A TriggerBuilder for fluent chaining
   */
  on(triggerName: string): TriggerBuilder {
    // Finalize any pending trigger builder
    this._finalizePendingTrigger();

    const tb = new TriggerBuilder(triggerName, this);
    this._activeTriggerBuilder = tb;
    return tb;
  }

  /** @internal Called by TriggerBuilder.done() to register and clear the active trigger. */
  _finalizeTrigger(trigger: CompiledTrigger): void {
    this._triggers.push(trigger);
    this._activeTriggerBuilder = undefined;
  }

  /** @internal Kept for backward compat — delegates to _finalizeTrigger. */
  _addTrigger(trigger: CompiledTrigger): void {
    this._finalizeTrigger(trigger);
  }

  /** @internal Finalize any pending trigger builder that wasn't explicitly done(). */
  private _finalizePendingTrigger(): void {
    if (this._activeTriggerBuilder) {
      this._finalizeTrigger(this._activeTriggerBuilder._getTrigger());
    }
  }

  // =========================================================================
  // Custom predicates
  // =========================================================================

  /**
   * Register a custom predicate function.
   *
   * @param name - Predicate name
   * @param fn - Function that evaluates against CharacterModelTrait state
   * @returns this for chaining
   */
  definePredicate(name: string, fn: CharacterPredicate): CharacterBuilder {
    this._customPredicates.set(name, fn);
    return this;
  }

  // =========================================================================
  // Vocabulary extension
  // =========================================================================

  /**
   * Attach a vocabulary extension for story-specific words.
   *
   * @param ext - VocabularyExtension instance
   * @returns this for chaining
   */
  withVocabulary(ext: VocabularyExtension): CharacterBuilder {
    this._vocabExtension = ext;
    return this;
  }

  // =========================================================================
  // Propagation (ADR-144)
  // =========================================================================

  /**
   * Define propagation behavior for this NPC.
   *
   * @param opts - Propagation profile options
   * @returns this for chaining
   */
  propagation(opts: PropagationOptions): CharacterBuilder {
    this._propagationProfile = buildPropagationProfile(opts);
    return this;
  }

  // =========================================================================
  // Movement (ADR-145)
  // =========================================================================

  /**
   * Define the NPC's movement profile — which rooms they know and can access.
   *
   * @param opts - Movement profile (knows, access)
   * @returns this for chaining
   */
  movement(opts: MovementProfile): CharacterBuilder {
    this._movementProfile = {
      knows: opts.knows === 'all' ? 'all' : [...opts.knows],
      access: opts.access === 'all' ? 'all' : [...opts.access],
    };
    return this;
  }

  // =========================================================================
  // Influence (ADR-146)
  // =========================================================================

  /**
   * Define an influence this NPC exerts.
   * Returns an InfluenceBuilder; call .done() to return to this builder.
   *
   * @param name - Author-defined influence name (e.g., 'seduction', 'intimidation')
   * @returns InfluenceBuilder for fluent chaining
   */
  influence(name: string): InfluenceBuilder<CharacterBuilder> {
    // Finalize any pending influence builder
    this._finalizePendingInfluenceBuilder();

    const ib = new InfluenceBuilder<CharacterBuilder>(name, this, (def) => {
      this._influenceDefs.push(def);
      this._activeInfluenceBuilder = undefined;
    });
    this._activeInfluenceBuilder = ib;
    return ib;
  }

  /**
   * Declare resistance to an influence.
   *
   * @param influenceName - The influence name to resist
   * @param opts - Optional except conditions for conditional vulnerability
   * @returns this for chaining
   */
  resistsInfluence(influenceName: string, opts?: { except: string[] }): CharacterBuilder {
    this._resistanceDefs.push({
      influenceName,
      except: opts?.except ? [...opts.except] : undefined,
    });
    return this;
  }

  /** @internal Finalize any pending influence builder. */
  private _finalizePendingInfluenceBuilder(): void {
    if (this._activeInfluenceBuilder) {
      this._influenceDefs.push(this._activeInfluenceBuilder._buildDef());
      this._activeInfluenceBuilder = undefined;
    }
  }

  // =========================================================================
  // Compilation
  // =========================================================================

  /**
   * Compile the builder state into CharacterModelTrait constructor data,
   * compiled event handlers, and custom predicates.
   *
   * @returns Compiled character data
   */
  compile(): CompiledCharacter {
    // Finalize any pending trigger, goal, or influence builder
    this._finalizePendingTrigger();
    this._finalizePendingGoalBuilder();
    this._finalizePendingInfluenceBuilder();

    // Build personality record
    const personality: Record<string, number> = {};
    for (const [trait, value] of this._personality) {
      personality[trait] = value;
    }

    // Build dispositions record
    const dispositions: Record<string, number> = {};
    for (const [entityId, value] of this._dispositions) {
      dispositions[entityId] = value;
    }

    // Resolve mood — check custom vocabulary if not a platform mood
    let moodWord = this._mood as Mood;
    let moodValence: number | undefined;
    let moodArousal: number | undefined;

    if (!(this._mood in MOOD_AXES)) {
      if (this._vocabExtension?.hasCustomMood(this._mood)) {
        const custom = this._vocabExtension.getCustomMood(this._mood)!;
        moodValence = custom.valence;
        moodArousal = custom.arousal;
        moodWord = undefined as unknown as Mood; // will use raw axes
      }
    }

    // Build knowledge record
    const knowledge: Record<string, { source: FactSource; confidence: ConfidenceWord; turnLearned: number }> = {};
    for (const [topic, fact] of this._knowledge) {
      knowledge[topic] = { source: fact.source, confidence: fact.confidence, turnLearned: fact.turn };
    }

    // Build beliefs record
    const beliefs: Record<string, { strength: ConfidenceWord; resistance: 'none' | 'reinterprets' | 'ignores' }> = {};
    for (const [topic, belief] of this._beliefs) {
      beliefs[topic] = belief;
    }

    // Build goals array
    const goals = Array.from(this._goals.entries())
      .map(([id, priority]) => ({ id, priority }))
      .sort((a, b) => b.priority - a.priority);

    // Build perceived events
    const perceivedEvents: Record<string, PerceivedEvent> = {};
    for (const [topic, pe] of this._perceivedEvents) {
      perceivedEvents[topic] = pe;
    }

    // Assemble trait data
    const traitData: ICharacterModelData = {
      personality: personality as Record<PersonalityTrait, number>,
      dispositions,
      ...(moodValence !== undefined
        ? { moodValence, moodArousal: moodArousal! }
        : { mood: moodWord }),
      threat: this._threat,
      cognitiveProfile: this._cognitiveProfile,
      knowledge,
      beliefs,
      goals,
      lucidityConfig: this._lucidityConfig,
      currentLucidityState: this._lucidityConfig?.baseline,
      perceptionFilters: this._perceptionFilters,
      perceivedEvents,
    };

    // Collect custom predicates
    const customPredicates = new Map(this._customPredicates);

    return {
      id: this._id,
      traitData,
      triggers: [...this._triggers],
      customPredicates,
      propagationProfile: this._propagationProfile,
      movementProfile: this._movementProfile,
      goalDefs: this._goalDefs.length > 0 ? [...this._goalDefs] : undefined,
      influenceDefs: this._influenceDefs.length > 0 ? [...this._influenceDefs] : undefined,
      resistanceDefs: this._resistanceDefs.length > 0 ? [...this._resistanceDefs] : undefined,
    };
  }
}

// ---------------------------------------------------------------------------
// Compiled output
// ---------------------------------------------------------------------------

/** The output of CharacterBuilder.compile(). */
export interface CompiledCharacter {
  /** Character ID. */
  id: string;

  /** Data for constructing CharacterModelTrait. */
  traitData: ICharacterModelData;

  /** Compiled trigger rules for event-driven state mutations. */
  triggers: CompiledTrigger[];

  /** Custom predicates to register on the trait after construction. */
  customPredicates: Map<string, CharacterPredicate>;

  /** Propagation profile (ADR-144). */
  propagationProfile?: PropagationProfile;

  /** Movement profile (ADR-145). */
  movementProfile?: MovementProfile;

  /** Rich goal definitions (ADR-145). */
  goalDefs?: GoalDef[];

  /** Influence definitions (ADR-146). */
  influenceDefs?: InfluenceDef[];

  /** Resistance definitions (ADR-146). */
  resistanceDefs?: ResistanceDef[];
}
