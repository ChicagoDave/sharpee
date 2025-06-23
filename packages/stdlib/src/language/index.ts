// packages/stdlib/src/language/index.ts

/**
 * Interactive Fiction language support
 * 
 * This module provides IF-specific language features on top of
 * the core language system, including:
 * - Base classes for language plugins
 * - Action verb registration
 * - IF-specific message formatting
 * - Event and action messages
 * - Direction handling
 */

// Export base classes for language plugins
export * from './base';

// Export existing language support
export * from './action-verb-registry';
export * from './if-language-provider';
export * from './english-if-provider';

// Convenience exports
import { getActionVerbRegistry } from './action-verb-registry';
import { createEnglishIFProvider } from './english-if-provider';

// Note: Language auto-registration has been removed.
// Languages should now be explicitly imported and configured by the story author.

/**
 * @deprecated Language initialization is now handled by story configuration
 * Languages should be explicitly imported and set by the story author
 */
export function initializeIFLanguages(): void {
  console.warn('initializeIFLanguages() is deprecated. Languages should be explicitly configured in your story.');
}

// Export helper to get current IF language provider
export function getActiveIFLanguageProvider(): IFLanguageProvider | null {
  const provider = getLanguageRegistry().getProvider();
  if (provider && 'getVerbRegistry' in provider) {
    return provider as IFLanguageProvider;
  }
  return null;
}
