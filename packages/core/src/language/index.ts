// packages/core/src/language/index.ts

/**
 * Core language system
 * Provides generic text formatting without game-specific knowledge
 */

export * from './types';
export * from './registry';

// Re-export commonly used functions
import { getLanguageRegistry } from './registry';
import { LanguageProvider } from './types';

/**
 * Get the active language provider
 * @returns The currently active language provider
 * @throws Error if no language provider is set
 */
export function getActiveLanguageProvider(): LanguageProvider {
  const provider = getLanguageRegistry().getProvider();
  if (!provider) {
    throw new Error('No language provider has been set. A language provider must be registered and set before use.');
  }
  return provider;
}

/**
 * Format a message using the active language provider
 * @param template The message template
 * @param params Parameters to substitute
 * @returns The formatted message
 */
export function formatMessage(template: string, params?: any): string {
  const provider = getActiveLanguageProvider();
  return provider.formatMessage(template, params);
}

/**
 * Format a list using the active language provider
 * @param items The items to format
 * @param options Formatting options
 * @returns The formatted list
 */
export function formatList(items: string[], options?: any): string {
  const provider = getActiveLanguageProvider();
  return provider.formatList(items, options);
}
