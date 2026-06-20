# @sharpee/character

NPC/character authoring — builders, applyCharacter, character model.

---

### character-builder

```typescript
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
import { PersonalityExpr, DispositionWord, Mood, ThreatLevel, CognitiveProfile, ConfidenceWord, LucidityConfig, PerceptionFilterConfig, PerceivedEvent, CharacterPredicate, ICharacterModelData } from '@sharpee/world-model';
import { CognitivePresetName } from './cognitive-presets';
import { VocabularyExtension } from './vocabulary-extension';
import { PropagationProfile } from './propagation/propagation-types';
import { PropagationOptions } from './propagation/builder';
import { GoalDef, MovementProfile } from './goals/goal-types';
import { GoalBuilder } from './goals/builder';
import { InfluenceDef, ResistanceDef } from './influence/influence-types';
import { InfluenceBuilder } from './influence/builder';
/** A compiled state mutation triggered by an event or condition. */
export interface CompiledTrigger {
    triggerName: string;
    condition?: string;
    mutations: TriggerMutation[];
}
/** A single mutation within a trigger. */
export type TriggerMutation = {
    type: 'setMood';
    mood: Mood | string;
} | {
    type: 'setDisposition';
    entityId: string;
    word: DispositionWord;
} | {
    type: 'setThreat';
    level: ThreatLevel;
} | {
    type: 'adjustThreat';
    delta: number;
} | {
    type: 'becomesLucid';
};
/**
 * Fluent chain for defining state transitions on triggers.
 *
 * Usage: `builder.on('player threatens').becomes('panicked').feelsAbout('player', 'wary of')`
 */
export declare class TriggerBuilder {
    private trigger;
    private parentBuilder;
    constructor(triggerName: string, parent: CharacterBuilder);
    /**
     * Add a condition predicate to this trigger.
     *
     * @param predicate - Predicate name that must be true for this trigger to fire
     * @returns this for chaining
     */
    if(predicate: string): TriggerBuilder;
    /**
     * Set the NPC's mood when this trigger fires.
     *
     * @param mood - Mood word
     * @returns this for chaining
     */
    becomes(mood: Mood | string): TriggerBuilder;
    /**
     * Set the NPC's disposition toward an entity when this trigger fires.
     *
     * @param entityId - Target entity
     * @param word - Disposition word
     * @returns this for chaining
     */
    feelsAbout(entityId: string, word: DispositionWord): TriggerBuilder;
    /**
     * Set the NPC's threat level when this trigger fires.
     *
     * @param level - Threat level word or numeric delta prefixed with + or -
     * @returns this for chaining
     */
    shift(dimension: 'threat', level: ThreatLevel): TriggerBuilder;
    /**
     * Enter a lucid window when this trigger fires.
     *
     * @returns this for chaining
     */
    becomesLucid(): TriggerBuilder;
    /**
     * Finalize this trigger and return the parent builder.
     *
     * @returns The parent CharacterBuilder
     */
    done(): CharacterBuilder;
    /**
     * Start a new trigger, auto-finalizing this one.
     * Allows chaining `.on()` directly from a trigger without calling `.done()`.
     *
     * @param triggerName - Event type or condition name for the next trigger
     * @returns A new TriggerBuilder
     */
    on(triggerName: string): TriggerBuilder;
    /**
     * Compile the builder, auto-finalizing this trigger.
     * Allows calling `.compile()` directly from a trigger chain.
     *
     * @returns Compiled character data
     */
    compile(): CompiledCharacter;
    /** @internal Get the compiled trigger without finalizing. */
    _getTrigger(): CompiledTrigger;
}
/**
 * Fluent builder for defining NPC characters.
 *
 * Accumulates character state declarations and compiles them into
 * CharacterModelTrait constructor data, event handler functions,
 * and state mutation rules.
 */
export declare class CharacterBuilder {
    private _id;
    private _personality;
    private _dispositions;
    private _mood;
    private _threat;
    private _cognitiveProfile;
    private _knowledge;
    private _beliefs;
    private _goals;
    private _lucidityConfig?;
    private _perceptionFilters?;
    private _perceivedEvents;
    private _triggers;
    private _customPredicates;
    private _activeTriggerBuilder?;
    private _vocabExtension?;
    private _propagationProfile?;
    private _movementProfile?;
    private readonly _goalDefs;
    private _activeGoalBuilder?;
    private readonly _influenceDefs;
    private readonly _resistanceDefs;
    private _activeInfluenceBuilder?;
    /**
     * Create a new character builder.
     *
     * @param id - Character identifier (matches the NPC entity ID)
     */
    constructor(id: string);
    /** The character ID. */
    get id(): string;
    /**
     * Set personality traits.
     *
     * @param traits - Personality expressions like 'very honest', 'cowardly'
     * @returns this for chaining
     */
    personality(...traits: (PersonalityExpr | string)[]): CharacterBuilder;
    /**
     * Set disposition toward an entity using a word.
     *
     * @param entityId - Target entity
     * @param word - Disposition word
     * @returns this for chaining
     */
    dispositionToward(entityId: string, word: DispositionWord): CharacterBuilder;
    /** Shorthand: set disposition toward entity to 'devoted to'. */
    loyalTo(entityId: string): CharacterBuilder;
    /** Shorthand: set disposition toward entity to 'likes'. */
    likes(entityId: string): CharacterBuilder;
    /** Shorthand: set disposition toward entity to 'trusts'. */
    trusts(entityId: string): CharacterBuilder;
    /** Shorthand: set disposition toward entity to 'dislikes'. */
    dislikes(entityId: string): CharacterBuilder;
    /** Shorthand: set disposition toward entity to 'wary of'. */
    distrusts(entityId: string): CharacterBuilder;
    /**
     * Set the starting mood.
     *
     * @param word - Mood word
     * @returns this for chaining
     */
    mood(word: Mood | string): CharacterBuilder;
    /**
     * Set the starting threat level.
     *
     * @param level - Threat level word
     * @returns this for chaining
     */
    threat(level: ThreatLevel): CharacterBuilder;
    /**
     * Set the cognitive profile from a named preset or partial override.
     *
     * @param profile - A preset name string or partial CognitiveProfile object
     * @returns this for chaining
     */
    cognitiveProfile(profile: CognitivePresetName | string | Partial<CognitiveProfile>): CharacterBuilder;
    /**
     * Declare that the NPC knows about a topic.
     *
     * @param topic - What the NPC knows about
     * @param opts - Optional: how they know and how confident
     * @returns this for chaining
     */
    knows(topic: string, opts?: {
        witnessed?: boolean;
        confidence?: ConfidenceWord;
    }): CharacterBuilder;
    /**
     * Declare a belief the NPC holds (may differ from facts).
     *
     * @param topic - What the belief is about
     * @param opts - Strength and resistance
     * @returns this for chaining
     */
    believes(topic: string, opts?: {
        strength?: ConfidenceWord;
        resistance?: 'none' | 'reinterprets' | 'ignores';
    }): CharacterBuilder;
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
    goal(id: string, priority?: number): GoalBuilder<CharacterBuilder> | CharacterBuilder;
    /** @internal Finalize any pending goal builder that wasn't explicitly done(). */
    private _finalizePendingGoalBuilder;
    /**
     * Configure lucidity windows.
     *
     * @param config - Lucidity window configuration
     * @returns this for chaining
     */
    lucidity(config: LucidityConfig): CharacterBuilder;
    /**
     * Configure perception filters (for filtered perception).
     *
     * @param config - Categories to miss and amplify
     * @returns this for chaining
     */
    filters(config: PerceptionFilterConfig): CharacterBuilder;
    /**
     * Define a hallucinated perceived event (for augmented perception).
     *
     * @param topic - Topic of the hallucinated event
     * @param opts - When it occurs and how it's stored
     * @returns this for chaining
     */
    perceives(topic: string, opts: PerceivedEvent): CharacterBuilder;
    /**
     * Begin a trigger chain for a named event or condition.
     *
     * @param triggerName - Event type or condition name
     * @returns A TriggerBuilder for fluent chaining
     */
    on(triggerName: string): TriggerBuilder;
    /** @internal Called by TriggerBuilder.done() to register and clear the active trigger. */
    _finalizeTrigger(trigger: CompiledTrigger): void;
    /** @internal Kept for backward compat — delegates to _finalizeTrigger. */
    _addTrigger(trigger: CompiledTrigger): void;
    /** @internal Finalize any pending trigger builder that wasn't explicitly done(). */
    private _finalizePendingTrigger;
    /**
     * Register a custom predicate function.
     *
     * @param name - Predicate name
     * @param fn - Function that evaluates against CharacterModelTrait state
     * @returns this for chaining
     */
    definePredicate(name: string, fn: CharacterPredicate): CharacterBuilder;
    /**
     * Attach a vocabulary extension for story-specific words.
     *
     * @param ext - VocabularyExtension instance
     * @returns this for chaining
     */
    withVocabulary(ext: VocabularyExtension): CharacterBuilder;
    /**
     * Define propagation behavior for this NPC.
     *
     * @param opts - Propagation profile options
     * @returns this for chaining
     */
    propagation(opts: PropagationOptions): CharacterBuilder;
    /**
     * Define the NPC's movement profile — which rooms they know and can access.
     *
     * @param opts - Movement profile (knows, access)
     * @returns this for chaining
     */
    movement(opts: MovementProfile): CharacterBuilder;
    /**
     * Define an influence this NPC exerts.
     * Returns an InfluenceBuilder; call .done() to return to this builder.
     *
     * @param name - Author-defined influence name (e.g., 'seduction', 'intimidation')
     * @returns InfluenceBuilder for fluent chaining
     */
    influence(name: string): InfluenceBuilder<CharacterBuilder>;
    /**
     * Declare resistance to an influence.
     *
     * @param influenceName - The influence name to resist
     * @param opts - Optional except conditions for conditional vulnerability
     * @returns this for chaining
     */
    resistsInfluence(influenceName: string, opts?: {
        except: string[];
    }): CharacterBuilder;
    /** @internal Finalize any pending influence builder. */
    private _finalizePendingInfluenceBuilder;
    /**
     * Compile the builder state into CharacterModelTrait constructor data,
     * compiled event handlers, and custom predicates.
     *
     * @returns Compiled character data
     */
    compile(): CompiledCharacter;
}
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
```

### cognitive-presets

```typescript
/**
 * Named cognitive profile presets (ADR-141)
 *
 * Documented example profiles for common cognitive conditions.
 * These are starting points for authors, not platform-level constants.
 * Authors override any dimension via the builder's cognitiveProfile() method.
 *
 * Public interface: COGNITIVE_PRESETS, CognitivePresetName.
 * Owner context: @sharpee/character
 */
import { CognitiveProfile } from '@sharpee/world-model';
/** Names of built-in cognitive presets. */
export type CognitivePresetName = 'stable' | 'schizophrenic' | 'ptsd' | 'dementia' | 'dissociative' | 'tbi' | 'obsessive' | 'intoxicated';
/**
 * Named cognitive profile presets.
 *
 * Each maps to the five-dimensional profile from ADR-141's condition table.
 * Authors select a preset as a starting point, then override individual
 * dimensions as needed for their character.
 */
export declare const COGNITIVE_PRESETS: Record<CognitivePresetName, CognitiveProfile>;
/**
 * Check if a string is a valid cognitive preset name.
 *
 * @param name - String to check
 * @returns True if the name is a recognized preset
 */
export declare function isCognitivePreset(name: string): name is CognitivePresetName;
```

### vocabulary-extension

```typescript
/**
 * Story-specific vocabulary extension (ADR-141)
 *
 * Allows stories to add custom mood words and personality traits
 * beyond the platform defaults. Extended vocabulary is validated
 * by the builder and compiled into trait data.
 *
 * Public interface: VocabularyExtension, defineCustomMood, defineCustomPersonality.
 * Owner context: @sharpee/character
 */
/** A custom mood definition with valence-arousal coordinates. */
export interface CustomMoodDef {
    name: string;
    valence: number;
    arousal: number;
}
/** A custom personality trait definition. */
export interface CustomPersonalityDef {
    name: string;
}
/**
 * Registry of story-specific vocabulary extensions.
 *
 * Stories call defineCustomMood() and defineCustomPersonality()
 * during initialization. The builder validates against both
 * platform vocabulary and these extensions.
 */
export declare class VocabularyExtension {
    private customMoods;
    private customPersonalities;
    /**
     * Define a custom mood word with valence-arousal coordinates.
     *
     * @param name - The mood word (e.g., 'lovesick')
     * @param valence - Valence value (-1 to 1)
     * @param arousal - Arousal value (0 to 1)
     */
    defineMood(name: string, valence: number, arousal: number): void;
    /**
     * Define a custom personality trait name.
     *
     * @param name - The personality trait (e.g., 'righteous')
     */
    definePersonality(name: string): void;
    /**
     * Check if a mood word is a recognized custom mood.
     *
     * @param name - Mood word to check
     * @returns True if it was registered via defineMood()
     */
    hasCustomMood(name: string): boolean;
    /**
     * Get a custom mood definition.
     *
     * @param name - Mood word to look up
     * @returns The mood definition, or undefined
     */
    getCustomMood(name: string): CustomMoodDef | undefined;
    /**
     * Check if a personality trait is a recognized custom trait.
     *
     * @param name - Personality trait to check
     * @returns True if it was registered via definePersonality()
     */
    hasCustomPersonality(name: string): boolean;
    /**
     * Get all registered custom mood names.
     *
     * @returns Array of custom mood names
     */
    getCustomMoodNames(): string[];
    /**
     * Get all registered custom personality names.
     *
     * @returns Array of custom personality trait names
     */
    getCustomPersonalityNames(): string[];
}
```

