// packages/core/src/index.ts

// Core data structures
export * from './types/index.js';

// IFID (Interactive Fiction Identifier) utilities
export * from './ifid/index.js';

// Story metadata
export * from './metadata/index.js';

// Event system - export from the events index which has everything organized
export * from './events/index.js';

// Extension system
export * from './extensions/types.js';

// Execution system - export specific items to avoid conflicts
export {
  ICommandHandler,
  IAction,
  IExecutionContext,
  ICommandRouter,
  ICommandHandlerFactory,
  ICommandExecutionOptions
} from './execution/types.js';

// Debug infrastructure
export * from './debug/index.js';

// Query system
export * from './query/index.js';

// Random utilities
export * from './random/index.js';
