/**
 * The meta-command stage: run a meta command (VERSION, SCORE, SAVE, UNDO,
 * and the rest of the registry's set) outside the turn cycle.
 *
 * The parsed command is validated and its action run through the
 * four-phase pattern against a fresh action context; platform requests
 * among its events are dispatched at once so their completion events
 * render in the same output. Nothing here increments the turn, ticks
 * plugins, snapshots for undo, or enters the command history, and the
 * events are not stored in the turn's list — the meta-render stage
 * renders them directly. Any failure, a validation error or a throw,
 * becomes an error event and a failed result; the stage always
 * continues so the render stage shows it.
 *
 * Public interface: `metaCommandStage`, `processMetaPlatformOperation`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-334 D1a (the meta list), D3 (the shared dispatcher).
 */

import { isPlatformRequestEvent, type IPlatformEvent, type ISemanticEvent } from '@sharpee/core';
import { createScopeResolver } from '@sharpee/stdlib';
import { createActionContext } from '../action-context-factory.js';
import { dispatchPlatformOperations } from '../platform-operations.js';
import type { TurnStage, TurnStageContext, TurnEngine } from './context.js';

/**
 * Run the one platform request a meta command emitted and return its
 * completion events for the command's result. Same dispatcher as the
 * turn path; the list is the difference.
 * @param engine the turn-facing engine surface
 * @param operation the request among the meta command's events
 * @returns the completion or failure events the operation produced
 */
export async function processMetaPlatformOperation(engine: TurnEngine, operation: IPlatformEvent): Promise<ISemanticEvent[]> {
  const completionEvents: ISemanticEvent[] = [];
  await dispatchPlatformOperations([operation], engine.platformOperationHost(), (event) => {
    completionEvents.push(event);
  });
  return completionEvents;
}

/** The turn's result for a meta command: the turn number for display, never incremented. */
function metaResult(
  context: TurnStageContext,
  outcome: { success: boolean; error?: string; actionId?: string }
): void {
  context.result = {
    type: 'turn', // For backward compatibility with callers that don't check type
    turn: context.turn,
    input: context.input,
    success: outcome.success,
    events: context.events,
    error: outcome.error,
    actionId: outcome.actionId
  };
}

export const metaCommandStage: TurnStage = {
  name: 'meta-command',
  requires: ['parse'],
  async run(context) {
    const { engine, input } = context;
    const parsedCommand = context.parsedCommand!;
    const events: ISemanticEvent[] = [];
    context.events = events;

    try {
      const validationResult = engine.commandExecutor.validateCommand(parsedCommand);

      if (!validationResult.success) {
        events.push({
          id: `meta_error_${Date.now()}`,
          type: 'if.event.command_error',
          timestamp: Date.now(),
          data: {
            messageId: `if.action.command.${validationResult.error?.code || 'validation_failed'}`,
            params: validationResult.error?.details || {},
            blocked: true,
            reason: validationResult.error?.code || 'validation_failed'
          },
          entities: {}
        });
        metaResult(context, {
          success: false,
          error: validationResult.error?.code || 'Validation failed',
          actionId: parsedCommand.action
        });
        return 'continue';
      }

      const command = validationResult.value;
      const action = engine.actionRegistry.get(command.actionId);

      if (!action) {
        events.push({
          id: `meta_error_${Date.now()}`,
          type: 'if.event.command_error',
          timestamp: Date.now(),
          data: {
            messageId: 'if.action.command.action_not_found',
            params: { actionId: command.actionId },
            blocked: true,
            reason: 'action_not_found'
          },
          entities: {}
        });
        metaResult(context, {
          success: false,
          error: `Action not found: ${command.actionId}`,
          actionId: command.actionId
        });
        return 'continue';
      }

      const scopeResolver = createScopeResolver(engine.world);
      const actionContext = createActionContext(
        engine.world,
        engine.context,
        command,
        action,
        scopeResolver,
        undefined,
        engine.randomService
      );

      const actionValidation = action.validate(actionContext);

      let actionEvents: ISemanticEvent[];
      if (actionValidation.valid) {
        action.execute(actionContext);
        actionEvents = action.report ? action.report(actionContext) : [];
      } else {
        actionEvents = action.blocked
          ? action.blocked(actionContext, actionValidation)
          : [{
              id: `meta_blocked_${Date.now()}`,
              type: 'if.event.command_error',
              timestamp: Date.now(),
              data: {
                messageId: `if.action.command.${actionValidation.error || 'validation_failed'}`,
                params: actionValidation.params || {},
                blocked: true,
                reason: actionValidation.error || 'validation_failed'
              },
              entities: {}
            }];
      }

      events.push(...actionEvents);

      // Platform requests are handled before the render so their
      // completion events show in the same output.
      const platformOps = events.filter(isPlatformRequestEvent);
      for (const op of platformOps) {
        const completionEvents = await processMetaPlatformOperation(engine, op as IPlatformEvent);
        events.push(...completionEvents);
      }

      metaResult(context, { success: actionValidation.valid, actionId: command.actionId });
      return 'continue';
    } catch (error: any) {
      events.push({
        id: `meta_error_${Date.now()}`,
        type: 'command.failed',
        timestamp: Date.now(),
        data: {
          reason: error.message,
          input
        },
        entities: {}
      });
      metaResult(context, { success: false, error: error.message, actionId: parsedCommand.action });
      return 'continue';
    }
  }
};