### apply

```typescript
/**
 * Apply compiled character data to an entity (ADR-141, 144, 145, 146)
 *
 * Convenience function that creates a CharacterModelTrait from compiled
 * builder output, registers custom predicates, and adds the trait to
 * the entity. Returns the trait plus any compiled configuration
 * (propagation, goals, movement, influence) for the NPC service.
 *
 * Public interface: applyCharacter, AppliedCharacter.
 * Owner context: @sharpee/character
 */
import { IFEntity, CharacterModelTrait } from '@sharpee/world-model';
import { CompiledCharacter } from './character-builder';
import { PropagationProfile } from './propagation/propagation-types';
import { GoalDef, MovementProfile } from './goals/goal-types';
import { InfluenceDef, ResistanceDef } from './influence/influence-types';
/**
 * Result of applying a compiled character to an entity.
 * Contains the trait plus any behavior configuration for the NPC service.
 */
export interface AppliedCharacter {
    /** The CharacterModelTrait added to the entity. */
    trait: CharacterModelTrait;
    /** Propagation profile (ADR-144), if defined. */
    propagationProfile?: PropagationProfile;
    /** Rich goal definitions (ADR-145), if defined. */
    goalDefs?: GoalDef[];
    /** Movement profile (ADR-145), if defined. */
    movementProfile?: MovementProfile;
    /** Influence definitions (ADR-146), if defined. */
    influenceDefs?: InfluenceDef[];
    /** Resistance definitions (ADR-146), if defined. */
    resistanceDefs?: ResistanceDef[];
}
/**
 * Apply a compiled character to an entity.
 *
 * Creates the CharacterModelTrait, registers custom predicates,
 * and adds the trait to the entity. Returns the trait plus any
 * compiled behavior configuration for the NPC service.
 *
 * @param entity - The NPC entity to apply the character model to
 * @param compiled - Output of CharacterBuilder.compile()
 * @returns The trait and compiled behavior configuration
 */
export declare function applyCharacter(entity: IFEntity, compiled: CompiledCharacter): AppliedCharacter;
```

### conversation/response-types

```typescript
/**
 * Conversation response types (ADR-142)
 *
 * Type definitions for constraint-based response selection:
 * ResponseAction, ResponseCandidate, ResponseIntent, and
 * conversation/evidence tracking records.
 *
 * Public interface: ResponseAction, ResponseCandidate, ResponseIntent,
 *   ConversationRecord, ConversationEntry, EvidenceRecord, EvidenceEntry.
 * Owner context: @sharpee/character / conversation
 */
import { Mood, Coherence } from '@sharpee/world-model';
/**
 * The semantic action an NPC takes when responding to a topic.
 * Drives both conversation history tracking and language layer variant selection.
 */
export type ResponseAction = 'tell' | 'omit' | 'lie' | 'deflect' | 'refuse' | 'ask back' | 'confess' | 'confabulate';
/**
 * A single authored response option for a topic.
 * The constraint evaluator selects among candidates using first-match-wins.
 */
export interface ResponseCandidate {
    /** The response action type. */
    action: ResponseAction;
    /** Language-layer message ID for this response. */
    messageId: string;
    /**
     * Predicate names that must all be satisfied for this candidate to match.
     * Empty array means "always matches" (used for .otherwise() fallback).
     */
    constraints: string[];
    /**
     * Author-defined parameters resolved at render time.
     * Keys are param names; values are resolver functions.
     */
    params?: Record<string, () => unknown>;
    /**
     * State mutations to apply when this response is selected.
     * Keys are state dimensions; values are target values.
     */
    stateMutations?: Record<string, unknown>;
}
/**
 * The structured output of constraint evaluation, consumed by the ACL
 * and ultimately the language layer. Contains everything needed to
 * produce prose without coupling to the character model.
 */
export interface ResponseIntent {
    /** Which response action was taken. */
    action: ResponseAction;
    /** The topic being discussed. */
    topic: string;
    /** Author-assigned message ID. */
    messageId: string;
    /** Current NPC mood (for tone selection in language layer). */
    mood: Mood;
    /** Current NPC coherence (for sentence structure in language layer). */
    coherence: Coherence;
    /** Active conversation context label, if any. */
    context?: string;
    /** Resolved parameter values for the language layer. */
    params?: Record<string, unknown>;
}
/** A single entry in the conversation record for one topic. */
export interface ConversationEntry {
    /** Which response action the NPC took. */
    action: ResponseAction;
    /** The turn number when this response was given. */
    turn: number;
}
/**
 * Per-NPC record of which topics have been discussed and what action
 * was taken. Keyed by topic name, stores the most recent response.
 * Previous responses are kept in a history array for contradiction detection.
 */
export interface ConversationRecord {
    /** Most recent response per topic. */
    responses: Map<string, ConversationEntry>;
    /** Full history per topic (for contradiction detection). */
    history: Map<string, ConversationEntry[]>;
}
/** A single record of evidence the player presented to an NPC. */
export interface EvidenceEntry {
    /** The topic/evidence the player presented. */
    topic: string;
    /** The turn number when the evidence was presented. */
    turn: number;
}
/**
 * Per-NPC record of what evidence the player has presented.
 * Keyed by NPC entity ID.
 */
export type EvidenceRecord = Map<string, EvidenceEntry[]>;
/** Create an empty ConversationRecord. */
export declare function createConversationRecord(): ConversationRecord;
/** Create an empty EvidenceRecord. */
export declare function createEvidenceRecord(): EvidenceRecord;
```

### conversation/topic-registry

```typescript
/**
 * Topic registry and resolution (ADR-142)
 *
 * Authors define topics with keyword sets and optional relationships.
 * The registry resolves free-text player input to authored topics
 * using exact normalized word matching with neighborhood fallback.
 *
 * Public interface: TopicDef, TopicRegistry.
 * Owner context: @sharpee/character / conversation
 */
import { CharacterModelTrait } from '@sharpee/world-model';
/** An authored topic definition with keywords, relationships, and availability. */
export interface TopicDef {
    /** The canonical topic name (used as key). */
    name: string;
    /**
     * Exact keyword set for matching player input.
     * Stored normalized (lowercase, trimmed). Each entry can be
     * a single word or a multi-word phrase.
     */
    keywords: string[];
    /**
     * Related topic names — the neighborhood for fallback matching.
     * When the player's input doesn't match any topic exactly but
     * matches a related topic, the NPC can redirect.
     */
    related?: string[];
    /**
     * Predicate names that must all be satisfied for this topic to be
     * available to the player. Evaluated against the NPC's character state.
     * If empty or undefined, the topic is always available.
     */
    availableWhen?: string[];
}
/** The result of resolving player text to a topic. */
export type TopicResolution = {
    type: 'exact';
    topic: TopicDef;
} | {
    type: 'related';
    topic: TopicDef;
    via: TopicDef;
} | {
    type: 'none';
};
/**
 * Registry of authored topics for a single NPC.
 *
 * Topics are defined once during character building. At runtime,
 * the registry resolves player free-text input to the best matching
 * topic, considering keyword matches and topic neighborhoods.
 */
export declare class TopicRegistry {
    private readonly topics;
    /**
     * Register a topic definition.
     *
     * @param def - The topic definition to register
     * @throws Error if a topic with the same name is already registered
     */
    define(def: TopicDef): void;
    /**
     * Get a topic by its canonical name.
     *
     * @param name - The topic name
     * @returns The topic definition, or undefined
     */
    get(name: string): TopicDef | undefined;
    /**
     * Check whether a topic is available given the NPC's current state.
     *
     * @param name - The topic name
     * @param npcTrait - The NPC's CharacterModelTrait for predicate evaluation
     * @returns True if the topic exists and its availability predicates are satisfied
     */
    isAvailable(name: string, npcTrait: CharacterModelTrait): boolean;
    /**
     * Resolve player free-text input to a topic.
     *
     * Resolution algorithm:
     * 1. Normalize input to lowercase words
     * 2. Score each available topic by keyword hits (exact word match)
     * 3. If any topic has hits, select the one with the most hits (exact match)
     * 4. If no exact match, check if input matches keywords of any related topic
     *    and redirect through the neighborhood
     * 5. If no match at all, return { type: 'none' }
     *
     * @param text - Raw text from the player (e.g., "the murder weapon")
     * @param npcTrait - The NPC's CharacterModelTrait for availability checks
     * @returns Resolution result: exact match, related redirect, or no match
     */
    resolve(text: string, npcTrait: CharacterModelTrait): TopicResolution;
    /**
     * Search for a related-topic redirect when no exact match was found.
     *
     * For each available topic with related topics, checks if the input
     * matches any related topic's keywords. Returns the first match as
     * a redirect resolution.
     *
     * @param inputWords - Input split into normalized words
     * @param inputNormalized - Full normalized input string
     * @param npcTrait - The NPC's CharacterModelTrait for availability checks
     * @returns Related redirect resolution, or { type: 'none' }
     */
    private findRelatedRedirect;
    /**
     * Get all registered topic names.
     *
     * @returns Array of topic names
     */
    getTopicNames(): string[];
    /**
     * Get all topics that are currently available to the player.
     *
     * @param npcTrait - The NPC's CharacterModelTrait for predicate evaluation
     * @returns Array of available topic definitions
     */
    getAvailableTopics(npcTrait: CharacterModelTrait): TopicDef[];
    /**
     * Score how well the input matches a keyword set.
     * Each keyword that appears as a word or phrase in the input scores 1.
     *
     * @param inputWords - Input split into normalized words
     * @param inputNormalized - Full normalized input string
     * @param keywords - The topic's keyword set (already normalized)
     * @returns Number of keyword hits
     */
    private scoreKeywordMatch;
}
```

### conversation/constraint-evaluator

```typescript
/**
 * Constraint evaluator (ADR-142)
 *
 * Evaluates authored response constraints against NPC character state
 * to select the appropriate response. Uses first-match-wins ordering
 * with .otherwise() fallback.
 *
 * Also handles response recording, contradiction detection, and
 * evidence tracking.
 *
 * Public interface: evaluateConstraints, ConstraintEvaluator.
 * Owner context: @sharpee/character / conversation
 */
import { CharacterModelTrait } from '@sharpee/world-model';
import { ResponseCandidate, ResponseAction, ConversationRecord, ConversationEntry, EvidenceEntry } from './response-types';
/** A detected contradiction in conversation history. */
export interface Contradiction {
    /** The topic where the contradiction was detected. */
    topic: string;
    /** The previous response action for this topic. */
    previousAction: ResponseAction;
    /** The new response action that contradicts the previous one. */
    currentAction: ResponseAction;
    /** Turn of the previous response. */
    previousTurn: number;
    /** Turn of the current response. */
    currentTurn: number;
}
/**
 * Evaluate a list of response candidates against NPC character state.
 * Uses first-match-wins: the first candidate whose constraints are all
 * satisfied is selected. Empty constraints means "always matches"
 * (the .otherwise() fallback).
 *
 * @param candidates - Ordered list of response candidates for this topic
 * @param npcTrait - The NPC's CharacterModelTrait for predicate evaluation
 * @returns The selected candidate, or undefined if no candidate matches
 */
export declare function evaluateConstraints(candidates: ResponseCandidate[], npcTrait: CharacterModelTrait): ResponseCandidate | undefined;
/**
 * Stateful constraint evaluator that tracks conversation history,
 * detects contradictions, and records evidence presentations.
 *
 * One instance per NPC. State survives save/restore.
 */
export declare class ConstraintEvaluator {
    /** Per-NPC conversation records. Keyed by NPC entity ID. */
    private readonly records;
    /** Evidence the player has presented. Keyed by NPC entity ID. */
    private readonly evidence;
    /**
     * Evaluate constraints and select the best response for a topic.
     *
     * @param candidates - Ordered response candidates
     * @param npcTrait - NPC's character model trait
     * @returns The selected candidate, or undefined
     */
    evaluate(candidates: ResponseCandidate[], npcTrait: CharacterModelTrait): ResponseCandidate | undefined;
    /**
     * Record that an NPC gave a specific response to a topic.
     * Updates both the current response and the history.
     *
     * @param npcId - The NPC entity ID
     * @param topic - The topic name
     * @param action - The response action taken
     * @param turn - The current turn number
     * @returns A Contradiction if this response contradicts a previous one, or undefined
     */
    recordResponse(npcId: string, topic: string, action: ResponseAction, turn: number): Contradiction | undefined;
    /**
     * Get the conversation record for an NPC.
     *
     * @param npcId - The NPC entity ID
     * @returns The conversation record, or undefined if no conversation has occurred
     */
    getRecord(npcId: string): ConversationRecord | undefined;
    /**
     * Check whether a topic has been discussed with an NPC.
     *
     * @param npcId - The NPC entity ID
     * @param topic - The topic name
     * @returns True if the topic has been discussed
     */
    hasDiscussed(npcId: string, topic: string): boolean;
    /**
     * Get the most recent response action for a topic.
     *
     * @param npcId - The NPC entity ID
     * @param topic - The topic name
     * @returns The most recent conversation entry, or undefined
     */
    getLastResponse(npcId: string, topic: string): ConversationEntry | undefined;
    /**
     * Record that the player presented evidence/information to an NPC.
     *
     * @param npcId - The NPC entity ID
     * @param topic - The evidence topic
     * @param turn - The current turn number
     */
    recordEvidence(npcId: string, topic: string, turn: number): void;
    /**
     * Check whether the player has presented specific evidence to an NPC.
     *
     * @param npcId - The NPC entity ID
     * @param topic - The evidence topic
     * @returns True if this evidence has been presented
     */
    hasPresented(npcId: string, topic: string): boolean;
    /**
     * Get all evidence presented to an NPC.
     *
     * @param npcId - The NPC entity ID
     * @returns Array of evidence entries, or empty array
     */
    getEvidence(npcId: string): EvidenceEntry[];
    /**
     * Export state for save/restore.
     * Converts Maps to plain objects for JSON serialization.
     */
    toJSON(): ConstraintEvaluatorState;
    /**
     * Restore state from serialized data.
     *
     * @param state - Previously serialized state
     */
    static fromJSON(state: ConstraintEvaluatorState): ConstraintEvaluator;
    /** Get or create a conversation record for an NPC. */
    private getOrCreateRecord;
    /**
     * Determine if two response actions constitute a contradiction.
     * A contradiction occurs when the NPC's story changes — telling the truth
     * after lying, confessing after deflecting, etc.
     */
    private isContradiction;
}
/** Serialized conversation record (Maps converted to plain objects). */
interface SerializedConversationRecord {
    responses: Record<string, ConversationEntry>;
    history: Record<string, ConversationEntry[]>;
}
/** Full serialized state of a ConstraintEvaluator. */
export interface ConstraintEvaluatorState {
    records: Record<string, SerializedConversationRecord>;
    evidence: Record<string, EvidenceEntry[]>;
}
export {};
```

