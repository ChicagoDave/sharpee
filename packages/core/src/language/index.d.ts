/**
 * Core language system
 * Provides generic text formatting without game-specific knowledge
 */
export * from './types';
export * from './registry';
export * from './default-provider';
import { LanguageProvider } from './types';
/**
 * Get the active language provider
 * @returns The currently active language provider
 */
export declare function getActiveLanguageProvider(): LanguageProvider;
/**
 * Format a message using the active language provider
 * @param template The message template
 * @param params Parameters to substitute
 * @returns The formatted message
 */
export declare function formatMessage(template: string, params?: any): string;
/**
 * Format a list using the active language provider
 * @param items The items to format
 * @param options Formatting options
 * @returns The formatted list
 */
export declare function formatList(items: string[], options?: any): string;
