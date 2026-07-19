/**
 * Actions module exports
 */

// Core types - export enhanced types as the primary interface
export * from './enhanced-types.js';
export * from './enhanced-context.js';

// Meta-command support
export { MetaAction } from './meta-action.js';
export { MetaCommandRegistry } from './meta-registry.js';

// Implementation
export * from './registry.js';
export * from './constants.js';

// Interceptor lifecycle engine (ADR-228) — descriptors + shared hook runner
export * from './lifecycle/index.js';

// Wired-action registry (ADR-228 D5) — the descriptor table + derived id set.
// Exported here, NOT from the lifecycle barrel: actions import that barrel,
// and this module imports the actions (cycle otherwise).
export * from './lifecycle/registry.js';

// Standard actions
export * from './standard/index.js';

// Author/debug actions
export * from './author/index.js';

// Helper functions
export { createEvent } from '@sharpee/core';