### conversation/lifecycle

```typescript
/**
 * Conversation lifecycle and attention management (ADR-142)
 *
 * A conversation is an active state that persists across non-conversation
 * actions and competes for the player's attention. NPC intent and strength
 * drive between-turn commentary and determine how aggressively the NPC
 * holds the player's focus.
 *
 * Public interface: ConversationIntent, ConversationStrength, ConversationContext,
 *   ContinuationEntry, InitiativeTrigger, ConversationLifecycle.
 * Owner context: @sharpee/character / conversation
 */
/** How the NPC feels about continuing the conversation. */
export type ConversationIntent = 'eager' | 'reluctant' | 'hostile' | 'confessing' | 'neutral';
/** How aggressively the NPC holds the player's attention. */
export type ConversationStrength = 'passive' | 'assertive' | 'blocking';
/** Result of attempting to redirect attention away from the current NPC. */
export type RedirectResult = 'yields' | 'protests' | 'blocks';
/**
 * Default number of non-conversation turns before a conversation decays,
 * keyed by intent. Authors can override per conversation context.
 */
export declare const DEFAULT_DECAY_THRESHOLDS: Record<ConversationIntent, number>;
/** A scheduled NPC continuation message within a conversation context. */
export interface ContinuationEntry {
    /** Turns after context was set before this continuation fires. */
    afterTurns: number;
    /** Message ID for the continuation. */
    messageId: string;
}
/** An NPC initiative trigger — the NPC starts a conversation proactively. */
export interface InitiativeTrigger {
    /** Predicate conditions that must all be satisfied. */
    conditions: string[];
    /** Message ID when the NPC initiates. */
    messageId: string;
}
/**
 * Platform default between-turn commentary message IDs.
 * Keyed by `${intent}.${turnBucket}` where turnBucket is '1', '3+', or 'decay'.
 * Authors override per conversation context for character-specific flavor.
 */
export declare const BETWEEN_TURN_DEFAULTS: Record<string, string>;
/** The persistent state of an active conversation. */
export interface ConversationContext {
    /** Entity ID of the NPC in this conversation. */
    npcId: string;
    /** Current conversation intent. */
    intent: ConversationIntent;
    /** Current conversation strength. */
    strength: ConversationStrength;
    /** Decay threshold (non-conversation turns before conversation ends). */
    decayThreshold: number;
    /** Number of non-conversation turns elapsed since last conversation action. */
    nonConversationTurns: number;
    /** Optional context label (e.g., 'confessing', 'caught'). */
    contextLabel?: string;
    /** Scheduled continuation messages within this context. */
    continuations: ContinuationEntry[];
    /** Author-overridden between-turn messages. Keyed by turn number. */
    betweenTurnOverrides: Map<number, string>;
    /** Author-overridden leave-attempt message. */
    onLeaveAttemptMessage?: string;
}
/**
 * Manages the lifecycle of an active conversation between the player
 * and a single NPC. Tracks intent, strength, decay, attention shifts,
 * NPC continuation scheduling, and NPC initiative triggers.
 *
 * One instance per game session. The active conversation is singular —
 * the player can only be in one conversation at a time.
 */
export declare class ConversationLifecycle {
    /** The currently active conversation, or null if none. */
    private context;
    /** Registered NPC initiative triggers. Keyed by NPC entity ID. */
    private readonly initiativeTriggers;
    /**
     * Begin a conversation with an NPC.
     * If a conversation is already active, it is ended first.
     *
     * @param npcId - The NPC entity ID
     * @param intent - The NPC's conversation intent
     * @param strength - The NPC's conversation strength
     */
    begin(npcId: string, intent?: ConversationIntent, strength?: ConversationStrength): void;
    /**
     * End the current conversation.
     * No-op if no conversation is active.
     */
    end(): void;
    /**
     * Update the conversation context mid-conversation.
     * Used when an NPC response changes the conversation's tone
     * (e.g., a confess response shifts intent to 'eager' and strength to 'assertive').
     *
     * @param label - Context label
     * @param intent - New intent (or keep current)
     * @param strength - New strength (or keep current)
     * @param decayThreshold - New decay threshold (or derive from intent)
     */
    setContext(label: string, intent?: ConversationIntent, strength?: ConversationStrength, decayThreshold?: number): void;
    /** Whether a conversation is currently active. */
    isActive(): boolean;
    /** Whether the active conversation is blocking. */
    isBlocking(): boolean;
    /** Get the active conversation context, or null. */
    getContext(): Readonly<ConversationContext> | null;
    /** Get the NPC ID of the active conversation, or null. */
    getActiveNpcId(): string | null;
    /**
     * Record that a non-conversation turn occurred.
     * Increments the decay counter and returns whether the conversation
     * should end (decay threshold reached).
     *
     * @returns True if the conversation decayed and ended
     */
    recordNonConversationTurn(): boolean;
    /**
     * Get the between-turn commentary message ID for the current state.
     * Returns author override if set, otherwise the platform default.
     *
     * @returns Message ID for between-turn commentary, or undefined if no conversation
     */
    getBetweenTurnMessage(): string | undefined;
    /**
     * Register an author-overridden between-turn message for the active context.
     *
     * @param turnNumber - Which non-conversation turn this fires on
     * @param messageId - The message ID
     */
    setBetweenTurnOverride(turnNumber: number, messageId: string): void;
    /**
     * Set the leave-attempt message for a blocking conversation.
     *
     * @param messageId - The message ID when the player tries to leave
     */
    setOnLeaveAttemptMessage(messageId: string): void;
    /**
     * Get the leave-attempt message ID, if any.
     *
     * @returns Message ID, or undefined
     */
    getOnLeaveAttemptMessage(): string | undefined;
    /**
     * Attempt to redirect the player's attention to a different NPC.
     * The result depends on the current conversation's strength:
     * - passive: yields immediately
     * - assertive: protests but yields (conversation ends)
     * - blocking: blocks the redirect (conversation stays active)
     *
     * @param _toNpcId - The NPC the player is trying to talk to
     * @returns The result of the redirect attempt
     */
    attemptRedirect(_toNpcId: string): RedirectResult;
    /**
     * Attempt to leave the room during an active conversation.
     * Same strength-based rules as redirect.
     *
     * @returns The result of the leave attempt
     */
    attemptLeave(): RedirectResult;
    /**
     * Resolve an attention challenge (redirect or leave) against conversation strength.
     * Passive and assertive conversations end; blocking conversations persist.
     *
     * @returns The redirect result based on current conversation strength
     */
    private resolveStrengthCheck;
    /**
     * Schedule a continuation message for N turns after context was set.
     *
     * @param afterTurns - Number of turns after context was set
     * @param messageId - The message ID
     */
    scheduleAfter(afterTurns: number, messageId: string): void;
    /**
     * Get the continuation message for the current turn count, if any.
     * Continuations fire based on non-conversation turns elapsed.
     *
     * @returns Message ID if a continuation is scheduled for this turn, or undefined
     */
    getContinuationMessage(): string | undefined;
    /**
     * Register an initiative trigger for an NPC.
     * The NPC will initiate conversation when conditions are met.
     *
     * @param npcId - The NPC entity ID
     * @param conditions - Predicate conditions that must be satisfied
     * @param messageId - The message ID when the NPC initiates
     */
    registerInitiative(npcId: string, conditions: string[], messageId: string): void;
    /**
     * Get initiative triggers for an NPC.
     *
     * @param npcId - The NPC entity ID
     * @returns Array of initiative triggers, or empty array
     */
    getInitiativeTriggers(npcId: string): InitiativeTrigger[];
    /** Export lifecycle state for save/restore. */
    toJSON(): ConversationLifecycleState;
    /** Restore lifecycle state from serialized data. */
    static fromJSON(state: ConversationLifecycleState): ConversationLifecycle;
}
/** Serialized lifecycle state. */
export interface ConversationLifecycleState {
    context: (Omit<ConversationContext, 'betweenTurnOverrides'> & {
        betweenTurnOverrides: Record<string, string>;
    }) | null;
    initiativeTriggers: Record<string, InitiativeTrigger[]>;
}
```

### conversation/acl

```typescript
/**
 * Anti-corruption layer for conversation responses (ADR-142)
 *
 * Translates between the character model domain (ResponseCandidate,
 * CharacterModelTrait) and the language layer domain (ResponseIntent,
 * message IDs, mood variants). Neither side couples to the other's
 * internal structure.
 *
 * Public interface: buildResponseIntent, selectMoodVariant,
 *   applyCognitiveColoring.
 * Owner context: @sharpee/character / conversation
 */
import { CharacterModelTrait, Mood, CognitiveProfile } from '@sharpee/world-model';
import { ResponseCandidate, ResponseIntent } from './response-types';
/**
 * Build a ResponseIntent from a selected candidate and the NPC's
 * current character state. This is the primary ACL function — it
 * bridges the constraint evaluation result to the language layer.
 *
 * @param candidate - The selected response candidate
 * @param topic - The resolved topic name
 * @param npcTrait - The NPC's CharacterModelTrait
 * @param context - Optional active conversation context label
 * @returns A fully populated ResponseIntent
 */
export declare function buildResponseIntent(candidate: ResponseCandidate, topic: string, npcTrait: CharacterModelTrait, context?: string): ResponseIntent;
/**
 * Select a mood-specific message variant if one exists.
 * Appends a mood suffix to the base message ID.
 *
 * The language layer registers variants like:
 *   'murder-truth-full' (base)
 *   'murder-truth-full.nervous' (mood variant)
 *   'murder-truth-full.panicked' (mood variant)
 *
 * This function produces the variant key. The language layer
 * falls back to the base if the variant isn't registered.
 *
 * @param baseMessageId - The author-assigned message ID
 * @param mood - The NPC's current mood
 * @returns The mood-suffixed message ID
 */
export declare function selectMoodVariant(baseMessageId: string, mood: Mood): string;
/**
 * Apply cognitive coloring to a response intent based on the NPC's
 * cognitive profile. This modifies the intent to signal to the
 * language layer how to render the text:
 *
 * - fragmented coherence → broken sentence patterns
 * - drifting coherence → mid-sentence topic shifts
 * - fractured selfModel → detached, third-person references
 * - augmented perception → hallucinatory insertions
 *
 * The language layer uses the coherence field and additional markers
 * on the intent to select the appropriate speech pattern.
 *
 * @param intent - The response intent to color
 * @param profile - The NPC's cognitive profile
 * @returns The colored response intent (may be the same object)
 */
export declare function applyCognitiveColoring(intent: ResponseIntent, profile: CognitiveProfile): ResponseIntent;
```

### conversation/dialogue-types

