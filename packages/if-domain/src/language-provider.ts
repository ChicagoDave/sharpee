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
