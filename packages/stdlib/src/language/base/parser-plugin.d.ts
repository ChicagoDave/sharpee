/**
 * @file Base Parser Plugin
 * @description Abstract base class for language-specific parsers
 *
 * This class provides common parsing functionality that can be
 * extended by language-specific implementations.
 */
import { IFParserPlugin, Token, TaggedWord, ParsedCommand, Phrase } from './types';
/**
 * Abstract base class for IF parser plugins
 *
 * Provides default implementations for common parsing tasks
 * that can be overridden by language-specific parsers.
 */
export declare abstract class BaseIFParserPlugin implements IFParserPlugin {
    /**
     * Default tokenization implementation
     * Can be overridden for language-specific tokenization rules
     */
    tokenize(input: string): Token[];
    /**
     * Normalize a phrase by removing articles and lemmatizing
     * Default implementation - should be overridden
     */
    normalizePhrase(phrase: string): string[];
    /**
     * Default phrase identification
     * Identifies basic phrase types based on POS tags
     */
    identifyPhrases(tagged: TaggedWord[]): Phrase[];
    /**
     * Check if a word can start a noun phrase
     */
    protected isNounPhraseStart(word: TaggedWord): boolean;
    /**
     * Extract a verb phrase starting at the given index
     */
    protected extractVerbPhrase(tagged: TaggedWord[], start: number): Phrase;
    /**
     * Extract a noun phrase starting at the given index
     */
    protected extractNounPhrase(tagged: TaggedWord[], start: number): Phrase;
    /**
     * Extract a prepositional phrase starting at the given index
     */
    protected extractPrepositionalPhrase(tagged: TaggedWord[], start: number): Phrase;
    /**
     * Default grammar analysis implementation
     * Extracts basic command structure from phrases
     */
    analyzeGrammar(tagged: TaggedWord[]): ParsedCommand | null;
    /**
     * Extract noun and adjectives from a noun phrase
     */
    protected extractNounAndAdjectives(phrase: Phrase): {
        noun: string;
        adjectives: string[];
    };
    /**
     * Extract just the noun from a phrase (ignoring articles, adjectives, etc.)
     */
    protected extractNounFromPhrase(phrase: Phrase): string | null;
    /**
     * Tag tokens with parts of speech
     * Must be implemented by language-specific parsers
     */
    abstract tagPOS(tokens: Token[]): TaggedWord[];
    /**
     * Lemmatize a word to its base form
     * Must be implemented by language-specific parsers
     */
    abstract lemmatize(word: string): string;
}