```typescript
/**
 * Dialogue extension types (ADR-102 / ADR-142)
 *
 * Defines the DialogueExtension interface and DialogueResult type
 * from ADR-102. The character model conversation system (ADR-142)
 * implements this interface via CharacterModelDialogue.
 *
 * Public interface: DialogueExtension, DialogueResult.
 * Owner context: @sharpee/character / conversation
 */
import { ResponseIntent } from './response-types';
/**
 * The result of a dialogue extension handling a conversation action.
 * Contains everything the action needs to produce output.
 */
export interface DialogueResult {
    /** Whether the extension handled the input. */
    handled: boolean;
    /** Message ID for the action to emit via the reporting phase. */
    messageId?: string;
    /** Parameters for the language layer message. */
    params?: Record<string, unknown>;
    /** The structured response intent (for systems that need it). */
    responseIntent?: ResponseIntent;
}
/**
 * Interface for dialogue extensions (ADR-102).
 *
 * Stdlib conversation actions (ASK, TELL, SAY, TALK TO) delegate
 * to a registered DialogueExtension to produce conversation results.
 * The extension resolves free text to topics, evaluates constraints,
 * and returns structured results.
 */
export interface DialogueExtension {
    /**
     * Handle ASK [npc] ABOUT [text].
     * Extension resolves text to topic and selects a response.
     *
     * @param npcId - The NPC entity ID
     * @param aboutText - The raw text after "about"
     * @returns Dialogue result
     */
    handleAsk(npcId: string, aboutText: string): DialogueResult;
    /**
     * Handle TELL [npc] ABOUT [text].
     * Confrontation path — the player presents information.
     *
     * @param npcId - The NPC entity ID
     * @param aboutText - The raw text after "about"
     * @returns Dialogue result
     */
    handleTell(npcId: string, aboutText: string): DialogueResult;
    /**
     * Handle SAY [text] or SAY [text] TO [npc].
     * Free speech routed through topic resolution.
     *
     * @param npcId - The NPC entity ID, or undefined for untargeted speech
     * @param spokenText - The raw text
     * @returns Dialogue result
     */
    handleSay(npcId: string | undefined, spokenText: string): DialogueResult;
    /**
     * Handle TALK TO [npc].
     * Initiates conversation lifecycle and fires initiative triggers.
     *
     * @param npcId - The NPC entity ID
     * @returns Dialogue result
     */
    handleTalkTo(npcId: string): DialogueResult;
}
```

### conversation/builder

```typescript
/**
 * Conversation builder API (ADR-142)
 *
 * Extends CharacterBuilder with fluent methods for defining conversation
 * topics, response constraints, NPC initiative, and NPC-to-NPC scenes.
 * Compiles to ConversationData stored in CompiledCharacter.
 *
 * Public interface: ConversationBuilder, ResponseChainBuilder,
 *   ConversationData, OffscreenScene, WitnessedScene, DialogueLine.
 * Owner context: @sharpee/character / conversation
 */
import { Mood, DispositionWord } from '@sharpee/world-model';
import { CharacterBuilder } from '../character-builder';
import { TopicDef } from './topic-registry';
import { ResponseCandidate } from './response-types';
import { ConversationIntent, ConversationStrength, InitiativeTrigger } from './lifecycle';
/** State mutations triggered by a response. */
export interface ResponseStateMutation {
    threat?: number;
    mood?: Mood;
    disposition?: Record<string, DispositionWord>;
}
/** Context settings attached to a response. */
export interface ResponseContextSettings {
    label: string;
    intent?: ConversationIntent;
    strength?: ConversationStrength;
    decayThreshold?: number;
}
/** Between-turn override keyed by turn number. */
export interface BetweenTurnOverride {
    turnNumber: number;
    messageId: string;
}
/** An authored response with its full metadata. */
export interface AuthoredResponse {
    /** The response candidate for constraint evaluation. */
    candidate: ResponseCandidate;
    /** Optional context to set after this response. */
    contextSettings?: ResponseContextSettings;
    /** Optional state mutations to apply after this response. */
    stateMutations?: ResponseStateMutation;
    /** Between-turn message overrides within this response's context. */
    betweenTurnOverrides?: BetweenTurnOverride[];
    /** Leave-attempt message when this response's context is blocking. */
    onLeaveAttemptMessage?: string;
}
/** A dialogue line in an NPC-to-NPC scene. */
export interface DialogueLine {
    speaker: string;
    says: string;
}
/** An offscreen NPC-to-NPC conversation (player absent). */
export interface OffscreenScene {
    npcA: string;
    npcB: string;
    conditions: string[];
    mutations: Record<string, ResponseStateMutation>;
    topicUnlocks?: Record<string, string[]>;
    onReturnMessage?: string;
}
/** An eavesdropping NPC-to-NPC conversation (player concealed). */
export interface WitnessedScene {
    npcA: string;
    npcB: string;
    conditions: string[];
    dialogue: DialogueLine[];
    mutations: Record<string, ResponseStateMutation>;
    playerLearns?: {
        topic: string;
        source: string;
    };
    discoveredBy?: {
        condition: string;
        messageId: string;
    };
}
/** All conversation data compiled from the builder. */
export interface ConversationData {
    /** Topic definitions. */
    topics: TopicDef[];
    /** Authored responses keyed by topic trigger (e.g., 'asked about murder'). */
    responses: Map<string, AuthoredResponse[]>;
    /** NPC initiative triggers. */
    initiatives: InitiativeTrigger[];
    /** Offscreen NPC-to-NPC scenes. */
    offscreenScenes: OffscreenScene[];
    /** Witnessed/eavesdropping NPC-to-NPC scenes. */
    witnessedScenes: WitnessedScene[];
}
/** Create empty conversation data. */
export declare function createConversationData(): ConversationData;
/**
 * Fluent builder for defining response constraints within a topic trigger.
 * Each .if().action() pair becomes one ResponseCandidate.
 */
export declare class ResponseChainBuilder {
    private readonly parentBuilder;
    private readonly trigger;
    private candidates;
    private currentConstraints;
    private pendingContextSettings?;
    private pendingStateMutations?;
    private pendingBetweenTurnOverrides;
    private pendingOnLeaveAttemptMessage?;
    constructor(trigger: string, parent: ConversationBuilder);
    /**
     * Set predicate constraints for the next response.
     * All predicates must be satisfied for this response to be selected.
     *
     * @param predicates - Predicate names
     * @returns this for chaining
     */
    if(...predicates: string[]): ResponseChainBuilder;
    /**
     * Mark the next response as the fallback (no constraints).
     *
     * @returns this for chaining
     */
    otherwise(): ResponseChainBuilder;
    private addResponse;
    /** Share the information truthfully. */
    tell(messageId: string, params?: Record<string, () => unknown>): ResponseChainBuilder;
    /** Provide false information. */
    lie(messageId: string): ResponseChainBuilder;
    /** Change the subject. */
    deflect(messageId: string): ResponseChainBuilder;
    /** Explicitly refuse to answer. */
    refuse(messageId: string): ResponseChainBuilder;
    /** Know but don't mention. */
    omit(messageId: string): ResponseChainBuilder;
    /** Reveal previously hidden truth. */
    confess(messageId: string): ResponseChainBuilder;
    /** Fill gaps with invented details (NPC believes them). */
    confabulate(messageId: string): ResponseChainBuilder;
    /** Turn the question around. */
    askBack(messageId: string): ResponseChainBuilder;
    /**
     * Set conversation context after this response.
     *
     * @param label - Context label
     * @param opts - Optional intent, strength, decay threshold
     * @returns this for chaining
     */
    setsContext(label: string, opts?: {
        intent?: ConversationIntent;
        strength?: ConversationStrength;
        decayThreshold?: number;
    }): ResponseChainBuilder;
    /**
     * Override between-turn commentary within this response's context.
     *
     * @param turnNumber - Which non-conversation turn this fires on
     * @param messageId - The message ID
     * @returns this for chaining
     */
    betweenTurns(turnNumber: number, messageId: string): ResponseChainBuilder;
    /**
     * Set the message shown when the player tries to leave during a blocking context.
     *
     * @param messageId - The message ID
     * @returns this for chaining
     */
    onLeaveAttempt(messageId: string): ResponseChainBuilder;
    /**
     * Apply state mutations after this response.
     *
     * @param mutations - State changes (threat, mood, disposition)
     * @returns this for chaining
     */
    updatesState(mutations: ResponseStateMutation): ResponseChainBuilder;
    /**
     * Start a new .when() trigger chain, finalizing this one.
     *
     * @param trigger - The new trigger (e.g., 'asked about weapon')
     * @returns A new ResponseChainBuilder for the new trigger
     */
    when(trigger: string): ResponseChainBuilder;
    /**
     * Return to the parent builder, finalizing this chain.
     *
     * @returns The parent ConversationBuilder
     */
    done(): ConversationBuilder;
    /** @internal Finalize this chain and push candidates to parent. */
    finalize(): void;
    /** @internal Get candidates without finalizing (for testing). */
    _getCandidates(): AuthoredResponse[];
}
/**
 * Extends CharacterBuilder with conversation-specific methods.
 * Accumulates conversation data and compiles it alongside
 * the character model data.
 */
export declare class ConversationBuilder extends CharacterBuilder {
    private readonly _conversationData;
    private _activeChain?;
    /**
     * Define a conversation topic.
     *
     * @param name - The canonical topic name
     * @param def - Topic definition (keywords, related, availableWhen)
     * @returns this for chaining
     */
    topic(name: string, def: Omit<TopicDef, 'name'>): ConversationBuilder;
    /**
     * Begin a response chain for a trigger.
     * The trigger is typically 'asked about {topic}' or 'told about {topic}'.
     *
     * @param trigger - The trigger string
     * @returns A ResponseChainBuilder for fluent chaining
     */
    when(trigger: string): ResponseChainBuilder;
    /** @internal Called by ResponseChainBuilder to register completed responses. */
    _addResponses(trigger: string, responses: AuthoredResponse[]): void;
    /**
     * Define when this NPC initiates conversation proactively.
     *
     * @param conditions - Predicate conditions
     * @param messageId - The message ID when the NPC initiates
     * @returns this for chaining
     */
    initiates(conditions: string[], messageId: string): ConversationBuilder;
    /**
     * Define an offscreen NPC-to-NPC conversation (player absent).
     *
     * @param scene - The offscreen scene definition
     * @returns this for chaining
     */
    offscreen(scene: OffscreenScene): ConversationBuilder;
    /**
     * Define an eavesdropping scene (player concealed).
     *
     * @param scene - The witnessed scene definition
     * @returns this for chaining
     */
    witnessed(scene: WitnessedScene): ConversationBuilder;
    /**
     * Get the compiled conversation data.
     * Finalizes any pending response chain.
     *
     * @returns The conversation data
     */
    getConversationData(): ConversationData;
    /** Finalize any pending response chain builder. */
    private _finalizePendingChain;
}
```

### conversation/dialogue-extension

```typescript
/**
 * CharacterModelDialogue — DialogueExtension implementation (ADR-142)
 *
 * Implements the DialogueExtension interface (ADR-102) using the
 * character model conversation system. Wires topic resolution,
 * constraint evaluation, conversation lifecycle, and the ACL
 * into a single handler for stdlib's ASK/TELL/SAY/TALK TO actions.
 *
 * Public interface: CharacterModelDialogue.
 * Owner context: @sharpee/character / conversation
 */
import { CharacterModelTrait } from '@sharpee/world-model';
import { DialogueExtension, DialogueResult } from './dialogue-types';
import { ConstraintEvaluator } from './constraint-evaluator';
import { ConversationLifecycle } from './lifecycle';
import { ConversationData } from './builder';
/**
 * DialogueExtension implementation backed by the character model.
 *
 * Manages per-NPC topic registries, constraint evaluation, conversation
 * lifecycle, and evidence tracking. One instance per game session.
 */
export declare class CharacterModelDialogue implements DialogueExtension {
    /** Per-NPC conversation state. */
    private readonly npcs;
    /** Shared constraint evaluator (owns conversation records and evidence). */
    private readonly evaluator;
    /** Shared conversation lifecycle (owns active conversation state). */
    private readonly lifecycle;
    /** Get the conversation lifecycle for external access. */
    getLifecycle(): ConversationLifecycle;
    /** Get the constraint evaluator for external access. */
    getEvaluator(): ConstraintEvaluator;
    /**
     * Register an NPC with its conversation data and character model trait.
     *
     * @param npcId - The NPC entity ID
     * @param data - Compiled conversation data from ConversationBuilder
     * @param trait - The NPC's CharacterModelTrait
     * @param getTurn - Function that returns the current turn number
     */
    registerNpc(npcId: string, data: ConversationData, trait: CharacterModelTrait, getTurn: () => number): void;
    /**
     * Handle ASK [npc] ABOUT [text].
     * Resolves topic, evaluates constraints, records response, builds intent.
     */
    handleAsk(npcId: string, aboutText: string): DialogueResult;
    /**
     * Handle TELL [npc] ABOUT [text].
     * Confrontation path — the player presents information.
     */
    handleTell(npcId: string, aboutText: string): DialogueResult;
    /**
     * Handle SAY [text] or SAY [text] TO [npc].
     * Routes free speech through topic resolution.
     */
    handleSay(npcId: string | undefined, spokenText: string): DialogueResult;
    /**
     * Handle TALK TO [npc].
     * Initiates conversation lifecycle.
     */
    handleTalkTo(npcId: string): DialogueResult;
    /**
     * Select the best response for a topic and record it in the evaluator.
     *
     * Evaluates constraints across all authored responses, picks the best
     * match, and records the interaction.
     *
     * @param npc - NPC conversation state
     * @param npcId - The NPC entity ID
     * @param topicName - The resolved topic name
     * @param authoredResponses - Authored responses for this trigger
     * @returns The selected candidate and its authored response, or null
     */
    private selectAndRecordResponse;
    /**
     * Apply side effects from a selected authored response: state mutations,
     * conversation context, between-turn overrides, and leave-attempt message.
     *
     * @param trait - The NPC's CharacterModelTrait
     * @param authoredResponse - The selected authored response
     */
    private applyResponseSideEffects;
    /** Apply state mutations to the NPC's character model trait. */
    private applyStateMutations;
}
```

