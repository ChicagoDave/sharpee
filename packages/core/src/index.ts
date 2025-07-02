// packages/core/src/index.ts

// Core data structures
export * from './types';

// Event system - export from the events index which has everything organized
export * from './events';

// Extension system
export * from './extensions/types';

// Execution system - export specific items to avoid conflicts
export {
  CommandHandler,
  Action,
  ExecutionContext,
  CommandRouter,
  CommandHandlerFactory,
  CommandExecutionOptions
} from './execution/types';

// Rules system
export * from './rules';

// Language system
export * from './language';



// Debug infrastructure
export * from './debug';
