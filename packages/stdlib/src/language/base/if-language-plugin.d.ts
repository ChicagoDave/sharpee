/**
 * @file Base IF Language Plugin
 * @description Abstract base class for IF language plugins
 *
 * This class provides a foundation for implementing language-specific
 * support for interactive fiction, including verb mappings, message
 * formatting, and parser creation.
 */
import { IFLanguagePlugin, IFParserPlugin, IFLanguageConfig, ActionParams, EventParams, ItemNameOptions, VerbDefinition } from './types';
import { IFActions, IFEvents } from '../../constants';
/**
 * Abstract base class for IF language plugins
 *
 * Language implementations should extend this class and implement
 * all abstract methods to provide language-specific functionality.
 */
export declare abstract class BaseIFLanguagePlugin implements IFLanguagePlugin {
    protected config: IFLanguageConfig;
    protected verbs: Map<string, IFActions>;
    protected actionVerbs: Map<IFActions, string[]>;
    protected actionTemplates: Map<string, string>;
    protected eventTemplates: Map<IFEvents, string>;
    protected directionMap: Map<string, string>;
    constructor(config?: Partial<IFLanguageConfig>);
    /**
     * Initialize all language-specific data
     * Subclasses must implement this to set up:
     * - Verb mappings
     * - Message templates
     * - Direction mappings
     * - Word lists
     */
    protected abstract initializeLanguageData(): void;
    /**
     * Get default language code (e.g., "en-US")
     * Used if not provided in config
     */
    protected abstract getDefaultLanguageCode(): string;
    /**
     * Get default language name (e.g., "English (US)")
     * Used if not provided in config
     */
    protected abstract getDefaultLanguageName(): string;
    /**
     * Get default text direction
     * Used if not provided in config
     */
    protected abstract getDefaultTextDirection(): 'ltr' | 'rtl';
    /**
     * Apply custom configuration from the config object
     */
    protected applyCustomConfig(): void;
    /**
     * Register a verb definition
     */
    protected registerVerbDefinition(def: VerbDefinition): void;
    /**
     * Register multiple verb definitions
     */
    protected registerVerbs(definitions: VerbDefinition[]): void;
    /**
     * Register action message templates
     * @param templates Object with keys like "take.check.already_have"
     */
    protected registerActionTemplates(templates: Record<string, string>): void;
    /**
     * Register event message templates
     */
    protected registerEventTemplates(templates: Partial<Record<IFEvents, string>>): void;
    /**
     * Register direction mappings (e.g., "n" -> "north")
     */
    protected registerDirections(directions: Record<string, string>): void;
    getLanguageCode(): string;
    getLanguageName(): string;
    getTextDirection(): 'ltr' | 'rtl';
    /**
     * Format a message template with parameters
     * Subclasses can override for language-specific formatting
     */
    formatMessage(template: string, params?: any): string;
    /**
     * Apply a modifier to a value (e.g., capitalize, plural)
     * Subclasses should override for language-specific modifiers
     */
    protected applyModifier(value: any, modifier: string): string;
    getVerbsForAction(action: IFActions): string[];
    getActionForVerb(verb: string): IFActions | undefined;
    formatActionMessage(action: IFActions, phase: string, key: string, params?: ActionParams): string;
    formatEventMessage(event: IFEvents, params?: EventParams): string;
    formatDirection(direction: string): string;
    canonicalizeDirection(direction: string): string | undefined;
    abstract createParser(): IFParserPlugin;
    abstract formatList(items: string[], options?: any): string;
    abstract formatItemName(name: string, options?: ItemNameOptions): string;
    abstract getArticles(): string[];
    abstract getPrepositions(): string[];
    abstract getPronouns(): string[];
    abstract getConjunctions(): string[];
    abstract getDirections(): string[];
    abstract getCommonAdjectives(): string[];
}
/**
 * Helper function to create message template keys
 */
export declare function messageKey(action: IFActions, phase: string, key: string): string;
/**
 * Helper function to create simple message keys (no phase)
 */
export declare function simpleMessageKey(action: IFActions, key: string): string;
