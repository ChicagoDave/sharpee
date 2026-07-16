/**
 * Actions module exports
 */

// Core types - export enhanced types as the primary interface
export * from './enhanced-types';
export * from './enhanced-context';

// Meta-command support
export { MetaAction } from './meta-action';
export { MetaCommandRegistry } from './meta-registry';

// Implementation
export * from './registry';
export * from './constants';

// Interceptor lifecycle engine (ADR-228) — descriptors + shared hook runner
export * from './lifecycle';

// Wired-action registry (ADR-228 D5) — the descriptor table + derived id set.
// Exported here, NOT from the lifecycle barrel: actions import that barrel,
// and this module imports the actions (cycle otherwise).
export * from './lifecycle/registry';

// Standard actions
export * from './standard';

// Author/debug actions
export * from './author';

// Helper functions
export { createEvent } from '@sharpee/core';
