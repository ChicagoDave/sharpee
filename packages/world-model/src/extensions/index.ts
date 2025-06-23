/**
 * Extension system exports
 * 
 * This module provides the infrastructure for creating and loading
 * trait extensions that add new functionality to the world model.
 */

// Types and interfaces
export * from './types';

// Registry
export { ExtensionRegistry, extensionRegistry } from './registry';

// Loader
export { ExtensionLoader, extensionLoader, ExtensionLoadError } from './loader';

// Re-export commonly used functions
export { createNamespacedId, parseNamespacedId } from './types';
