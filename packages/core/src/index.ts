// packages/core/src/index.ts

// Core data structures
export * from './types';

// Event system - export from the events index which has everything organized
export * from './events';

// Extension system
export * from './extensions/types';

// Execution system - export specific items to avoid conflicts
export {
  ICommandHandler,
  IAction,
  IExecutionContext,
  ICommandRouter,
  ICommandHandlerFactory,
  ICommandExecutionOptions
} from './execution/types';

// Rules system
export * from './rules';

// Debug infrastructure
export * from './debug';

// Query system
export * from './query';
