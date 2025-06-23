// packages/stdlib/src/index.ts

/**
 * Sharpee Standard Library for Interactive Fiction
 * 
 * This package provides the standard IF implementation on top of
 * the generic Sharpee core, including:
 * - IF-specific constants (entity types, events, actions, etc.)
 * - Standard IF actions (taking, dropping, examining, etc.)
 * - IF language support with verb mappings
 * - Channels for IF output
 * - Standard handlers for common commands
 */

// Export constants first - these are fundamental
export * from './constants';

// Export language support
export * from './language/action-verb-registry';
export * from './language/if-language-provider';
export * from './language/base'; // Export base classes and types for language plugins

// Export actions
export * from './actions';

// Export execution system (replaces handlers)
export * from './execution';

// Export parser (moved from core)
export * from './parser';

// Export services layer
export * from './services';

// Export enhanced action context
export { ActionContext, createActionContext } from './actions/types/enhanced-action-context';
export { BaseActionExecutor } from './actions/types/base-action-executor';

// Export story API
export * from './story/story';

// Export messages (temporary - will be moved to language providers)
export { actionMessages } from './messages/en-US';

// Export version
export const version = '0.1.0';

// Helper functions for initialization
import { ActionRegistry } from './core-imports';
import { LanguageProvider } from './core-imports';
import { standardActions } from './actions';
import { actionMessages } from './messages/en-US';
import { ActionVerbRegistry, registerStandardVerbs } from './language/action-verb-registry';
import { IFLanguageProvider } from './language/if-language-provider';

/**
 * Register all stdlib actions with the registry
 * This also registers their verbs if a language provider is given
 */
export function registerStdlibActions(
  registry: ActionRegistry, 
  languageProvider?: LanguageProvider | IFLanguageProvider
): void {
  // Create verb registry and register standard verbs
  const verbRegistry = new ActionVerbRegistry();
  registerStandardVerbs(verbRegistry);
  
  // Register each action
  for (const action of standardActions) {
    registry.register(action);
    
    // If it's an IF action, register its verbs
    if ('registerVerbs' in action && typeof action.registerVerbs === 'function') {
      action.registerVerbs(verbRegistry);
    }
  }
  
  // Register messages if the language provider supports it
  if (languageProvider && 'setTemplate' in languageProvider) {
    Object.entries(actionMessages).forEach(([key, value]) => {
      (languageProvider as any).setTemplate(key, value);
    });
  }
}

/**
 * Initialize the stdlib with all standard components
 * This is a convenience function for getting started quickly
 */
export function initializeStdlib(options?: {
  actionRegistry?: ActionRegistry;
  languageProvider?: LanguageProvider | IFLanguageProvider;
}): void {
  if (options?.actionRegistry) {
    registerStdlibActions(options.actionRegistry, options.languageProvider);
  }
}
