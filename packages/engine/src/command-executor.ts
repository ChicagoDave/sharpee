/**
 * Command Executor - Thin Orchestrator (~100 lines)
 * 
 * Phase 3.5: Refactored to be a simple orchestrator that delegates all
 * responsibilities to the appropriate components (parser, validator, actions).
 * 
 * Responsibilities:
 * - Orchestrate the three-phase pattern (validate → execute → report)
 * - Pass results between phases
 * - Return the final TurnResult
 * 
 * All event creation is now owned by the components themselves.
 */

import { ISemanticEvent, ISystemEvent, IGenericEventSource } from '@sharpee/core';
import { IParser, IValidatedCommand, IParsedCommand } from '@sharpee/world-model';
import { WorldModel } from '@sharpee/world-model';
import { EventProcessor } from '@sharpee/event-processor';
import {
  CommandValidator,
  ActionRegistry,
  Action,
  ScopeResolver,
  createScopeResolver
} from '@sharpee/stdlib';

import { GameContext, TurnResult, EngineConfig } from './types';
import { eventSequencer } from './event-sequencer';
import { createActionContext } from './action-context-factory';

/**
 * Transformer function for parsed commands.
 * Called after parsing but before validation.
 * Can modify the parsed command to bypass or alter validation behavior.
 *
 * @param parsed - The parsed command from the parser
 * @param world - The world model for checking state (e.g., gdtMode)
 * @returns The (potentially modified) parsed command
 */
export type ParsedCommandTransformer = (
  parsed: IParsedCommand,
  world: WorldModel
) => IParsedCommand;

export class CommandExecutor {
  private parser: IParser;
  private validator: CommandValidator;
  private actionRegistry: ActionRegistry;
  private eventProcessor: EventProcessor;
  private scopeResolver?: ScopeResolver;
  private parsedCommandTransformers: ParsedCommandTransformer[] = [];

  constructor(
    world: WorldModel,
    actionRegistry: ActionRegistry,
    eventProcessor: EventProcessor,
    parser: IParser,
    systemEvents?: IGenericEventSource<ISystemEvent>
  ) {
    if (!world) throw new Error('World model is required');
    if (!actionRegistry) throw new Error('Action registry is required');
    if (!eventProcessor) throw new Error('Event processor is required');
    if (!parser) throw new Error('Parser is required');

    this.parser = parser;
    this.validator = new CommandValidator(world, actionRegistry);
    if (systemEvents) {
      this.validator.setSystemEventSource(systemEvents);
    }
    this.actionRegistry = actionRegistry;
    this.eventProcessor = eventProcessor;
  }

  /**
   * Register a transformer that can modify parsed commands before validation.
   * Transformers are called in order of registration.
   *
   * @param transformer - Function to transform parsed commands
   */
  registerParsedCommandTransformer(transformer: ParsedCommandTransformer): void {
    this.parsedCommandTransformers.push(transformer);
  }

  /**
   * Unregister a previously registered transformer.
   *
   * @param transformer - The transformer to remove
   * @returns true if the transformer was found and removed
   */
  unregisterParsedCommandTransformer(transformer: ParsedCommandTransformer): boolean {
    const index = this.parsedCommandTransformers.indexOf(transformer);
    if (index !== -1) {
      this.parsedCommandTransformers.splice(index, 1);
      return true;
    }
    return false;
  }

