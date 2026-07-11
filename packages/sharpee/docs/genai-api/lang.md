# @sharpee/lang-en-us

English language provider, message resolution, formatters.

---

### language-provider

```typescript
/**
 * English Language Provider
 *
 * Self-contained language implementation with no external dependencies
 * Enhanced to support getMessage interface for text service
 */
import { ParserLanguageProvider, ActionHelp, VerbVocabulary, DirectionVocabulary, SpecialVocabulary, LanguageGrammarPattern, LocaleSettings, RenderContext } from '@sharpee/if-domain';
import type { ITextBlock } from '@sharpee/text-blocks';
import { NarrativeContext } from './perspective';
/**
 * English language data and rules
 */
export declare class EnglishLanguageProvider implements ParserLanguageProvider {
    readonly languageCode = "en-US";
    readonly languageName = "English (US)";
    readonly textDirection: "ltr";
    private messages;
    private customActionPatterns;
    private narrativeContext;
    private serialComma;
    private readonly assembler;
    constructor();
    /**
     * Load core system messages (command failures, etc.)
     * These are used by text-service for command.failed events
     */
    private loadCoreMessages;
    /**
     * Set narrative settings for perspective-aware message resolution (ADR-089)
     *
     * This should be called by the engine after loading a story to configure
     * how {You}, {your}, {take} placeholders are resolved.
     *
     * @param settings Narrative settings from story config
     */
    setNarrativeSettings(settings: NarrativeContext): void;
    /**
     * Get current narrative context
     */
    getNarrativeContext(): NarrativeContext;
    /**
     * Load messages from all action language definitions
     */
    private loadActionMessages;
    /**
     * Load NPC messages (ADR-070)
     */
    private loadNpcMessages;
    /**
     * Load character system messages (ADR-142 conversation, ADR-144 propagation, ADR-146 influence)
     */
    private loadCharacterMessages;
    /**
     * Load spatial-sound prose defaults (ADR-172 Phase 5).
     *
     * Per-`(kind, audibility_tier)` defaults the sound dispatcher (Phase
     * 6) resolves when rendering an `AudibilityEvent` for a listener.
     * Story authors override per kind via the standard message-override
     * mechanism.
     */
    private loadSoundMessages;
    /**
     * Load platform-event prose defaults (save/restore/undo outcomes).
     * The prose pipeline renders a `platform.*` event via the message
     * registered under the event type; stories override the same ids.
     */
    private loadPlatformMessages;
    /**
     * Get a message by its ID with optional parameter substitution
     *
     * Supports three types of placeholders:
     * 1. Perspective placeholders (ADR-089): {You}, {your}, {take}, etc.
     *    - Resolved based on narrative context (1st/2nd/3rd person)
     * 2. Simple `{key}` placeholders → `String(params[key])`.
     *
     * The ADR-095 formatter chain is gone (ADR-192): entity-aware article / list /
     * verb realization lives in the phrase pipeline ({@link renderMessage}). This
     * string path remains for non-phrase callers (e.g. core prompts) and does plain
     * substitution only — no articles, lists, or `:`-chains.
     *
     * @param messageId Full message ID (e.g., 'if.action.taking.taken')
     * @param params Parameters to substitute in the message
     * @returns The resolved message text, or the ID when not registered
     */
    getMessage(messageId: string, params?: Record<string, any>): string;
    /**
     * Get the raw, unresolved template for a message ID (ADR-192 phrase path).
     *
     * Returns the author template verbatim — no perspective resolution, no
     * parameter substitution. The phrase pipeline resolves perspective and parses
     * the result; see {@link renderMessage}.
     *
     * @param messageId Full message ID (e.g. 'if.action.taking.taken')
     * @returns The raw template, or undefined when the ID is not registered
     */
    getTemplate(messageId: string): string | undefined;
    /**
     * Locale realization settings (ADR-192). The engine reads these when building
     * the per-turn render context so the Assembler agrees over the story's
     * configured knobs.
     *
     * @returns The current locale settings (serial comma, …)
     */
    getLocaleSettings(): LocaleSettings;
    /**
     * The narrative grammatical person of the player subject (ADR-199 §4 B),
     * mapped from the ADR-089 perspective ('1st'/'2nd'/'3rd' → first/second/third).
     *
     * @returns the player subject's grammatical person under the current narration
     */
    getNarrativePerson(): 'first' | 'second' | 'third';
    /**
     * Render a message to text blocks through the phrase pipeline (ADR-192 §6).
     *
     * Phrase-path replacement for {@link getMessage}: resolve perspective
     * placeholders (kept as a string pre-pass, ADR-089), parse the template into a
     * `Phrase` tree, then realize it with the Assembler against `ctx`. A missing
     * template realizes to a literal of the ID, mirroring `getMessage`'s
     * echo-the-ID fallback.
     *
     * @param messageId Full message ID
     * @param params Parameter/producer bindings keyed by placeholder name
     * @param ctx The per-message render context (world, settings, seams)
     * @returns The realized text blocks
     */
    renderMessage(messageId: string, params: Record<string, unknown>, ctx: RenderContext): ITextBlock[];
    /**
     * Set whether lists use the serial (Oxford) comma (ADR-190). Default true.
     * @param on true → "a, b, and c"; false → "a, b and c"
     */
    setSerialComma(on: boolean): void;
    /**
     * Check if a message exists
     * @param messageId The message identifier
     * @returns True if the message exists
     */
    hasMessage(messageId: string): boolean;
    /**
     * Get patterns/aliases for an action
     * @param actionId The action identifier (e.g., 'if.action.taking')
     * @returns Array of patterns or undefined if action not found
     */
    getActionPatterns(actionId: string): string[] | undefined;
    /**
     * Get structured help information for an action
     * @param actionId The action identifier (e.g., 'if.action.taking')
     * @returns Structured help information or undefined if not found
     */
    getActionHelp(actionId: string): ActionHelp | undefined;
    /**
     * Get all supported actions
     * @returns Array of action IDs
     */
    getSupportedActions(): string[];
    /**
     * Returns all registered message IDs and their text.
     * Used by tooling for language introspection.
     *
     * @returns Copy of the internal message map
     */
    getAllMessages(): Map<string, string>;
    /**
     * Get entity name/description
     * @param entity Entity object or ID
     * @returns Entity name or fallback
     */
    getEntityName(entity: any): string;
    /**
     * Get all messages for a given action
     * @param actionId Action identifier
     * @returns Map of message keys to messages
     */
    getActionMessages(actionId: string): Map<string, string> | null;
    getVerbs(): VerbVocabulary[];
    getDirections(): DirectionVocabulary[];
    getSpecialVocabulary(): SpecialVocabulary;
    getCommonAdjectives(): string[];
    getCommonNouns(): string[];
    getPrepositions(): string[];
    getDeterminers(): string[];
    getConjunctions(): string[];
    getNumbers(): string[];
    getGrammarPatterns(): LanguageGrammarPattern[];
    lemmatize(word: string): string;
    expandAbbreviation(abbreviation: string): string | null;
    formatList(items: string[], conjunction?: 'and' | 'or'): string;
    getIndefiniteArticle(noun: string): string;
    pluralize(noun: string): string;
    isIgnoreWord(word: string): boolean;
    /**
     * Add a custom message to the language provider
     * @param messageId The message identifier (e.g., 'custom.action.message')
     * @param template The message template with optional {param} placeholders
     */
    addMessage(messageId: string, template: string): void;
    /**
     * Add help information for a custom action
     * @param actionId The action identifier (e.g., 'custom.action.foo')
     * @param help The help information including usage, description, examples
     */
    addActionHelp(actionId: string, help: ActionHelp): void;
    /**
     * Add custom patterns/aliases for an action
     * @param actionId The action identifier
     * @param patterns Array of verb patterns/aliases
     */
    addActionPatterns(actionId: string, patterns: string[]): void;
}
declare const _default: EnglishLanguageProvider;
export default _default;
```

### data/verbs

