/**
 * Execution system exports
 * 
 * This module provides the command execution pipeline:
 * - CommandResolver: Resolves parsed commands into executable commands
 * - ActionExecutor: Executes resolved commands using registered actions
 */

export {
  CommandResolver,
  DisambiguationStrategy,
  ResolverOptions,
  InteractiveDisambiguation,
  createCommandResolver
} from './command-resolver';

export {
  ActionExecutor,
  ActionExecutorOptions,
  createActionExecutor
} from './action-executor';

export {
  TraitAwareActionExecutor,
  TraitAwareActionExecutorOptions,
  createTraitAwareActionExecutor
} from './trait-aware-action-executor';