### conversation/conversation-messages

```typescript
/**
 * Conversation message IDs (ADR-142)
 *
 * Semantic message IDs for conversation system events.
 * Actual text is provided by the language layer (lang-en-us).
 *
 * Public interface: ConversationMessages.
 * Owner context: @sharpee/character / conversation
 */
/**
 * Platform default message IDs for the conversation system.
 * Authors override these per-NPC; these serve as fallbacks.
 */
export declare const ConversationMessages: {
    /** Framing for deflect responses. */
    readonly RESPONSE_DEFLECT: "character.conversation.response.deflect";
    /** Framing for refuse responses. */
    readonly RESPONSE_REFUSE: "character.conversation.response.refuse";
    /** Framing for confabulate responses (NPC fills in gaps). */
    readonly RESPONSE_CONFABULATE: "character.conversation.response.confabulate";
    /** Framing for omit responses (NPC knows but stays silent). */
    readonly RESPONSE_OMIT: "character.conversation.response.omit";
    /** Fragmented speech (low coherence). */
    readonly COGNITIVE_FRAGMENTED: "character.conversation.cognitive.fragmented";
    /** Drifting speech (mid coherence, tangential). */
    readonly COGNITIVE_DRIFTING: "character.conversation.cognitive.drifting";
    /** Detached speech (low selfModel, flat affect). */
    readonly COGNITIVE_DETACHED: "character.conversation.cognitive.detached";
    /** Eager NPC, first non-conversation turn. */
    readonly BETWEEN_TURN_EAGER_1: "character.conversation.between.eager.1";
    /** Eager NPC, third+ non-conversation turn. */
    readonly BETWEEN_TURN_EAGER_3: "character.conversation.between.eager.3";
    /** Reluctant NPC, first non-conversation turn. */
    readonly BETWEEN_TURN_RELUCTANT_1: "character.conversation.between.reluctant.1";
    /** Hostile NPC, first non-conversation turn. */
    readonly BETWEEN_TURN_HOSTILE_1: "character.conversation.between.hostile.1";
    /** Confessing NPC, first non-conversation turn. */
    readonly BETWEEN_TURN_CONFESSING_1: "character.conversation.between.confessing.1";
    /** Confessing NPC, third non-conversation turn. */
    readonly BETWEEN_TURN_CONFESSING_3: "character.conversation.between.confessing.3";
    /** Neutral NPC, third+ non-conversation turn (default decay). */
    readonly BETWEEN_TURN_NEUTRAL_3: "character.conversation.between.neutral.3";
    /** NPC yields attention when player redirects to another NPC. */
    readonly ATTENTION_YIELDS: "character.conversation.attention.yields";
    /** NPC protests when player redirects but doesn't block. */
    readonly ATTENTION_PROTESTS: "character.conversation.attention.protests";
    /** NPC blocks player from redirecting (strong attention hold). */
    readonly ATTENTION_BLOCKS: "character.conversation.attention.blocks";
    /** Conversation ends naturally (goodbye). */
    readonly CONVERSATION_ENDS: "character.conversation.ends";
    /** NPC initiates conversation. */
    readonly CONVERSATION_INITIATES: "character.conversation.initiates";
};
/** Type for conversation message IDs. */
export type ConversationMessageId = (typeof ConversationMessages)[keyof typeof ConversationMessages];
```

### propagation/propagation-types

```typescript
/**
 * Information propagation types (ADR-144)
 *
 * Type definitions for NPC-to-NPC information flow: propagation
 * profiles, audience/tendency/pace/coloring vocabularies, per-fact
 * overrides, and transfer records.
 *
 * Public interface: All exported types.
 * Owner context: @sharpee/character / propagation
 */
/** How freely the NPC shares information. */
export type PropagationTendency = 'chatty' | 'selective' | 'mute';
/** Who the NPC shares with. */
export type PropagationAudience = 'trusted' | 'anyone' | 'allied';
/** How quickly the NPC shares when conditions are met. */
export type PropagationPace = 'eager' | 'gradual' | 'reluctant';
/** Tone of the telling — hint to the language layer for variant selection. */
export type PropagationColoring = 'neutral' | 'dramatic' | 'vague' | 'fearful' | 'conspiratorial';
/** How the NPC receives information from others. */
export type ReceivesAs = 'as fact' | 'as belief';
/** Which version of a fact the NPC spreads. */
export type SpreadsVersion = 'truth' | 'lie';
/** Per-fact override for propagation behavior. */
export interface FactOverride {
    /** Override audience for this specific fact. */
    to?: PropagationAudience;
    /** Override which version to spread (truth or the lie told). */
    spreadsVersion?: SpreadsVersion;
    /** Override witnessed message for this fact when player is present. */
    witnessed?: string;
}
/** When/where propagation happens. */
export interface PropagationSchedule {
    /** Predicate conditions that must be satisfied. */
    when: string[];
}
/**
 * Per-NPC propagation behavior definition.
 * Controls who the NPC talks to, what they share, when, and how.
 */
export interface PropagationProfile {
    /** How freely the NPC shares. */
    tendency: PropagationTendency;
    /** Who the NPC shares with (default: 'trusted'). */
    audience?: PropagationAudience;
    /** NPC IDs explicitly excluded from sharing. */
    excludes?: string[];
    /** Topics the chatty NPC withholds (blacklist for chatty tendency). */
    withholds?: string[];
    /** Topics the selective NPC will share (whitelist for selective tendency). */
    spreads?: string[];
    /** Per-fact overrides. */
    overrides?: Record<string, FactOverride>;
    /** How quickly facts are shared (default: 'eager'). */
    pace?: PropagationPace;
    /** Optional scheduling conditions. */
    schedule?: PropagationSchedule;
    /** Tone of the telling (default: 'neutral'). */
    coloring?: PropagationColoring;
    /** Whether the player can use this NPC as a messenger (default: false). */
    playerCanLeverage?: boolean;
    /** How the NPC treats received information (default: 'as fact'). */
    receives?: ReceivesAs;
}
/** A single pending propagation transfer. */
export interface PropagationTransfer {
    /** The speaking NPC's entity ID. */
    speakerId: string;
    /** The listening NPC's entity ID. */
    listenerId: string;
    /** The topic being shared. */
    topic: string;
    /** Which version is being shared. */
    version: SpreadsVersion;
    /** The speaker's coloring for this transfer. */
    coloring: PropagationColoring;
    /** Per-fact witnessed message override, if any. */
    witnessedOverride?: string;
}
/**
 * Tracks which facts an NPC has already told to each listener.
 * Prevents repeated sharing of the same fact to the same NPC.
 */
export declare class AlreadyToldRecord {
    /** speakerId → listenerId → Set of topic names */
    private readonly records;
    /**
     * Check if a speaker has already told a listener about a topic.
     */
    hasTold(speakerId: string, listenerId: string, topic: string): boolean;
    /**
     * Record that a speaker told a listener about a topic.
     */
    record(speakerId: string, listenerId: string, topic: string): void;
    /** Export for serialization. */
    toJSON(): Record<string, Record<string, string[]>>;
    /** Restore from serialized data. */
    static fromJSON(data: Record<string, Record<string, string[]>>): AlreadyToldRecord;
}
```

### propagation/propagation-evaluator

```typescript
/**
 * Propagation evaluation engine (ADR-144)
 *
 * Per-turn evaluator that determines which facts each NPC shares,
 * with whom, and in what order. Pure evaluation logic — does not
 * mutate world state. Returns PropagationTransfer objects that
 * the caller applies via fact-transfer.
 *
 * Public interface: evaluatePropagation, PropagationContext.
 * Owner context: @sharpee/character / propagation
 */
import { CharacterModelTrait } from '@sharpee/world-model';
import { PropagationProfile, PropagationTransfer, AlreadyToldRecord } from './propagation-types';
/** Information about an NPC in the room for propagation evaluation. */
export interface RoomOccupant {
    /** Entity ID. */
    id: string;
    /** The NPC's CharacterModelTrait (for disposition checks). */
    trait: CharacterModelTrait;
    /** The NPC's propagation profile, if any. */
    profile?: PropagationProfile;
}
/** Context for evaluating one NPC's propagation. */
export interface PropagationContext {
    /** The speaking NPC. */
    speaker: RoomOccupant;
    /** All other NPCs in the same room. */
    listeners: RoomOccupant[];
    /** Whether the player is present in the room. */
    playerPresent: boolean;
    /** The already-told record (shared across all NPCs). */
    alreadyTold: AlreadyToldRecord;
    /** Current turn number. */
    turn: number;
    /** Number of turns the speaker has been in this room with listeners. */
    turnsColocated?: number;
}
/**
 * Evaluate propagation for a single NPC.
 *
 * Algorithm:
 * 1. Mute check — skip entirely
 * 2. Schedule condition check — skip if not met
 * 3. Find eligible listeners (audience + exclusions)
 * 4. Find eligible facts (tendency whitelist/blacklist + already-told)
 * 5. Apply pace (eager = all, gradual = one, reluctant = wait)
 * 6. Return transfer objects
 *
 * @param ctx - The propagation context
 * @returns Array of transfers to execute
 */
export declare function evaluatePropagation(ctx: PropagationContext): PropagationTransfer[];
```

### propagation/fact-transfer

```typescript
/**
 * Fact transfer and provenance tracking (ADR-144)
 *
 * Applies propagation transfers by creating facts in the listener's
 * knowledge base with full provenance chain. Records transfers in
 * the already-told record.
 *
 * Public interface: transferFact, TransferResult.
 * Owner context: @sharpee/character / propagation
 */
import { CharacterModelTrait } from '@sharpee/world-model';
import { PropagationTransfer, AlreadyToldRecord, ReceivesAs } from './propagation-types';
/** The result of applying a fact transfer. */
export interface TransferResult {
    /** The transfer that was applied. */
    transfer: PropagationTransfer;
    /** The source string recorded on the listener's fact. */
    source: string;
    /** Whether the listener already knew this topic (no-op transfer). */
    alreadyKnew: boolean;
}
/**
 * Apply a single propagation transfer.
 *
 * Creates a fact in the listener's knowledge with provenance,
 * records the transfer in the already-told record.
 *
 * @param transfer - The transfer to apply
 * @param listenerTrait - The listener's CharacterModelTrait
 * @param alreadyTold - The shared already-told record
 * @param turn - Current turn number
 * @param receivesAs - How the listener treats received info (default: 'as fact')
 * @returns The transfer result
 */
export declare function transferFact(transfer: PropagationTransfer, listenerTrait: CharacterModelTrait, alreadyTold: AlreadyToldRecord, turn: number, receivesAs?: ReceivesAs): TransferResult;
/**
 * Apply multiple propagation transfers in sequence.
 *
 * @param transfers - The transfers to apply
 * @param getListenerTrait - Function to get a listener's CharacterModelTrait by ID
 * @param alreadyTold - The shared already-told record
 * @param turn - Current turn number
 * @param getReceivesAs - Function to get how a listener receives info
 * @returns Array of transfer results
 */
export declare function applyTransfers(transfers: PropagationTransfer[], getListenerTrait: (id: string) => CharacterModelTrait | undefined, alreadyTold: AlreadyToldRecord, turn: number, getReceivesAs?: (listenerId: string) => ReceivesAs): TransferResult[];
```

### propagation/visibility

```typescript
/**
 * Propagation visibility (ADR-144)
 *
 * Determines what the player sees when NPC-to-NPC information
 * transfer occurs. Three modes: offscreen (absent), witnessed
 * (present), eavesdropped (concealed).
 *
 * Public interface: PropagationVisibility, getVisibilityMessage.
 * Owner context: @sharpee/character / propagation
 */
import { PropagationTransfer, PropagationColoring } from './propagation-types';
import type { WorldModel } from '@sharpee/world-model';
/** The player's presence state relative to the propagation event. */
export type PlayerPresence = 'absent' | 'present' | 'concealed';
/** The visibility output for a single propagation transfer. */
export interface PropagationVisibilityResult {
    /** The transfer this result is for. */
    transfer: PropagationTransfer;
    /** The player's presence state. */
    presence: PlayerPresence;
    /** Message ID to emit (undefined if offscreen). */
    messageId?: string;
    /** Whether the player gains the fact with source 'overheard'. */
    playerLearns: boolean;
}
/**
 * Platform default witnessed message IDs per coloring.
 * Authors override per fact via FactOverride.witnessed.
 */
export declare const PROPAGATION_WITNESSED_DEFAULTS: Record<PropagationColoring, string>;
/**
 * Determine visibility output for a propagation transfer.
 *
 * @param transfer - The propagation transfer
 * @param presence - The player's presence state
 * @returns Visibility result with message ID and player-learns flag
 */
export declare function getVisibilityResult(transfer: PropagationTransfer, presence: PlayerPresence): PropagationVisibilityResult;
/**
 * Evaluate visibility for multiple transfers.
 *
 * @param transfers - The transfers to evaluate
 * @param presence - The player's presence state
 * @returns Array of visibility results
 */
export declare function getVisibilityResults(transfers: PropagationTransfer[], presence: PlayerPresence): PropagationVisibilityResult[];
/**
 * Determine the player's presence state relative to an NPC.
 *
 * Used by the propagation evaluator to decide what the player observes:
 * - `absent`: different room — state mutation only, no message
 * - `present`: same room, visible — witnessed summary
 * - `concealed`: same room, hidden — full eavesdropping, player learns the fact
 *
 * NPC-to-player visibility (can the NPC see the player?) is handled separately
 * by ConcealedVisibilityBehavior via the canSee() pipeline.
 *
 * @param world - The world model
 * @param playerId - The player entity ID
 * @param npcId - The NPC entity ID
 * @returns The player's presence state
 */
export declare function resolvePlayerPresence(world: WorldModel, playerId: string, npcId: string): PlayerPresence;
```