```typescript
/**
 * @file English Verb Definitions
 * @description Verb mappings for English language
 */
/**
 * Standard Interactive Fiction action identifiers
 * These match the action IDs used in the IF system
 */
export declare const IFActions: {
    readonly GOING: "if.action.going";
    readonly ENTERING: "if.action.entering";
    readonly EXITING: "if.action.exiting";
    readonly CLIMBING: "if.action.climbing";
    readonly LOOKING: "if.action.looking";
    readonly EXAMINING: "if.action.examining";
    readonly READING: "if.action.reading";
    readonly SEARCHING: "if.action.searching";
    readonly LISTENING: "if.action.listening";
    readonly SMELLING: "if.action.smelling";
    readonly TOUCHING: "if.action.touching";
    readonly TAKING: "if.action.taking";
    readonly DROPPING: "if.action.dropping";
    readonly PUTTING: "if.action.putting";
    readonly INSERTING: "if.action.inserting";
    readonly OPENING: "if.action.opening";
    readonly CLOSING: "if.action.closing";
    readonly LOCKING: "if.action.locking";
    readonly UNLOCKING: "if.action.unlocking";
    readonly SWITCHING_ON: "if.action.switching_on";
    readonly SWITCHING_OFF: "if.action.switching_off";
    readonly PUSHING: "if.action.pushing";
    readonly PULLING: "if.action.pulling";
    readonly TURNING: "if.action.turning";
    readonly USING: "if.action.using";
    readonly GIVING: "if.action.giving";
    readonly SHOWING: "if.action.showing";
    readonly THROWING: "if.action.throwing";
    readonly ATTACKING: "if.action.attacking";
    readonly TALKING: "if.action.talking";
    readonly ASKING: "if.action.asking";
    readonly TELLING: "if.action.telling";
    readonly ANSWERING: "if.action.answering";
    readonly WEARING: "if.action.wearing";
    readonly TAKING_OFF: "if.action.taking_off";
    readonly EATING: "if.action.eating";
    readonly DRINKING: "if.action.drinking";
    readonly INVENTORY: "if.action.inventory";
    readonly WAITING: "if.action.waiting";
    readonly SLEEPING: "if.action.sleeping";
    readonly SAVING: "if.action.saving";
    readonly RESTORING: "if.action.restoring";
    readonly QUITTING: "if.action.quitting";
    readonly HELP: "if.action.help";
    readonly ABOUT: "if.action.about";
    readonly SCORING: "if.action.scoring";
    readonly TRACE: "author.trace";
};
export interface VerbDefinition {
    action: string;
    verbs: string[];
    requiresObject: boolean;
    allowsIndirectObject?: boolean;
}
/**
 * English verb definitions mapping verbs to IF actions
 */
export declare const englishVerbs: VerbDefinition[];
```

### grammar

```typescript
/**
 * English-specific grammar types and constants
 *
 * This module defines the parts of speech and grammatical structures
 * specific to the English language. Other languages will have their
 * own grammar modules with different parts of speech.
 */
/**
 * English parts of speech
 *
 * Note: This is specific to English and may not apply to other languages.
 * For example, Japanese has particles, Turkish has postpositions, etc.
 */
export declare const EnglishPartsOfSpeech: Readonly<{
    readonly VERB: "verb";
    readonly NOUN: "noun";
    readonly ADJECTIVE: "adjective";
    readonly ARTICLE: "article";
    readonly PREPOSITION: "preposition";
    readonly PRONOUN: "pronoun";
    readonly DETERMINER: "determiner";
    readonly CONJUNCTION: "conjunction";
    readonly INTERJECTION: "interjection";
    readonly DIRECTION: "direction";
    readonly ADVERB: "adverb";
    readonly AUXILIARY: "auxiliary";
}>;
/**
 * Type for English parts of speech values
 */
export type EnglishPartOfSpeech = typeof EnglishPartsOfSpeech[keyof typeof EnglishPartsOfSpeech];
/**
 * English grammar patterns
 *
 * These patterns describe common command structures in English
 */
export declare const EnglishGrammarPatterns: {
    readonly VERB_ONLY: {
        readonly name: "verb_only";
        readonly elements: readonly ["VERB"];
        readonly example: "look";
        readonly description: "Simple intransitive verb";
    };
    readonly VERB_NOUN: {
        readonly name: "verb_noun";
        readonly elements: readonly ["VERB", "NOUN_PHRASE"];
        readonly example: "take ball";
        readonly description: "Transitive verb with direct object";
    };
    readonly VERB_NOUN_PREP_NOUN: {
        readonly name: "verb_noun_prep_noun";
        readonly elements: readonly ["VERB", "NOUN_PHRASE", "PREP", "NOUN_PHRASE"];
        readonly example: "put ball in box";
        readonly description: "Ditransitive verb with direct and indirect objects";
    };
    readonly VERB_PREP_NOUN: {
        readonly name: "verb_prep_noun";
        readonly elements: readonly ["VERB", "PREP", "NOUN_PHRASE"];
        readonly example: "look at painting";
        readonly description: "Verb with prepositional phrase";
    };
    readonly VERB_PARTICLE_NOUN: {
        readonly name: "verb_particle_noun";
        readonly elements: readonly ["VERB", "PARTICLE", "NOUN_PHRASE"];
        readonly example: "pick up ball";
        readonly description: "Phrasal verb with direct object";
    };
    readonly VERB_NOUN_PARTICLE: {
        readonly name: "verb_noun_particle";
        readonly elements: readonly ["VERB", "NOUN_PHRASE", "PARTICLE"];
        readonly example: "put ball down";
        readonly description: "Phrasal verb with object before particle";
    };
    readonly VERB_DIRECTION: {
        readonly name: "verb_direction";
        readonly elements: readonly ["VERB", "DIRECTION"];
        readonly example: "go north";
        readonly description: "Movement verb with direction";
    };
    readonly DIRECTION_ONLY: {
        readonly name: "direction_only";
        readonly elements: readonly ["DIRECTION"];
        readonly example: "north";
        readonly description: "Implicit movement command";
    };
};
/**
 * Type for English grammar pattern names
 */
export type EnglishGrammarPatternName = keyof typeof EnglishGrammarPatterns;
/**
 * English-specific token type for language processing
 */
export interface EnglishToken {
    /** Original word as typed */
    word: string;
    /** Normalized form (lowercase, etc.) */
    normalized: string;
    /** Character position in original input */
    position: number;
    /** Length of the token */
    length: number;
    /** Possible English parts of speech */
    partsOfSpeech: EnglishPartOfSpeech[];
    /** Additional English-specific data */
    englishData?: {
        /** Is this a contraction? */
        isContraction?: boolean;
        /** Expanded form if contraction */
        expandedForm?: string;
        /** Is this part of a phrasal verb? */
        isPhrasalVerbParticle?: boolean;
        /** Is this a modal verb? */
        isModal?: boolean;
    };
}
/**
 * English verb forms and conjugations
 */
export interface EnglishVerbForms {
    /** Base form (infinitive without 'to') */
    base: string;
    /** Third person singular present */
    thirdPersonSingular?: string;
    /** Past tense */
    past?: string;
    /** Past participle */
    pastParticiple?: string;
    /** Present participle (-ing form) */
    presentParticiple?: string;
    /** Imperative form (usually same as base) */
    imperative?: string;
}
/**
 * English noun properties
 */
export interface EnglishNounProperties {
    /** Singular form */
    singular: string;
    /** Plural form */
    plural?: string;
    /** Is this a mass noun (uncountable)? */
    isMassNoun?: boolean;
    /** Is this a proper noun? */
    isProperNoun?: boolean;
    /** Common adjectives that collocate with this noun */
    commonAdjectives?: string[];
}
/**
 * English preposition properties
 */
export interface EnglishPrepositionProperties {
    /** The preposition */
    preposition: string;
    /** Type of relationship it expresses */
    relationshipType: 'spatial' | 'temporal' | 'logical' | 'other';
    /** Can it be used as a particle in phrasal verbs? */
    canBeParticle?: boolean;
}
/**
 * Utility functions for English grammar
 */
export declare const EnglishGrammarUtils: {
    /**
     * Check if a word is likely an article
     */
    isArticle(word: string): boolean;
    /**
     * Check if a word is a common determiner
     */
    isDeterminer(word: string): boolean;
    /**
     * Check if a word is a pronoun
     */
    isPronoun(word: string): boolean;
    /**
     * Check if a word is a conjunction
     */
    isConjunction(word: string): boolean;
    /**
     * Get the indefinite article for a word
     */
    getIndefiniteArticle(word: string): "a" | "an";
};
/**
 * Export all grammar types and constants
 */
export * from './index';
```

