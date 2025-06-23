/**
 * @file Language Plugin Types
 * @description Core types for IF language plugins
 *
 * This file defines all the types needed by language plugins to implement
 * parsing, formatting, and language-specific features for interactive fiction.
 */
import { LanguageProvider } from '@sharpee/core';
import { IFActions, IFEvents } from '../../constants';
/**
 * Main interface for IF language plugins
 * Extends the core LanguageProvider with IF-specific functionality
 */
export interface IFLanguagePlugin extends LanguageProvider {
    /**
     * Create a parser instance for this language
     */
    createParser(): IFParserPlugin;
    /**
     * Get all verbs that map to a specific action
     * @param action The IF action
     * @returns Array of verb strings (e.g., ['take', 'get', 'grab'])
     */
    getVerbsForAction(action: IFActions): string[];
    /**
     * Get the action associated with a verb
     * @param verb The verb to look up
     * @returns The action or undefined if not found
     */
    getActionForVerb(verb: string): IFActions | undefined;
    /**
     * Format an action message with parameters
     * @param action The action being performed
     * @param phase The phase of the action (e.g., 'check', 'perform', 'report')
     * @param key The specific message key
     * @param params Parameters for message formatting
     */
    formatActionMessage(action: IFActions, phase: string, key: string, params?: ActionParams): string;
    /**
     * Format an event message
     * @param event The IF event
     * @param params Parameters for message formatting
     */
    formatEventMessage(event: IFEvents, params?: EventParams): string;
    /**
     * Format a direction for display (e.g., "north" -> "to the north")
     * @param direction The direction string
     */
    formatDirection(direction: string): string;
    /**
     * Get canonical form of a direction (e.g., "n" -> "north")
     * @param direction The direction string or abbreviation
     */
    canonicalizeDirection(direction: string): string | undefined;
    /**
     * Format an item/entity name with appropriate article
     * @param name The item name
     * @param options Formatting options
     */
    formatItemName(name: string, options?: ItemNameOptions): string;
    /**
     * Get language-specific word lists for parsing
     */
    getArticles(): string[];
    getPrepositions(): string[];
    getPronouns(): string[];
    getConjunctions(): string[];
    getDirections(): string[];
    getCommonAdjectives(): string[];
}
/**
 * Parser plugin interface
 * Handles tokenization, POS tagging, and command parsing
 */
export interface IFParserPlugin {
    /**
     * Tokenize input text into tokens
     */
    tokenize(input: string): Token[];
    /**
     * Tag tokens with parts of speech
     */
    tagPOS(tokens: Token[]): TaggedWord[];
    /**
     * Lemmatize a word to its base form
     * @param word The word to lemmatize
     * @returns Base form of the word
     */
    lemmatize(word: string): string;
    /**
     * Normalize a phrase for matching (remove articles, lemmatize, etc.)
     * @param phrase The phrase to normalize
     * @returns Array of normalized words
     */
    normalizePhrase(phrase: string): string[];
    /**
     * Analyze tagged words to extract a command
     * @param tagged The POS-tagged words
     * @returns Parsed command or null if invalid
     */
    analyzeGrammar(tagged: TaggedWord[]): ParsedCommand | null;
    /**
     * Identify phrases in tagged words
     * @param tagged The POS-tagged words
     * @returns Array of identified phrases
     */
    identifyPhrases(tagged: TaggedWord[]): Phrase[];
}
/**
 * Token from tokenization
 */
export interface Token {
    value: string;
    type: TokenType;
    position: number;
}
/**
 * Token types
 */
export declare enum TokenType {
    WORD = "word",
    PUNCTUATION = "punctuation",
    NUMBER = "number",
    WHITESPACE = "whitespace",
    SYMBOL = "symbol"
}
/**
 * Word with part-of-speech tag
 */
export interface TaggedWord {
    value: string;
    tag: POSType;
    lemma?: string;
    position: number;
    original: string;
}
/**
 * Part of speech types
 */
