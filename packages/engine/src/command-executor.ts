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
  BasicParser,
  CommandValidator,
  LanguageProvider,
  ActionContext,
  ActionRegistry,
  Action,
  ActionResult
} from '@sharpee/stdlib';

import { 
  GameContext, 
  TurnResult, 
  SequencedEvent,
  GameEvent,
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

  constructor(
    world: WorldModel,
    actionRegistry: ActionRegistry,
    eventProcessor: EventProcessor,
    languageProvider: LanguageProvider
  ) {
    if (!world) throw new Error('World model is required');
    if (!actionRegistry) throw new Error('Action registry is required');
    if (!eventProcessor) throw new Error('Event processor is required');
    if (!languageProvider) throw new Error('Language provider is required');
    
    this.parser = new BasicParser(languageProvider);
    this.validator = new CommandValidator(world, actionRegistry);
    this.actionRegistry = actionRegistry;
    this.eventProcessor = eventProcessor;
    this.autoResolve = true;
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
    const startTime = config?.collectTiming ? Date.now() : 0;
    let parseEndTime = 0;
    const turn = context.currentTurn;

    try {
      // Phase 1: Parse the input
      const parseResult = this.parser.parse(input);
      
      if (config?.collectTiming) {
        parseEndTime = Date.now();
      }
      
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
        const endTime = Date.now();
        result.timing = {
          parsing: parseEndTime - startTime,
          execution: endTime - parseEndTime,
          total: endTime - startTime
        };
      }

      return result;

    } catch (error) {
      // Handle errors
      if (config?.onError) {
        config.onError(error as Error, context);
      }

      // Create error event
      const errorEvent = eventSequencer.sequence({
        type: 'command.failed',
        data: {
          reason: (error as Error).message,
          input
        }
      }, turn);
      
      return {
        turn,
        input,
        success: false,
        events: [errorEvent],
        error: (error as Error).message
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

    let events: GameEvent[] = [];
    let success = true;
    let error: string | undefined;

    // Check if it's an Action (has patterns) or ActionExecutor
    if ('patterns' in action) {
      // It's an Action - execute expects only context and returns ActionResult
      const actionResult = await (action as Action).execute(actionContext);
      
      // Create events from action result
      events = actionResult.events || [];
      if (actionResult.message) {
        events.push({
          type: 'command.succeeded',
          data: { message: actionResult.message }
        });
      }
      
      success = actionResult.success;
      error = actionResult.error;
    } else {
      // It's an ActionExecutor - execute expects command and context, returns SemanticEvent[]
      const semanticEvents = (action as any).execute(command, actionContext);
      
      // Convert SemanticEvent[] to GameEvent[]
      events = semanticEvents.map((se: SemanticEvent) => ({
        type: se.type,
        data: se.data,
        metadata: { id: se.id, entities: se.entities }
      }));
    }

    // Sequence the events
    const sequencedEvents = eventSequencer.sequenceAll(events, turn);

    // Process the events to update the world
    if (sequencedEvents.length > 0) {
      // Convert SequencedEvent[] to SemanticEvent[] for the event processor
      const semanticEvents = sequencedEvents.map(e => ({
        id: e.sequence.toString(),
        type: e.type,
        data: e.data,
        timestamp: e.timestamp instanceof Date ? e.timestamp.getTime() : e.timestamp,
        entities: e.data?.entities || {}
      }));
      this.eventProcessor.processEvents(semanticEvents);
    }

    return {
      turn,
      input: command.parsed.rawInput || command.parsed.action,
      success,
      events: sequencedEvents,
      error
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
      canSee: (entity: IFEntity) => world.canSee(player.id, entity.id),
      canReach: (entity: IFEntity) => {
        // Simple implementation - can reach if can see
        // Could be enhanced with actual reach calculation
        return world.canSee(player.id, entity.id);
      },
      canTake: (entity: IFEntity) => {
        // Can take if not scenery, not a room, etc.
        return !entity.has('SCENERY') && !entity.has('ROOM');
      },
      isInScope: (entity: IFEntity) => {
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

    // TODO: Implement entity tracking from events
    // For now, return empty array
    // We would need to examine the events in each turn to extract entity references
    
    return recent;
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
  languageProvider: LanguageProvider
): CommandExecutor {
  return new CommandExecutor(
    world,
    actionRegistry,
    eventProcessor,
    languageProvider
  );
}