### actions

```typescript
/**
 * English language content for all standard actions
 *
 * Each action has its own file with patterns, messages, and help text
 */
export * from './taking';
export * from './dropping';
export * from './looking';
export * from './inventory';
export * from './examining';
export * from './going';
export * from './opening';
export * from './closing';
export * from './putting';
export * from './inserting';
export * from './removing';
export * from './wearing';
export * from './taking-off';
export * from './locking';
export * from './unlocking';
export * from './entering';
export * from './exiting';
export * from './climbing';
export * from './searching';
export * from './listening';
export * from './smelling';
export * from './touching';
export * from './reading';
export * from './switching-on';
export * from './switching-off';
export * from './pushing';
export * from './pulling';
export * from './turning';
export * from './lowering';
export * from './raising';
export * from './giving';
export * from './showing';
export * from './talking';
export * from './asking';
export * from './telling';
export * from './answering';
export * from './throwing';
export * from './eating';
export * from './drinking';
export * from './attacking';
export * from './hiding';
export * from './waiting';
export * from './sleeping';
export * from './scoring';
export * from './help';
export * from './about';
export * from './version';
export * from './saving';
export * from './restoring';
export * from './quitting';
export * from './undoing';
export * from './again';
/**
 * All standard action language definitions
 */
export declare const standardActionLanguage: ({
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_held: string;
        nothing_to_drop: string;
        dropped: string;
        still_worn: string;
        dropped_in: string;
        dropped_on: string;
        dropped_multi: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        cant_take_self: string;
        already_have: string;
        cant_take_room: string;
        fixed_in_place: string;
        container_full: string;
        too_heavy: string;
        cannot_take: string;
        taken: string;
        nothing_to_take: string;
        taken_from: string;
        taken_multi: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        room_description: string;
        room_dark: string;
        exits: string;
        you_see: string;
        contents_list: string;
        nothing_special: string;
        container_contents: string;
        surface_contents: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        empty: string;
        inventory_empty: string;
        nothing_at_all: string;
        hands_empty: string;
        pockets_empty: string;
        carrying: string;
        wearing: string;
        carrying_and_wearing: string;
        item_list: string;
        holding_list: string;
        worn_list: string;
        inventory_header: string;
        carrying_count: string;
        wearing_count: string;
        burden_light: string;
        burden_heavy: string;
        burden_overloaded: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_visible: string;
        cant_see: string;
        examined: string;
        examined_self: string;
        examined_container: string;
        examined_supporter: string;
        examined_readable: string;
        examined_switchable: string;
        examined_wearable: string;
        examined_door: string;
        examined_wall: string;
        nothing_special: string;
        description: string;
        brief_description: string;
        no_description: string;
        container_open: string;
        container_closed: string;
        container_empty: string;
        container_contents: string;
        surface_contents: string;
        worn_by_you: string;
        worn_by_other: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        room_description: string;
        contents_list: string;
        no_exit: string;
        no_exit_that_way: string;
        door_closed: string;
        door_locked: string;
        too_dark: string;
        moved: string;
        cant_go_through: string;
        already_there: string;
        nowhere_to_go: string;
        no_direction: string;
        not_in_room: string;
        no_exits: string;
        movement_blocked: string;
        destination_not_found: string;
        need_light: string;
        went: string;
        arrived: string;
        cant_go: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_openable: string;
        already_open: string;
        locked: string;
        opened: string;
        revealing: string;
        its_empty: string;
        cant_reach: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_closable: string;
        already_closed: string;
        closed: string;
        cant_reach: string;
        prevents_closing: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        no_destination: string;
        not_held: string;
        not_container: string;
        not_surface: string;
        container_closed: string;
        already_there: string;
        put_in: string;
        put_on: string;
        cant_put_in_itself: string;
        cant_put_on_itself: string;
        no_room: string;
        no_space: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        no_destination: string;
        not_held: string;
        not_insertable: string;
        not_container: string;
        already_there: string;
        inserted: string;
        wont_fit: string;
        container_closed: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        no_source: string;
        not_in_container: string;
        not_on_surface: string;
        container_closed: string;
        removed_from: string;
        removed_from_surface: string;
        cant_reach: string;
        already_have: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_wearable: string;
        not_held: string;
        already_wearing: string;
        worn: string;
        cant_wear_that: string;
        hands_full: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_wearing: string;
        removed: string;
        cant_remove: string;
        prevents_removal: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_lockable: string;
        no_key: string;
        wrong_key: string;
        already_locked: string;
        not_closed: string;
        locked: string;
        locked_with: string;
        cant_reach: string;
        key_not_held: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_lockable: string;
        no_key: string;
        wrong_key: string;
        already_unlocked: string;
        unlocked: string;
        unlocked_with: string;
        cant_reach: string;
        key_not_held: string;
        still_locked: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_enterable: string;
        already_inside: string;
        container_closed: string;
        too_full: string;
        entered: string;
        entered_on: string;
        cant_enter: string;
        not_here: string;
        too_small: string;
        occupied: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        already_outside: string;
        container_closed: string;
        cant_exit: string;
        exited: string;
        exited_from: string;
        nowhere_to_go: string;
        exit_blocked: string;
        must_stand_first: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_climbable: string;
        cant_go_that_way: string;
        climbed_up: string;
        climbed_down: string;
        climbed_onto: string;
        already_there: string;
        too_high: string;
        too_dangerous: string;
        need_equipment: string;
        too_slippery: string;
        nothing_to_climb: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        not_visible: string;
        not_reachable: string;
        container_closed: string;
        nothing_special: string;
        found_items: string;
        empty_container: string;
        container_contents: string;
        supporter_contents: string;
        searched_location: string;
        searched_object: string;
        found_concealed: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        not_visible: string;
        silence: string;
        ambient_sounds: string;
        active_devices: string;
        no_sound: string;
        device_running: string;
        device_off: string;
        container_sounds: string;
        liquid_sounds: string;
        listened_to: string;
        listened_environment: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        not_visible: string;
        too_far: string;
        no_scent: string;
        room_scents: string;
        food_nearby: string;
        smoke_detected: string;
        no_particular_scent: string;
        food_scent: string;
        drink_scent: string;
        burning_scent: string;
        container_food_scent: string;
        musty_scent: string;
        fresh_scent: string;
        smelled: string;
        smelled_environment: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_visible: string;
        not_reachable: string;
        feels_normal: string;
        feels_warm: string;
        feels_hot: string;
        feels_cold: string;
        feels_soft: string;
        feels_hard: string;
        feels_smooth: string;
        feels_rough: string;
        feels_wet: string;
        device_vibrating: string;
        immovable_object: string;
        liquid_container: string;
        touched: string;
        touched_gently: string;
        poked: string;
        prodded: string;
        patted: string;
        stroked: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        what_to_read: string;
        not_readable: string;
        cannot_read_now: string;
        read_text: string;
        read_book: string;
        read_book_page: string;
        read_sign: string;
        read_inscription: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_visible: string;
        not_reachable: string;
        not_switchable: string;
        already_on: string;
        no_power: string;
        switched_on: string;
        light_on: string;
        device_humming: string;
        temporary_activation: string;
        with_sound: string;
        door_opens: string;
        illuminates_darkness: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_visible: string;
        not_reachable: string;
        not_switchable: string;
        already_off: string;
        switched_off: string;
        light_off: string;
        light_off_still_lit: string;
        device_stops: string;
        silence_falls: string;
        with_sound: string;
        door_closes: string;
        was_temporary: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_visible: string;
        not_reachable: string;
        too_heavy: string;
        wearing_it: string;
        button_pushed: string;
        button_clicks: string;
        switch_toggled: string;
        pushed_direction: string;
        pushed_nudged: string;
        pushed_with_effort: string;
        reveals_passage: string;
        wont_budge: string;
        pushing_does_nothing: string;
        fixed_in_place: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_visible: string;
        not_reachable: string;
        too_heavy: string;
        wearing_it: string;
        wont_budge: string;
        lever_pulled: string;
        lever_clicks: string;
        lever_toggled: string;
        cord_pulled: string;
        bell_rings: string;
        cord_activates: string;
        comes_loose: string;
        firmly_attached: string;
        tugging_useless: string;
        pulled_direction: string;
        pulled_nudged: string;
        pulled_with_effort: string;
        pulling_does_nothing: string;
        fixed_in_place: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_visible: string;
        not_reachable: string;
        wearing_it: string;
        cant_turn_that: string;
        dial_turned: string;
        dial_set: string;
        dial_adjusted: string;
        knob_turned: string;
        knob_clicks: string;
        knob_toggled: string;
        wheel_turned: string;
        crank_turned: string;
        mechanism_grinds: string;
        requires_more_turns: string;
        mechanism_activated: string;
        valve_opened: string;
        valve_closed: string;
        flow_changes: string;
        key_needs_lock: string;
        key_turned: string;
        turned: string;
        rotated: string;
        spun: string;
        nothing_happens: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        cant_lower_that: string;
        already_down: string;
        lowered: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        cant_raise_that: string;
        already_up: string;
        raised: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_item: string;
        no_recipient: string;
        not_holding: string;
        recipient_not_visible: string;
        recipient_not_reachable: string;
        not_actor: string;
        self: string;
        inventory_full: string;
        too_heavy: string;
        not_interested: string;
        refuses: string;
        given: string;
        accepts: string;
        gratefully_accepts: string;
        reluctantly_accepts: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_item: string;
        no_viewer: string;
        not_carrying: string;
        viewer_not_visible: string;
        viewer_too_far: string;
        not_actor: string;
        self: string;
        shown: string;
        viewer_examines: string;
        viewer_nods: string;
        viewer_impressed: string;
        viewer_unimpressed: string;
        viewer_recognizes: string;
        wearing_shown: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_visible: string;
        too_far: string;
        not_actor: string;
        self: string;
        not_available: string;
        talked: string;
        no_response: string;
        acknowledges: string;
        first_meeting: string;
        greets_back: string;
        formal_greeting: string;
        casual_greeting: string;
        greets_again: string;
        remembers_you: string;
        friendly_greeting: string;
        has_topics: string;
        nothing_to_say: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        no_topic: string;
        not_visible: string;
        too_far: string;
        not_actor: string;
        unknown_topic: string;
        shrugs: string;
        no_idea: string;
        confused: string;
        responds: string;
        explains: string;
        already_told: string;
        remembers: string;
        not_yet: string;
        must_do_first: string;
        earned_trust: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        no_topic: string;
        not_visible: string;
        too_far: string;
        not_actor: string;
        told: string;
        informed: string;
        interested: string;
        very_interested: string;
        grateful: string;
        already_knew: string;
        not_interested: string;
        bored: string;
        dismissive: string;
        ignores: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_question: string;
        no_one_asked: string;
        too_late: string;
        answered: string;
        answered_yes: string;
        answered_no: string;
        gave_answer: string;
        accepted: string;
        rejected: string;
        noted: string;
        confused_by_answer: string;
        invalid_response: string;
        needs_yes_or_no: string;
        unclear_answer: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_item: string;
        not_holding: string;
        target_not_visible: string;
        target_not_here: string;
        no_exit: string;
        too_heavy: string;
        self: string;
        thrown: string;
        thrown_down: string;
        thrown_gently: string;
        thrown_at: string;
        hits_target: string;
        misses_target: string;
        bounces_off: string;
        lands_on: string;
        lands_in: string;
        thrown_direction: string;
        sails_through: string;
        breaks_on_impact: string;
        breaks_against: string;
        fragile_breaks: string;
        target_ducks: string;
        target_catches: string;
        target_angry: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_item: string;
        not_visible: string;
        not_reachable: string;
        not_edible: string;
        is_drink: string;
        already_consumed: string;
        eaten: string;
        eaten_all: string;
        eaten_some: string;
        eaten_portion: string;
        delicious: string;
        tasty: string;
        bland: string;
        awful: string;
        filling: string;
        still_hungry: string;
        satisfying: string;
        poisonous: string;
        nibbled: string;
        tasted: string;
        devoured: string;
        munched: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_item: string;
        not_visible: string;
        not_reachable: string;
        not_drinkable: string;
        already_consumed: string;
        container_closed: string;
        drunk: string;
        drunk_all: string;
        drunk_some: string;
        drunk_from: string;
        refreshing: string;
        satisfying: string;
        bitter: string;
        sweet: string;
        strong: string;
        thirst_quenched: string;
        still_thirsty: string;
        magical_effects: string;
        healing: string;
        from_container: string;
        empty_now: string;
        some_remains: string;
        sipped: string;
        quaffed: string;
        gulped: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_target: string;
        not_visible: string;
        not_reachable: string;
        self: string;
        not_holding_weapon: string;
        indestructible: string;
        need_weapon_to_damage: string;
        wrong_weapon_type: string;
        attack_ineffective: string;
        already_dead: string;
        violence_not_the_answer: string;
        'combat.cannot_attack': string;
        'combat.already_dead': string;
        'combat.not_hostile': string;
        'combat.no_target': string;
        'combat.target_unconscious': string;
        'combat.need_weapon': string;
        'combat.attack.missed': string;
        'combat.attack.hit': string;
        'combat.attack.hit_light': string;
        'combat.attack.hit_heavy': string;
        'combat.attack.knocked_out': string;
        'combat.attack.killed': string;
        'combat.defend.blocked': string;
        'combat.defend.parried': string;
        'combat.defend.dodged': string;
        'combat.health.healthy': string;
        'combat.health.wounded': string;
        'combat.health.badly_wounded': string;
        'combat.health.near_death': string;
        'combat.health.unconscious': string;
        'combat.health.dead': string;
        'combat.special.sword_glows': string;
        'combat.special.sword_stops_glowing': string;
        'combat.special.blessed_weapon': string;
        'combat.started': string;
        'combat.ended': string;
        'combat.player_died': string;
        'combat.player_resurrected': string;
        attacked: string;
        attacked_with: string;
        hit_target: string;
        hit_blindly: string;
        hit_with: string;
        struck: string;
        struck_with: string;
        punched: string;
        kicked: string;
        unarmed_attack: string;
        target_broke: string;
        target_shattered: string;
        broke: string;
        smashed: string;
        target_destroyed: string;
        destroyed: string;
        shattered: string;
        target_damaged: string;
        killed_target: string;
        killed_blindly: string;
        items_spilled: string;
        passage_revealed: string;
        debris_created: string;
        defends: string;
        dodges: string;
        retaliates: string;
        flees: string;
        peaceful_solution: string;
        no_fighting: string;
        unnecessary_violence: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        waited: string;
        waited_patiently: string;
        time_passes: string;
        nothing_happens: string;
        waited_in_vehicle: string;
        waited_for_event: string;
        waited_anxiously: string;
        waited_briefly: string;
        something_approaches: string;
        time_runs_out: string;
        patience_rewarded: string;
        grows_restless: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        slept: string;
        dozed_off: string;
        fell_asleep: string;
        brief_nap: string;
        deep_sleep: string;
        slept_fitfully: string;
        cant_sleep_here: string;
        too_dangerous_to_sleep: string;
        already_well_rested: string;
        woke_refreshed: string;
        disturbed_sleep: string;
        nightmares: string;
        peaceful_sleep: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        no_scoring: string;
        scoring_not_enabled: string;
        score_display: string;
        score_simple: string;
        score_with_rank: string;
        perfect_score: string;
        rank_novice: string;
        rank_amateur: string;
        rank_proficient: string;
        rank_expert: string;
        rank_master: string;
        with_achievements: string;
        no_achievements: string;
        early_game: string;
        mid_game: string;
        late_game: string;
        game_complete: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        general: string;
        topic: string;
        unknown_topic: string;
        help_movement: string;
        help_objects: string;
        help_special: string;
        first_time: string;
        hints_available: string;
        hints_disabled: string;
        stuck_help: string;
        help_footer: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        success: string;
        about_header: string;
        game_info: string;
        game_info_simple: string;
        description: string;
        copyright: string;
        license: string;
        website: string;
        contact: string;
        credits_header: string;
        credits_list: string;
        special_thanks: string;
        dedication: string;
        acknowledgments: string;
        engine_info: string;
        technical_info: string;
        play_stats: string;
        session_info: string;
        about_footer: string;
        enjoy_game: string;
        about_compact: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        version_full: string;
        version_no_date: string;
        version_compact: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        game_saved: string;
        game_saved_as: string;
        save_successful: string;
        save_slot: string;
        overwrite_save: string;
        save_details: string;
        quick_save: string;
        auto_save: string;
        save_failed: string;
        no_save_slots: string;
        invalid_save_name: string;
        save_not_allowed: string;
        save_in_progress: string;
        confirm_overwrite: string;
        save_reminder: string;
        saved_locally: string;
        saved_to_cloud: string;
        save_exported: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        game_restored: string;
        game_loaded: string;
        restore_successful: string;
        welcome_back: string;
        restore_details: string;
        quick_restore: string;
        resuming_game: string;
        restore_failed: string;
        save_not_found: string;
        no_saves: string;
        corrupt_save: string;
        incompatible_save: string;
        restore_not_allowed: string;
        confirm_restore: string;
        unsaved_progress: string;
        available_saves: string;
        no_saves_available: string;
        choose_save: string;
        import_save: string;
        save_imported: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        quit_confirm_query: string;
        quit_save_query: string;
        quit_unsaved_query: string;
        quit_confirmed: string;
        quit_cancelled: string;
        quit_and_saved: string;
        final_score: string;
        final_stats: string;
        achievements_earned: string;
    };
    queryOptions: {
        quit: string;
        cancel: string;
        save_and_quit: string;
        quit_without_saving: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        undo_success: string;
        undo_to_turn: string;
        undo_failed: string;
        nothing_to_undo: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        nothing_to_repeat: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        behind: string;
        under: string;
        on: string;
        inside: string;
        nothing_to_hide: string;
        cant_hide_there: string;
        already_hidden: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
} | {
    actionId: string;
    patterns: string[];
    messages: {
        revealed: string;
        not_hidden: string;
    };
    help: {
        description: string;
        examples: string;
        summary: string;
    };
})[];
```

