import { LanguageProvider, LanguageProviderFactory } from './types';
/**
 * Registry for language providers
 * This manages available languages and the active language provider
 */
export declare class LanguageRegistry {
    private providers;
    private activeProvider;
    private activeLanguage;
    /**
     * Register a language provider factory
     */
    registerLanguage(code: string, factory: LanguageProviderFactory): void;
    /**
     * Set the active language
     */
    setLanguage(code: string, options?: any): void;
    /**
     * Get the active language provider
     */
    getProvider(): LanguageProvider | null;
    /**
     * Get the active language code
     */
    getActiveLanguage(): string | null;
    /**
     * Get all registered language codes
     */
    getRegisteredLanguages(): string[];
    /**
     * Check if a language is registered
     */
    hasLanguage(code: string): boolean;
    /**
     * Unregister a language
     */
    unregisterLanguage(code: string): void;
    /**
     * Clear all registrations
     */
    clear(): void;
}
/**
 * Get the global language registry
 */
export declare function getLanguageRegistry(): LanguageRegistry;
