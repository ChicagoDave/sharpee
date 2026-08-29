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
import { type PersonalityExpr, type DispositionWord, type Mood, type ThreatLevel, type CognitiveProfile, type ConfidenceWord, type FactSource, type ResistanceMode, type LucidityConfig, type PerceptionFilterConfig, type PerceivedEvent, type CharacterPredicate, type ICharacterModelData, type ActCategory, type FaceAct } from '@sharpee/world-model';
import { CognitivePresetName } from './cognitive-presets.js';
import { VocabularyExtension } from './vocabulary-extension.js';
import { PropagationProfile } from './propagation/propagation-types.js';
import { PropagationOptions } from './propagation/builder.js';
import { GoalDef, MovementProfile } from './goals/goal-types.js';
import { GoalBuilder } from './goals/builder.js';
import { InfluenceDef, ResistanceDef } from './influence/influence-types.js';
import { InfluenceBuilder } from './influence/builder.js';
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
    private _factBeliefs;
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
    private readonly _temperaments;
    private readonly _principles;
    private readonly _obligations;
    private _honor?;
    private readonly _burdenedBy;
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
     * Declare that the NPC knows about a topic (valueless — ADR-310 D14).
     *
     * @param topic - What the NPC knows about
     * @param opts - Optional: how they know (`source` names any FactSource —
     *   Chord parity for `knows the murder, told`; the `witnessed` boolean
     *   is the older shorthand), how confident, and how resistant to
     *   counter-evidence (the fold of the retired belief map)
     * @returns this for chaining
     */
    knows(topic: string, opts?: {
        witnessed?: boolean;
        source?: FactSource;
        confidence?: ConfidenceWord;
        resistance?: ResistanceMode;
        confided?: boolean;
    }): CharacterBuilder;
    /**
     * Declare what this NPC thinks a declared fact's value is — Chord parity
     * for `thinks the killer is the Butler, suspects, told`. Replaces the
     * retired `believes()` method (its firmness/resistance fields fold in
     * here and into `knows()`).
     *
     * @param factId - The fact declaration's id
     * @param value - The value this NPC thinks is true (checked against the
     *   fact's closed value set at compile/load time, not here)
     * @param opts - Confidence, source, and resistance
     * @returns this for chaining
     */
    thinks(factId: string, value: string, opts?: {
        confidence?: ConfidenceWord;
        source?: FactSource;
        resistance?: ResistanceMode;
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
    /**
     * Bind a named temperament — a force ordering (ADR-318 D3). Static when
     * `while` is absent; state-bound otherwise. Never directly mutated: the
     * entity-state ratchet is the only lever.
     *
     * @param name - The temperament definition's name (defs are story data,
     *   registered with the arbiter at load)
     * @param opts - `while`: the entity state that makes this binding live
     * @returns this for chaining
     */
    temperament(name: string, opts?: {
        while?: string;
    }): CharacterBuilder;
    /**
     * Declare a principle — `never <category>` (ADR-318 D4). Feeds duty at a
     * strong fixed baseline; a temperament is what makes it unconditional.
     *
     * @param category - An act category the runtime can detect
     * @param opts - `scope`: canonical scope string (`anyone` / `a <kind>` /
     *   entity id — `harm`/`abandon` only); `except`: canonical carve-out
     *   (`to protect <scope>` yields to that obligation; a bare scope exempts
     *   the act's object)
     * @returns this for chaining
     */
    never(category: ActCategory, opts?: {
        scope?: string;
        except?: string;
    }): CharacterBuilder;
    /**
     * Declare the `protects <scope>` obligation (ADR-318 D5) — compiles to a
     * standing goal with a duty feed at load; recorded on the trait so the
     * author channel can attribute it.
     *
     * @param scope - Canonical scope string (`anyone` / `a <kind>` / entity id)
     * @returns this for chaining
     */
    protects(scope: string): CharacterBuilder;
    /**
     * Declare the `answers honestly` obligation (ADR-318 D4) — the dual of
     * `lie`: evasion satisfies `never lies` but violates this.
     *
     * @returns this for chaining
     */
    answersHonestly(): CharacterBuilder;
    /**
     * Declare honor before an audience (ADR-318 D7). Binds on audience
     * PRESENCE — honor sees the room, never anticipated reputation.
     *
     * @param scope - Canonical audience scope string
     * @param opts - `faceActs`: a selective bundle (default: the full
     *   platform six); `except`: audience carve-out entity ids
     * @returns this for chaining
     */
    honor(scope: string, opts?: {
        faceActs?: FaceAct[];
        except?: string[];
    }): CharacterBuilder;
    /**
     * Seed pre-story conscience pressure (ADR-318 D8) — `burdened by` a held
     * topic. States are declarable; curves are runtime-owned.
     *
     * @param topic - A topic this character `knows` (checked at compile/load,
     *   not here)
     * @returns this for chaining
     */
    burdenedBy(topic: string): CharacterBuilder;
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
 * Named cognitive profile presets (ADR-141, renamed per ADR-310 D5)
 *
 * Documented example profiles named for the behavior they produce, not a
 * diagnosis. These are starting points for authors, not platform-level
 * constants. Authors override any dimension via the builder's
 * cognitiveProfile() method, or ignore all eight and compose from
 * dimensions.
 *
 * Public interface: COGNITIVE_PRESETS, CognitivePresetName.
 * Owner context: @sharpee/character
 */
import { type CognitiveProfile } from '@sharpee/world-model';
/**
 * Names of built-in cognitive presets (ADR-310 D5 behavioral names — the
 * clinical names they replaced are gone; dimension values are unchanged).
 */
export type CognitivePresetName = 'clear-headed' | 'fixated' | 'elsewhere' | 'loosened' | 'fogged' | 'braced' | 'unmoored' | 'unquiet';
/**
 * Named cognitive profile presets.
 *
 * Each maps to the five-dimensional profile from ADR-141's table, under the
 * ADR-310 D5 behavioral names. A preset says what the character *does* —
 * never implies the five dimensions model a real condition.
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
import { CompiledCharacter } from './character-builder.js';
import { PropagationProfile } from './propagation/propagation-types.js';
import { GoalDef, MovementProfile } from './goals/goal-types.js';
import { InfluenceDef, ResistanceDef } from './influence/influence-types.js';
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
    /**
     * The authored starting mood as valence-arousal axes — the mood-decay
     * baseline for the tick phase (ADR-310 D6). Always present: the builder
     * defaults the starting mood when the author does not set one.
     */
    baselineMood: {
        valence: number;
        arousal: number;
    };
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

### apply-compiled

```typescript
/**
 * Apply COMPILED-STORY character data to an entity (ADR-310 Phase 3).
 *
 * The one seam between the Chord compiler's wire shape (IRCharacter,
 * words never numbers) and the character model: the story-loader calls
 * this at load (Phase 5), and the AC1 round-trip tests call it directly.
 * It drives the normalized CharacterBuilder, so the produced trait is the
 * builder's own output for the same declaration — ADR-310 Acceptance 1 by
 * construction, with word-mapping and completion defects still caught.
 *
 * Public interface: applyCompiledCharacter, CompiledCharacterContext.
 * Owner context: @sharpee/character
 */
import type { IFEntity, TemperamentDef } from '@sharpee/world-model';
import type { IRCharacter, IRMoodDef, IRWordDef, IRTemperamentDef } from '@sharpee/chord';
import { AppliedCharacter } from './apply.js';
/**
 * Story-level context for compiled character application: the custom
 * vocabulary the story's `define mood` / `define personality` lines
 * declared (StoryIR.customMoods / customPersonalities), plus the loader's
 * IR→world entity-id mapping.
 */
export interface CompiledCharacterContext {
    customMoods?: readonly IRMoodDef[];
    customPersonalities?: readonly IRWordDef[];
    /**
     * Maps a wire entity ref (IR id) to the built world entity id. The
     * LOADER owns the mapping (it is the only party holding both id
     * spaces); this seam owns the walk over every ref-bearing field.
     * Absent = identity (direct seam callers, AC1 round-trip tests).
     * Implementations should throw on an unresolvable id — an unresolved
     * ref here is rogue IR, not a story state.
     */
    resolveEntityId?: (irId: string) => string;
}
/**
 * Map compiled `define temperament` defs (plus the compiler's synthesized
 * inline/override defs) to the arbiter's registry shape — the loader hands
 * the result to ArbiterContext.temperamentDefs at load (ADR-318 D3).
 *
 * @param defs - StoryIR.temperaments
 * @returns name → TemperamentDef record
 */
export declare function temperamentDefsFrom(defs: readonly IRTemperamentDef[]): Record<string, TemperamentDef>;
/**
 * Apply compiled-story character data to an entity: builds the
 * CharacterModelTrait via the normalized builder and attaches it,
 * returning the same shape applyCharacter returns (trait, service
 * configs, mood-decay baseline).
 *
 * @param entity - The NPC entity to apply the character model to
 * @param data - The entity's compiled character block (IREntity.character)
 * @param ctx - Story-level custom vocabulary, if any
 * @returns The trait and compiled behavior configuration
 */
export declare function applyCompiledCharacter(entity: IFEntity, data: IRCharacter, ctx?: CompiledCharacterContext): AppliedCharacter;
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
import { type Mood, type Coherence } from '@sharpee/world-model';
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
    /**
     * What this line asserts (ADR-318 D9: `claims <fact> is <value>`).
     * Prose is opaque — this one tag is the bridge. Lines that assert
     * nothing carry nothing. Compile-checked against the fact's value set
     * by the Chord compiler; the runtime trusts it.
     */
    claims?: {
        factId: string;
        value: string;
    };
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

### conversation/claims

```typescript
/**
 * Claim delivery bookkeeping (ADR-318 D9 / contracts.md §4)
 *
 * The lie ledger's two rules, shared by every dialogue surface (the TS
 * dialogue extension and the loader's topic dispatch):
 *
 * - Pin rule: a pinned claim to an audience forbids delivering a line
 *   whose claim contradicts the pinned value — mood and disposition
 *   drift cannot evaporate a maintained lie. The hold lasts exactly as
 *   far as D9 says: at the speaker's own `breaking` band the pin stops
 *   gating (seam-4 ruling 2026-08-16), so the truth can escape through
 *   the crack whatever order the lies were told in. Gating suspension is
 *   not release — the entry stays pinned (release is seam 3's question).
 * - Mint rule: delivering a line whose claim contradicts the speaker's
 *   own held belief mints a pinned ledger entry; honest assertion mints
 *   nothing (disagreement is not lying); every pinned delivery — mint or
 *   maintenance of the pinned value — is a duty defeat feeding
 *   conscience pressure. Honestly contradicting one's own pin (only
 *   reachable at breaking) is neither: no mint, no maintenance, no cost —
 *   it is the truth reaching the lie's audience, and it releases exactly
 *   that pin (seam-3 ruling 2026-08-16: release is PER AUDIENCE — pins to
 *   audiences who never got the truth keep holding; discharge drains the
 *   curve, never the ledger).
 *
 * Public interface: pinAllowsClaim, recordClaimDelivery, ClaimTag.
 * Owner context: @sharpee/character / conversation
 */
import { type ISemanticEvent } from '@sharpee/core';
import { CharacterModelTrait } from '@sharpee/world-model';
/** What a response line asserts: `(factId, value)` (ADR-318 D9). */
export interface ClaimTag {
    factId: string;
    value: string;
}
/**
 * Whether an active pin permits delivering a line with this claim tag.
 * Lines that claim nothing are always allowed.
 *
 * @param trait - The speaker's trait
 * @param audienceId - Who the line would be delivered to
 * @param claims - The line's claim tag, if any
 * @returns False exactly when a pin to this audience holds a different
 *   value AND the speaker is below `breaking` — at breaking the pin no
 *   longer gates (ADR-318 D9: the hold lasts "until … conscience
 *   breaking"; seam-4 ruling 2026-08-16)
 */
export declare function pinAllowsClaim(trait: CharacterModelTrait, audienceId: string, claims: ClaimTag | undefined): boolean;
/**
 * Ledger bookkeeping for a delivered claim (ADR-318 D9).
 *
 * Mint rule as documented above. Re-delivering an already-pinned claim
 * mints no duplicate, but every pinned selection deposits pressure —
 * maintaining a lie costs by construction.
 *
 * @param trait - The speaker's trait (mutated: ledger, pressure)
 * @param npcId - The speaker's entity id (author-channel attribution)
 * @param audienceId - Who the claim was delivered to
 * @param claims - The line's claim tag
 * @param turn - Current turn number
 * @returns Author-channel events for the mint/maintenance/deposit (ADR-318 D11)
 */
export declare function recordClaimDelivery(trait: CharacterModelTrait, npcId: string, audienceId: string, claims: ClaimTag, turn: number): ISemanticEvent[];
```

### conversation/conversation-marker

```typescript
/**
 * Conversation marker (ADR-310 D16 lifecycle rule)
 *
 * "A conversation in progress suppresses goal pursuit": every dialogue
 * delivery stamps the marker on the speaker's trait (D17 — it rides the
 * trait, so it saves and restores), and the goal sub-step skips step
 * execution while the marker is fresh. Freshness is turn distance
 * against the lifecycle's decay threshold — the marker is never cleared
 * in place, only superseded or outgrown, so no per-turn mutation exists.
 *
 * Both dialogue surfaces stamp through here: the chord topic dispatch
 * (story-loader's topic arm) and the TS-API selector socket — one
 * semantics, the same pattern as the claim bookkeeping in claims.ts.
 *
 * Public interface: markConversationTurn, conversationSuppressesGoals.
 * Owner context: @sharpee/character / conversation
 */
import type { CharacterModelTrait } from '@sharpee/world-model';
/**
 * Stamp the conversation marker: dialogue reached this character from
 * `partnerId` on `currentTurn`. Overwrites any earlier marker.
 *
 * @param trait - The speaker's character model trait (mutated)
 * @param partnerId - The conversing actor (the player on both surfaces)
 * @param currentTurn - The turn the dialogue happened in
 */
export declare function markConversationTurn(trait: CharacterModelTrait, partnerId: string, currentTurn: number): void;
/**
 * Whether a conversation in progress suppresses this character's goal
 * pursuit (ADR-310 D16). True while the last dialogue delivery is within
 * the suppression window; goal ACTIVATION is unaffected — D8's
 * `active when` still re-evaluates every turn, the goal simply does not
 * act.
 *
 * @param trait - The character model trait to consult
 * @param currentTurn - The turn being evaluated
 * @returns True if pursuit is suppressed this turn
 */
export declare function conversationSuppressesGoals(trait: CharacterModelTrait, currentTurn: number): boolean;
```

### conversation/author-events

```typescript
/**
 * Author-channel event helper (ADR-318 D11)
 *
 * One constructor for `character.author.*` events shared by every
 * dialogue surface (the TS dialogue extension and the loader's topic
 * dispatch). Author events carry no message ID and never render as
 * player prose (ADR-310 D12).
 *
 * Public interface: createAuthorEvent.
 * Owner context: @sharpee/character / conversation
 */
import { type ISemanticEvent } from '@sharpee/core';
/**
 * Build an author-channel event.
 *
 * @param type - Event type (`character.author.*`)
 * @param npcId - The NPC the event attributes to
 * @param data - Event payload (diagnostic data, never prose)
 * @returns The semantic event
 */
export declare function createAuthorEvent(type: string, npcId: string, data: Record<string, unknown>): ISemanticEvent;
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
import { ResponseCandidate, ResponseAction, ConversationRecord, ConversationEntry, EvidenceEntry } from './response-types.js';
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
 * Superseded surface: the skeleton's continuation scheduling
 * (`ContinuationEntry`, `scheduleAfter`, `getContinuationMessage`) was
 * retired in ADR-320 Phase 10.3 — authored multi-beat continuation is the
 * conversation-thread construct (`define conversation`, ADR-320 D14),
 * whose runtime lives in `thread-runtime.ts`.
 *
 * Public interface: ContinuationIntent, ConversationStrength, ConversationContext,
 *   InitiativeTrigger, ConversationLifecycle.
 * Owner context: @sharpee/character / conversation
 */
import type { SceneStrength } from '@sharpee/world-model';
import type { InterruptionOutcome } from './scene-scoring.js';
/**
 * How the NPC feels about continuing the conversation. Renamed from
 * `ConversationIntent` (contracts.md §7) — that name now belongs solely to
 * the world-model dialogue-selector socket's ask/tell/say/talk-to intent.
 */
export type ContinuationIntent = 'eager' | 'reluctant' | 'hostile' | 'confessing' | 'neutral';
/**
 * How aggressively the NPC holds the player's attention. One declaration
 * with the scene's grip vocabulary (contracts.md §7): world-model's
 * `SceneStrength` is the shared lower-package union; this is its alias.
 */
export type ConversationStrength = SceneStrength;
/**
 * Result of attempting to redirect attention away from the current NPC.
 * One declaration with the scene's `InterruptionOutcome` (contracts.md §7).
 */
export type RedirectResult = InterruptionOutcome;
/**
 * Default number of non-conversation turns before a conversation decays,
 * keyed by intent. Authors can override per conversation context.
 */
export declare const DEFAULT_DECAY_THRESHOLDS: Record<ContinuationIntent, number>;
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
    intent: ContinuationIntent;
    /** Current conversation strength. */
    strength: ConversationStrength;
    /** Decay threshold (non-conversation turns before conversation ends). */
    decayThreshold: number;
    /** Number of non-conversation turns elapsed since last conversation action. */
    nonConversationTurns: number;
    /** Optional context label (e.g., 'confessing', 'caught'). */
    contextLabel?: string;
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
    begin(npcId: string, intent?: ContinuationIntent, strength?: ConversationStrength): void;
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
    setContext(label: string, intent?: ContinuationIntent, strength?: ConversationStrength, decayThreshold?: number): void;
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
import { CharacterModelTrait, type Mood, type CognitiveProfile } from '@sharpee/world-model';
import { ResponseCandidate, ResponseIntent } from './response-types.js';
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
import { type ISemanticEvent } from '@sharpee/core';
import { ResponseIntent } from './response-types.js';
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
    /**
     * Author-channel events this selection produced (ADR-318 D11 — ledger
     * mints, pressure deposits, band transitions). Never player prose.
     */
    authorEvents?: ISemanticEvent[];
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
import { type Mood, type DispositionWord } from '@sharpee/world-model';
import { CharacterBuilder } from '../character-builder.js';
import { TopicDef } from './topic-registry.js';
import { ResponseCandidate } from './response-types.js';
import { ContinuationIntent, ConversationStrength, InitiativeTrigger } from './lifecycle.js';
/** State mutations triggered by a response. */
export interface ResponseStateMutation {
    threat?: number;
    mood?: Mood;
    disposition?: Record<string, DispositionWord>;
}
/** Context settings attached to a response. */
export interface ResponseContextSettings {
    label: string;
    intent?: ContinuationIntent;
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
        intent?: ContinuationIntent;
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
import { DialogueExtension, DialogueResult } from './dialogue-types.js';
import { ConstraintEvaluator } from './constraint-evaluator.js';
import { ConversationLifecycle } from './lifecycle.js';
import { ConversationData } from './builder.js';
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
     *
     * @param npcId - The NPC entity ID
     * @param aboutText - The raw text after "about"
     * @param audienceId - Who is asking — the lie ledger's audience (ADR-318 D9)
     */
    handleAsk(npcId: string, aboutText: string, audienceId?: string): DialogueResult;
    /**
     * Handle TELL [npc] ABOUT [text].
     * Confrontation path — the player presents information.
     *
     * @param npcId - The NPC entity ID
     * @param aboutText - The raw text after "about"
     * @param audienceId - Who is telling — the lie ledger's audience (ADR-318 D9)
     */
    handleTell(npcId: string, aboutText: string, audienceId?: string): DialogueResult;
    /**
     * Handle SAY [text] or SAY [text] TO [npc].
     * Routes free speech through topic resolution.
     */
    handleSay(npcId: string | undefined, spokenText: string, audienceId?: string): DialogueResult;
    /**
     * Handle TALK TO [npc].
     * Initiates conversation lifecycle.
     */
    handleTalkTo(npcId: string): DialogueResult;
    /**
     * Select the best response for a topic and record it in the evaluator.
     *
     * Evaluates constraints across all authored responses, picks the best
     * match, and records the interaction. The lie ledger is consulted
     * before scoring (ADR-318 D9 / contracts.md §4): a pinned claim to this
     * audience filters out contradicting lines — mood and disposition drift
     * cannot evaporate a maintained lie — and the selection's own claim
     * mints or maintains ledger entries afterward.
     *
     * @param npc - NPC conversation state
     * @param npcId - The NPC entity ID
     * @param topicName - The resolved topic name
     * @param authoredResponses - Authored responses for this trigger
     * @param audienceId - The ledger audience (the conversing player); no
     *   audience → no pin filtering, no minting
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

### conversation/scene-scoring

```typescript
/**
 * Floor and interruption scoring shapes (ADR-320 D7/D10; adr-320
 * contracts.md §5)
 *
 * The forces-feed-arbitration idiom (ADR-318), pointed at "do I speak?":
 * disposition-under-circumstance readings bid for the floor, an authored
 * row forces or suppresses the moment where written (D7 most-specific-
 * wins), and interruption resolves as strength-vs-motivation (D10) with
 * world acts breaking even `blocking` (D8's exemption). The occasion and
 * floor shapes are declared in `@sharpee/world-model`'s scene-runtime
 * binding (Phase 6 amendment — stdlib names them across the package
 * boundary) and re-exported here; the scoring functions stay HERE.
 *
 * Every shape is platform-internal (contracts.md §7) — NOT author-facing
 * compatibility surface; revisable at refactor cost.
 *
 * Public interface: SceneOccasion, FloorBid, FloorDecision,
 *   InterruptionChallenge, InterruptionOutcome, scoreFloor,
 *   resolveInterruption, sceneGrip, strengthFromIntent.
 * Owner context: @sharpee/character / conversation
 */
import type { ConversationSceneState, SceneStrength, FloorBid, FloorDecision, InterruptionOutcome } from '@sharpee/world-model';
import type { ContinuationIntent } from './lifecycle.js';
export type { SceneOccasion, FloorBid, FloorDecision } from '@sharpee/world-model';
export type { InterruptionOutcome } from '@sharpee/world-model';
/**
 * An outsider — PC included — challenging a scene's grip (ADR-320 D10).
 * `worldAct` marks world events and acts, which break even a `blocking`
 * scene (D8's exemption: a gunshot interrupts anything).
 */
export interface InterruptionChallenge {
    /** The scene being challenged. */
    sceneId: string;
    /** The would-be interrupter. */
    interrupterId: string;
    /** The interrupter's motivation, as a floor bid. */
    bid: FloorBid;
    /** True for world events and acts — breaks even `blocking` (D8). */
    worldAct: boolean;
}
/**
 * Resolve a floor contest (ADR-320 D7/D10): an authored `forces` row wins
 * outright and an authored `suppresses` row withdraws its bid (D7
 * most-specific-wins — authored rows beat disposition both ways);
 * otherwise the most motivated live bid seizes the moment, and nobody
 * does when no bid carries live motivation. Every bid — losers and
 * suppressed included — is retained on the decision so non-speakers'
 * manner can still react (one speaker, many tells).
 *
 * @param bids - Every participant's bid for the occasion
 * @returns The decision: winner (or null) plus all bids considered
 */
export declare function scoreFloor(bids: FloorBid[]): FloorDecision;
/**
 * The scene's effective grip against interruption (ADR-320 D10): the open
 * exchange's authored strength is the innermost word and wins, then the
 * scene's own, then the caller-derived fallback (absent markers derive
 * from intent at runtime — `strengthFromIntent`).
 *
 * @param scene - The challenged scene
 * @param fallback - The intent-derived strength when nothing is authored
 * @returns The effective strength
 */
export declare function sceneGrip(scene: ConversationSceneState, fallback?: SceneStrength): SceneStrength;
/**
 * Resolve an interruption challenge (ADR-320 D10): a world event or act
 * breaks any grip — even `blocking` (D8's exemption); otherwise the
 * grip answers — `passive` yields, `assertive` protests then yields,
 * `blocking` blocks. The caller closes or re-floors the scene on
 * `yields`/`protests`; on `blocks` the scene holds.
 *
 * @param challenge - The challenge (interrupter, bid, world-act flag)
 * @param strength - The scene's effective grip (see `sceneGrip`)
 * @returns The outcome word
 */
export declare function resolveInterruption(challenge: InterruptionChallenge, strength: SceneStrength): InterruptionOutcome;
/**
 * Derive a scene's grip from its holder's continuation intent when no
 * strength is authored (contracts.md §1.1 — "absent = derived from intent
 * at runtime"). Runtime-owned mapping: the intents that want the
 * conversation to continue (`eager`, `confessing`) protest interruption;
 * the rest let it go. `blocking` is never derived — only authored.
 *
 * @param intent - The holder's continuation intent
 * @returns The derived strength
 */
export declare function strengthFromIntent(intent: ContinuationIntent): SceneStrength;
```

### conversation/scene-store

```typescript
/**
 * Scene store — write side (ADR-320 D4; adr-320 contracts.md §1.3 as
 * amended for Phase 6)
 *
 * The store shape and the pure reads live in `@sharpee/world-model`
 * (`conversation-scene-store.ts`) so stdlib's dispatch and this runtime
 * share one declaration; they are re-exported here so the runtime's
 * internal call sites keep one import home. The write stays HERE: the
 * scene runtime is the store's single writer — every other consumer
 * reads.
 *
 * Public interface: CHARACTER_SCENES_KEY, SceneStoreState, readSceneStore,
 *   writeSceneStore, liveScenes, sceneOf, sceneWith.
 * Owner context: @sharpee/character / conversation
 */
import { type WorldModel, type SceneStoreState } from '@sharpee/world-model';
export { CHARACTER_SCENES_KEY, readSceneStore, liveScenes, sceneOf, sceneWith, type SceneStoreState, } from '@sharpee/world-model';
/**
 * Write the scene store back to world state. Scene-runtime-only — every
 * other consumer reads.
 *
 * @param world - The live world
 * @param state - The store state to persist
 */
export declare function writeSceneStore(world: WorldModel, state: SceneStoreState): void;
```

### conversation/scene-runtime

```typescript
/**
 * Scene runtime — open, close, floor, exchange, and decay (ADR-320 D4;
 * adr-320 contracts.md §1)
 *
 * The one writer of the scene store: scenes open against per-pair memory
 * (first-meeting vs return boundaries), moves stamp the floor clock,
 * selector-issued directives mutate scene state (the selector computes,
 * this runtime mutates — the arbiter discipline), closes fold the scene
 * into both sides' conversation memory, and unattended scenes decay into
 * a `silence` close (the ADR-142 attention-decay machinery wired live).
 * All turn reads go through the character clock seam (D6).
 *
 * Public interface: OpenSceneOptions, openScene, closeScene,
 *   recordSceneMove, applySceneDirectives, stampThreadContinuability,
 *   ageScenes.
 * Owner context: @sharpee/character / conversation
 */
import type { WorldModel, ConversationSceneState, SceneBoundaryKind, SceneOpenedBy, SceneStrength, SceneDirective, SceneWireEvent, ThreadContinuability } from '@sharpee/world-model';
import { type ConversationMemoryAccess } from './conversation-memory.js';
/** What a caller supplies to open a scene. */
export interface OpenSceneOptions {
    /** Everyone in the scene, PC included (at least two). */
    participantIds: string[];
    /** How the scene opened (selects boundary rows, seeds aboutness). */
    openedBy: SceneOpenedBy;
    /** Authored scene strength, if any (D10); absent = derived at read time. */
    strength?: SceneStrength;
}
/**
 * Open a scene (ADR-320 D4). Mints the id, seats the participants, and
 * gives an addressing/initiating opener the floor (a witnessed-event
 * opening leaves the floor contested). Enforces the store's invariants:
 * at least two participants, none already in a live scene.
 *
 * @param world - The live world
 * @param options - Participants, opener, optional strength
 * @returns The opened scene and its wire events
 * @throws Error when the participant invariants are violated
 */
export declare function openScene(world: WorldModel, options: OpenSceneOptions): {
    scene: ConversationSceneState;
    wireEvents: SceneWireEvent[];
};
/**
 * Close a scene (ADR-320 D4/D6): removes it from the store and folds it
 * into conversation memory — every ordered participant pair records a
 * completed visit and the close turn (the access ignores unmodeled
 * holders; no model, no change).
 *
 * @param world - The live world
 * @param sceneId - The scene to close
 * @param boundary - Which boundary closed it (`exit` or `silence`)
 * @param memory - The per-pair memory home
 * @returns The scene-closed wire event, or none when the id is not live
 */
export declare function closeScene(world: WorldModel, sceneId: string, boundary: SceneBoundaryKind, memory: ConversationMemoryAccess): SceneWireEvent[];
/**
 * Stamp an on-floor move (utterance, act, or event — one vocabulary):
 * resets the scene's silence clock.
 *
 * @param world - The live world
 * @param sceneId - The scene the move landed in
 */
export declare function recordSceneMove(world: WorldModel, sceneId: string): void;
/**
 * Stamp a topic move onto the scene's thread (ADR-320 D9; Phase 7 design
 * §6): a topic differing from the live thread abandons it —
 * `subjectChangedTurn` stamps the abandoning turn (the evaluator's
 * `subject-changes` and Phase 8's subject-change occasion read it) and
 * the new topic becomes the thread. The same topic again is not a change.
 *
 * @param world - The live world
 * @param sceneId - The scene the topic move landed in
 * @param topic - The normalized topic of the move
 */
export declare function noteTopicMove(world: WorldModel, sceneId: string, topic: string): void;
/**
 * Stamp — or clear — a scene's active-thread continuability snapshot
 * (ADR-320 D14; the D12 affordance surface). Written HERE because the
 * scene runtime is the store's single writer; callers (the thread
 * dispatch and the thread floor turn, Phase 10.4) compute the record via
 * `threadContinuabilityFor` after each thread mutation. `undefined`
 * clears it — the record disappears when no thread is active, the
 * exchange-affordances never-stale discipline.
 *
 * @param world - The live world
 * @param sceneId - The scene the affordance describes
 * @param continuability - The fresh record, or undefined to clear
 */
export declare function stampThreadContinuability(world: WorldModel, sceneId: string, continuability: ThreadContinuability | undefined): void;
/**
 * Apply a selection's scene directives (adr-320 contracts.md §4): the
 * selector stays pure and this runtime performs the lifecycle it asked
 * for. `open-exchange` replaces any open exchange (at most one — a chained
 * `then asks` hands the moment over); `close-scene` folds memory like any
 * close.
 *
 * @param world - The live world
 * @param sceneId - The scene the directives target
 * @param directives - The selection's directives, in order
 * @param memory - The per-pair memory home (for `close-scene`)
 * @returns Wire events the directives produced
 */
export declare function applySceneDirectives(world: WorldModel, sceneId: string, directives: SceneDirective[], memory: ConversationMemoryAccess): SceneWireEvent[];
/**
 * Decay unattended scenes (ADR-142's attention decay, wired live): a
 * scene with no on-floor move for `threshold` turns closes on the
 * `silence` boundary. The default threshold is the neutral continuation
 * intent's decay (intent-aware thresholds arrive with dispatch wiring,
 * which knows each scene's holder intent).
 *
 * @param world - The live world
 * @param memory - The per-pair memory home
 * @param threshold - Silent turns before a scene closes
 * @returns The scene-closed wire events, oldest scene first
 */
export declare function ageScenes(world: WorldModel, memory: ConversationMemoryAccess, threshold?: number): SceneWireEvent[];
```

### conversation/conversation-memory

```typescript
/**
 * Conversation memory — per-pair tracking and the word curves (ADR-320
 * D4/D6/D9; adr-320 contracts.md §2)
 *
 * Each modeled character holds its own per-partner view (the disposition
 * precedent): completed-scene visits, last-close turn, discussed topics,
 * and per-topic ask counts. Numbers never reach Chord — recency, absence,
 * and repetition all surface as the frozen words, with this module owning
 * every curve, reading time only through the character clock seam (D6).
 *
 * Storage home: `ICharacterModelData` gains the field in Phase 7. Until
 * then callers supply a `ConversationMemoryAccess` — the runtime mutates
 * through it, tests back it with a Map, and Phase 7 plugs the trait in
 * without touching this module.
 *
 * Public interface: ConversationMemoryAccess, createMapMemoryAccess,
 *   emptyConversationMemory, recordSceneClosed, recordTopicDiscussed,
 *   recordAsked, wasDiscussed, boundaryKindOnOpen, recencyWordFor,
 *   absenceWordFor, askedWordFor, RECENCY_WORDS, ABSENCE_WORDS, ASKED_WORDS.
 * Owner context: @sharpee/character / conversation
 */
import type { ConversationMemory } from '@sharpee/world-model';
/**
 * Where a holder's per-partner memory lives. `get` returns undefined for
 * a pair with no history yet — and implementations for unmodeled holders
 * simply ignore `set` (no model, no change; ADR-310 D7).
 */
export interface ConversationMemoryAccess {
    /** The holder's memory of a partner, or undefined when blank. */
    get(holderId: string, partnerId: string): ConversationMemory | undefined;
    /** Persist the holder's memory of a partner. */
    set(holderId: string, partnerId: string, memory: ConversationMemory): void;
}
/**
 * A Map-backed access — the Phase 5 test double and any caller that has
 * not yet re-homed memory onto the trait (Phase 7).
 *
 * @returns A fresh, empty access
 */
export declare function createMapMemoryAccess(): ConversationMemoryAccess;
/** A blank per-pair memory (no visits, nothing discussed). */
export declare function emptyConversationMemory(): ConversationMemory;
/**
 * Record a completed scene between holder and partner: increments the
 * visit count and stamps the close turn (absence words age off it).
 *
 * @param access - The memory home
 * @param holderId - The remembering side
 * @param partnerId - The partner
 * @param closedTurn - The turn the scene closed (clock-seam sourced)
 */
export declare function recordSceneClosed(access: ConversationMemoryAccess, holderId: string, partnerId: string, closedTurn: number): void;
/**
 * Record a topic as discussed between holder and partner (D9 — the
 * `was discussed` predicate's ground truth, tracked across scenes).
 *
 * @param access - The memory home
 * @param holderId - The remembering side
 * @param partnerId - The partner
 * @param topic - The normalized topic key
 */
export declare function recordTopicDiscussed(access: ConversationMemoryAccess, holderId: string, partnerId: string, topic: string): void;
/**
 * Record one asking of a topic (repetition words read the count).
 *
 * @param access - The memory home
 * @param holderId - The remembering side
 * @param partnerId - The asker
 * @param topic - The normalized topic key
 */
export declare function recordAsked(access: ConversationMemoryAccess, holderId: string, partnerId: string, topic: string): void;
/**
 * Whether holder and partner have discussed a topic (D9 `was discussed`).
 *
 * @param access - The memory home
 * @param holderId - The remembering side
 * @param partnerId - The partner
 * @param topic - The normalized topic key
 * @returns True when the topic is in the pair's discussed set
 */
export declare function wasDiscussed(access: ConversationMemoryAccess, holderId: string, partnerId: string, topic: string): boolean;
/**
 * Which opening boundary a new scene with this partner presents (D4):
 * `first-meeting` when the pair has no completed scene, `return` after.
 *
 * @param access - The memory home
 * @param holderId - The remembering side
 * @param partnerId - The partner
 * @returns The opening boundary kind
 */
export declare function boundaryKindOnOpen(access: ConversationMemoryAccess, holderId: string, partnerId: string): 'first-meeting' | 'return';
/** The frozen recency scale (Phase 3 freeze §3). */
export declare const RECENCY_WORDS: readonly ["fresh", "recent", "stale"];
/** The frozen absence words on `return` boundaries (Phase 3 freeze). */
export declare const ABSENCE_WORDS: readonly ["again-so-soon", "after-a-while", "after-days"];
/** The frozen repetition words (Phase 3/4 freeze). */
export declare const ASKED_WORDS: readonly ["once", "again", "many-times"];
/**
 * The recency word for something learned/last-touched at `sinceTurn`,
 * read at `currentTurn` (D6 — the runtime's curve, revisable freely).
 *
 * @param currentTurn - The turn the read happens on (clock-seam sourced)
 * @param sinceTurn - The turn the thing was learned or last touched
 * @returns The recency word
 */
export declare function recencyWordFor(currentTurn: number, sinceTurn: number): (typeof RECENCY_WORDS)[number];
/**
 * The absence word a `return` boundary presents, from the last close turn.
 * Undefined when the pair has never closed a scene (no absence to name).
 *
 * @param currentTurn - The turn the read happens on (clock-seam sourced)
 * @param lastSceneClosedTurn - The pair's last close turn, if any
 * @returns The absence word, or undefined with no history
 */
export declare function absenceWordFor(currentTurn: number, lastSceneClosedTurn: number | undefined): (typeof ABSENCE_WORDS)[number] | undefined;
/**
 * The repetition word for a topic's ask count (1 → `once`, 2 → `again`,
 * 3+ → `many-times`). Undefined for a never-asked topic.
 *
 * @param count - The pair's ask count for the topic
 * @returns The repetition word, or undefined when never asked
 */
export declare function askedWordFor(count: number): (typeof ASKED_WORDS)[number] | undefined;
```

### conversation/manner

```typescript
/**
 * Manner beat selection (ADR-320 D5)
 *
 * A `define manner` block's rows are condition-gated beat sets. Selection
 * picks the first row whose condition holds (declaration order — the
 * analyzer already proved overlap rules at compile), then rotates through
 * that row's beats without back-to-back repeats. The rotation cursor
 * rides the scene store, so delivery replays byte-identically across
 * save/restore at the pinned seed. Silence is a manner-colored rendered
 * response like any other delivery (D8) — `renderSilence` builds its wire
 * event from the same selection path.
 *
 * Public interface: MannerSelection, selectMannerBeat, renderSilence.
 * Owner context: @sharpee/character / conversation
 */
import type { WorldModel, SceneWireEvent } from '@sharpee/world-model';
import type { IRMannerRow } from '@sharpee/chord';
/** A selected delivery coloring: the beat to emit and the row's voice. */
export interface MannerSelection {
    /** The beat phrase key to emit. */
    beatKey: string;
    /** The matched row's `voice` word, if declared (open vocabulary, data). */
    voice?: string;
    /** Index of the matched row (callers correlate with authored order). */
    rowIndex: number;
}
/**
 * Select the delivery beat for a speaker (ADR-320 D5): first matching row
 * in declaration order, then beat rotation within the row — the cursor
 * advances one beat per delivery and a row with two or more beats never
 * repeats back-to-back. Mutates the rotation cursor in the scene store.
 *
 * @param world - The live world (rotation cursor home)
 * @param ownerId - The speaking entity (cursor scope)
 * @param rows - The owner's compiled manner rows, declaration order
 * @param evalCondition - Row-condition evaluator (the loader's, bound by the caller)
 * @returns The selection, or undefined when no row matches (no manner coloring)
 */
export declare function selectMannerBeat(world: WorldModel, ownerId: string, rows: IRMannerRow[], evalCondition: (row: IRMannerRow) => boolean): MannerSelection | undefined;
/**
 * Render a silence (ADR-320 D8): a withheld reply is a delivery like any
 * other — manner-colored through the same selection path, emitted as a
 * `rendered-silence` wire event, never a bare absence.
 *
 * @param world - The live world (rotation cursor home)
 * @param sceneId - The scene the silence lands in
 * @param speakerId - The character staying silent
 * @param rows - The speaker's compiled manner rows, declaration order
 * @param evalCondition - Row-condition evaluator (the loader's, bound by the caller)
 * @returns The rendered-silence wire event (beats empty when no row matches)
 */
export declare function renderSilence(world: WorldModel, sceneId: string, speakerId: string, rows: IRMannerRow[], evalCondition: (row: IRMannerRow) => boolean): SceneWireEvent;
```

### conversation/initiative

```typescript
/**
 * Authored initiative (ADR-320 D7)
 *
 * `define initiative` rows force or suppress a seizure at their occasion —
 * most-specific-wins: an authored row always beats disposition scoring, in
 * either direction. This module matches a character's compiled rows
 * against a live occasion; the caller feeds the answer into `scoreFloor`
 * as the bid's `authored` field and runs a forcing row's body. A row whose
 * body is the lone `hold their tongue` statement suppresses (the analyzer
 * guarantees the alone-gate at compile).
 *
 * Public interface: AuthoredInitiative, authoredInitiativeFor.
 * Owner context: @sharpee/character / conversation
 */
import type { IRInitiativeRow } from '@sharpee/chord';
import type { SceneOccasion } from './scene-scoring.js';
/** An authored row's answer to an occasion. */
export interface AuthoredInitiative {
    /** Suppress when the body is the lone hold-tongue statement; else force. */
    authored: 'forces' | 'suppresses';
    /** The matching row (a forcing row's body is the seizure's script). */
    row: IRInitiativeRow;
}
/**
 * The authored answer to an occasion, if any (ADR-320 D7): the first row
 * in declaration order whose occasion head matches and whose `, when`
 * refinement holds. `goal-step` occasions never match — the goal surface
 * is deliberately unsurfaced in initiative authoring (Phase 4 freeze).
 *
 * @param rows - The character's compiled initiative rows, declaration order
 * @param occasion - The live occasion
 * @param evalCondition - Refinement evaluator (the loader's, bound by the caller)
 * @param witnessedAction - For witnessed-event occasions, the committed action id
 * @returns The authored answer, or undefined when disposition decides
 */
export declare function authoredInitiativeFor(rows: IRInitiativeRow[], occasion: SceneOccasion, evalCondition: (row: IRInitiativeRow) => boolean, witnessedAction?: string): AuthoredInitiative | undefined;
```

### conversation/thread-runtime

```typescript
/**
 * Conversation-thread runtime — open, resume, park, advance, conclude
 * (ADR-320 D14; Phase 10.3)
 *
 * The one writer of per-pair thread state: an author-scripted subject the
 * owner carries beat by beat to a defined conclusion, across as many
 * sittings as it takes. State lives on the owner's trait
 * (`CharacterModelTrait.conversationThreads`, schema v3 — Phase 10.2's
 * home), so it rides the world snapshot, survives scene closes and day
 * boundaries, and restores mid-beat. The compiled `define conversation`
 * shape (`IRConversation`, Phase 10.1) is this runtime's fixed input;
 * serving a beat's statement body is the loader's (Phase 10.4) — this
 * module owns cursor/status mutations, the D14 transition table, and the
 * wire events. All turn reads go through the character clock seam (D6).
 *
 * Public interface: threadStateFor, activeThreadFor, ThreadTransition,
 *   resolveThreadTransition, openThread, resumeThread, parkThread,
 *   ThreadAdvance, advanceThreadBeat, concludeThread, ThreadMove,
 *   readyThreadMove, threadContinuabilityFor.
 * Owner context: @sharpee/character / conversation
 */
import { type WorldModel, type ConversationThreadState, type SceneStrength, type SceneWireEvent, type ThreadContinuability } from '@sharpee/world-model';
import { type IRCondition, type IRConversation, type IRStatement } from '@sharpee/chord';
import { type ConversationMemoryAccess } from './conversation-memory.js';
/** A hold-gate/`opens when` evaluator, bound by the caller (the loader's). */
export type ThreadConditionEval = (condition: IRCondition) => boolean;
/**
 * The owner's state for one thread with one partner, or undefined when the
 * thread has never engaged (pre-v3 rehydrated traits lack the field — the
 * absence reads the same).
 *
 * @param world - The live world
 * @param ownerId - The thread's owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @param threadKey - The `define conversation` key
 * @returns The per-pair state, or undefined
 */
export declare function threadStateFor(world: WorldModel, ownerId: string, partnerId: string, threadKey: string): ConversationThreadState | undefined;
/**
 * The pair's one ACTIVE thread, or undefined (the at-most-one-ACTIVE
 * invariant's read side).
 *
 * @param world - The live world
 * @param ownerId - The thread owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @returns The active thread's key and state, or undefined
 */
export declare function activeThreadFor(world: WorldModel, ownerId: string, partnerId: string): {
    threadKey: string;
    state: ConversationThreadState;
} | undefined;
/**
 * How an ACTIVE thread answers an off-thread ask (ADR-320 D14): `parks`
 * silently by default (`on parting` renders if authored), `protests-then-
 * parks` renders `on parting` as one authored beat of resistance then
 * yields, `refuses` turns the ask back into the thread (the authored
 * `on refusing:` row first, the current beat re-served otherwise).
 */
export type ThreadTransition = 'parks' | 'protests-then-parks' | 'refuses';
/**
 * The strength-governed transition answer (ADR-320 D14's table). Pure —
 * the caller parks/serves/refuses accordingly.
 *
 * @param strength - The ACTIVE thread's effective strength
 * @returns The transition word
 */
export declare function resolveThreadTransition(strength: SceneStrength): ThreadTransition;
/**
 * Open a thread fresh (ADR-320 D14): first engagement of the pair — a
 * matching ask or an `opens when` occasion. Writes `active`/cursor 0.
 *
 * @param world - The live world
 * @param sceneId - The scene the opening lands in (wire attribution)
 * @param ownerId - The thread owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @param threadKey - The `define conversation` key
 * @returns The thread-opened wire event (empty for an unmodeled owner)
 * @throws Error when the pair already has state for this thread, or
 *   another thread is ACTIVE for the pair
 */
export declare function openThread(world: WorldModel, sceneId: string, ownerId: string, partnerId: string, threadKey: string): SceneWireEvent[];
/**
 * Resume a parked thread (ADR-320 D14): re-engagement at the held cursor
 * — same scene, the next day, or after a restore alike. The caller serves
 * the authored `on resuming:` row alongside.
 *
 * @param world - The live world
 * @param sceneId - The scene the resumption lands in
 * @param ownerId - The thread owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @param threadKey - The `define conversation` key
 * @returns The thread-resumed wire event (empty for an unmodeled owner)
 * @throws Error when the thread is not PARKED, or another thread is
 *   ACTIVE for the pair
 */
export declare function resumeThread(world: WorldModel, sceneId: string, ownerId: string, partnerId: string, threadKey: string): SceneWireEvent[];
/**
 * Park the ACTIVE thread (ADR-320 D14): the subject switched away, the
 * scene closed, or the player left — the cursor holds. The caller serves
 * the authored `on parting:` row alongside (silently absent for a passive
 * thread with none authored).
 *
 * @param world - The live world
 * @param sceneId - The scene the parking lands in
 * @param ownerId - The thread owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @param threadKey - The `define conversation` key
 * @returns The thread-parked wire event (empty for an unmodeled owner)
 * @throws Error when the thread is not ACTIVE
 */
export declare function parkThread(world: WorldModel, sceneId: string, ownerId: string, partnerId: string, threadKey: string): SceneWireEvent[];
/**
 * Park every ACTIVE thread between the scene's participants (ADR-320
 * D14's persistence clause): a scene close never resets a thread — it
 * parks it, cursor held, so the next engagement is a resume (`on
 * resuming` renders whether the gap is three turns, a day boundary, or a
 * restore). Called by `closeScene` for every ordered participant pair;
 * unmodeled holders read blank and nothing changes.
 *
 * @param world - The live world
 * @param sceneId - The closing scene (wire attribution)
 * @param participantIds - The scene's participants
 * @returns The thread-parked wire events, holder order
 */
export declare function parkActiveThreadsOnClose(world: WorldModel, sceneId: string, participantIds: string[]): SceneWireEvent[];
/**
 * Conclude the ACTIVE thread (ADR-320 D14): status CONCLUDED — terminal —
 * and every `about` topic candidate recorded discussed on BOTH sides'
 * conversation memory (the "topics record as discussed" clause; the
 * `is concluded` evaluator reads the status straight off the trait).
 *
 * @param world - The live world
 * @param sceneId - The scene the conclusion lands in
 * @param ownerId - The thread owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @param thread - The compiled thread (key and `about` filter)
 * @param memory - The per-pair conversation-memory home
 * @returns The thread-concluded wire event (empty for an unmodeled owner)
 * @throws Error when the thread is not ACTIVE (conclusion fires once)
 */
export declare function concludeThread(world: WorldModel, sceneId: string, ownerId: string, partnerId: string, thread: IRConversation, memory: ConversationMemoryAccess): SceneWireEvent[];
/** What one advance served: a numbered beat, or the conclusion. */
export interface ThreadAdvance {
    /** `beat` while beats remain; `conclusion` on the final advance. */
    kind: 'beat' | 'conclusion';
    /** The statement body to serve (the loader executes it — Phase 10.4). */
    body: IRStatement[];
    /** Wire events the advance produced. */
    wireEvents: SceneWireEvent[];
}
/**
 * Advance the ACTIVE thread one beat (ADR-320 D14's advance clause —
 * fired on the owner's own floor turns AND on player continuation
 * prompts; both paths land here). A held beat advances on neither: an
 * open exchange in the pair's scene holds (a `then asks` beat waits for
 * its exchange to close), and an unmet `beat, when` hold-gate waits for
 * the world. Past the last beat, the advance serves the conclusion
 * (`concludeThread`).
 *
 * @param world - The live world
 * @param sceneId - The scene the advance lands in
 * @param ownerId - The thread owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @param thread - The compiled thread
 * @param evalCondition - Hold-gate evaluator (the loader's, bound by the caller)
 * @param memory - The per-pair conversation-memory home (conclusion's record)
 * @returns The served advance, or undefined when the beat is held
 * @throws Error when the thread is not ACTIVE for the pair
 */
export declare function advanceThreadBeat(world: WorldModel, sceneId: string, ownerId: string, partnerId: string, thread: IRConversation, evalCondition: ThreadConditionEval, memory: ConversationMemoryAccess): ThreadAdvance | undefined;
/**
 * The thread move an owner would make with the floor (ADR-320 D14): what
 * dispatch (Phase 10.4) turns into a forcing floor answer — threads claim
 * the owner's floor turns the way authored initiative rows claim their
 * occasions (D7 most-specific-wins), so disposition, interruption, and
 * decay stay unchanged around them.
 */
export type ThreadMove = {
    kind: 'advance';
    thread: IRConversation;
} | {
    kind: 'resume';
    thread: IRConversation;
} | {
    kind: 'open';
    thread: IRConversation;
};
/**
 * The pair's ready thread move, if any: the ACTIVE thread's next advance
 * when it is not held; otherwise the first declared thread whose `opens
 * when` holds — unopened opens fresh, parked resumes (a concluded thread
 * never re-engages).
 *
 * @param world - The live world
 * @param ownerId - The thread owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @param conversations - The owner's compiled threads, declaration order
 * @param evalCondition - Hold-gate/`opens when` evaluator (the loader's)
 * @returns The ready move, or undefined when no thread claims the moment
 */
export declare function readyThreadMove(world: WorldModel, ownerId: string, partnerId: string, conversations: IRConversation[], evalCondition: ThreadConditionEval): ThreadMove | undefined;
/**
 * The pair's thread continuability (ADR-320 D14, the D12 affordance
 * surface): present exactly while a thread is ACTIVE; `continuable` is
 * false while the next beat is held (unmet gate or open exchange).
 *
 * @param world - The live world
 * @param sceneId - The scene the affordance describes
 * @param ownerId - The thread owner (world id)
 * @param partnerId - The conversation partner (world id)
 * @param conversations - The owner's compiled threads
 * @param evalCondition - Hold-gate evaluator (the loader's)
 * @returns The continuability record, or undefined when no thread is active
 */
export declare function threadContinuabilityFor(world: WorldModel, sceneId: string, ownerId: string, partnerId: string, conversations: IRConversation[], evalCondition: ThreadConditionEval): ThreadContinuability | undefined;
```

### conversation/scene-binding

```typescript
/**
 * The world's scene runtime (ADR-320 D4/D7/D10; Phase 6 design §1 seam B)
 *
 * Implements `SceneRuntimeBinding` over the Phase 5 scene runtime and
 * registers it per world (idempotent last-wins; re-register on every
 * story load) so stdlib's conversation actions can drive scene lifecycle
 * across the package boundary. Floor bids are built here from
 * disposition-under-circumstance (D7): a runtime-owned propensity curve
 * over the closed personality words, damped by fear and paranoia,
 * compelled by the `breaking` pressure band — numbers never reach Chord,
 * and every threshold is revisable freely. Authored initiative rows
 * arrive through the registrar's `authoredFor` callback (the loader's,
 * Phase 7) and always beat disposition (D7 most-specific-wins).
 *
 * Public interface: SceneBindingOptions, createTraitMemoryAccess,
 *   createSceneRuntimeBinding, registerCharacterScenes.
 * Owner context: @sharpee/character / conversation
 */
import { WorldModel, type SceneRuntimeBinding, type SceneOccasion, type InitiativeSeizure } from '@sharpee/world-model';
import type { ConversationMemoryAccess } from './conversation-memory.js';
/**
 * The production memory home (ADR-320 Phase 7; contracts §2): per-pair
 * records live on the holder's `CharacterModelTrait.conversationMemory`,
 * so they ride the world snapshot with the rest of the model (D17). An
 * unmodeled holder reads blank and ignores writes (ADR-310 D7: no model,
 * no change). Pre-v2 rehydrated traits may lack the field — reads
 * tolerate it, and the first write creates it.
 *
 * @param world - The world whose entities hold the memory
 * @returns The trait-backed access
 */
export declare function createTraitMemoryAccess(world: WorldModel): ConversationMemoryAccess;
/** Registrar-supplied hooks for the binding. */
export interface SceneBindingOptions {
    /**
     * The authored-initiative answer for a participant at an occasion (D7
     * most-specific-wins) — the loader binds compiled `define initiative`
     * rows here (Phase 7). Absent = disposition alone decides.
     */
    authoredFor?: (participantId: string, occasion: SceneOccasion, witnessedAction?: string) => 'forces' | 'suppresses' | undefined;
    /**
     * Run an authored initiative seizure (ADR-320 D7; Phase 8) — the loader
     * binds compiled `define initiative` row BODIES here: a forcing row's
     * body executes (occurrence keys, pins, claims — the serve-path rules)
     * and the seizure's line comes back for the observability surface.
     * Absent = authored occasions never run (builder-authored stories).
     */
    seizeInitiative?: (participantId: string, occasion: SceneOccasion, witnessedAction?: string, audienceId?: string) => InitiativeSeizure | undefined;
    /**
     * Take one thread floor turn (ADR-320 D14; Phase 10.4) — the loader
     * binds compiled `define conversation` blocks here: the owner's ready
     * thread move executes against the pair's live scene and the spoken
     * line comes back for the observability surface. Absent = no threads
     * declared (the tick's thread step no-ops, the D2 cost leg).
     */
    threadTurn?: (ownerId: string, partnerId: string, sceneId: string) => InitiativeSeizure | undefined;
    /**
     * Pure probe for `threadTurn`: would the owner take a thread floor
     * turn toward this partner right now? Consulted before opening a scene
     * for an `opens when` thread — must not mutate.
     */
    threadTurnReady?: (ownerId: string, partnerId: string) => boolean;
}
/**
 * Build the world's scene runtime over the Phase 5 machinery.
 *
 * @param world - The world the binding serves (closed over, like the selector)
 * @param memory - The per-pair conversation-memory home
 * @param options - Registrar hooks (authored initiative)
 * @returns The binding to register
 */
export declare function createSceneRuntimeBinding(world: WorldModel, memory: ConversationMemoryAccess, options?: SceneBindingOptions): SceneRuntimeBinding;
/**
 * Register the scene runtime on a world (idempotent last-wins, per-world;
 * re-register on every story load).
 *
 * @param world - The world whose conversation actions should drive it
 * @param memory - The per-pair conversation-memory home
 * @param options - Registrar hooks (authored initiative)
 */
export declare function registerCharacterScenes(world: WorldModel, memory: ConversationMemoryAccess, options?: SceneBindingOptions): void;
```

### conversation/selector

```typescript
/**
 * The character dialogue selector (ADR-310 D15; contracts.md §5)
 *
 * Adapts CharacterModelDialogue to the world's dialogue-selector socket:
 * stdlib's ASK/TELL/SAY/TALK TO consult the registered selector for NPCs
 * carrying CharacterModelTrait, and an unhandled result falls through to
 * the action's default (ADR-310 D7: no model, no change). The selection
 * context's speaker becomes the lie ledger's audience (ADR-318 D9).
 *
 * Public interface: createCharacterDialogueSelector,
 *   registerCharacterDialogue.
 * Owner context: @sharpee/character / conversation
 */
import { WorldModel, type DialogueSelector } from '@sharpee/world-model';
import { CharacterModelDialogue } from './dialogue-extension.js';
/**
 * Build a DialogueSelector backed by a CharacterModelDialogue instance.
 *
 * @param dialogue - The conversation system holding registered NPCs
 * @returns The selector to register on the world
 */
export declare function createCharacterDialogueSelector(dialogue: CharacterModelDialogue): DialogueSelector;
/**
 * Register the character dialogue selector on a world (idempotent
 * last-wins, per-world; re-register on every story load).
 *
 * @param world - The world whose conversation actions should consult it
 * @param dialogue - The conversation system holding registered NPCs
 */
export declare function registerCharacterDialogue(world: WorldModel, dialogue: CharacterModelDialogue): void;
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
/**
 * How freely the NPC shares information. `selective` is retired (ADR-310
 * D10): listing what an NPC spreads IS selectivity — a non-empty `spreads`
 * list narrows a chatty speaker to exactly those topics.
 */
export type PropagationTendency = 'chatty' | 'mute';
/** Who the NPC shares with. */
export type PropagationAudience = 'trusted' | 'anyone' | 'allied';
/** All propagation audiences, for vocabulary export and iteration (ADR-310 D10). */
export declare const PROPAGATION_AUDIENCES: readonly PropagationAudience[];
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
    /** Topics the chatty NPC withholds (blacklist). */
    withholds?: string[];
    /** Topics the NPC will share — a non-empty list is a whitelist (ADR-310 D10). */
    spreads?: string[];
    /** Per-fact overrides. */
    overrides?: Record<string, FactOverride>;
    /** How quickly facts are shared (default: 'eager'). */
    pace?: PropagationPace;
    /** Optional scheduling conditions. */
    schedule?: PropagationSchedule;
    /** Tone of the telling (default: 'neutral'). */
    coloring?: PropagationColoring;
    /**
     * RETIRED (ADR-320 D11, ruling 2026-08-17): hearsay spreads like any
     * knowledge — the told-source gate this flag controlled is deleted, so
     * the field is dead config kept only so existing profiles still parse.
     * Selectivity lives in `tendency`/`spreads`/`withholds`/audiences.
     */
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
import { PropagationProfile, PropagationTransfer } from './propagation-types.js';
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
 * 4. Find eligible facts (spreads whitelist / withholds blacklist + already-told)
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
 * Fact transfer and provenance tracking (ADR-144, ADR-310 D14/D17)
 *
 * Applies propagation transfers by creating facts in the listener's
 * knowledge base with provenance, and recording the transfer on the
 * speaker's trait told-record (the AlreadyToldRecord service is retired —
 * ADR-310 D17).
 *
 * Public interface: transferFact, applyTransfers, TransferResult.
 * Owner context: @sharpee/character / propagation
 */
import { CharacterModelTrait } from '@sharpee/world-model';
import { PropagationTransfer, ReceivesAs } from './propagation-types.js';
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
 * Creates a fact in the listener's knowledge with provenance, and records
 * the transfer on the speaker's told-record. A skeptical listener
 * (`receives: 'as belief'`) holds the fact at lower confidence
 * ('suspects') — the fold of the retired standalone belief map
 * (ADR-310 D14).
 *
 * When the speaker holds a *valued belief* about the topic, the value
 * travels too (ADR-310 D10/D14, AC5 — propagation moves a claim, not a
 * token): the listener receives the speaker's held value at the same
 * receives-downgraded confidence, `source: 'told'`. A belief the
 * listener already holds is never displaced — belief revision is D14
 * resistance territory, not the transfer's job.
 *
 * @param transfer - The transfer to apply
 * @param speakerTrait - The speaker's CharacterModelTrait (told-record home)
 * @param listenerTrait - The listener's CharacterModelTrait
 * @param turn - Current turn number
 * @param receivesAs - How the listener treats received info (default: 'as fact')
 * @returns The transfer result
 */
export declare function transferFact(transfer: PropagationTransfer, speakerTrait: CharacterModelTrait, listenerTrait: CharacterModelTrait, turn: number, receivesAs?: ReceivesAs): TransferResult;
/**
 * Apply multiple propagation transfers in sequence.
 *
 * @param transfers - The transfers to apply
 * @param getTrait - Function to get an entity's CharacterModelTrait by ID
 *   (used for both speakers and listeners)
 * @param turn - Current turn number
 * @param getReceivesAs - Function to get how a listener receives info
 * @returns Array of transfer results
 */
export declare function applyTransfers(transfers: PropagationTransfer[], getTrait: (id: string) => CharacterModelTrait | undefined, turn: number, getReceivesAs?: (listenerId: string) => ReceivesAs): TransferResult[];
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
import { PropagationTransfer, PropagationColoring } from './propagation-types.js';
import type { Presence } from '@sharpee/core';
import type { WorldModel } from '@sharpee/world-model';
/**
 * The player's presence state relative to the propagation event. The union is
 * `@sharpee/core`'s `Presence` (ADR-328 D3 moved the declaration down so
 * `ISemanticEvent` can carry it); this name is kept for ADR-144 readers.
 */
export type PlayerPresence = Presence;
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
import { PropagationTendency, PropagationAudience, PropagationPace, PropagationColoring, ReceivesAs, FactOverride, PropagationSchedule, PropagationProfile } from './propagation-types.js';
/**
 * Options for the .propagation() builder method.
 * All fields map directly to PropagationProfile.
 */
export interface PropagationOptions {
    /**
     * How freely the NPC shares information (default: 'chatty'). A non-empty
     * `spreads` list narrows sharing to exactly those topics (ADR-310 D10 —
     * the retired `selective` keyword, said by listing).
     */
    tendency?: PropagationTendency;
    /** Who the NPC shares with (default: 'trusted'). */
    audience?: PropagationAudience;
    /** NPC IDs explicitly excluded from sharing. */
    excludes?: string[];
    /** Topics the chatty NPC withholds (blacklist). */
    withholds?: string[];
    /** Topics the NPC will share — a non-empty list is a whitelist (ADR-310 D10). */
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
import type { GoalRuntimeState } from '@sharpee/world-model';
import type { IRCondition } from '@sharpee/chord';
/** Goal priority levels. */
export type GoalPriority = 'critical' | 'high' | 'medium' | 'low';
/** All goal priorities, for vocabulary export and iteration (ADR-310 D8). */
export declare const GOAL_PRIORITIES: readonly GoalPriority[];
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
    /**
     * Compiled-story condition (ADR-310 Phase 3): a Chord `wait for` step
     * carries its structured IRCondition here; `conditions` strings are the
     * TS-builder surface. The step evaluator learns this form with the
     * Phase 5 loader wiring.
     */
    conditionCompiled?: IRCondition;
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
    /**
     * Compiled-story activation condition (ADR-310 Phase 3): a Chord
     * `active when` line carries its structured IRCondition here;
     * `activatesWhen` strings are the TS-builder surface. Absent BOTH ways
     * means always active. The activation evaluator learns this form with
     * the Phase 5 loader wiring.
     */
    activeWhenCompiled?: IRCondition;
    /**
     * This goal is a conscience outlet (ADR-318 D8; seam-2 ruling
     * 2026-08-16): its sequential completion discharges — drains the
     * pressure curve to `clear`. Stamped by the loader when `active when`
     * is provably self-breaking-gated (`conditionRequiresSelfBreaking`);
     * TS-builder stories may set it directly.
     */
    discharges?: boolean;
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
/**
 * An active goal: the authored definition paired with its live pursuit
 * state on the NPC's trait (ADR-310 D17 — mutations to `state` persist
 * through save/restore because the state object IS trait state).
 */
export interface ActiveGoal {
    /** The goal definition. */
    def: GoalDef;
    /** Live reference to the goal's runtime state on the trait. */
    state: GoalRuntimeState;
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
/**
 * The world mutation a step calls for. The evaluator computes intent and
 * stays pure; the tick phase — which owns the world handle — applies it
 * (ADR-310 AC3: the NPC *executes* its steps, it does not merely track them).
 */
export type StepMutation = {
    kind: 'move';
    toRoom: string;
} | {
    kind: 'take';
    itemId: string;
} | {
    kind: 'give';
    itemId: string;
    toId: string;
} | {
    kind: 'drop';
    itemId: string;
};
/** Result of evaluating a single goal step. */
export type StepResult = {
    status: 'completed';
    witnessed?: string;
    mutation?: StepMutation;
} | {
    status: 'in-progress';
    witnessed?: string;
    mutation?: StepMutation;
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
 * Goal activation and lifecycle (ADR-145, relocated per ADR-310 D17)
 *
 * Evaluates goal activation conditions against character state and manages
 * the active goal queue. Holds ONLY authored goal definitions — all mutable
 * pursuit state (active flag, current step, paused/interrupted/prepared)
 * lives on the NPC's CharacterModelTrait (`trait.goalState`), so it rides
 * the world-model save path.
 *
 * Public interface: GoalManager.
 * Owner context: @sharpee/character / goals
 */
import { CharacterModelTrait } from '@sharpee/world-model';
import type { IRCondition } from '@sharpee/chord';
import { GoalDef, ActiveGoal } from './goal-types.js';
/** Pre-bound compiled-condition evaluator (the story oracle, closed over one NPC). */
export type CompiledConditionEval = (cond: IRCondition) => boolean;
/**
 * Manages goal activation, deactivation, and interruption for a single NPC.
 * Stateless between turns by construction (ADR-310 D17): definitions are
 * authored and re-registered at load; every mutation goes to the trait.
 */
export declare class GoalManager {
    /** All authored goal definitions for this NPC. */
    private readonly defs;
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
     * Evaluate all goal activation and interruption conditions against the
     * trait, mutating `trait.goalState` in place. Activates new goals,
     * interrupts active ones, resumes cleared ones.
     *
     * @param trait - The NPC's CharacterModelTrait
     * @param evalCompiled - Compiled-condition evaluator for `activeWhenCompiled`
     *   defs (required whenever any def carries one; throws otherwise — an
     *   unbound oracle under a compiled story is a wiring defect, not a state)
     * @returns The current active goal queue (priority-sorted, interrupted last)
     */
    evaluate(trait: CharacterModelTrait, evalCompiled?: CompiledConditionEval): ActiveGoal[];
    /**
     * Get the highest-priority non-interrupted, non-paused active goal.
     *
     * @param trait - The NPC's CharacterModelTrait
     * @returns The top goal, or undefined
     */
    getTopGoal(trait: CharacterModelTrait): ActiveGoal | undefined;
    /**
     * Check if a goal is currently active.
     *
     * @param trait - The NPC's CharacterModelTrait
     * @param goalId - The goal ID
     * @returns True if the goal is active
     */
    isActive(trait: CharacterModelTrait, goalId: string): boolean;
    /**
     * Get all active goals in registration order (unsorted view).
     *
     * @param trait - The NPC's CharacterModelTrait
     * @returns Active goals paired with their live trait state
     */
    getActiveGoals(trait: CharacterModelTrait): ActiveGoal[];
    /**
     * Advance the current step of a goal (after step completion). A completed
     * sequential goal deactivates; a completed prepared goal switches to
     * opportunistic behavior.
     *
     * @param trait - The NPC's CharacterModelTrait
     * @param goalId - The goal ID
     */
    advanceStep(trait: CharacterModelTrait, goalId: string): void;
    /**
     * Complete a goal and deactivate it.
     *
     * @param trait - The NPC's CharacterModelTrait
     * @param goalId - The goal ID
     */
    complete(trait: CharacterModelTrait, goalId: string): void;
    /** Active goals in priority order (interrupted last) without re-evaluating conditions. */
    private evaluateOrder;
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
    /** Deactivate a goal, resetting its pursuit state for a possible future re-activation. */
    private deactivate;
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
import { ActiveGoal, StepResult, MovementProfile } from './goal-types.js';
import type { CompiledConditionEval } from './goal-activation.js';
import { RoomGraph } from './pathfinding.js';
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
    /**
     * Compiled-condition evaluator (the story oracle, pre-bound to this
     * NPC). Required whenever a wait-for step carries `conditionCompiled`;
     * evaluating such a step without it throws (wiring defect, not a state).
     */
    evalCompiled?: CompiledConditionEval;
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
import { MovementProfile } from './goal-types.js';
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
import type { IRCondition } from '@sharpee/chord';
import { GoalPriority, PursuitMode, GoalStep, GoalDef } from './goal-types.js';
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
    private _activeWhenCompiled?;
    private _discharges?;
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
     * Set the compiled-story activation condition (ADR-310 Phase 3) — the
     * structured IRCondition a Chord `active when` line carries.
     *
     * @param condition - The compiled condition
     * @returns this for chaining
     */
    activeWhenCompiled(condition: IRCondition): GoalBuilder<TParent>;
    /**
     * Mark this goal a conscience outlet (ADR-318 D8; seam-2 ruling): its
     * sequential completion drains the pressure curve.
     *
     * @returns this for chaining
     */
    discharges(): GoalBuilder<TParent>;
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
/** All influence modes, for vocabulary export and iteration (ADR-310 D9). */
export declare const INFLUENCE_MODES: readonly InfluenceMode[];
/**
 * Who the influence affects.
 * - proximity: target must be in the same room
 * - targeted: influencer selects a specific target (used with active mode)
 * - room: affects all entities in the room (aura)
 */
export type InfluenceRange = 'proximity' | 'targeted' | 'room';
/** All influence ranges, for vocabulary export and iteration (ADR-310 D9). */
export declare const INFLUENCE_RANGES: readonly InfluenceRange[];
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
    /**
     * Message ID when the effect expires (separation or duration lapse) with
     * the expiring target at the player's location. Opt-in release line —
     * absent means expiry stays silent (David's ruling 2026-08-16).
     */
    expired?: string;
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
/** One target's outcome within a passive exertion. */
export interface InfluenceTargetOutcome {
    /** The target entity id. */
    targetId: string;
    /** Whether the influence took hold on this target or was resisted. */
    status: 'applied' | 'resisted';
}
/**
 * Result of one passive influence exertion in a room (ADR-310 D8).
 *
 * The exertion is one fact — its `witnessed` phrase, effect, and message
 * ids exist exactly once here — while per-target outcomes nest inside.
 * This shape is what makes duplicate witnessed events unrepresentable.
 */
export type PassiveInfluenceExertion = {
    status: 'exerted';
    influenceName: string;
    influencerId: string;
    effect: InfluenceEffect;
    witnessed?: string;
    resisted?: string;
    targets: InfluenceTargetOutcome[];
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
import { InfluenceDef, ResistanceDef, InfluenceResult, PassiveInfluenceExertion } from './influence-types.js';
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
 * Returns one exertion per (influencer, influence) — the exertion-level
 * facts (effect, witnessed/resisted message ids) appear exactly once,
 * with per-target applied/resisted outcomes nested inside (ADR-310 D8).
 *
 * @param entities - All entities in the room
 * @returns Array of exertion results
 */
export declare function evaluatePassiveInfluences(entities: InfluenceRoomEntity[]): PassiveInfluenceExertion[];
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
 * Influence duration handling (ADR-146 layer 3, relocated per ADR-310 D17)
 *
 * Trait-based functions that record and expire influence effects:
 * 'while present' clears when the influencer leaves the room,
 * 'momentary' clears after one turn,
 * 'lingering' clears after authored turns or when a condition is met.
 *
 * The InfluenceTracker service class is retired — effects in force ride
 * the trait (`trait.influencesInForce`) so they serialize with the world.
 * All turn arithmetic goes through the character-clock seam.
 *
 * Public interface: trackInfluence, isUnderInfluence,
 *   expireInfluencesForTurn, expireInfluencesBySeparation.
 * Owner context: @sharpee/character / influence
 */
import { CharacterModelTrait, InfluenceInForce } from '@sharpee/world-model';
import { InfluenceEffect, InfluenceDuration } from './influence-types.js';
/**
 * Record an influence exertion outcome on the trait that homes it (the
 * target's trait normally; the exerter's trait with an explicit `target`
 * for targets with no character model). The record set is level-state:
 * an identical outcome already in force is never double-tracked, and the
 * return value is the edge detector callers mint events from (ADR-310
 * D8 — events mark transitions, records mark levels). A record whose
 * status differs (resistance lapsing or re-establishing) is updated in
 * place and reports as a transition.
 *
 * @param homeTrait - The trait the record rides
 * @param influenceName - The influence name
 * @param influencerId - The influencer entity ID
 * @param effect - The applied effect mutations
 * @param options - Status, duration, timing, clear condition, explicit target
 * @returns True when the outcome newly transitioned into force
 */
export declare function trackInfluence(homeTrait: CharacterModelTrait, influenceName: string, influencerId: string, effect: InfluenceEffect, options: {
    duration: InfluenceDuration;
    turn: number;
    /** Absent means 'applied' (matching InfluenceInForce deserialization). */
    status?: 'applied' | 'resisted';
    lingeringTurns?: number;
    clearCondition?: string;
    /** Set only when the record rides the exerter's trait (player target). */
    target?: string;
}): boolean;
/**
 * Check if a trait's owner is under a specific influence. Resisted
 * records exist only as flip-transition state and do not count.
 *
 * @param trait - The trait to check (effects homed here)
 * @param influenceName - The influence name
 * @returns True if an applied effect with this name is in force
 */
export declare function isUnderInfluence(trait: CharacterModelTrait, influenceName: string): boolean;
/**
 * Expire 'momentary' and 'lingering' effects homed on a trait.
 * Call once per turn per trait.
 *
 * @param trait - The trait whose effects to expire
 * @param currentTurn - The current turn number
 * @param evaluateClearCondition - Evaluates a lingering clear condition
 *   against the effect's TARGET (the trait owner unless `target` is set)
 * @returns Effects that were removed
 */
export declare function expireInfluencesForTurn(trait: CharacterModelTrait, currentTurn: number, evaluateClearCondition?: (effect: InfluenceInForce, predicate: string) => boolean): InfluenceInForce[];
/**
 * Expire 'while present' effects whose influencer and target no longer
 * share a room, homed on a trait. Run once per turn per trait, BEFORE
 * evaluation, so a re-entry re-transitions (and re-fires its witnessed
 * phrase) the same turn the parties reunite (ADR-310 D8).
 *
 * @param trait - The trait whose effects to expire
 * @param ownerId - The trait owner's entity id (the target unless the
 *   record carries an explicit `target`)
 * @param getLocation - Resolves an entity's current room (undefined = gone)
 * @returns Effects that were removed
 */
export declare function expireInfluencesBySeparation(trait: CharacterModelTrait, ownerId: string, getLocation: (entityId: string) => string | undefined): InfluenceInForce[];
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
import { InfluenceInForce } from '@sharpee/world-model';
import { InfluenceDef } from './influence-types.js';
/** Result of checking PC influence before a player action. */
export type PcInfluenceResult = {
    status: 'clear';
} | {
    status: 'intercepted';
    influenceName: string;
    influencerId: string;
    effect: InfluenceInForce;
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
 * Player-targeted effects ride the exerters' traits with `target` set
 * (ADR-310 D17 home rule); the caller collects them from the room's NPCs.
 *
 * @param playerId - The player entity ID
 * @param effects - Effect records to consider (any target)
 * @param influenceDefs - Map of influencer ID to their influence definitions
 * @returns PC influence result
 */
export declare function evaluatePcInfluence(playerId: string, effects: InfluenceInForce[], influenceDefs: Map<string, InfluenceDef[]>): PcInfluenceResult;
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
import { InfluenceMode, InfluenceRange, InfluenceDuration, InfluenceEffect, InfluenceSchedule, InfluenceDef } from './influence-types.js';
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
    private _expired?;
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
     * Set the message ID rendered when the effect expires (separation or
     * duration lapse). Absent = expiry stays silent.
     *
     * @param messageId - Message ID
     * @returns this for chaining
     */
    expired(messageId: string): InfluenceBuilder<TParent>;
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
 * The character-model NPC tick phase (ADR-144, 145, 146; ADR-310 D15/D17)
 *
 * One tick-phase registration — `'character-model'` — running ordered
 * sub-steps: decay → observe → influence → propagation → goals → scenes
 * (ADR-320 Phase 8). (Arbiter bookkeeping arrives with ADR-318's
 * arbiter.) Ordering between sub-steps is a contract, which is why this
 * is one registration rather than three (docs/work/archive/adr-310/
 * contracts.md §2); scenes run last because they consume the propagation
 * and goal sub-steps' same-turn output.
 *
 * All mutable state rides CharacterModelTrait (ADR-310 D17): the registry
 * below holds ONLY authored configuration, re-registered at load, and has
 * no serialization path of its own.
 *
 * The registration signature is platform-internal — not author-facing
 * compatibility surface; revisable by ADR-317/R3 at refactor cost.
 *
 * Public interface: createCharacterModelPhase, registerCharacterModelPhase,
 *   CharacterPhaseRegistry, CharacterPhaseConfig, CHARACTER_MODEL_PHASE_NAME.
 * Owner context: @sharpee/character
 */
import { type ISemanticEvent, type EntityId, type RandomService } from '@sharpee/core';
import type { ISound } from '@sharpee/if-domain';
import { IFEntity, WorldModel, type TemperamentDef } from '@sharpee/world-model';
import { type ExecutionEntry } from '@sharpee/stdlib';
import type { CompiledStoryOracle } from './story-oracle.js';
import { PropagationProfile } from './propagation/index.js';
import { GoalDef, MovementProfile, GoalManager } from './goals/index.js';
import { InfluenceDef, ResistanceDef } from './influence/index.js';
/** Tick context — mirrors NpcTickContext from stdlib. */
interface TickContext {
    world: WorldModel;
    turn: number;
    /** The session's per-point stream owner (ADR-293) */
    random: RandomService;
    playerLocation: EntityId;
    playerId: EntityId;
    /**
     * The execution entry (ADR-328 D2; ADR-329 D6): how a goal step's chosen
     * act — `taking`, `giving`, `dropping`, `going` — becomes a real action
     * run as the NPC through the engine's four phases. The engine supplies
     * it every tick; the goal sub-step is its only consumer here.
     */
    act: ExecutionEntry;
    /**
     * The player action's events this turn (ADR-310 Phase 5) — the observe
     * sub-step's input. Absent (older callers, unit harnesses) = nothing
     * observed this turn.
     */
    actionEvents?: ISemanticEvent[];
    /**
     * Feed the engine's per-turn sound buffer (ADR-172; ADR-320 Phase 8) —
     * the scenes sub-step emits conversation sounds here so eavesdropping
     * rides spatial propagation. Absent (older callers, unit harnesses) =
     * scenes run silently (mutations land, no sounds).
     */
    emitSound?: (sound: ISound) => void;
}
/** Per-NPC character configuration for the tick phase. Authored data only. */
export interface CharacterPhaseConfig {
    propagationProfile?: PropagationProfile;
    goalDefs?: GoalDef[];
    movementProfile?: MovementProfile;
    influenceDefs?: InfluenceDef[];
    resistanceDefs?: ResistanceDef[];
    /**
     * Authored starting mood as valence-arousal axes — the mood-decay
     * baseline (ADR-310 D6: the author declares a starting state; the
     * runtime owns the curve). Absent → no mood decay for this NPC.
     */
    baselineMood?: {
        valence: number;
        arousal: number;
    };
    /**
     * Topics this character's own TURN-TRIGGERED rules are gated on knowing
     * (`on every turn … while it knows <topic>`). When such a topic arrives by
     * propagation, that rule fires this same turn and narrates the arrival in
     * the author's words — so the platform must NOT also describe it with the
     * generic witnessed summary, or one moment gets told twice: the author's
     * staged confrontation, plus "X mentions something to Y."
     *
     * Only turn-triggered clauses count. A topic row gated `when it knows
     * <topic>` is a RESPONSE gate — it fires if the player asks, later or
     * never — so it says nothing about who narrates this arrival and must not
     * suppress anything.
     *
     * Derived from the compiled story at load; authors declare nothing.
     */
    arrivalNarratedTopics?: ReadonlySet<string>;
}
/**
 * Holds per-NPC authored configs for the tick phase. Rebuilt from compiled
 * story data at every load; holds NO mutable runtime state (ADR-310 D17 —
 * the old toJSON/restoreState side path is deleted; everything it carried
 * now rides CharacterModelTrait).
 */
export declare class CharacterPhaseRegistry {
    private readonly configs;
    private readonly goalManagers;
    /** The loaded story's answer surface (ADR-310 Phase 5) — authored wiring, bound at load. */
    private oracle?;
    /** Authored `define temperament` defs (ADR-318 D3) — read by the arbitration seams. */
    private temperamentDefs?;
    /** Authored `witnessed as` aliases (ADR-318 D12a), actor as WORLD id — the loader resolves. */
    private witnessedAliases?;
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
    /** Bind the loaded story's oracle (loader, at load — last-wins, like every load-time registration). */
    setOracle(oracle: CompiledStoryOracle): void;
    /** The bound story oracle, if any. */
    getOracle(): CompiledStoryOracle | undefined;
    /** Set the story's authored temperament definitions (loader, at load). */
    setTemperamentDefs(defs: Readonly<Record<string, TemperamentDef>>): void;
    /** Authored temperament definitions by name (ArbiterContext.temperamentDefs source). */
    getTemperamentDefs(): Readonly<Record<string, TemperamentDef>> | undefined;
    /** Set the story's `witnessed as` aliases (loader, at load — actors pre-resolved to world ids). */
    setWitnessedAliases(aliases: ReadonlyArray<{
        actor: string;
        act: string;
        alias: string;
    }>): void;
    /** The D12a alias for a witnessed (actor, act), or the derived name unchanged. */
    witnessedAliasFor(actorId: string, act: string, derived: string): string;
}
/** The one tick-phase name this package registers (contracts.md §2 — frozen, platform-internal). */
export declare const CHARACTER_MODEL_PHASE_NAME = "character-model";
export { CHARACTER_TURN_KEY } from './character-clock.js';
/**
 * Create the character-model tick phase handler. Register it once:
 * `registerCharacterModelPhase(npcService, registry)`.
 *
 * Sub-step order (a contract, not a coincidence — contracts.md §2): decay
 * runs first so the turn's evaluation sees settled mood/lucidity;
 * observation second, so the turn's remaining evaluation reacts to what
 * the player just did; influence effects are expired then applied next
 * (expiry first so a recurring influence re-transitions the turn it
 * recurs — ADR-310 D8), so propagation and goal evaluation the same turn
 * see them; propagation
 * moves knowledge before goals re-evaluate activation conditions that may
 * reference it; scenes run last (ADR-320 Phase 8), consuming the
 * transfers, say completions, moves, and detected acts the earlier
 * sub-steps surfaced this turn.
 *
 * @param registry - The character phase registry (authored configs)
 * @returns Tick phase handler function
 */
export declare function createCharacterModelPhase(registry: CharacterPhaseRegistry): (npcs: IFEntity[], ctx: TickContext) => ISemanticEvent[];
/**
 * Register the character-model phase on an NPC service under its contract
 * name (ADR-310 D15 — one registration, ordered sub-steps inside).
 *
 * @param service - Anything with stdlib's `registerTickPhase` socket
 * @param registry - The character phase registry (authored configs)
 */
export declare function registerCharacterModelPhase(service: {
    registerTickPhase(name: string, handler: (npcs: IFEntity[], ctx: TickContext) => ISemanticEvent[]): void;
}, registry: CharacterPhaseRegistry): void;
```

### story-oracle

```typescript
/**
 * The compiled-story oracle (ADR-310/318 Phase 5)
 *
 * The character runtime's ONE injected seam for asking the loaded story a
 * question trait state cannot answer: evaluating a compiled Chord
 * condition (goal `active when`, `wait for`), and — a reserved slot for
 * the Phase 6 arbitration seam — kind membership for classifier scopes
 * (`a merchant`), which only the story's IR knows.
 *
 * The story-loader binds an implementation at load and the registry
 * carries it (authored wiring, never serialized — ADR-310 D17).
 * Builder-authored stories carry no compiled conditions and need no
 * oracle. The signature is platform-internal (contracts.md §7).
 *
 * Public interface: CompiledStoryOracle.
 * Owner context: @sharpee/character
 */
import type { IRCondition } from '@sharpee/chord';
import type { WorldModel } from '@sharpee/world-model';
/** The loaded story's answer surface for the character runtime. */
export interface CompiledStoryOracle {
    /**
     * Evaluate a compiled Chord condition for an NPC.
     *
     * @param cond - The compiled condition (refs in IR terms — the oracle
     *   owns the translation, mirroring the loader's evaluator)
     * @param opts - self: the asking NPC's WORLD entity id (bound to `it`);
     *   world: the live world model
     * @returns Whether the condition holds this turn
     */
    evalCondition(cond: IRCondition, opts: {
        self: string;
        world: WorldModel;
    }): boolean;
    /**
     * Reserved for the Phase 6 arbitration seam: does the entity belong to
     * the story kind named by a classifier scope (`a <kind>`)?
     *
     * @param entityId - WORLD entity id
     * @param kind - The classifier's kind noun as written in Chord
     * @returns Whether the entity is one of the story's `<kind>`s
     */
    isKindMember(entityId: string, kind: string): boolean;
}
```

### act-detection/act-detection

```typescript
/**
 * Act detection over the event stream (ADR-318 D4/D7/D12a)
 *
 * The runtime half of "a category the runtime cannot detect cannot be a
 * word": classifies semantic events at the three named stdlib sites into
 * act categories and face-acts, derives each witnessed act's deterministic
 * topic name (D12a — actor × act), and records witnessed acts as observer
 * knowledge so reputation travels by propagation (D7).
 *
 * Sites (ADR-318 Implementation; statement site per ADR-320 D11):
 * - taking → steal-candidate: `if.event.taken` where the item
 *   came out of another actor's possession
 * - combat → harm: `if.event.attacked`
 * - reveal → topic delivery: `revealConfidedTopic` — called from the
 *   dialogue path, where delivery is knowable (prose is opaque; events are
 *   not tagged with what a line asserts)
 * - statement → witnessed claim: `witnessStatement` over `if.event.told`
 *   (ADR-320 D11 — the player's utterances are witnessed claims): every
 *   co-located modeled hearer records the statement under the fact-
 *   transfer rules, and a modeled speaker's claims-tagged statement mints
 *   on the speaker's own ledger — both sides can lie, one discipline
 *
 * Public interface: detectActs, revealConfidedTopic, witnessActs,
 *   witnessStatement, derivedTopicFor, DetectedAct.
 * Owner context: @sharpee/character / act-detection
 */
import { type ISemanticEvent } from '@sharpee/core';
import { WorldModel, CharacterModelTrait, type IFEntity, type ActCategory, type FaceAct } from '@sharpee/world-model';
import { type ClaimTag } from '../conversation/claims.js';
/** A classified act, ready for arbitration input, minting, and the author channel. */
export interface DetectedAct {
    /** Exactly one of `category` / `faceAct` is set. */
    category?: ActCategory;
    faceAct?: FaceAct;
    actorId: string;
    targetId?: string;
    /** D12a derived deterministic topic name, e.g. 'the Steward stole'. */
    derivedTopic: string;
}
/**
 * The deterministic platform-derived topic name for an act (D12a): the
 * actor and the act. The namespace is compile-checkable — actors ×
 * detectable acts is a closed set. Scene aliases (`witnessed as`) rename
 * at the Chord layer; pass the alias map at that integration.
 *
 * @param actorName - The acting entity's display name
 * @param act - The category or face-act performed
 * @returns The derived topic string, e.g. 'the Colonel backed down'
 */
export declare function derivedTopicFor(actorName: string, act: ActCategory | FaceAct): string;
/**
 * Classify one semantic event at the taking and combat sites. Pure —
 * reads world state, mutates nothing. The reveal site cannot be detected
 * from events (prose is opaque) and lives in `revealConfidedTopic`.
 *
 * @param event - A dispatched semantic event
 * @param world - The live world, for prior-holder and name lookups
 * @returns Zero or more classified acts
 */
export declare function detectActs(event: ISemanticEvent, world: WorldModel): DetectedAct[];
/**
 * The reveal site (topic delivery): classify a speaker delivering a topic.
 * Called from the dialogue path, which alone knows what was delivered.
 * Pure — the caller owns any bookkeeping.
 *
 * @param speaker - The NPC delivering the topic
 * @param speakerTrait - The speaker's trait (holds the confided marker)
 * @param topic - The topic being delivered
 * @returns The betray-a-confidence act when the topic is marked confided
 */
export declare function revealConfidedTopic(speaker: IFEntity, speakerTrait: CharacterModelTrait, topic: string): DetectedAct | undefined;
/**
 * The statement site (ADR-320 D11): a speaker's TELL/SAY lands in every
 * modeled hearer under the fact-transfer rules — the hearer records the
 * topic (`told`), a valued claim rides when one is asserted (the explicit
 * claim tag first, else the modeled speaker's own held value), and a
 * belief the hearer already holds is never displaced (belief revision is
 * D14 resistance territory). A modeled speaker's claims-tagged statement
 * additionally runs the lie-ledger mint rule per hearer-audience
 * (`recordClaimDelivery`) — the both-sides-can-lie symmetry — and every
 * hearer is recorded on the speaker's told-record.
 *
 * @param world - The live world (speaker trait lookup)
 * @param speakerId - The speaking actor (the player at the stdlib site)
 * @param topic - The normalized topic key the statement is about
 * @param hearers - Who heard it (co-located; the speaker is skipped)
 * @param turn - Current turn number
 * @param claims - The statement's claim tag, when an authored line asserts one
 * @returns Topics learned per hearer id, plus author-channel events from
 *   any ledger bookkeeping
 */
export declare function witnessStatement(world: WorldModel, speakerId: string, topic: string, hearers: readonly IFEntity[], turn: number, claims?: ClaimTag): {
    learned: Record<string, string[]>;
    authorEvents: ISemanticEvent[];
};
/**
 * Record witnessed acts as observer knowledge under their derived topic
 * names (D12a: coverage is total with zero authoring cost; D7: reputation
 * travels from here by `spreads`).
 *
 * @param acts - Acts detected this turn
 * @param observers - Entities that witnessed them (co-located, minus the actor)
 * @param turn - Current turn number
 * @returns Topic names actually learned, per observer id
 */
export declare function witnessActs(acts: readonly DetectedAct[], observers: readonly IFEntity[], turn: number): Record<string, string[]>;
```

### arbiter/arbiter-types

```typescript
/**
 * Arbiter types (ADR-318 D1–D3; contracts.md §3)
 *
 * The shapes the force arbiter computes over: candidates, force readings,
 * verdicts, and the platform-internal context callers assemble. Every
 * signature here is platform-internal — NOT author-facing compatibility
 * surface (contracts.md §7); revisable at refactor cost.
 *
 * Public interface: ActCandidate, ForceReading, ArbiterVerdict,
 *   ArbiterContext, ArbiterAct.
 * Owner context: @sharpee/character / arbiter
 */
import type { Force, ActCategory, ObligationWord, FaceAct, TemperamentDef, ForceReading } from '@sharpee/world-model';
export type { ForceReading } from '@sharpee/world-model';
/** The act an arbitration decides: a dialogue act or a goal's execution. */
export type ArbiterAct = 'comply' | 'refuse' | 'evade' | {
    goalId: string;
};
/**
 * The act under consideration (contracts.md §3). `audiencePresent` is who
 * is in the room — honor sees the room, not the future (ADR-318 D7).
 */
export interface ActCandidate {
    kind: 'dialogue' | 'goal';
    act: ArbiterAct;
    topicId?: string;
    audiencePresent: string[];
}
/** The arbitration result (contracts.md §3). The arbiter is pure — it computes; bookkeeping mutates. */
export interface ArbiterVerdict {
    winner: Force;
    /** Possibly rewritten: paralysis → 'evade' (ADR-318 D6). */
    act: ArbiterAct;
    readings: ForceReading[];
    /** Absent = D2's intensity default decided (no declared ordering applied). */
    temperamentApplied?: {
        name: string;
        pair: [Force, Force];
    };
    /** Live principle/obligation feeds on the losing side → pressure deposits (ADR-318 D8). */
    defeats: Array<{
        force: Force;
        feed: string;
    }>;
    /** Two unexcepted duty feeds in live collision (ADR-318 D6). */
    paralysis?: {
        principles: [string, string];
    };
}
/**
 * What the caller (dialogue selector, goal sub-step, act detection)
 * assembles for an arbitration. The arbiter never classifies acts itself —
 * act detection owns which categories an act commits; the arbiter owns
 * which force wins.
 */
export interface ArbiterContext {
    /** Active entity states, for temperament `while` bindings (ADR-318 D3). */
    activeStates?: readonly string[];
    /** Authored `define temperament` definitions by name (story-level data). */
    temperamentDefs?: Readonly<Record<string, TemperamentDef>>;
    /**
     * Act categories COMPLYING would commit (already scope-filtered by act
     * detection). A matching unexcepted principle sets duty against the act.
     */
    commits?: readonly ActCategory[];
    /**
     * Act categories REFUSING would commit (e.g. `break a promise` when the
     * refusal violates a promised act). A matching unexcepted principle sets
     * duty FOR the act — and both sides live is D6 paralysis.
     */
    refusalCommits?: readonly ActCategory[];
    /** Obligations complying satisfies and refusing would violate (e.g. 'answers honestly'). */
    satisfies?: readonly ObligationWord[];
    /** Face-acts complying would perform before the declared audience (D7). */
    complyFaceActs?: readonly FaceAct[];
    /** Face-acts refusing would perform before the declared audience (D7). */
    refuseFaceActs?: readonly FaceAct[];
    /** The entity the act addresses — the love feed's disposition target. */
    audienceId?: string;
    /** The desire feed, when an active goal bears on this act (ADR-310 D8). */
    desire?: {
        intensity: number;
        stance: 'for' | 'against';
        feed: string;
    };
    /**
     * The act's OBJECT for principle scope/except matching (ADR-318 D4 —
     * the asker at the dialogue site, the act target at detection sites).
     * Absent = unknown: scoped principles stay in force, excepts never lift.
     */
    actObjectId?: string;
    /** Kind membership for classifier scopes (`a <kind>`) — the story oracle's slot. */
    isKindMember?: (entityId: string, kind: string) => boolean;
}
/** A reading plus which side of the candidate act it pushes (internal). */
export interface StancedReading extends ForceReading {
    stance: 'for' | 'against';
}
```

### arbiter/arbiter

```typescript
/**
 * The force arbiter (ADR-318 D1–D3, D6; contracts.md §3)
 *
 * Decides which force wins when live forces disagree on an act. Pure —
 * it computes a verdict; the tick's bookkeeping (pressure.ts) mutates.
 *
 * The rules, in order:
 * - D2 default: no declared ordering between the colliding forces →
 *   whichever feed currently burns hotter wins. The declaration is the
 *   deviation.
 * - D3 temperament: the live binding's pair lines override intensity for
 *   exactly the pairs they name.
 * - D6 paralysis: two unexcepted duty feeds in live collision (one
 *   forbidding the act, one compelling it) → evasion, plus a verdict
 *   field the author channel turns into a warning naming both.
 *
 * Public interface: arbitrate.
 * Owner context: @sharpee/character / arbiter
 */
import { CharacterModelTrait } from '@sharpee/world-model';
import type { ActCandidate, ArbiterContext, ArbiterVerdict } from './arbiter-types.js';
/**
 * Arbitrate a candidate act against the character's live forces.
 *
 * @param trait - The arbitrating character's trait
 * @param candidate - The act under consideration
 * @param ctx - Caller-assembled classification and story data
 * @returns The verdict: winner, resulting act, readings, defeats, paralysis
 */
export declare function arbitrate(trait: CharacterModelTrait, candidate: ActCandidate, ctx: ArbiterContext): ArbiterVerdict;
```

### arbiter/force-feeds

```typescript
/**
 * Force feeds (ADR-318 D1) — how each of the five forces reads its
 * intensity off the trait and the arbitration context.
 *
 * All formulas are runtime-owned (rule 4: the runtime boils the pot).
 * Intensities are 0..1. A force is live when its feed is off-baseline.
 *
 * Public interface: computeStancedReadings, PRINCIPLE_DUTY_INTENSITY.
 * Owner context: @sharpee/character / arbiter
 */
import { CharacterModelTrait } from '@sharpee/world-model';
import type { ActCandidate, ArbiterContext, StancedReading } from './arbiter-types.js';
/**
 * Principles and obligations burn at a strong fixed baseline (ADR-318 D4:
 * "a principle is a strong habit until character makes it a commitment").
 * Threat must reach 'cornered' (0.8) to outburn one on intensity alone.
 */
export declare const PRINCIPLE_DUTY_INTENSITY = 0.7;
/** Honor binds at the same strong baseline when declared audience is present (D7). */
export declare const HONOR_INTENSITY = 0.7;
/**
 * Compute every force reading for a candidate, each with the side of the
 * act it pushes. Pure — reads trait state, mutates nothing.
 *
 * @param trait - The arbitrating character's trait
 * @param candidate - The act under consideration
 * @param ctx - Caller-assembled classification and story data
 * @returns Readings in force order: fear, desire, duty, honor, love
 */
export declare function computeStancedReadings(trait: CharacterModelTrait, candidate: ActCandidate, ctx: ArbiterContext): StancedReading[];
```

### arbiter/pressure

```typescript
/**
 * Conscience pressure bookkeeping (ADR-318 D8) — the deposit/drain half
 * the pure arbiter never touches.
 *
 * Guilt is the ledger of the arbiter's defeats: every live principle that
 * loses an arbitration deposits pressure. The curve and its rates are
 * runtime-owned (rule 4); the bands move monotonically upward under
 * deposits (D11: ordering, not scheduling, is the testable fact).
 *
 * Public interface: depositPressure, drainPressure, pressureBandFor,
 *   BandTransition.
 * Owner context: @sharpee/character / arbiter
 */
import { CharacterModelTrait, type PressureBand } from '@sharpee/world-model';
import type { ArbiterVerdict } from './arbiter-types.js';
/** A band change produced by a deposit or drain — author-channel material (D11). */
export interface BandTransition {
    from: PressureBand;
    to: PressureBand;
}
/**
 * The band a curve value falls in. Monotonic in value — deposits can only
 * hold or climb the band, never lower it (D11's ordering contract).
 *
 * @param value - Curve value, 0..100
 * @returns The band word
 */
export declare function pressureBandFor(value: number): PressureBand;
/**
 * Deposit pressure for a verdict's defeats onto the trait (D8). No
 * defeats → no mutation. Sensitivity is personality: `remorseful` doubles
 * each deposit, `untroubled` quarters it (runtime-owned scaling of the
 * existing adjective machinery).
 *
 * @param trait - The character's trait (mutated: pressure value + band)
 * @param verdict - The arbitration whose defeats deposit
 * @returns The band transition if the deposit crossed one, else undefined
 */
export declare function depositPressure(trait: CharacterModelTrait, verdict: ArbiterVerdict): BandTransition | undefined;
/**
 * Drain the curve on a discharge — confession ends the losing collisions
 * (D8). Resets value and band ONLY. The ledger is deliberately untouched
 * (seam-3 per-audience ruling 2026-08-16): a pin releases when its own
 * audience gets the truth — told (recordClaimDelivery's release branch)
 * or caught (the caught-lying face-act, ruled-but-dormant) — or on an
 * authored break (`trait.unpinLedger`). A global unpin here would
 * silently evaporate maintained lies to absent audiences, which D9
 * forbids. Being broken is a state only an author writes.
 *
 * @param trait - The character's trait (mutated: pressure reset)
 * @returns The band transition if the drain crossed one, else undefined
 */
export declare function drainPressure(trait: CharacterModelTrait): BandTransition | undefined;
```

### arbiter/scope

```typescript
/**
 * Scope-string interpretation (ADR-318 D4/D7 — Phase 6)
 *
 * The runtime half of the canonical trait-side scope idiom
 * (`anyone` / `a <kind>` / world-entity-id) that apply-compiled writes:
 * matching an act's object or audience against a declared scope, and
 * deciding whether a principle's `except` lifts it. Kind membership is
 * story knowledge, so it arrives as a callback (the story oracle's
 * `isKindMember` slot).
 *
 * Public interface: scopeMatches, exceptLifts, KindMembership.
 * Owner context: @sharpee/character / arbiter
 */
/** Kind membership for classifier scopes — the story oracle's reserved slot. */
export type KindMembership = (entityId: string, kind: string) => boolean;
/**
 * Whether an entity falls within a canonical scope string.
 *
 * @param scope - `anyone` | `a <kind>` | a world entity id
 * @param entityId - The entity being matched (act object, audience member)
 * @param isKindMember - Kind membership oracle; without one, classifier
 *   scopes match nothing (conservative: the principle stays in force)
 * @returns Whether the entity is in scope
 */
export declare function scopeMatches(scope: string, entityId: string, isKindMember?: KindMembership): boolean;
/**
 * Whether a principle's `except` lifts it for this act.
 *
 * The object carve-out (a bare scope) lifts when the act's object is in
 * scope (exp-02: `never steals, except the Duke` — stealing from the
 * Duke is allowed). The collision carve-out (`to protect <scope>`)
 * yields to the obligation protecting that scope — arbiter-internal
 * semantics deferred with the goal-site arbitration (Phase 6 follow-up);
 * until then it conservatively does NOT lift, so the principle stays in
 * force (thealderman declares none).
 *
 * @param except - The canonical except string from the trait
 * @param objectId - The act's object (the asker at the dialogue site);
 *   absent means the object is unknown — nothing lifts
 * @param isKindMember - Kind membership oracle
 * @returns Whether the principle is lifted for this act
 */
export declare function exceptLifts(except: string, objectId: string | undefined, isKindMember?: KindMembership): boolean;
```

### arbiter/reveal

```typescript
/**
 * Confided-topic reveal arbitration (ADR-318 — the reveal site)
 *
 * The assembled arbitration for the dialogue reveal gate: asked about a
 * topic held `confided`, complying commits `betray a confidence` and
 * satisfies `answers honestly`; the arbiter weighs principles, honor
 * (the room is the audience), temperament, fear, and disposition, and
 * the verdict's bookkeeping (pressure deposits, paralysis warning,
 * author-channel attribution) happens here so every dialogue surface
 * shares one implementation.
 *
 * Public interface: arbitrateConfidedReveal, RevealArbitration.
 * Owner context: @sharpee/character / arbiter
 */
import { type ISemanticEvent } from '@sharpee/core';
import { CharacterModelTrait, type TemperamentDef } from '@sharpee/world-model';
import type { ArbiterVerdict } from './arbiter-types.js';
import type { KindMembership } from './scope.js';
/** What the reveal gate needs from the asking site. */
export interface RevealArbitrationInput {
    /** The asked NPC's trait. */
    trait: CharacterModelTrait;
    /** The asked NPC's entity id (author-channel attribution). */
    npcId: string;
    /** The conversing actor (the ledger audience and the act's object). */
    askerId: string;
    /** The canonical topic string being asked about. */
    topic: string;
    /** Entity ids present in the room — honor sees the room (D7). */
    audiencePresent: readonly string[];
    /** The NPC's active entity states, for temperament `while` bindings. */
    activeStates?: readonly string[];
    /** Authored temperament definitions (CharacterPhaseRegistry). */
    temperamentDefs?: Readonly<Record<string, TemperamentDef>>;
    /** Kind membership for classifier scopes (the story oracle's slot). */
    isKindMember?: KindMembership;
}
/** The gate's outcome: the verdict, the reveal decision, and its author events. */
export interface RevealArbitration {
    verdict: ArbiterVerdict;
    /** True exactly when the verdict's act is `comply` — the row may deliver. */
    reveal: boolean;
    /** Arbitration + deposit + paralysis events (ADR-318 D11). */
    authorEvents: ISemanticEvent[];
}
/**
 * Arbitrate revealing a confided topic, with bookkeeping.
 *
 * @param input - The asking site's context
 * @returns The arbitration, or null when the topic is not held confided
 *   (no gate — the row proceeds untouched)
 */
export declare function arbitrateConfidedReveal(input: RevealArbitrationInput): RevealArbitration | null;
```

### character-clock

```typescript
/**
 * Character clock seam (ADR-310 implementation plan, temporal amendment
 * 2026-08-15)
 *
 * The ONE place @sharpee/character does turn arithmetic. Every duration,
 * expiry, and elapsed-time comparison in this package goes through these
 * helpers rather than raw `turn` math, so that ADR-316's elapsed-time
 * semantics — when un-deferred — changes exactly one seam.
 *
 * Public interface: expiryTurn, hasExpired, isMomentaryExpired, turnsSince,
 *   CHARACTER_TURN_KEY, dialogueTurn.
 * Owner context: @sharpee/character
 */
import type { WorldModel } from '@sharpee/world-model';
/**
 * World-state key mirroring the last completed NPC turn (Phase 6). The
 * dialogue surfaces run during PLAYER actions, where the engine's turn
 * counter is unreachable by design (the selector binding's documented
 * idiom is a closed-over turn source); the character-model tick phase
 * mirrors its turn here so dialogue-path bookkeeping stamps `mirror + 1`
 * — the turn the player is acting in. Rides world state, so it saves
 * and restores.
 */
export declare const CHARACTER_TURN_KEY = "character.turn";
/**
 * The turn the player is acting in, read from the tick phase's mirror —
 * the one turn source for dialogue-path bookkeeping (ledger stamps,
 * witnessed-act stamps, conversation markers).
 *
 * @param world - The live world holding the mirror
 * @returns The current player turn (mirror + 1; 1 before any tick)
 */
export declare function dialogueTurn(world: WorldModel): number;
/**
 * Compute the turn on which a lingering effect expires.
 *
 * @param appliedAtTurn - The turn the effect was applied
 * @param lingeringTurns - How many turns it lasts
 * @returns The expiry turn
 */
export declare function expiryTurn(appliedAtTurn: number, lingeringTurns: number): number;
/**
 * Check whether an expiry turn has been reached.
 *
 * @param currentTurn - The current turn number
 * @param expiresAtTurn - The expiry turn, if any
 * @returns True if set and reached
 */
export declare function hasExpired(currentTurn: number, expiresAtTurn: number | undefined): boolean;
/**
 * Check whether a momentary effect (one-turn lifetime) has expired.
 * Applied on turn N, gone on turn N+1.
 *
 * @param currentTurn - The current turn number
 * @param appliedAtTurn - The turn the effect was applied
 * @returns True if at least one turn has passed
 */
export declare function isMomentaryExpired(currentTurn: number, appliedAtTurn: number): boolean;
/**
 * Turns elapsed since a recorded turn.
 *
 * @param currentTurn - The current turn number
 * @param sinceTurn - The earlier turn
 * @returns Elapsed turns (never negative)
 */
export declare function turnsSince(currentTurn: number, sinceTurn: number): number;
```