### npc/npc

```typescript
/**
 * Language content for NPC system (ADR-070)
 *
 * Attribution lines name the acting NPC via a `speaker` NounPhrase param (ADR-203)
 * and agree their verb with it via the ADR-199 Verb atom (`{verb:LEMMA speaker}`).
 * The article is the ADR-192 hint (`{the speaker}` here; author-overridable). The
 * `{capitalize …}` hint supplies the sentence-initial capital (top-level messages are
 * not sentence-initial by default, so auto-cap does not fire here).
 */
export declare const npcLanguage: {
    messages: {
        'npc.enters': string;
        'npc.leaves': string;
        'npc.arrives': string;
        'npc.departs': string;
        'npc.heard_arrives': string;
        'npc.heard_departs': string;
        'npc.notices_player': string;
        'npc.ignores_player': string;
        'npc.takes': string;
        'npc.drops': string;
        'npc.follows': string;
        'npc.guard.blocks': string;
        'npc.guard.attacks': string;
        'npc.guard.defeated': string;
        'npc.attacks': string;
        'npc.misses': string;
        'npc.hits': string;
        'npc.killed': string;
        'npc.unconscious': string;
        'npc.combat.attack.missed': string;
        'npc.combat.attack.hit': string;
        'npc.combat.attack.hit_light': string;
        'npc.combat.attack.hit_heavy': string;
        'npc.combat.attack.knocked_out': string;
        'npc.combat.attack.killed': string;
        'npc.speech': string;
        'npc.speaks': string;
        'npc.shouts': string;
        'npc.whispers': string;
        'npc.mutters': string;
        'npc.emote': string;
        'npc.laughs': string;
        'npc.growls': string;
        'npc.cries': string;
        'npc.sighs': string;
        'npc.greets': string;
        'npc.farewell': string;
        'npc.no_response': string;
        'npc.confused': string;
    };
};
```