export declare enum POSType {
    NOUN = "noun",
    VERB = "verb",
    ADJECTIVE = "adjective",
    ADVERB = "adverb",
    PREPOSITION = "preposition",
    ARTICLE = "article",
    PRONOUN = "pronoun",
    CONJUNCTION = "conjunction",
    NUMBER = "number",
    DETERMINER = "determiner",
    INTERJECTION = "interjection",
    PROPER_NOUN = "proper_noun",
    UNKNOWN = "unknown"
}
/**
 * Identified phrase in the input
 */
export interface Phrase {
    type: PhraseType;
    words: TaggedWord[];
    start: number;
    end: number;
}
/**
 * Types of phrases
 */
export declare enum PhraseType {
    NOUN_PHRASE = "noun_phrase",
    VERB_PHRASE = "verb_phrase",
    PREPOSITIONAL_PHRASE = "prepositional_phrase",
    ADJECTIVE_PHRASE = "adjective_phrase",
    ADVERB_PHRASE = "adverb_phrase"
}
/**
 * Parsed command structure
 */
export interface ParsedCommand {
    /**
     * The main verb/action
     */
    verb: string;
    /**
     * Direct object (what the verb acts on)
     */
    directObject?: string;
    /**
     * Indirect object (to/for whom/what)
     */
    indirectObject?: string;
    /**
     * Preposition connecting objects
     */
    preposition?: string;
    /**
     * Adjectives modifying the direct object
     */
    adjectives: string[];
    /**
     * The original raw input
     */
    raw: string;
    /**
     * Additional parsed details
     */
    details?: {
        directObjectWords?: string[];
        indirectObjectWords?: string[];
        quantity?: number;
        all?: boolean;
    };
}
/**
 * Parameters for action message formatting
 */
export interface ActionParams {
    actor?: string;
    target?: string;
    item?: string;
    direction?: string;
    container?: string;
    reason?: string;
    [key: string]: any;
}
/**
 * Parameters for event message formatting
 */
export interface EventParams {
    entity?: string;
    location?: string;
    oldValue?: any;
    newValue?: any;
    [key: string]: any;
}
/**
 * Options for formatting item names
 */
export interface ItemNameOptions {
    /**
     * Use definite article ("the")
     */
    definite?: boolean;
    /**
     * Use indefinite article ("a/an")
     */
    indefinite?: boolean;
    /**
     * Capitalize first letter
     */
    capitalize?: boolean;
    /**
     * Use plural form
     */
    plural?: boolean;
    /**
     * Specific count for pluralization
     */
    count?: number;
    /**
     * Use proper name (no article)
     */
    proper?: boolean;
}
/**
 * Verb definition for action mapping
 */
export interface VerbDefinition {
    /**
     * The action this verb maps to
     */
    action: IFActions;
    /**
     * All verb forms that map to this action
     */
    verbs: string[];
    /**
     * Optional grammar patterns for this verb
     */
    patterns?: string[];
    /**
     * Whether this verb requires an object
     */
    requiresObject?: boolean;
    /**
     * Whether this verb can take an indirect object
     */
    allowsIndirectObject?: boolean;
}
/**
 * Grammar pattern for command matching
 */
export interface GrammarPattern {
    /**
     * Pattern string (e.g., "VERB NOUN", "VERB PREP NOUN")
     */
    pattern: string;
    /**
     * Optional action this pattern maps to
     */
    action?: IFActions;
    /**
     * Priority for disambiguation (higher = preferred)
     */
    priority?: number;
}
/**
 * Configuration for language plugins
 */
export interface IFLanguageConfig {
    /**
     * Language code (e.g., "en-US")
     */
    code: string;
    /**
     * Language name (e.g., "English (US)")
     */
    name: string;
    /**
     * Text direction
     */
    direction: 'ltr' | 'rtl';
    /**
     * Custom message templates
     */
    customTemplates?: Record<string, string>;
    /**
     * Additional verb mappings
     */
    customVerbs?: VerbDefinition[];
    /**
     * Custom grammar patterns
     */
    customPatterns?: GrammarPattern[];
}
