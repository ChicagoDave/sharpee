import { LanguageProvider, ListFormatOptions } from './types';
/**
 * Default language provider implementation
 * Provides basic English formatting as a fallback
 */
export declare class DefaultLanguageProvider implements LanguageProvider {
    private metadata;
    formatMessage(template: string, params?: any): string;
    formatList(items: string[], options?: ListFormatOptions): string;
    getLanguageCode(): string;
    getLanguageName(): string;
    getTextDirection(): 'ltr' | 'rtl';
}
/**
 * Factory for creating default language providers
 */
export declare class DefaultLanguageProviderFactory {
    createProvider(): LanguageProvider;
}
/**
 * Create a new default language provider
 */
export declare function createDefaultLanguageProvider(): LanguageProvider;