### npc/conversation

```typescript
/**
 * Language content for conversation system (ADR-142)
 *
 * Platform default messages for response action framing, cognitive
 * speech patterns, between-turn commentary, and attention management.
 * Authors override per-NPC; these serve as fallbacks.
 *
 * Attribution names the NPC via a `speaker` NounPhrase (ADR-203) and agrees the
 * leading verb with it (`{verb:LEMMA speaker}`, ADR-199). Embedded literal dialogue
 * stays verbatim (ADR-200); secondary body verbs remain literal (leading-attribution
 * scope).
 *
 * Owner context: @sharpee/lang-en-us / npc
 */
export declare const conversationLanguage: {
    messages: {
        'character.conversation.response.deflect': string;
        'character.conversation.response.refuse': string;
        'character.conversation.response.confabulate': string;
        'character.conversation.response.omit': string;
        'character.conversation.cognitive.fragmented': string;
        'character.conversation.cognitive.drifting': string;
        'character.conversation.cognitive.detached': string;
        'character.conversation.between.eager.1': string;
        'character.conversation.between.eager.3': string;
        'character.conversation.between.reluctant.1': string;
        'character.conversation.between.hostile.1': string;
        'character.conversation.between.confessing.1': string;
        'character.conversation.between.confessing.3': string;
        'character.conversation.between.neutral.3': string;
        'character.conversation.attention.yields': string;
        'character.conversation.attention.protests': string;
        'character.conversation.attention.blocks': string;
        'character.conversation.ends': string;
        'character.conversation.initiates': string;
    };
};
```

### npc/propagation

```typescript
/**
 * Language content for propagation system (ADR-144)
 *
 * Platform default witnessed messages per propagation coloring.
 * Authors override per-fact via FactOverride.witnessed.
 *
 * Owner context: @sharpee/lang-en-us / npc
 */
export declare const propagationLanguage: {
    messages: {
        'character.propagation.witnessed.neutral': string;
        'character.propagation.witnessed.dramatic': string;
        'character.propagation.witnessed.vague': string;
        'character.propagation.witnessed.fearful': string;
        'character.propagation.witnessed.conspiratorial': string;
        'character.propagation.eavesdropped': string;
    };
};
```

### npc/influence

```typescript
/**
 * Language content for influence system (ADR-146)
 *
 * Platform default witnessed/resisted messages for influence events.
 * Authors override per-influence via InfluenceDef.witnessed / .resisted.
 *
 * Owner context: @sharpee/lang-en-us / npc
 */
export declare const influenceLanguage: {
    messages: {
        'character.influence.witnessed.default': string;
        'character.influence.resisted.default': string;
        'character.influence.pc.focus_clouded': string;
        'character.influence.pc.action_intercepted': string;
        'character.influence.effect.expired': string;
        'character.influence.effect.departed': string;
    };
};
```

### perspective/placeholder-resolver