### propagation/builder

```typescript
/**
 * Propagation builder API (ADR-144 layer 5)
 *
 * Extends CharacterBuilder with a fluent .propagation() method that
 * accepts PropagationProfile options. The compiled profile is stored
 * in CompiledCharacter for applyCharacter to consume.
 *
 * Public interface: propagation() method added to CharacterBuilder.
 * Owner context: @sharpee/character / propagation
 */
import { PropagationTendency, PropagationAudience, PropagationPace, PropagationColoring, ReceivesAs, FactOverride, PropagationSchedule, PropagationProfile } from './propagation-types';
/**
 * Options for the .propagation() builder method.
 * All fields map directly to PropagationProfile.
 */
export interface PropagationOptions {
    /** How freely the NPC shares information. */
    tendency: PropagationTendency;
    /** Who the NPC shares with (default: 'trusted'). */
    audience?: PropagationAudience;
    /** NPC IDs explicitly excluded from sharing. */
    excludes?: string[];
    /** Topics the chatty NPC withholds (blacklist for chatty tendency). */
    withholds?: string[];
    /** Topics the selective NPC will share (whitelist for selective tendency). */
    spreads?: string[];
    /** Per-fact overrides. */
    overrides?: Record<string, FactOverride>;
    /** How quickly facts are shared (default: 'eager'). */
    pace?: PropagationPace;
    /** Optional scheduling conditions. */
    schedule?: PropagationSchedule;
    /** Tone of the telling (default: 'neutral'). */
    coloring?: PropagationColoring;
    /** Whether the player can use this NPC as a messenger (default: false). */
    playerCanLeverage?: boolean;
    /** How the NPC treats received information (default: 'as fact'). */
    receives?: ReceivesAs;
}
/**
 * Convert builder options to a PropagationProfile.
 *
 * @param opts - Builder options
 * @returns A PropagationProfile with all specified fields
 */
export declare function buildPropagationProfile(opts: PropagationOptions): PropagationProfile;
```

### propagation/propagation-messages

```typescript
/**
 * Propagation message IDs (ADR-144)
 *
 * Semantic message IDs for NPC-to-NPC information propagation events.
 * Actual text is provided by the language layer (lang-en-us).
 *
 * Public interface: PropagationMessages.
 * Owner context: @sharpee/character / propagation
 */
/**
 * Platform default message IDs for propagation visibility.
 * Keyed by coloring; authors override per-fact via FactOverride.witnessed.
 */
export declare const PropagationMessages: {
    /** Neutral telling: "{speaker} mentions {topic} to {listener}." */
    readonly WITNESSED_NEUTRAL: "character.propagation.witnessed.neutral";
    /** Dramatic telling: "{speaker} excitedly tells {listener} about {topic}." */
    readonly WITNESSED_DRAMATIC: "character.propagation.witnessed.dramatic";
    /** Vague telling: "{speaker} vaguely alludes to {topic} near {listener}." */
    readonly WITNESSED_VAGUE: "character.propagation.witnessed.vague";
    /** Fearful telling: "{speaker} nervously whispers about {topic} to {listener}." */
    readonly WITNESSED_FEARFUL: "character.propagation.witnessed.fearful";
    /** Conspiratorial telling: "{speaker} leans close to {listener}, muttering about {topic}." */
    readonly WITNESSED_CONSPIRATORIAL: "character.propagation.witnessed.conspiratorial";
    /** Player overhears NPC-to-NPC exchange. */
    readonly EAVESDROPPED: "character.propagation.eavesdropped";
};
/** Type for propagation message IDs. */
export type PropagationMessageId = (typeof PropagationMessages)[keyof typeof PropagationMessages];
```

### goals/goal-types

```typescript
/**
 * NPC goal pursuit types (ADR-145)
 *
 * Type definitions for authored behavior sequences: goal definitions,
 * step types, pursuit modes, and active goal state.
 *
 * Public interface: All exported types.
 * Owner context: @sharpee/character / goals
 */
/** Goal priority levels. */
export type GoalPriority = 'critical' | 'high' | 'medium' | 'low';
/** Maps priority words to numeric values for sorting. */
export declare const GOAL_PRIORITY_VALUES: Record<GoalPriority, number>;
/**
 * How the NPC pursues the goal.
 * - sequential: execute steps in order, one per turn
 * - opportunistic: no steps — wait for act conditions
 * - prepared: sequential prep steps, then switch to opportunistic
 */
export type PursuitMode = 'sequential' | 'opportunistic' | 'prepared';
/** Base for all step types. */
interface StepBase {
    /** Message ID when player witnesses this step. */
    witnessed?: string;
}
/** Move toward a location or entity. */
export interface SeekStep extends StepBase {
    type: 'seek';
    target: string;
    from?: string;
}
/** Pick up or obtain an item. */
export interface AcquireStep extends StepBase {
    type: 'acquire';
    target: string;
}
/** Pause until a condition is met. */
export interface WaitForStep extends StepBase {
    type: 'waitFor';
    conditions: string[];
}
/** Go to a specific location. */
export interface MoveToStep extends StepBase {
    type: 'moveTo';
    target: string;
}
/** Perform an authored action. */
export interface ActStep extends StepBase {
    type: 'act';
    messageId: string;
}
/** Initiate conversation. */
export interface SayStep extends StepBase {
    type: 'say';
    messageId: string;
    target?: string;
}
/** Hand an item to another entity. */
export interface GiveStep extends StepBase {
    type: 'give';
    item: string;
    target: string;
}
/** Leave an item somewhere. */
export interface DropStep extends StepBase {
    type: 'drop';
    item: string;
    location?: string;
}
/** Union of all goal step types. */
export type GoalStep = SeekStep | AcquireStep | WaitForStep | MoveToStep | ActStep | SayStep | GiveStep | DropStep;
/** Author-defined goal with activation conditions and behavior sequence. */
export interface GoalDef {
    /** Unique goal identifier. */
    id: string;
    /** Predicate conditions that activate this goal. */
    activatesWhen: string[];
    /** Predicate conditions that interrupt (suspend) this goal. */
    interruptedBy?: string[];
    /** Goal priority. */
    priority: GoalPriority;
    /** Pursuit mode. */
    mode: PursuitMode;
    /** Behavior sequence (for sequential and prepared modes). */
    steps?: GoalStep[];
    /**
     * Act conditions (for opportunistic and prepared modes).
     * When all conditions are met, the final act fires.
     */
    actsWhen?: string[];
    /** Message ID for the final act (opportunistic/prepared). */
    actMessageId?: string;
    /** Message ID when the goal is interrupted. */
    onInterrupt?: string;
    /** Whether the goal resumes from where it left off after interruption clears. */
    resumeOnClear?: boolean;
}
/** Runtime state of an active goal. */
export interface ActiveGoal {
    /** The goal definition. */
    def: GoalDef;
    /** Current step index (for sequential/prepared modes). */
    currentStep: number;
    /** Whether the goal is paused (preempted by higher priority). */
    paused: boolean;
    /** Whether the goal is interrupted (conditions met). */
    interrupted: boolean;
    /**
     * Whether the preparatory steps are complete (for prepared mode).
     * When true, the goal switches to opportunistic behavior.
     */
    prepared: boolean;
}
/**
 * NPC movement profile — defines map knowledge and access.
 * NPCs can only pathfind through known rooms and accessible passages.
 */
export interface MovementProfile {
    /** Room IDs the NPC knows about, or 'all'. */
    knows: string[] | 'all';
    /** Passage/connection IDs the NPC can traverse, or 'all'. */
    access: string[] | 'all';
}
/** Result of evaluating a single goal step. */
export type StepResult = {
    status: 'completed';
    witnessed?: string;
} | {
    status: 'in-progress';
    witnessed?: string;
} | {
    status: 'waiting';
} | {
    status: 'blocked';
    reason: string;
};
export {};
```

### goals/goal-activation

```typescript
/**
 * Goal activation and lifecycle (ADR-145)
 *
 * Evaluates goal activation conditions against character state,
 * manages the active goal queue (priority-sorted), and handles
 * interruption/resumption.
 *
 * Public interface: GoalManager.
 * Owner context: @sharpee/character / goals
 */
import { CharacterModelTrait } from '@sharpee/world-model';
import { GoalDef, ActiveGoal } from './goal-types';
/**
 * Manages goal activation, deactivation, interruption, and the
 * active goal queue for a single NPC.
 */
export declare class GoalManager {
    /** All authored goal definitions for this NPC. */
    private readonly defs;
    /** Currently active goals, sorted by priority (highest first). */
    private activeGoals;
    /**
     * Register a goal definition.
     *
     * @param def - The goal definition
     */
    registerGoal(def: GoalDef): void;
    /**
     * Register multiple goal definitions.
     *
     * @param defs - The goal definitions
     */
    registerGoals(defs: GoalDef[]): void;
    /**
     * Evaluate all goal activation and interruption conditions.
     * Activates new goals, interrupts active ones, resumes cleared ones.
     *
     * @param trait - The NPC's CharacterModelTrait
     * @returns The current active goal queue (priority-sorted)
     */
    evaluate(trait: CharacterModelTrait): ActiveGoal[];
    /**
     * Get the highest-priority non-interrupted active goal.
     *
     * @returns The top goal, or undefined
     */
    getTopGoal(): ActiveGoal | undefined;
    /**
     * Check if a goal is currently active.
     *
     * @param goalId - The goal ID
     * @returns True if the goal is in the active queue
     */
    isActive(goalId: string): boolean;
    /**
     * Get all active goals.
     *
     * @returns The active goal queue
     */
    getActiveGoals(): readonly ActiveGoal[];
    /**
     * Advance the current step of a goal (after step completion).
     *
     * @param goalId - The goal ID
     */
    advanceStep(goalId: string): void;
    /**
     * Complete a goal and remove it from the active queue.
     *
     * @param goalId - The goal ID
     */
    complete(goalId: string): void;
    /** Export active goals for save/restore. */
    toJSON(): ActiveGoalState[];
    /** Restore active goals from serialized state. */
    restoreState(states: ActiveGoalState[]): void;
    /**
     * Evaluate interruption and resumption conditions for all active goals.
     *
     * For interrupted goals with resumeOnClear, checks if interruption
     * conditions have cleared and resumes them. For non-interrupted goals,
     * checks if any interruption conditions are now met and interrupts them.
     *
     * @param activeGoals - The active goal queue
     * @param trait - The NPC's CharacterModelTrait
     */
    private evaluateInterruptions;
    private activate;
    private deactivate;
}
/** Serialized active goal state. */
export interface ActiveGoalState {
    defId: string;
    currentStep: number;
    paused: boolean;
    interrupted: boolean;
    prepared: boolean;
}
```

### goals/step-evaluator

```typescript
/**
 * Goal step evaluator (ADR-145)
 *
 * Evaluates the current step of an active goal each NPC turn.
 * Pure evaluation logic — returns step results that the caller applies.
 *
 * Public interface: evaluateGoalStep, GoalStepContext.
 * Owner context: @sharpee/character / goals
 */
import { CharacterModelTrait } from '@sharpee/world-model';
import { ActiveGoal, StepResult, MovementProfile } from './goal-types';
import { RoomGraph } from './pathfinding';
/** Context needed to evaluate a goal step. */
export interface GoalStepContext {
    /** The NPC's entity ID. */
    npcId: string;
    /** The NPC's current room ID. */
    currentRoom: string;
    /** The NPC's CharacterModelTrait. */
    trait: CharacterModelTrait;
    /** The NPC's movement profile. */
    movement: MovementProfile;
    /** The room connection graph. */
    roomGraph: RoomGraph;
    /** Whether the player is in the same room as the NPC. */
    playerPresent: boolean;
    /**
     * Function to check if an entity is in the same room as the NPC.
     * Used for acquire/give/drop steps.
     */
    isInRoom: (entityId: string, roomId: string) => boolean;
    /**
     * Function to get an entity's current room.
     * Used for seek steps targeting entities.
     */
    getEntityRoom?: (entityId: string) => string | undefined;
}
/**
 * Evaluate a single goal step for an NPC.
 *
 * Each step type produces a StepResult:
 * - completed: step is done, advance to next
 * - in-progress: step partially done (e.g., moving toward target)
 * - waiting: conditions not met, hold this turn
 * - blocked: cannot proceed (e.g., unreachable target)
 *
 * @param goal - The active goal
 * @param ctx - The evaluation context
 * @returns The step evaluation result
 */
export declare function evaluateGoalStep(goal: ActiveGoal, ctx: GoalStepContext): StepResult;
```

