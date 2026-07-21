/**
 * Extension system exports
 * 
 * This module provides the infrastructure for creating and loading
 * trait extensions that add new functionality to the world model.
 */

// Types and interfaces
export * from './types.js';

// Registry
export { ExtensionRegistry, extensionRegistry } from './registry.js';

// Loader
export { ExtensionLoader, extensionLoader, ExtensionLoadError } from './loader.js';

// Re-export commonly used functions
export { createNamespacedId, parseNamespacedId } from './types.js';