```typescript
/**
 * Perspective Placeholder Resolver
 *
 * ADR-089 Phase D: Resolves perspective-aware placeholders in messages.
 *
 * Placeholders:
 * - {You} / {you} - Subject pronoun ("I", "You", "She")
 * - {Your} / {your} - Possessive adjective ("My", "Your", "Her")
 * - {Yours} / {yours} - Possessive pronoun ("Mine", "Yours", "Hers")
 * - {Yourself} / {yourself} - Reflexive ("Myself", "Yourself", "Herself")
 * - {You're} / {you're} - Contraction ("I'm", "You're", "She's")
 * - {verb} - Conjugated verb (e.g., {take} -> "take" or "takes")
 */
/**
 * Pronoun set for an entity (matches world-model PronounSet)
 *
 * Defined locally to avoid lang-en-us depending on world-model.
 * Engine should pass player pronouns when setting narrative context.
 */
export interface PronounSet {
    /** Nominative case: "he", "she", "they", "xe" */
    subject: string;
    /** Accusative case: "him", "her", "them", "xem" */
    object: string;
    /** Possessive pronoun (standalone): "his", "hers", "theirs", "xyrs" */
    possessive: string;
    /** Possessive adjective (before noun): "his", "her", "their", "xyr" */
    possessiveAdj: string;
    /** Reflexive: "himself", "herself", "themselves", "xemself" */
    reflexive: string;
    /** Verb agreement: 'singular' or 'plural' (they takes plural verbs) */
    verbForm: 'singular' | 'plural';
}
/**
 * Standard pronoun sets (matches world-model PRONOUNS)
 */
export declare const PRONOUNS: {
    readonly HE_HIM: {
        readonly subject: "he";
        readonly object: "him";
        readonly possessive: "his";
        readonly possessiveAdj: "his";
        readonly reflexive: "himself";
        readonly verbForm: "singular";
    };
    readonly SHE_HER: {
        readonly subject: "she";
        readonly object: "her";
        readonly possessive: "hers";
        readonly possessiveAdj: "her";
        readonly reflexive: "herself";
        readonly verbForm: "singular";
    };
    readonly THEY_THEM: {
        readonly subject: "they";
        readonly object: "them";
        readonly possessive: "theirs";
        readonly possessiveAdj: "their";
        readonly reflexive: "themselves";
        readonly verbForm: "plural";
    };
};
/**
 * Narrative perspective
 */
export type Perspective = '1st' | '2nd' | '3rd';
/**
 * Narrative settings for placeholder resolution
 */
export interface NarrativeContext {
    perspective: Perspective;
    playerPronouns?: PronounSet;
}
/**
 * Default narrative context (2nd person)
 */
export declare const DEFAULT_NARRATIVE_CONTEXT: NarrativeContext;
/**
 * Conjugate a verb based on perspective
 *
 * @param verb Base form of verb (e.g., "take", "open")
 * @param context Narrative context
 * @returns Conjugated verb
 */
export declare function conjugateVerb(verb: string, context: NarrativeContext): string;
/**
 * Resolve perspective placeholders in a message
 *
 * Placeholders:
 * - {You} / {you} - Subject pronoun
 * - {Your} / {your} - Possessive adjective
 * - {Yours} / {yours} - Possessive pronoun
 * - {Yourself} / {yourself} - Reflexive
 * - {You're} / {you're} - Contraction
 * - {verb} - Any verb in curly braces gets conjugated
 *
 * @param message Message with placeholders
 * @param context Narrative context
 * @returns Message with resolved placeholders
 */
export declare function resolvePerspectivePlaceholders(message: string, context?: NarrativeContext, params?: Record<string, unknown>): string;
```

### assembler/english-assembler

```typescript
/**
 * @file English Assembler — realizes a phrase tree to text blocks (ADR-192 §4).
 *
 * Purpose: the single English-locale component that walks a `Phrase` tree and
 * is the SOLE authority for every cross-cutting correctness concern — article,
 * agreement, punctuation, whitespace, reference, and case. It replaces the
 * left-to-right formatter chain (`applyFormatters`) whose early collapse to a
 * bare string lost the metadata neighbours need to agree against.
 *
 * Public interface: `EnglishAssembler` (implements `Assembler`),
 * `ASSEMBLER_DEFAULT_BLOCK_KEY`, and the standalone `capitalizeSentenceStart`
 * case-authority helper.
 *
 * Owner context: `@sharpee/lang-en-us` — English realization. The ADR-190 list
 * formatter logic is reproduced here in the `PhraseList` case (the old
 * `formatters/list.ts` is retired in Phase 3, not called from here).
 *
 * INVARIANT (ADR-192 §7): `realize` is a pure function of `(tree, ctx)` GIVEN the
 * `textState` snapshot — the same tree, context, and counters yield byte-identical
 * output. No clocks, no `Math.random`. The one declared state transition is a
 * `Choice` advancing its `textState` counter (ADR-196 §3) — seeded, deterministic.
 *
 * All if-domain kinds are realized here: the foundational kinds (Literal,
 * NounPhrase, PhraseList, Sequence, Empty) plus the `Verb` (199), `Verbatim`
 * (200), `Numeral` (198), `Pronoun` (197), `Contents` (194), `Slot` (195), and
 * `Optional` / `Choice` (196) atoms. `PhraseNotImplementedError` is now only a
 * defensive guard against a future unhandled kind.
 */
import { Assembler, Phrase, RenderContext } from '@sharpee/if-domain';
import { ITextBlock } from '@sharpee/text-blocks';
/**
 * Default channel key for a realized tree. Phase 2 emits one block; the report
 * layer (ADR-192 §6, Phase 4) assigns real channel keys (room.name, …) as it
 * wires per-event trees.
 */
export declare const ASSEMBLER_DEFAULT_BLOCK_KEY: "action.result";
/**
 * Capitalize the first alphabetic character of a sentence. Exposed as the Case
 * authority; the explicit `{capitalize …}` template hint is wired to it by the
 * parser in Phase 3 (ADR-192 §5). Not auto-applied — realization preserves the
 * author's case unless capitalization is requested.
 *
 * @param text the realized text
 * @returns the text with its first letter upper-cased
 */
export declare function capitalizeSentenceStart(text: string): string;
/**
 * The English Assembler. Realizes a phrase tree to text blocks under the default
 * channel key; the report layer re-keys per channel.
 */
export declare class EnglishAssembler implements Assembler {
    /**
     * Realize a phrase tree to text blocks.
     *
     * Newlines in the realized text are lifted to block boundaries (no block's
     * content carries `\n`); horizontal whitespace is collapsed per block, except
     * in verbatim runs. A single-line tree yields one block.
     *
     * @param tree the phrase tree to realize
     * @param ctx the render context (world, params, settings, seams)
     * @returns the realized text blocks
     * @throws PhraseNotImplementedError when a reserved stub kind is encountered
     */
    realize(tree: Phrase, ctx: RenderContext): ITextBlock[];
    /** The realize body, run inside the per-pass Choice pick scope. */
    private realizePass;
}
```

### assembler/errors

```typescript
/**
 * @file Assembler error types (ADR-192).
 *
 * Purpose: the named error the English Assembler throws when it meets a phrase
 * kind whose realization has not yet landed.
 *
 * Public interface: `PhraseNotImplementedError`.
 *
 * Owner context: `@sharpee/lang-en-us` — English realization. As of ADR-196
 * (Optional / Choice) every if-domain phrase kind is realized; this error is now
 * a defensive guard against a future kind landing without an Assembler case,
 * refusing loudly rather than silently dropping text.
 */
import { Phrase } from '@sharpee/if-domain';
/**
 * Thrown by the Assembler when a reserved (stub) phrase kind is realized before
 * its follow-on ADR has implemented the case. Names the kind and the ADR.
 */
export declare class PhraseNotImplementedError extends Error {
    readonly kind: Phrase['kind'];
    constructor(kind: Phrase['kind']);
}
```

### parser/parse-phrase-template

