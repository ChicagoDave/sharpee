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

import { ISemanticEvent } from '@sharpee/core';
import { IParser, IValidatedCommand } from '@sharpee/world-model';
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

export class CommandExecutor {
  private parser: IParser;
  private validator: CommandValidator;
  private actionRegistry: ActionRegistry;
  private eventProcessor: EventProcessor;
  private scopeResolver?: ScopeResolver;

  constructor(
    world: WorldModel,
    actionRegistry: ActionRegistry,
    eventProcessor: EventProcessor,
    parser: IParser
  ) {
    this.parser = parser;
    this.validator = new CommandValidator(world, actionRegistry);
    this.actionRegistry = actionRegistry;
    this.eventProcessor = eventProcessor;
  }

  async execute(
    input: string,
    world: WorldModel,
    context: GameContext,
    config?: EngineConfig
  ): Promise<TurnResult> {
    const turn = context.currentTurn;
    eventSequencer.resetTurn(turn);

    try {
      // Phase 1: Parse
      const parseResult = this.parser.parse(input);
      if (!parseResult.success) {
        throw new Error(`Parse failed: ${(parseResult.error as any).code}`);
      }

      // Phase 2: Validate
      const validationResult = this.validator.validate(parseResult.value);
      if (!validationResult.success) {
        throw new Error(`Validation failed: ${validationResult.error.code}`);
      }

      // Phase 3: Execute action's three-phase pattern
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

      // Run action's three phases
      const actionValidation = action.validate(actionContext);
      
      let events: ISemanticEvent[];
      
      if (!actionValidation.valid) {
        // Let action create its own error events
        if (action.report) {
          events = action.report(actionContext, actionValidation);
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
      } else {
        // Execute mutations
        let executionError: Error | undefined;
        try {
          const executeResult = await action.execute(actionContext);
          
          // Check pattern (new vs old)
          if (executeResult === undefined || executeResult === null) {
            // New pattern: use report()
            if (action.report) {
              events = action.report(actionContext, actionValidation);
            } else {
              throw new Error(`Action ${action.id} uses new pattern but lacks report()`);
            }
          } else {
            // Old pattern: events from execute()
            events = executeResult as ISemanticEvent[];
          }
        } catch (error) {
          executionError = error as Error;
          if (action.report) {
            events = action.report(actionContext, actionValidation, executionError);
          } else {
            throw error;
          }
        }
      }

      // Process events
      const sequenced = eventSequencer.sequenceAll(
        events.map(e => ({ type: e.type, data: e.data })), 
        turn
      );
      
      if (sequenced.length > 0) {
        this.eventProcessor.processEvents(events);
      }

      return {
        turn,
        input,
        success: !events.some(e => e.type === 'action.error'),
        events: sequenced,
        actionId: command.actionId,
        parsedCommand: command.parsed
      };

    } catch (error) {
      // Minimal error handling - just return failure
      return {
        turn,
        input,
        success: false,
        events: [eventSequencer.sequence({
          type: 'command.failed',
          data: { reason: (error as Error).message, input }
        }, turn)],
        error: (error as Error).message
      };
    }
  }
}

export function createCommandExecutor(
  world: WorldModel,
  actionRegistry: ActionRegistry,
  eventProcessor: EventProcessor,
  parser: IParser
): CommandExecutor {
  return new CommandExecutor(world, actionRegistry, eventProcessor, parser);
}