### goals/pathfinding

```typescript
/**
 * NPC pathfinding (ADR-145)
 *
 * BFS over room connection graph filtered by NPC movement profile.
 * NPCs can only pathfind through rooms they know and passages they
 * have access to.
 *
 * Public interface: findNextRoom, RoomGraph, RoomConnection.
 * Owner context: @sharpee/character / goals
 */
import { MovementProfile } from './goal-types';
/** A connection between two rooms. */
export interface RoomConnection {
    /** Source room ID. */
    from: string;
    /** Destination room ID. */
    to: string;
    /** Optional passage/connection ID (for access checking). */
    passageId?: string;
}
/**
 * A room graph — adjacency list representation.
 * The caller (NpcService or test harness) provides this from the world model.
 */
export interface RoomGraph {
    /** Get all connections from a room. */
    getConnections(roomId: string): RoomConnection[];
}
/**
 * Simple room graph implementation for testing.
 * Production code can implement the RoomGraph interface directly.
 */
export declare class SimpleRoomGraph implements RoomGraph {
    private readonly connections;
    /**
     * Add a bidirectional connection between two rooms.
     *
     * @param from - Source room ID
     * @param to - Destination room ID
     * @param passageId - Optional passage ID
     */
    addConnection(from: string, to: string, passageId?: string): void;
    /**
     * Add a one-way connection.
     *
     * @param from - Source room ID
     * @param to - Destination room ID
     * @param passageId - Optional passage ID
     */
    addDirected(from: string, to: string, passageId?: string): void;
    getConnections(roomId: string): RoomConnection[];
}
/**
 * Find the next room the NPC should move to on the shortest path
 * toward a target room, filtered by movement profile.
 *
 * Uses BFS (breadth-first search) over the room graph. Only traverses
 * rooms the NPC knows about and passages the NPC has access to.
 *
 * @param currentRoom - The NPC's current room ID
 * @param targetRoom - The destination room ID
 * @param graph - The room connection graph
 * @param movement - The NPC's movement profile
 * @returns The next room ID to move to, or null if unreachable
 */
export declare function findNextRoom(currentRoom: string, targetRoom: string, graph: RoomGraph, movement: MovementProfile): string | null;
```

### goals/builder

```typescript
/**
 * Goal builder API (ADR-145 layer 5)
 *
 * Fluent builder for defining NPC goals with activation conditions,
 * pursuit modes, behavior sequences, and interruption rules.
 * Returns from CharacterBuilder.goal(id) and compiles to GoalDef
 * stored in CompiledCharacter.goalDefs.
 *
 * Public interface: GoalBuilder.
 * Owner context: @sharpee/character / goals
 */
import { GoalPriority, PursuitMode, GoalStep, GoalDef } from './goal-types';
/**
 * Fluent builder for a single goal definition.
 *
 * Usage:
 * ```
 * builder.goal('eliminate-player')
 *   .activatesWhen('knows murder discovered', 'has weapon')
 *   .priority('critical')
 *   .mode('prepared')
 *   .pursues([
 *     { type: 'moveTo', target: 'study' },
 *     { type: 'acquire', target: 'knife' },
 *   ])
 *   .actsWhen('alone with player')
 *   .act('colonel-attacks-player')
 *   .onInterrupt('colonel-retreats')
 *   .resumeOnClear(true)
 *   .done()
 * ```
 */
export declare class GoalBuilder<TParent extends {
    compile(): unknown;
}> {
    private readonly _id;
    private readonly _parent;
    private readonly _finalize;
    private readonly _activatesWhen;
    private readonly _interruptedBy;
    private _priority;
    private _mode;
    private _steps;
    private readonly _actsWhen;
    private _actMessageId?;
    private _onInterrupt?;
    private _resumeOnClear;
    /**
     * Create a new goal builder.
     *
     * @param id - Unique goal identifier
     * @param parent - Parent builder to return to on .done()
     * @param finalize - Callback to register the compiled GoalDef
     */
    constructor(id: string, parent: TParent, finalize: (def: GoalDef) => void);
    /**
     * Set predicate conditions that activate this goal.
     *
     * @param predicates - Predicate names (all must be true)
     * @returns this for chaining
     */
    activatesWhen(...predicates: string[]): GoalBuilder<TParent>;
    /**
     * Set goal priority.
     *
     * @param priority - Priority word
     * @returns this for chaining
     */
    priority(priority: GoalPriority): GoalBuilder<TParent>;
    /**
     * Set pursuit mode.
     *
     * @param mode - How the NPC pursues the goal
     * @returns this for chaining
     */
    mode(mode: PursuitMode): GoalBuilder<TParent>;
    /**
     * Set the behavior sequence (for sequential and prepared modes).
     *
     * @param steps - Array of goal steps
     * @returns this for chaining
     */
    pursues(steps: GoalStep[]): GoalBuilder<TParent>;
    /**
     * Set conditions for the final act (opportunistic/prepared modes).
     *
     * @param predicates - Predicate names (all must be true)
     * @returns this for chaining
     */
    actsWhen(...predicates: string[]): GoalBuilder<TParent>;
    /**
     * Set the message ID for the final act.
     *
     * @param messageId - Message ID
     * @returns this for chaining
     */
    act(messageId: string): GoalBuilder<TParent>;
    /**
     * Set predicate conditions that interrupt (suspend) this goal.
     *
     * @param predicates - Predicate names
     * @returns this for chaining
     */
    interruptedBy(...predicates: string[]): GoalBuilder<TParent>;
    /**
     * Set the message ID when the goal is interrupted.
     *
     * @param messageId - Message ID
     * @returns this for chaining
     */
    onInterrupt(messageId: string): GoalBuilder<TParent>;
    /**
     * Set whether the goal resumes from where it left off after interruption.
     *
     * @param resume - Whether to resume
     * @returns this for chaining
     */
    resumeOnClear(resume: boolean): GoalBuilder<TParent>;
    /**
     * Finalize this goal definition and return the parent builder.
     *
     * @returns The parent builder
     */
    done(): TParent;
    /**
     * Compile the parent builder, auto-finalizing this goal.
     * Allows calling .compile() directly from a goal chain without .done().
     *
     * @returns Compiled character data (delegates to parent's compile())
     */
    compile(): ReturnType<TParent extends {
        compile(): infer R;
    } ? () => R : never>;
    /** @internal Build the GoalDef without finalizing. */
    _buildDef(): GoalDef;
}
```

### influence/influence-types

```typescript
/**
 * NPC influence types (ADR-146)
 *
 * Type definitions for the influence system: influence definitions,
 * resistance definitions, effect tracking, and evaluation results.
 *
 * Public interface: All exported types.
 * Owner context: @sharpee/character / influence
 */
/**
 * How the influence is exerted.
 * - passive: automatically when conditions are met (proximity, same room)
 * - active: deliberately as part of NPC behavior or goal pursuit
 */
export type InfluenceMode = 'passive' | 'active';
/**
 * Who the influence affects.
 * - proximity: target must be in the same room
 * - targeted: influencer selects a specific target (used with active mode)
 * - room: affects all entities in the room (aura)
 */
export type InfluenceRange = 'proximity' | 'targeted' | 'room';
/**
 * How long the effect lasts.
 * - 'while present': clears when influencer leaves the room (default for passive)
 * - 'momentary': lasts one turn (default for active)
 * - 'lingering': persists for author-defined turns or until a condition clears it
 */
export type InfluenceDuration = 'while present' | 'momentary' | 'lingering';
/**
 * Character state mutations caused by influence.
 * Keys map to ADR-141 vocabulary: mood, threat, focus, propagation, disposition.
 */
export interface InfluenceEffect {
    /** ADR-141 mood state. */
    mood?: string;
    /** ADR-141 threat level. */
    threat?: string;
    /** PC or NPC ability to pursue current activity. */
    focus?: string;
    /** ADR-144 propagation tendency override. */
    propagation?: string;
    /** ADR-141 disposition toward a specific entity. */
    disposition?: Record<string, string>;
}
/** Conditions for when a passive influence is exerted. */
export interface InfluenceSchedule {
    /** Predicate conditions that must be satisfied. */
    when: string[];
}
/** Author-defined influence on the exerting NPC. */
export interface InfluenceDef {
    /** Author-invented influence name (e.g., 'seduction', 'intimidation'). */
    name: string;
    /** How the influence is exerted. */
    mode: InfluenceMode;
    /** Who the influence affects. */
    range: InfluenceRange;
    /** State mutations applied to affected targets. */
    effect: InfluenceEffect;
    /** How long the effect lasts. */
    duration: InfluenceDuration;
    /** Message ID when the target is affected (player witnesses). */
    witnessed?: string;
    /** Message ID when the target resists. */
    resisted?: string;
    /** Optional scheduling conditions (for passive mode). */
    schedule?: InfluenceSchedule;
    /** Message ID when PC tries to act while under this influence. */
    onPlayerAction?: string;
    /** Number of turns for lingering duration. */
    lingeringTurns?: number;
    /** Predicate condition to clear lingering effect. */
    lingeringClearCondition?: string;
}
/** Author-defined resistance on the target NPC. */
export interface ResistanceDef {
    /** The influence name this entity resists. */
    influenceName: string;
    /**
     * Conditions under which resistance fails (target becomes vulnerable).
     * Uses the same predicate system as ADR-141/142.
     */
    except?: string[];
}
/** Runtime tracking of an applied influence effect. */
export interface ActiveInfluenceEffect {
    /** The influence name. */
    influenceName: string;
    /** The influencer's entity ID. */
    influencerId: string;
    /** The target's entity ID. */
    targetId: string;
    /** The applied effect mutations. */
    effect: InfluenceEffect;
    /** Duration type. */
    duration: InfluenceDuration;
    /** Turn when the effect was applied. */
    appliedAtTurn: number;
    /** For lingering: turn when the effect expires. */
    expiresAtTurn?: number;
    /** For lingering: predicate condition that clears the effect. */
    clearCondition?: string;
}
/** Result of evaluating one influence against one target. */
export type InfluenceResult = {
    status: 'applied';
    influenceName: string;
    influencerId: string;
    targetId: string;
    effect: InfluenceEffect;
    witnessed?: string;
} | {
    status: 'resisted';
    influenceName: string;
    influencerId: string;
    targetId: string;
    resisted?: string;
} | {
    status: 'skipped';
    reason: string;
};
```

### influence/influence-evaluator

```typescript
/**
 * Influence evaluation engine (ADR-146 layer 3)
 *
 * Evaluates passive and active influences: checks range, schedule,
 * and resistance, then produces InfluenceResult describing whether
 * the effect was applied or resisted.
 *
 * Pure evaluation — does not mutate state directly. Callers apply
 * the returned effects to CharacterModelTrait state.
 *
 * Public interface: evaluatePassiveInfluences, evaluateActiveInfluence,
 *   checkResistance.
 * Owner context: @sharpee/character / influence
 */
import { InfluenceDef, ResistanceDef, InfluenceResult } from './influence-types';
/** An entity in a room with its influence and resistance data. */
export interface InfluenceRoomEntity {
    /** Entity ID. */
    id: string;
    /** Influences this entity exerts (may be empty). */
    influences: InfluenceDef[];
    /** Resistances this entity has (may be empty). */
    resistances: ResistanceDef[];
    /** Evaluate a predicate against this entity's state. Returns true if satisfied. */
    evaluatePredicate: (predicate: string) => boolean;
}
/**
 * Check whether a target resists an influence.
 *
 * @param target - The target entity with its resistances
 * @param influenceName - The influence to check
 * @returns true if the target resists (no effect should be applied)
 */
export declare function checkResistance(target: InfluenceRoomEntity, influenceName: string): boolean;
/**
 * Evaluate all passive influences for entities in a room.
 *
 * For each entity with passive influences, checks range, schedule,
 * and each potential target's resistance. Returns results describing
 * which effects were applied and which were resisted.
 *
 * @param entities - All entities in the room
 * @returns Array of influence results
 */
export declare function evaluatePassiveInfluences(entities: InfluenceRoomEntity[]): InfluenceResult[];
/**
 * Evaluate a single active influence against a specific target.
 *
 * @param influencer - The entity exerting the influence
 * @param influenceName - The name of the influence to exert
 * @param target - The target entity
 * @returns The influence result
 */
export declare function evaluateActiveInfluence(influencer: InfluenceRoomEntity, influenceName: string, target: InfluenceRoomEntity): InfluenceResult;
```

### influence/influence-duration