```typescript
/**
 * @file parsePhraseTemplate — the phrase-tree template parser (ADR-192 §5).
 *
 * Purpose: parse an author template string into a `Phrase` tree, binding each
 * placeholder to a producer/param value. Replaces `parsePlaceholder` and the
 * `:`-chain formatter grammar. Placeholders are producer references, never
 * formatter chains.
 *
 * Public interface: `parsePhraseTemplate(template, params)` and
 * `PhraseParseError`.
 *
 * Owner context: `@sharpee/lang-en-us`. The grammar is English-locale authoring
 * surface; the produced `Phrase` tree is language-neutral.
 *
 * Grammar (ADR-192 §5):
 *  - `{item}` / `{the item}` / `{a item}` / `{an item}` / `{some item}` /
 *    `{capitalize the item}` → `NounPhrase` (last bare token = param name,
 *    leading bare tokens = reserved hints).
 *  - `{verb:is target}` / `{verb:has target}` / `{verb:opens door}` → a `Verb`
 *    atom (ADR-199): leading bare token is the lemma, last bare token is the
 *    subject param to agree with. The subject must be a bound param.
 *  - `{verbatim:name}` → a `Verbatim` atom (ADR-200): the param's value rendered
 *    as opaque, whitespace-exempt text. The param must be bound.
 *  - `{number:coins}` / `{number:coins words}` / `{number:floor ordinal}` → a
 *    `Numeral` atom (ADR-198): the numeric param, optional format. Must be bound.
 *  - `{pronoun:subject}` / `{pronoun:object}` / `{pronoun:possessive}` → a `Pronoun`
 *    atom (ADR-197): a grammatical case; the referent is the last-mentioned entity.
 *  - `{contents:box}` → a `Contents` atom (ADR-194): the container's live contents
 *    as a grouped list, read at realize time. The container must be bound.
 *  - `{slot:here}` / `{slot:detail clause}` / `{slot:detail clause or}` → a `Slot`
 *    combinator (ADR-195): the first bare token is the contribution channel key;
 *    optional trailing hints set `mode` (`sentence` default | `clause`) and the
 *    `clause` conjunction (`and` default | `or`). The key need NOT be a bound param
 *    — an unfilled slot is valid (AC-7); a keyless `{slot:}` is a parse error (AC-9).
 *  - No `:`-chain, `?`, `|`, `#`. A `:` head whose prefix is not a known kind,
 *    an unknown leading hint, or an unbound param all raise `PhraseParseError`
 *    AT PARSE TIME (never a silent `Empty` at realize time). (AC-8, AC-11)
 */
import { Phrase } from '@sharpee/if-domain';
/**
 * Raised when a template cannot be parsed: a legacy `:`-chain, an unknown
 * kind-prefix, an unknown leading hint, or a reference to an unbound param.
 * Carries the offending token and the full template so the author sees both.
 */
export declare class PhraseParseError extends Error {
    readonly offendingToken: string;
    readonly template: string;
    readonly reason: string;
    constructor(offendingToken: string, template: string, reason: string);
}
/**
 * Parse a template into a phrase tree.
 *
 * @param template author template, e.g. "You take {the item}."
 * @param params param/producer bindings keyed by placeholder name
 * @returns the parsed phrase (a `Sequence` when the template mixes literal text
 *          and placeholders; the bare phrase when it is a single placeholder)
 * @throws PhraseParseError on a legacy `:`-chain, unknown kind-prefix, unknown
 *         hint, or unbound param — synchronously, at parse time (AC-8, AC-11)
 */
export declare function parsePhraseTemplate(template: string, params?: Record<string, unknown>): Phrase;
```

### pluralize

```typescript
/**
 * Pluralize an English noun. Checks the irregular map first (preserving the
 * original case pattern), then applies regular rules (-es / -ies / -ves / -s).
 *
 * @param noun singular noun, e.g. "coin", "goose"
 * @returns the plural form, e.g. "coins", "geese"
 */
export declare function pluralize(noun: string): string;
```

### number-words

```typescript
/**
 * Render a count as a word for 1–10, or a numeral for 0 and 11+.
 *
 * @param n a non-negative integer count
 * @returns "one".."ten" for 1–10, otherwise the numeral as a string
 */
export declare function countWord(n: number): string;
/**
 * Spell an integer in words: ones/teens/tens, hundreds with "and", and the
 * thousand/million/billion scales. Negatives prefix "minus"; non-integers fall
 * back to digits. The general speller for the `Numeral` atom (ADR-198) —
 * distinct from {@link countWord}, which caps at ten for list grouping.
 *
 * @param value the number to spell
 * @returns the cardinal words, e.g. 105 → "one hundred and five"
 */
export declare function numberToWords(value: number): string;
/**
 * The ordinal surface of an integer: digits + suffix, handling the 11–13
 * exception (1st, 2nd, 3rd, 4th, 11th, 21st). Non-integers fall back to digits.
 *
 * @param value the number to ordinalize
 * @returns e.g. 3 → "3rd", 11 → "11th"
 */
export declare function ordinalString(value: number): string;
```

### data/words

```typescript
/**
 * @file English Word Lists
 * @description Common word lists for English parsing
 */
/**
 * English word lists for parsing
 */
export declare const englishWords: {
    /**
     * Articles
     */
    articles: string[];
    /**
     * Common prepositions
     */
    prepositions: string[];
    /**
     * Common nouns for basic parsing
     */
    commonNouns: string[];
    /**
     * Pronouns
     */
    pronouns: string[];
    /**
     * Conjunctions
     */
    conjunctions: string[];
    /**
     * Common determiners
     */
    determiners: string[];
    /**
     * Directions
     */
    directions: string[];
    /**
     * Common adjectives for parsing
     */
    commonAdjectives: string[];
    /**
     * Numbers as words (legacy array - use cardinalNumbers instead)
     * @deprecated Use cardinalNumbers or ordinalNumbers maps
     */
    numberWords: string[];
    /**
     * Common verbs that don't map to actions (auxiliaries, etc.)
     */
    auxiliaryVerbs: string[];
    /**
     * Words to ignore in parsing
     */
    ignoreWords: string[];
};
/**
 * Irregular plural mappings
 */
export declare const irregularPlurals: Map<string, string>;
/**
 * Common abbreviations
 */
export declare const abbreviations: Map<string, string>;
/**
 * Cardinal number words mapped to numeric values
 * Used by NUMBER slot type in grammar patterns
 */
export declare const cardinalNumbers: Record<string, number>;
/**
 * Ordinal number words mapped to numeric values
 * Used by ORDINAL slot type in grammar patterns
 */
export declare const ordinalNumbers: Record<string, number>;
/**
 * Direction vocabulary with canonical forms
 * Maps all variations (full names and abbreviations) to canonical direction names
 * Used by DIRECTION slot type in grammar patterns
 */
export declare const directionMap: Record<string, string>;
```

### data/messages

```typescript
/**
 * @file English Message Templates
 * @description Message templates for action failure reasons and system messages
 */
/**
 * Action failure reasons
 * These match the failure codes used in the IF system
 */
