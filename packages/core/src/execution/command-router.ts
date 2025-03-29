// packages/core/src/execution/command-router.ts

import { ParsedCommand } from '../parser/core/types';
import { 
  CommandHandler, 
  CommandRouter, 
  CommandResult, 
  GameContext,
  CommandExecutionOptions 
} from './types';
import { createEvent } from '../events/event-system';
import { StandardEventTypes } from '../events/standard-events';

/**
 * Default implementation of the CommandRouter interface
 */
export class DefaultCommandRouter implements CommandRouter {
  private handlers: CommandHandler[] = [];
  private fallbackHandler?: CommandHandler;
  private preExecutionHooks: ((command: ParsedCommand, context: GameContext) => Promise<void> | void)[] = [];
  private postExecutionHooks: ((result: CommandResult, command: ParsedCommand, context: GameContext) => Promise<CommandResult> | CommandResult)[] = [];

  /**
   * Register a command handler
   */
  public registerHandler(handler: CommandHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Register a fallback handler for commands that don't match any registered handlers
   */
  public registerFallbackHandler(handler: CommandHandler): void {
    this.fallbackHandler = handler;
  }

  /**
   * Unregister a command handler
   */
  public unregisterHandler(handler: CommandHandler): void {
    this.handlers = this.handlers.filter(h => h !== handler);
  }

  /**
   * Register a pre-execution hook
   */
  public registerPreExecutionHook(hook: (command: ParsedCommand, context: GameContext) => Promise<void> | void): void {
    this.preExecutionHooks.push(hook);
  }

  /**
   * Register a post-execution hook
   */
  public registerPostExecutionHook(hook: (result: CommandResult, command: ParsedCommand, context: GameContext) => Promise<CommandResult> | CommandResult): void {
    this.postExecutionHooks.push(hook);
  }

  /**
   * Get a handler for the command
   */
  public getHandler(command: ParsedCommand, context: GameContext): CommandHandler | undefined {
    // Find a handler that can handle this command
    const handler = this.handlers.find(h => 
      // Check if the verb matches
      (h.verbs.includes(command.verb) || h.verbs.includes('*')) &&
      // Check if the handler says it can handle the command
      h.canHandle(command, context)
    );

    return handler || this.fallbackHandler;
  }

  /**
   * Route and execute a command
   */
  public async execute(
    command: ParsedCommand, 
    context: GameContext,
    options: CommandExecutionOptions = {}
  ): Promise<CommandResult> {
    try {
      // Run pre-execution hooks
      const hooks = [...this.preExecutionHooks, ...(options.preExecute || [])];
      for (const hook of hooks) {
        await hook(command, context);
      }

      // Find a handler
      const handler = this.getHandler(command, context);
      
      if (!handler) {
        return {
          success: false,
          events: [
            createEvent(StandardEventTypes.COMMAND_NOT_UNDERSTOOD, {
              command: command.originalText,
              reason: 'No handler found for command'
            })
          ],
          error: `I don't know how to '${command.verb}' something.`
        };
      }

      // Validate the command
      if (!options.skipValidation) {
        const validate = options.customValidation || handler.validate;
        if (validate) {
          const validation = validate(command, context);
          if (!validation.valid) {
            return {
              success: false,
              events: [
                createEvent(StandardEventTypes.COMMAND_VALIDATION_FAILED, {
                  command: command.originalText,
                  reason: validation.error
                })
              ],
              error: validation.error
            };
          }
        }
      }

      // Execute the command
      let result = await Promise.resolve(handler.execute(command, context));

      // Run post-execution hooks
      const postHooks = [...this.postExecutionHooks, ...(options.postExecute || [])];
      for (const hook of postHooks) {
        result = await Promise.resolve(hook(result, command, context));
      }

      return result;
    } catch (error) {
      // Handle any errors during execution
      console.error('Error executing command:', error);
      
      return {
        success: false,
        events: [
          createEvent(StandardEventTypes.COMMAND_EXECUTION_ERROR, {
            command: command.originalText,
            error: error instanceof Error ? error.message : String(error)
          })
        ],
        error: 'An error occurred while executing the command.'
      };
    }
  }
}

/**
 * Create a new command router
 */
export function createCommandRouter(): CommandRouter {
  return new DefaultCommandRouter();
}