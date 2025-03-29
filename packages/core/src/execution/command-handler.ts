// packages/core/src/execution/command-handler.ts

import { ParsedCommand } from '../parser/core/types';
import { 
  CommandHandler, 
  CommandResult, 
  GameContext,
  CommandHandlerFactory 
} from './types';
import { createEvent } from '../events/event-system';
import { StandardEventTypes } from '../events/standard-events';

/**
 * Base class for command handlers
 */
export abstract class BaseCommandHandler implements CommandHandler {
  /**
   * The verb or verbs that this handler can process
   */
  public readonly verbs: string[];

  /**
   * Create a new command handler
   */
  constructor(verbs: string | string[]) {
    this.verbs = Array.isArray(verbs) ? verbs : [verbs];
  }

  /**
   * Check if this handler can handle the given command
   */
  public canHandle(command: ParsedCommand, context: GameContext): boolean {
    return this.verbs.includes(command.verb) || this.verbs.includes('*');
  }

  /**
   * Execute the command
   */
  public abstract execute(command: ParsedCommand, context: GameContext): Promise<CommandResult> | CommandResult;

  /**
   * Validate the command before execution
   */
  public validate?(command: ParsedCommand, context: GameContext): { valid: boolean; error?: string };

  /**
   * Helper function to create a successful result
   */
  protected createSuccessResult(events: CommandResult['events'] = [], metadata?: Record<string, unknown>): CommandResult {
    return {
      success: true,
      events,
      metadata
    };
  }

  /**
   * Helper function to create a failure result
   */
  protected createFailureResult(error: string, events: CommandResult['events'] = [], metadata?: Record<string, unknown>): CommandResult {
    return {
      success: false,
      events: [
        ...events,
        createEvent(StandardEventTypes.COMMAND_FAILED, { error })
      ],
      error,
      metadata
    };
  }
}

/**
 * Factory for creating command handlers
 */
export class CommandHandlerFactoryImpl implements CommandHandlerFactory {
  /**
   * Create a standard command handler
   */
  public createHandler(config: {
    verbs: string[];
    canHandle?: (command: ParsedCommand, context: GameContext) => boolean;
    execute: (command: ParsedCommand, context: GameContext) => Promise<CommandResult> | CommandResult;
    validate?: (command: ParsedCommand, context: GameContext) => { valid: boolean; error?: string };
  }): CommandHandler {
    return {
      verbs: config.verbs,
      canHandle: config.canHandle || ((command, context) => config.verbs.includes(command.verb)),
      execute: config.execute,
      validate: config.validate
    };
  }
}

/**
 * Create a new command handler factory
 */
export function createCommandHandlerFactory(): CommandHandlerFactory {
  return new CommandHandlerFactoryImpl();
}