export declare const ActionFailureReason: {
    readonly NOT_VISIBLE: "not_visible";
    readonly NOT_REACHABLE: "not_reachable";
    readonly NOT_IN_SCOPE: "not_in_scope";
    readonly FIXED_IN_PLACE: "fixed_in_place";
    readonly ALREADY_OPEN: "already_open";
    readonly ALREADY_CLOSED: "already_closed";
    readonly NOT_OPENABLE: "not_openable";
    readonly LOCKED: "locked";
    readonly NOT_LOCKABLE: "not_lockable";
    readonly ALREADY_LOCKED: "already_locked";
    readonly ALREADY_UNLOCKED: "already_unlocked";
    readonly STILL_OPEN: "still_open";
    readonly CONTAINER_FULL: "container_full";
    readonly CONTAINER_CLOSED: "container_closed";
    readonly NOT_A_CONTAINER: "not_a_container";
    readonly NOT_A_SUPPORTER: "not_a_supporter";
    readonly ALREADY_IN_CONTAINER: "already_in_container";
    readonly NOT_IN_CONTAINER: "not_in_container";
    readonly NOT_WEARABLE: "not_wearable";
    readonly ALREADY_WEARING: "already_wearing";
    readonly NOT_WEARING: "not_wearing";
    readonly WORN_BY_OTHER: "worn_by_other";
    readonly TOO_HEAVY: "too_heavy";
    readonly CARRYING_TOO_MUCH: "carrying_too_much";
    readonly WRONG_KEY: "wrong_key";
    readonly NO_KEY_SPECIFIED: "no_key_specified";
    readonly NOT_A_KEY: "not_a_key";
    readonly NOT_HOLDING_KEY: "not_holding_key";
    readonly ALREADY_ON: "already_on";
    readonly ALREADY_OFF: "already_off";
    readonly NOT_SWITCHABLE: "not_switchable";
    readonly NO_POWER: "no_power";
    readonly NO_EXIT_THAT_WAY: "no_exit_that_way";
    readonly CANT_GO_THAT_WAY: "cant_go_that_way";
    readonly DOOR_CLOSED: "door_closed";
    readonly DOOR_LOCKED: "door_locked";
    readonly TOO_DARK: "too_dark";
    readonly CANT_TALK_TO_THAT: "cant_talk_to_that";
    readonly NO_RESPONSE: "no_response";
    readonly NOT_A_PERSON: "not_a_person";
    readonly CANT_DO_THAT: "cant_do_that";
    readonly NOT_IMPLEMENTED: "not_implemented";
    readonly INVALID_TARGET: "invalid_target";
    readonly AMBIGUOUS_TARGET: "ambiguous_target";
    readonly NOTHING_HAPPENS: "nothing_happens";
    readonly ACTOR_CANT_SEE: "actor_cant_see";
    readonly ACTOR_CANT_REACH: "actor_cant_reach";
    readonly ACTOR_BUSY: "actor_busy";
    readonly NOT_EDIBLE: "not_edible";
    readonly NOT_READABLE: "not_readable";
    readonly NOTHING_WRITTEN: "nothing_written";
    readonly WONT_ACCEPT: "wont_accept";
    readonly CANT_GIVE_TO_SELF: "cant_give_to_self";
    readonly CANT_USE_THAT: "cant_use_that";
    readonly CANT_USE_TOGETHER: "cant_use_together";
    readonly NOTHING_TO_USE_WITH: "nothing_to_use_with";
    readonly CANT_PUSH_THAT: "cant_push_that";
    readonly CANT_PULL_THAT: "cant_pull_that";
    readonly CANT_TURN_THAT: "cant_turn_that";
    readonly WONT_BUDGE: "wont_budge";
    readonly WEARING_IT: "wearing_it";
    readonly NO_TARGET: "no_target";
};
type ActionFailureReasonType = typeof ActionFailureReason[keyof typeof ActionFailureReason];
/**
 * Mapping of action failure reasons to English messages
 */
export declare const failureMessages: Record<ActionFailureReasonType, string>;
/**
 * System messages for meta-commands and special situations
 */
export declare const systemMessages: {
    inventoryEmpty: string;
    inventoryHeader: string;
    inventoryWearing: string;
    locationDescription: string;
    canSee: string;
    canAlsoSee: string;
    nothingSpecial: string;
    insideContainer: string;
    onSupporter: string;
    savePrompt: string;
    saveSuccess: string;
    saveFailed: string;
    restorePrompt: string;
    restoreSuccess: string;
    restoreFailed: string;
    saving_game: string;
    game_saved: string;
    save_failed: string;
    restoring_game: string;
    game_restored: string;
    restore_failed: string;
    quitting_game: string;
    quit_confirmed: string;
    quit_cancelled: string;
    restarting_game: string;
    game_restarted: string;
    restart_cancelled: string;
    quitConfirm: string;
    scoreDisplay: string;
    turnsDisplay: string;
    unknownVerb: string;
    unknownObject: string;
    ambiguousObject: string;
    missingObject: string;
    missingIndirectObject: string;
    ok: string;
    done: string;
    taken: string;
    dropped: string;
};
/**
 * Parser error messages
 * Keys match the messageId from ParseErrorCode analysis
 *
 * Template variables:
 * - {verb} - The recognized verb
 * - {noun} - The word that failed to resolve
 * - {slot} - The slot name (target, container, etc.)
 * - {options} - Comma-separated list of disambiguation options
 */
export declare const parserErrors: Record<string, string | ((ctx: Record<string, any>) => string)>;
/**
 * Get a parser error message by ID
 * @param messageId The message ID (e.g., 'parser.error.unknownVerb')
 * @param context Template variables to substitute
 * @returns The formatted error message
 */
export declare function getParserErrorMessage(messageId: string, context?: Record<string, any>): string;
export {};
```

### sound-messages

```typescript
/**
 * English (US) sound prose defaults — per-`(kind, audibility_tier)` (ADR-172).
 *
 * The language layer renders each `AudibilityEvent` by looking up
 * `sound.heard.<kind>.<tier>` in this table. If a kind-specific entry
 * is missing, the consumer falls back to `sound.heard.default.<tier>`
 * (i.e. the platform default phrasing for that tier).
 *
 * Scope:
 *
 *  - **Tier set** — `full`, `muffled`, `fragments`, `presence-only`.
 *    `silent` does not reach the prose layer (the engine suppresses
 *    delivery of silent events).
 *  - **Kinds shipped** — `default` (fallback), `speech` (NPC dialogue,
 *    the most common content-bearing kind), and `ambient` (footsteps,
 *    machinery, doors slamming — content-less environmental sounds).
 *    Story authors override per kind via the standard message-override
 *    mechanism, and add new kinds as their sound vocabulary grows.
 *
 * Templates use `{content}` for the message rendered from the
 * `AudibilityEvent.content` payload (only meaningful at `full` and
 * `muffled` tiers; story-side rendering may decide to suppress
 * `{content}` at `muffled` and substitute a distortion phrasing).
 * `{kind}` is the raw kind string (used in fallback prose so the
 * listener at least learns what *sort* of sound passed through).
 *
 * Phase 5 ships the data table. Phase 6's action-integration work
 * resolves the message-id dynamically from each delivered
 * `AudibilityEvent` and feeds the result into the main text channel.
 *
 * @see ADR-172 — Spatial Sound Propagation §Audibility tier, §Channel routing
 */
export declare const soundMessages: {
    readonly 'sound.heard.default.full': "{You} {hear} {verbatim:kind}.";
    readonly 'sound.heard.default.muffled': "{You} {hear} a muffled {verbatim:kind}.";
    readonly 'sound.heard.default.fragments': "{You} {catch} broken {verbatim:kind}.";
    readonly 'sound.heard.default.presence-only': "{You} {hear} something distant.";
    readonly 'sound.heard.speech.full': "{You} {hear}: \"{verbatim:content}\"";
    readonly 'sound.heard.speech.muffled': "{You} {catch} a muffled voice: \"{verbatim:content}\"";
    readonly 'sound.heard.speech.fragments': "{You} {catch} fragments of speech.";
    readonly 'sound.heard.speech.presence-only': "{You} {hear} voices nearby.";
    readonly 'sound.heard.ambient.full': "{You} {hear} {verbatim:kind}.";
    readonly 'sound.heard.ambient.muffled': "{You} {hear} a muffled {verbatim:kind}.";
    readonly 'sound.heard.ambient.fragments': "{You} {catch} the faint sound of {verbatim:kind}.";
    readonly 'sound.heard.ambient.presence-only': "{You} {hear} something at the edge of hearing.";
};
export type SoundMessageId = keyof typeof soundMessages;
/**
 * The four audibility tiers the prose layer renders. The fifth tier
 * (`silent`) is filtered upstream and never reaches rendering.
 */
export type RenderableAudibilityTier = 'full' | 'muffled' | 'fragments' | 'presence-only';
/**
 * Build a message id from a sound kind and the listener's audibility
 * tier. The id has the form `sound.heard.<kind>.<tier>`.
 *
 * Callers fall back to `sound.heard.default.<tier>` when the
 * kind-specific id is not registered. This helper is namespace-only —
 * it does not perform the fallback itself; that decision lives at the
 * call site (typically Phase 6's action integration).
 */
export declare function soundMessageId(kind: string, tier: RenderableAudibilityTier): string;
/**
 * Convenience helper for the fallback id. When `soundMessageId(kind,
 * tier)` is not registered, callers use the result of
 * `soundFallbackMessageId(tier)` instead.
 */
export declare function soundFallbackMessageId(tier: RenderableAudibilityTier): string;
```