```typescript
/**
 * Influence duration tracking (ADR-146 layer 3)
 *
 * Tracks active influence effects and manages their expiration:
 * 'while present' clears when influencer leaves room,
 * 'momentary' clears after one turn,
 * 'lingering' clears after authored turns or when a condition is met.
 *
 * Public interface: InfluenceTracker.
 * Owner context: @sharpee/character / influence
 */
import { ActiveInfluenceEffect, InfluenceEffect, InfluenceDuration } from './influence-types';
/**
 * Tracks and manages active influence effects across turns.
 *
 * The tracker maintains a list of currently active effects and
 * provides methods to add, query, and expire them.
 */
export declare class InfluenceTracker {
    private effects;
    /**
     * Record a new active influence effect.
     *
     * @param influenceName - The influence name
     * @param influencerId - The influencer entity ID
     * @param targetId - The target entity ID
     * @param effect - The applied effect mutations
     * @param options - Duration, timing, and clear condition options
     */
    track(influenceName: string, influencerId: string, targetId: string, effect: InfluenceEffect, options: {
        duration: InfluenceDuration;
        turn: number;
        lingeringTurns?: number;
        clearCondition?: string;
    }): void;
    /**
     * Get all active effects on a specific target.
     *
     * @param targetId - The target entity ID
     * @returns Active effects affecting this target
     */
    getEffectsOn(targetId: string): ActiveInfluenceEffect[];
    /**
     * Get all active effects from a specific influencer.
     *
     * @param influencerId - The influencer entity ID
     * @returns Active effects from this influencer
     */
    getEffectsFrom(influencerId: string): ActiveInfluenceEffect[];
    /**
     * Check if a target is under a specific influence.
     *
     * @param targetId - The target entity ID
     * @param influenceName - The influence name
     * @returns true if the target is currently under this influence
     */
    isUnderInfluence(targetId: string, influenceName: string): boolean;
    /**
     * Expire 'while present' effects when the influencer leaves a room.
     *
     * @param influencerId - The influencer who left
     * @param roomEntityIds - Entity IDs still in the room (targets to clear)
     * @returns Effects that were cleared
     */
    expireOnDeparture(influencerId: string, roomEntityIds?: string[]): ActiveInfluenceEffect[];
    /**
     * Expire 'momentary' effects and check lingering expiration.
     * Call once per turn.
     *
     * @param currentTurn - The current turn number
     * @param evaluatePredicate - Function to evaluate clear conditions (targetId, predicate) => boolean
     * @returns Effects that were cleared
     */
    expireTurn(currentTurn: number, evaluatePredicate?: (targetId: string, predicate: string) => boolean): ActiveInfluenceEffect[];
    /** Get the count of active effects. */
    get count(): number;
    /** Export for serialization. */
    toJSON(): ActiveInfluenceEffect[];
    /** Restore from serialized data. */
    static fromJSON(data: ActiveInfluenceEffect[]): InfluenceTracker;
}
```

### influence/pc-influence

```typescript
/**
 * PC influence handling (ADR-146 layer 4)
 *
 * Handles the effect of influences on the player character:
 * checks for active influence effects on the PC and determines
 * whether player actions should be intercepted.
 *
 * Public interface: evaluatePcInfluence, PcInfluenceResult.
 * Owner context: @sharpee/character / influence
 */
import { InfluenceTracker } from './influence-duration';
import { ActiveInfluenceEffect, InfluenceDef } from './influence-types';
/** Result of checking PC influence before a player action. */
export type PcInfluenceResult = {
    status: 'clear';
} | {
    status: 'intercepted';
    influenceName: string;
    influencerId: string;
    effect: ActiveInfluenceEffect;
    onPlayerAction?: string;
    clearConversationContext: boolean;
};
/**
 * Check if the player is under any influence that would intercept their action.
 *
 * Returns the highest-impact influence affecting the PC, if any.
 * An influence intercepts the PC when:
 * - The effect includes `focus: 'clouded'` — clears conversation context
 * - The influence has an `onPlayerAction` message — fires narrative message
 *
 * @param playerId - The player entity ID
 * @param tracker - The influence tracker with active effects
 * @param influenceDefs - Map of influencer ID to their influence definitions
 * @returns PC influence result
 */
export declare function evaluatePcInfluence(playerId: string, tracker: InfluenceTracker, influenceDefs: Map<string, InfluenceDef[]>): PcInfluenceResult;
```

### influence/builder

```typescript
/**
 * Influence builder API (ADR-146 layer 5)
 *
 * Fluent builder for defining NPC influences and resistances.
 * Returns from CharacterBuilder.influence(name) and compiles to
 * InfluenceDef stored in CompiledCharacter.influenceDefs.
 *
 * Public interface: InfluenceBuilder.
 * Owner context: @sharpee/character / influence
 */
import { InfluenceMode, InfluenceRange, InfluenceDuration, InfluenceEffect, InfluenceSchedule, InfluenceDef } from './influence-types';
/**
 * Fluent builder for a single influence definition.
 *
 * Usage:
 * ```
 * builder.influence('seduction')
 *   .mode('passive')
 *   .range('proximity')
 *   .effect({ focus: 'clouded', mood: 'distracted' })
 *   .duration('while present')
 *   .witnessed('ginger-brushes-against-{target}')
 *   .resisted('ginger-brushes-against-{target}-no-effect')
 *   .done()
 * ```
 */
export declare class InfluenceBuilder<TParent extends {
    compile(): unknown;
}> {
    private readonly _name;
    private readonly _parent;
    private readonly _finalize;
    private _mode;
    private _range;
    private _effect;
    private _duration;
    private _witnessed?;
    private _resisted?;
    private _schedule?;
    private _onPlayerAction?;
    private _lingeringTurns?;
    private _lingeringClearCondition?;
    /**
     * Create a new influence builder.
     *
     * @param name - Author-defined influence name
     * @param parent - Parent builder to return to on .done()
     * @param finalize - Callback to register the compiled InfluenceDef
     */
    constructor(name: string, parent: TParent, finalize: (def: InfluenceDef) => void);
    /**
     * Set the influence mode.
     *
     * @param mode - 'passive' or 'active'
     * @returns this for chaining
     */
    mode(mode: InfluenceMode): InfluenceBuilder<TParent>;
    /**
     * Set the influence range.
     *
     * @param range - 'proximity', 'targeted', or 'room'
     * @returns this for chaining
     */
    range(range: InfluenceRange): InfluenceBuilder<TParent>;
    /**
     * Set the effect mutations applied to targets.
     *
     * @param effect - Character state mutations
     * @returns this for chaining
     */
    effect(effect: InfluenceEffect): InfluenceBuilder<TParent>;
    /**
     * Set the duration type.
     *
     * @param duration - 'while present', 'momentary', or 'lingering'
     * @returns this for chaining
     */
    duration(duration: InfluenceDuration): InfluenceBuilder<TParent>;
    /**
     * Set the message ID when the target is affected.
     *
     * @param messageId - Message ID
     * @returns this for chaining
     */
    witnessed(messageId: string): InfluenceBuilder<TParent>;
    /**
     * Set the message ID when the target resists.
     *
     * @param messageId - Message ID
     * @returns this for chaining
     */
    resisted(messageId: string): InfluenceBuilder<TParent>;
    /**
     * Set scheduling conditions for passive influences.
     *
     * @param schedule - Schedule with predicate conditions
     * @returns this for chaining
     */
    schedule(schedule: InfluenceSchedule): InfluenceBuilder<TParent>;
    /**
     * Set the message ID when PC tries to act while under this influence.
     *
     * @param messageId - Message ID
     * @returns this for chaining
     */
    onPlayerAction(messageId: string): InfluenceBuilder<TParent>;
    /**
     * Set lingering duration in turns.
     *
     * @param turns - Number of turns the effect persists
     * @returns this for chaining
     */
    lingeringTurns(turns: number): InfluenceBuilder<TParent>;
    /**
     * Set a predicate condition that clears a lingering effect.
     *
     * @param condition - Predicate condition
     * @returns this for chaining
     */
    clearsWhen(condition: string): InfluenceBuilder<TParent>;
    /**
     * Finalize this influence definition and return the parent builder.
     *
     * @returns The parent builder
     */
    done(): TParent;
    /**
     * Compile the parent builder, auto-finalizing this influence.
     *
     * @returns Compiled character data (delegates to parent's compile())
     */
    compile(): ReturnType<TParent extends {
        compile(): infer R;
    } ? () => R : never>;
    /** @internal Build the InfluenceDef without finalizing. */
    _buildDef(): InfluenceDef;
}
```

### influence/influence-messages

```typescript
/**
 * Influence message IDs (ADR-146)
 *
 * Semantic message IDs for influence system events.
 * Actual text is provided by the language layer (lang-en-us).
 *
 * Public interface: InfluenceMessages.
 * Owner context: @sharpee/character / influence
 */
/**
 * Platform default message IDs for influence events.
 * Authors override per-influence via InfluenceDef.witnessed / .resisted.
 */
export declare const InfluenceMessages: {
    /** Default witnessed message when target is affected. */
    readonly WITNESSED_DEFAULT: "character.influence.witnessed.default";
    /** Default resisted message when target resists. */
    readonly RESISTED_DEFAULT: "character.influence.resisted.default";
    /** Player's focus is clouded (conversation context cleared). */
    readonly PC_FOCUS_CLOUDED: "character.influence.pc.focus_clouded";
    /** Player's action is intercepted by influence. */
    readonly PC_ACTION_INTERCEPTED: "character.influence.pc.action_intercepted";
    /** Influence effect wears off (momentary or lingering expired). */
    readonly EFFECT_EXPIRED: "character.influence.effect.expired";
    /** Influence effect cleared because influencer departed. */
    readonly EFFECT_DEPARTED: "character.influence.effect.departed";
};
/** Type for influence message IDs. */
export type InfluenceMessageId = (typeof InfluenceMessages)[keyof typeof InfluenceMessages];
```

### tick-phases

```typescript
/**
 * NPC tick phase implementations (ADR-144, 145, 146)
 *
 * Factory functions that create tick phase handlers for propagation,
 * goal pursuit, and influence evaluation. Register these with
 * NpcService.registerTickPhase() during story initialization.
 *
 * Public interface: createPropagationPhase, createGoalPhase,
 *   createInfluencePhase, CharacterPhaseConfig.
 * Owner context: @sharpee/character
 */
import { ISemanticEvent, EntityId } from '@sharpee/core';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { PropagationProfile, AlreadyToldRecord } from './propagation';
import { GoalDef, MovementProfile, GoalManager } from './goals';
import { InfluenceDef, ResistanceDef, InfluenceTracker } from './influence';
/** Tick context — mirrors NpcTickContext from stdlib. */
interface TickContext {
    world: WorldModel;
    turn: number;
    random: unknown;
    playerLocation: EntityId;
    playerId: EntityId;
}
/** Per-NPC character configuration for tick phases. */
export interface CharacterPhaseConfig {
    propagationProfile?: PropagationProfile;
    goalDefs?: GoalDef[];
    movementProfile?: MovementProfile;
    influenceDefs?: InfluenceDef[];
    resistanceDefs?: ResistanceDef[];
}
/** Manages per-NPC configs and shared state for tick phases. */
export declare class CharacterPhaseRegistry {
    private readonly configs;
    private readonly goalManagers;
    readonly influenceTracker: InfluenceTracker;
    readonly alreadyToldRecord: AlreadyToldRecord;
    /**
     * Register character configuration for an NPC.
     *
     * @param entityId - NPC entity ID
     * @param config - Configuration from AppliedCharacter
     */
    register(entityId: string, config: CharacterPhaseConfig): void;
    /** Get config for an NPC. */
    getConfig(entityId: string): CharacterPhaseConfig | undefined;
    /** Get goal manager for an NPC. */
    getGoalManager(entityId: string): GoalManager | undefined;
    /** Check if any NPCs have been registered. */
    get hasConfigs(): boolean;
    /**
     * Export serializable state for save/restore.
     * Configs are authored (re-registered on load), so only mutable state is saved.
     */
    toJSON(): {
        goalStates: Record<string, ReturnType<GoalManager['toJSON']>>;
        influenceEffects: ReturnType<InfluenceTracker['toJSON']>;
        alreadyTold: ReturnType<AlreadyToldRecord['toJSON']>;
    };
    /**
     * Restore mutable state from saved data.
     * Call after re-registering all NPC configs.
     */
    restoreState(saved: {
        goalStates?: Record<string, ReturnType<GoalManager['toJSON']>>;
        influenceEffects?: ReturnType<InfluenceTracker['toJSON']>;
        alreadyTold?: ReturnType<AlreadyToldRecord['toJSON']>;
    }): void;
}
/**
 * Create a propagation tick phase handler.
 *
 * @param registry - The character phase registry
 * @returns Tick phase handler function
 */
export declare function createPropagationPhase(registry: CharacterPhaseRegistry): (npcs: IFEntity[], ctx: TickContext) => ISemanticEvent[];
/**
 * Create a goal pursuit tick phase handler.
 *
 * @param registry - The character phase registry
 * @returns Tick phase handler function
 */
export declare function createGoalPhase(registry: CharacterPhaseRegistry): (npcs: IFEntity[], ctx: TickContext) => ISemanticEvent[];
/**
 * Create an influence evaluation tick phase handler.
 *
 * @param registry - The character phase registry
 * @returns Tick phase handler function
 */
export declare function createInfluencePhase(registry: CharacterPhaseRegistry): (npcs: IFEntity[], ctx: TickContext) => ISemanticEvent[];
export {};
```
