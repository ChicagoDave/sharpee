/**
 * Command Executor - Orchestrates command execution flow
 * 
 * Ties together parsing, resolution, action execution, and event processing
 */

import { SemanticEvent } from '@sharpee/core';
import { 
  ParsedCommand, 
  ValidatedCommand,
  Parser,
  ValidationError,
  CommandValidator as ICommandValidator
} from '@sharpee/world-model';
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { EventProcessor } from '@sharpee/event-processor';
import { 
  ActionContext,
  ActionRegistry
} from '@sharpee/stdlib/actions';
import {
  BasicParser,
  CommandValidator,
  LanguageProvider
} from '@sharpee/stdlib';

import { 
  GameContext, 
  TurnResult, 
  SequencedEvent,
  EngineConfig 
} from './types';
import { eventSequencer } from './event-sequencer';

/**
 * Command executor options
 */
export interface CommandExecutorOptions {
  /**
   * World model
   */
  world: WorldModel;
  
  /**
   * Action registry to use
   */
  actionRegistry: ActionRegistry;
  
  /**
   * Event processor to use
   */
  eventProcessor: EventProcessor;
  
  /**
   * Language provider for parsing
   */
  languageProvider: LanguageProvider;
  
  /**
   * Whether to auto-resolve ambiguities
   */
  autoResolveAmbiguities?: boolean;
}

/**
 * Command executor implementation
 */
export class CommandExecutor {
  private parser: Parser;
  private validator: ICommandValidator;
  private actionRegistry: ActionRegistry;
  private eventProcessor: EventProcessor;
  private autoResolve: boolean;

  constructor(options: CommandExecutorOptions) {
    this.parser = new BasicParser(options.languageProvider);
    this.validator = new CommandValidator(
      options.world, 
      options.actionRegistry
    );
    this.actionRegistry = options.actionRegistry;
    this.eventProcessor = options.eventProcessor;
    this.autoResolve = options.autoResolveAmbiguities ?? true;
  }

  /**
   * Execute a command string
   */
  async execute(
    input: string,
    world: WorldModel,
    context: GameContext,
    config?: EngineConfig
  ): Promise<TurnResult> {
    const startTime = Date.now();
    const turn = context.currentTurn;

    try {
      // Phase 1: Parse the input
      const parseResult = this.parser.parse(input);
      
      if (!parseResult.success) {
        throw new Error(parseResult.error.message);
      }

      const parsed = parseResult.value;

      // Phase 2: Validate against the world
      const validationResult = this.validator.validate(parsed);
      
      if (!validationResult.success) {
        throw new Error(validationResult.error.message);
      }

      const validated = validationResult.value;

      // Phase 3: Execute the validated command
      const result = await this.executeCommand(validated, world, context, turn);

      // Add timing if configured
      if (config?.collectTiming) {
        result.timing = {
          start: startTime,
          end: Date.now(),
          duration: Date.now() - startTime
        };
      }

      return result;

    } catch (error) {
      // Handle errors
      if (config?.onError) {
        config.onError(error as Error, context);
      }

      return {
        turn,
        command: this.createErrorCommand(input),
        events: [],
        worldChanges: [],
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Execute a validated command
   */
  async executeCommand(
    command: ValidatedCommand,
    world: WorldModel,
    context: GameContext,
    turn: number
  ): Promise<TurnResult> {
    // Reset sequencer for this turn
    eventSequencer.resetTurn(turn);

    // Look up the action from the registry
    const action = this.actionRegistry.get(command.actionId);
    if (!action) {
      throw new Error(`Action not found in registry: ${command.actionId}`);
    }

    // Create action context
    const actionContext = this.createActionContext(world, context);

    // Execute the action to get events
    const rawEvents = action.execute(command, actionContext);

    // Sequence the events
    const sequencedEvents = eventSequencer.sequence(rawEvents, turn);

    // Process the events to update the world
    const processResult = this.eventProcessor.processEvents(sequencedEvents);

    return {
      turn,
      command: command.parsed,
      events: sequencedEvents,
      worldChanges: processResult.changes,
      success: processResult.applied.length > 0
    };
  }

  /**
   * Create action context from game context
   */
  private createActionContext(world: WorldModel, context: GameContext): ActionContext {
    const player = context.player;
    const currentLocation = world.getContainingRoom(player.id) || player;

    return {
      world: world as any, // Read-only interface
      player,
      currentLocation,
      canSee: (entity) => world.canSee(player.id, entity.id),
      canReach: (entity) => {
        // Simple implementation - can reach if can see
        // Could be enhanced with actual reach calculation
        return world.canSee(player.id, entity.id);
      },
      canTake: (entity) => {
        // Can take if not scenery, not a room, etc.
        return !entity.has('SCENERY') && !entity.has('ROOM');
      },
      isInScope: (entity) => {
        const inScope = world.getInScope(player.id);
        return inScope.some(e => e.id === entity.id);
      },
      getVisible: () => world.getVisible(player.id),
      getInScope: () => world.getInScope(player.id)
    };
  }

  /**
   * Get recent entities from turn history
   */
  private getRecentEntities(context: GameContext): string[] {
    const recent: string[] = [];
    const recentTurns = context.history.slice(-5); // Last 5 turns

    for (const turn of recentTurns) {
      if (turn.command.directObject) {
        recent.push(turn.command.directObject.text);
      }
      if (turn.command.indirectObject) {
        recent.push(turn.command.indirectObject.text);
      }
    }

    return [...new Set(recent)]; // Deduplicate
  }

  /**
   * Create an error command for failed parsing
   */
  private createErrorCommand(input: string): ParsedCommand {
    return {
      action: 'UNKNOWN',
      rawInput: input
    };
  }
}

/**
 * Factory function to create a command executor
 */
export function createCommandExecutor(
  world: WorldModel,
  actionRegistry: ActionRegistry,
  eventProcessor: EventProcessor,
  languageProvider: LanguageProvider,
  options?: Partial<CommandExecutorOptions>
): CommandExecutor {
  return new CommandExecutor({
    world,
    actionRegistry,
    eventProcessor,
    languageProvider,
    ...options
  });
}