  async execute(
    input: string,
    world: WorldModel,
    context: GameContext,
    config?: EngineConfig
  ): Promise<TurnResult> {
    const turn = context.currentTurn;
    eventSequencer.resetTurn(turn);

    // Timing tracking
    const startTime = config?.collectTiming ? Date.now() : 0;
    let parseTime = 0;
    let executionTime = 0;

    try {
      // Set world context for parser entity resolution
      const player = world.getPlayer();
      if (player && 'setWorldContext' in this.parser) {
        const playerLocation = world.getLocation(player.id) || '';
        (this.parser as any).setWorldContext(world, player.id, playerLocation);
      }

      // Phase 1: Parse
      const parseStart = config?.collectTiming ? Date.now() : 0;
      const parseResult = this.parser.parse(input);
      if (config?.collectTiming) {
        parseTime = Date.now() - parseStart;
      }
      
      if (!parseResult.success) {
        throw new Error(`Parse failed: ${(parseResult.error as any).code}`);
      }

      // Phase 1.5: Apply parsed command transformers
      // Allows stories to modify parsed commands before validation
      let parsedCommand = parseResult.value;
      for (const transformer of this.parsedCommandTransformers) {
        parsedCommand = transformer(parsedCommand, world);
      }

      // Phase 2: Validate
      const validationResult = this.validator.validate(parsedCommand);
      if (!validationResult.success) {
        throw new Error(`Validation failed: ${validationResult.error.code}`);
      }

      // Phase 3: Execute action's three-phase pattern
      const executionStart = config?.collectTiming ? Date.now() : 0;
      const command = validationResult.value;
      const action = this.actionRegistry.get(command.actionId);
      if (!action) {
        throw new Error(`Action not found: ${command.actionId}`);
      }

      // Create context
      if (!this.scopeResolver) {
        this.scopeResolver = createScopeResolver(world);
      }
      const actionContext = createActionContext(world, context, command, action, this.scopeResolver);

      // Run action's four phases: validate → execute → report (or blocked)
      const actionValidation = action.validate(actionContext);

      // Thread validation result to later phases via context
      // This allows actions to access data from validate() in execute/report
      (actionContext as { validationResult?: typeof actionValidation }).validationResult = actionValidation;

      let events: ISemanticEvent[];

      if (actionValidation.valid) {
        // Execute mutations
        const executeResult = action.execute(actionContext);

        // Check pattern (new vs old)
        if (executeResult === undefined || executeResult === null) {
          // New pattern: use report() for success events only
          if (action.report) {
            events = action.report(actionContext);
          } else {
            throw new Error(`Action ${action.id} uses new pattern but lacks report()`);
          }
        } else {
          // Old pattern: events from execute()
          events = executeResult as ISemanticEvent[];
        }
      } else {
        // Validation failed - use blocked() for error events
        if (action.blocked) {
          events = action.blocked(actionContext, actionValidation);
        } else {
          // Fallback for unmigrated actions
          events = [{
            id: `${turn}-error`,
            type: 'action.error',
            timestamp: Date.now(),
            data: {
              actionId: command.actionId,
              messageId: actionValidation.error || 'validation_failed',
              params: actionValidation.params || {}
            },
            entities: {}
          }];
        }
      }

      if (config?.collectTiming) {
        executionTime = Date.now() - executionStart;
      }

      // Process events and collect reactions (ADR-052 entity handlers)
      let allEvents = events;
      if (events.length > 0) {
        const processed = this.eventProcessor.processEvents(events);
        // Add reaction events from entity handlers
        if (processed.reactions && processed.reactions.length > 0) {
          allEvents = [...events, ...processed.reactions];
        }
      }

      // Preserve all event properties (including requiresClientAction for platform events)
      const sequenced = eventSequencer.sequenceAll(allEvents, turn);

      const result: TurnResult = {
        turn,
        input,
        success: !events.some(e => e.type === 'action.error'),
        events: sequenced,
        actionId: command.actionId,
        parsedCommand: command.parsed
      };

      // Add timing data if requested
      if (config?.collectTiming) {
        result.timing = {
          parsing: parseTime,
          execution: executionTime,
          total: Date.now() - startTime
        };
      }

      return result;

    } catch (error) {
      // Minimal error handling - just return failure
      const result: TurnResult = {
        turn,
        input,
        success: false,
        events: [eventSequencer.sequence({
          type: 'command.failed',
          data: { reason: (error as Error).message, input }
        }, turn)],
        error: (error as Error).message
      };

      // Add timing data even for errors if requested
      if (config?.collectTiming) {
        result.timing = {
          parsing: parseTime,
          execution: executionTime,
          total: Date.now() - startTime
        };
      }

      return result;
    }
  }
}

export function createCommandExecutor(
  world: WorldModel,
  actionRegistry: ActionRegistry,
  eventProcessor: EventProcessor,
  parser: IParser,
  systemEvents?: IGenericEventSource<ISystemEvent>
): CommandExecutor {
  return new CommandExecutor(world, actionRegistry, eventProcessor, parser, systemEvents);
}