// packages/core/src/language/index.ts

/**
 * Core language system
 * Provides generic text formatting without game-specific knowledge
 */

export * from './types';
export * from './registry';
export * from './default-provider';

// Re-export commonly used functions
import { getLanguageRegistry } from './registry';
import { LanguageProvider } from './types';
import { createDefaultLanguageProvider } from './default-provider';

/**
 * Get the active language provider
 * @returns The currently active language provider
 */
export function getActiveLanguageProvider(): LanguageProvider {
  const provider = getLanguageRegistry().getProvider();
  if (!provider) {
    // Return a default provider if none is set
    return createDefaultLanguageProvider();
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
