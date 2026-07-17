/**
 * Opening action - opens containers and doors
 *
 * This action properly delegates to OpenableBehavior and LockableBehavior
 * for validation and execution. It follows the validate/execute pattern.
 *
 * Uses four-phase pattern:
 * 1. validate: Check target exists and can be opened
 * 2. execute: Delegate to OpenableBehavior for state changes
 * 3. report: Generate success events with opened/revealed data
 * 4. blocked: Generate error events when validation fails
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent, EntityId } from '@sharpee/core';
import { TraitType, OpenableBehavior, LockableBehavior, IOpenResult } from '@sharpee/world-model';
import { buildEventData } from '../../data-builder-types';
import { IFActions } from '../../constants';
import { OpenedEventData, ExitRevealedEventData } from './opening-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { OpeningMessages } from './opening-messages';
import { validateToolRequirements } from '../tool-shared';
import { nounPhraseFor } from '../../../utils';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked,
  blockedMessageId
} from '../../lifecycle';

/**
 * Interceptor surface (ADR-228, ADR-230 D3b): the opened target and any
 * explicit tool are the consultable entities of an OPEN command, published
 * order target → tool (D3-B). Explicit tools only — mirrors locking's key
 * slot (ADR-229 R2).
 */
export const openingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.OPENING,
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.OPENING],
      resolve: (ctx) => ctx.command.directObject?.entity,
      seedData: (ctx, entity) => {
        const tool = ctx.command.instrument?.entity ?? ctx.command.indirectObject?.entity;
        return {
          targetId: entity.id,
          targetName: entity.name,
          toolId: tool?.id,
          toolName: tool?.name
        };
      }
    },
    {
      id: 'tool',
      actionIds: [IFActions.OPENING],
      resolve: (ctx) => ctx.command.instrument?.entity ?? ctx.command.indirectObject?.entity,
      seedData: (ctx, entity) => ({
        toolId: entity.id,
        toolName: entity.name,
        targetId: ctx.command.directObject?.entity?.id,
        targetName: ctx.command.directObject?.entity?.name
      })
    }
  ]
};

// Import our data builder
import { openedDataConfig } from './opening-data';

export const openingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.OPENING,

  // Default scope requirements for this action's slots
  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  // ADR-104: Implicit inference requirements
  targetRequirements: {
    trait: TraitType.OPENABLE,
    condition: 'not_open',
    description: 'openable'
  },

  // Opening doesn't require holding the target
  requiresHolding: false,

  requiredMessages: [
    'no_target',
    'not_openable',
    'already_open',
    'locked',
    'opened',
    'revealing',
    'its_empty',
    'cant_reach',
    'no_tool',
    'tool_not_held',
    'wrong_tool'
  ],
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  group: 'container_manipulation',
  
  validate(context: ActionContext): ValidationResult {
    const noun = context.command.directObject?.entity;

    // Validate we have a target
    if (!noun) {
      return { valid: false, error: OpeningMessages.NO_TARGET };
    }

    const state = resolveLifecycle(context, openingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    // Check scope - must be able to reach the target
    const scopeCheck = context.requireScope(noun, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Check if it's openable
    if (!noun.has(TraitType.OPENABLE)) {
      return {
        valid: false,
        error: OpeningMessages.NOT_OPENABLE,
        params: { item: nounPhraseFor(noun) }
      };
    }

    // Use behavior's canOpen method for validation
    if (!OpenableBehavior.canOpen(noun)) {
      return {
        valid: false,
        error: OpeningMessages.ALREADY_OPEN,
        params: { item: nounPhraseFor(noun) }
      };
    }

    // Author-configured tool requirement (ADR-230 D3b): a no-requirement
    // openable ignores an offered tool; a requirement refuses on
    // no_tool/tool_not_held/wrong_tool. Explicit tools only.
    const tool = context.command.instrument?.entity ?? context.command.indirectObject?.entity;
    const toolValidation = validateToolRequirements(
      context,
      noun,
      tool,
      OpenableBehavior.requiresTool(noun),
      (toolId) => OpenableBehavior.canOpenWith(noun, toolId)
    );
    if (toolValidation) {
      return toolValidation;
    }

    // Check lock status using behavior
    if (noun.has(TraitType.LOCKABLE) && LockableBehavior.isLocked(noun)) {
      return {
        valid: false,
        error: OpeningMessages.LOCKED,
        params: { item: nounPhraseFor(noun) }
      };
    }

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

    return { valid: true };
  },
  
  /**
   * Execute the open action
   * Assumes validation has already passed - no validation logic here
   * Delegates to OpenableBehavior for actual state changes
   */
  execute(context: ActionContext): void {
    // Assume validation has passed - no checks needed
    const noun = context.command.directObject!.entity!; // Safe because validate ensures it exists
    
    // Delegate to behavior for opening
    const result: IOpenResult = OpenableBehavior.open(noun);

    // Store result for report phase
    context.sharedData.openResult = result;

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  /**
   * Report phase - generates events for successful opening
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   * Text-service looks up message from domain event - no separate action.success needed.
   */
  report(context: ActionContext): ISemanticEvent[] {
    // report() is only called on success - validation passed
    const noun = context.command.directObject!.entity!;
    const result = context.sharedData.openResult as IOpenResult;
    const events: ISemanticEvent[] = [];

    // Determine message based on contents
    const isContainer = noun.has(TraitType.CONTAINER);
    const contents = isContainer ? context.world.getContents(noun.id) : [];

    let messageKey: string = OpeningMessages.OPENED;
    // params carry EntityInfo for the formatter chain (ADR-158)
    let params: Record<string, any> = { item: nounPhraseFor(noun) };

    // Special message for empty containers
    if (isContainer && contents.length === 0) {
      messageKey = OpeningMessages.ITS_EMPTY;
      params = { container: nounPhraseFor(noun) };
    }

    // 1. Primary domain event with messageId (simplified pattern - ADR-097)
    events.push(context.event('if.event.opened', {
      // Rendering data (messageId + params for text-service)
      messageId: `${context.action.id}.${messageKey}`,
      params,
      // Domain data (for event sourcing / handlers)
      targetId: noun.id,
      targetName: noun.name,
      actorId: context.player.id
    }));

    // 2. Domain event for backward compatibility (simplified)
    events.push(context.event('opened', {
      targetId: noun.id,
      targetName: noun.name
    }));

    // Note: if.event.revealed is emitted by the opened event handler in stdlib
    // This ensures revealed events fire regardless of what action opened the container

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.opened');

    return events;
  },

  /**
   * Blocked phase - generates events when validation fails
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const noun = context.command.directObject?.entity;

    const messageId = blockedMessageId(context, result);

    const events: ISemanticEvent[] = [context.event('if.event.open_blocked', {
      // Rendering data — EntityInfo for the formatter chain (ADR-158)
      messageId,
      params: {
        ...result.params,
        item: noun ? nounPhraseFor(noun) : undefined
      },
      // Domain data
      targetId: noun?.id,
      targetName: noun?.name,
      reason: result.error
    })];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.open_blocked', result.error);
    }

    return events;
  }
};
