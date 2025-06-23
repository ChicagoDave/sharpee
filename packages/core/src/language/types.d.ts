/**
 * Core language provider interface
 * This provides only generic text formatting capabilities,
 * without knowledge of specific game concepts
 */
export interface LanguageProvider {
    /**
     * Format a message with parameters
     * @param template The message template
     * @param params Parameters to substitute
     */
    formatMessage(template: string, params?: any): string;
    /**
     * Format a list of items
     * @param items The items to format
     * @param options Formatting options
     */
    formatList(items: string[], options?: ListFormatOptions): string;
    /**
     * Get the language code
     */
    getLanguageCode(): string;
    /**
     * Get the language name
     */
    getLanguageName(): string;
    /**
     * Get text direction
     */
    getTextDirection(): 'ltr' | 'rtl';
}
/**
 * Options for formatting lists
 */
export interface ListFormatOptions {
    /**
     * Style of list formatting
     */
    style?: 'long' | 'short' | 'narrow';
    /**
     * Type of list
     */
    type?: 'conjunction' | 'disjunction' | 'unit';
    /**
     * Locale-specific list formatting options
     */
    localeOptions?: any;
}
/**
 * Factory to create language providers
 */
export interface LanguageProviderFactory {
    /**
     * Create a language provider instance
     */
    createProvider(options?: any): LanguageProvider;
}
/**
 * Language metadata
 */
export interface LanguageMetadata {
    code: string;
    name: string;
    englishName: string;
    direction: 'ltr' | 'rtl';
}
