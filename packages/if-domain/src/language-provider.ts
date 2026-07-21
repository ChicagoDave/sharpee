/**
 * Language provider interface for Interactive Fiction
 *
 * This interface defines the contract for providing localized text,
 * action patterns, and message formatting throughout the IF system.
 *
 * Implementations should handle:
 * - Action patterns (verb synonyms)
 * - Message text with parameter substitution
 * - Localization and customization
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import type { LocaleSettings, RenderContext } from './phrase.js';

/**
 * Structured help information for an action
 */
export interface ActionHelp {
  /**
   * Brief description of what the action does
   */
  description: string;
  
  /**
   * Verb forms and patterns that trigger this action
   * Extracted from the patterns array
   */
  verbs: string[];
  
  /**
   * Example commands showing usage
   */
  examples: string[];
  
  /**
   * The one-line help summary (from help_<action> message)
   * Format: "VERB/VERB - Description. Example: COMMAND"
   */
  summary?: string;
}

/**
 * Language provider interface
 */
export interface LanguageProvider {
  /**
   * The language code this provider supports (e.g., 'en-us', 'es-es')
   */
  readonly languageCode: string;
  
  /**
   * Get patterns/aliases for an action
   * @param actionId The action identifier (e.g., 'if.action.taking')
   * @returns Array of patterns or undefined if action not found
   */
  getActionPatterns(actionId: string): string[] | undefined;
  
  /**
   * Get a message by ID with optional parameter substitution
   * @param messageId The message identifier
   * @param params Optional parameters for substitution
   * @returns The formatted message
   */
  getMessage(messageId: string, params?: Record<string, any>): string;

  /**
   * Get the raw, unresolved template for a message ID (ADR-192 phrase path).
   *
   * Unlike {@link getMessage}, this returns the author template verbatim —
   * no perspective resolution, no parameter substitution — so the phrase
   * pipeline can parse it into a {@link RenderContext}-realized tree.
   *
   * @param messageId The message identifier
   * @returns The raw template, or undefined when the ID is not registered
   */
  getTemplate?(messageId: string): string | undefined;

  /**
   * Locale realization settings (ADR-192). Consumed by the engine when it
   * builds the per-turn {@link RenderContext} so the Assembler agrees over
   * the story's configured knobs (e.g. the serial comma).
   *
   * @returns The provider's current locale settings
   */
  getLocaleSettings?(): LocaleSettings;

  /**
   * The narrative grammatical person of the player subject (ADR-199 §4 B).
   *
   * Derived from the provider's perspective/narrative configuration (ADR-089).
   * The engine reads it when building the per-turn {@link RenderContext} so the
   * Assembler can give the player subject the agreeing verb form ("you are").
   *
   * @returns 'first' | 'second' | 'third'
   */
  getNarrativePerson?(): 'first' | 'second' | 'third';

  /**
   * Render a message to text blocks through the phrase pipeline (ADR-192 §6).
   *
   * The phrase-path replacement for {@link getMessage}: resolves perspective
   * placeholders, parses the template into a `Phrase` tree, and realizes it
   * with the locale Assembler against the supplied render context. Returns
   * `ITextBlock[]` directly — no intermediate string. `getMessage` remains for
   * any non-phrase callers.
   *
   * @param messageId The message identifier
   * @param params Parameter/producer bindings keyed by placeholder name
   * @param ctx The per-message render context (world, settings, seams)
   * @returns The realized text blocks
   */
  renderMessage?(
    messageId: string,
    params: Record<string, unknown>,
    ctx: RenderContext,
  ): ITextBlock[];

  /**
   * Render a template STRING through the phrase pipeline — the body of
   * {@link renderMessage} minus the registry lookup (ADR-250 D4). Used by
   * the engine's phrasebook read point, where the winning template comes
   * from a book resolved against world state, not from the messages map.
   *
   * @param template The template text (placeholder syntax as registered)
   * @param params Parameter/producer bindings keyed by placeholder name
   * @param ctx The per-message render context (world, settings, seams)
   * @returns The realized text blocks
   */
  renderTemplate?(
    template: string,
    params: Record<string, unknown>,
    ctx: RenderContext,
  ): ITextBlock[];

  /**
   * Check if a message exists
   * @param messageId The message identifier
   * @returns True if the message exists
   */
  hasMessage(messageId: string): boolean;
  
  /**
   * Get structured help information for an action
   * @param actionId The action identifier (e.g., 'if.action.taking')
   * @returns Structured help information or undefined if not found
   */
  getActionHelp?(actionId: string): ActionHelp | undefined;
  
  /**
   * Get all supported actions
   * @returns Array of action IDs
   */
  getSupportedActions?(): string[];

  /**
   * Get all registered message IDs and their text.
   * Used by tooling (VS Code extension) for language introspection.
   * @returns Map of message ID to text, or undefined if not supported
   */
  getAllMessages?(): Map<string, string>;
}

/**
 * Language provider registry interface
 */
export interface LanguageProviderRegistry {
  /**
   * Register a language provider
   * @param provider The language provider to register
   */
  register(provider: LanguageProvider): void;
  
  /**
   * Get a language provider by code
   * @param languageCode The language code (e.g., 'en-us')
   * @returns The provider or undefined if not found
   */
  get(languageCode: string): LanguageProvider | undefined;
  
  /**
   * Get the default language provider
   * @returns The default provider
   * @throws Error if no default provider is set
   */
  getDefault(): LanguageProvider;
  
  /**
   * Set the default language provider
   * @param languageCode The language code to set as default
   */
  setDefault(languageCode: string): void;
  
  /**
   * Get all registered language codes
   * @returns Array of language codes
   */
  getAvailableLanguages(): string[];
}
