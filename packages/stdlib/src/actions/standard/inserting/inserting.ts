/**
 * Inserting action - insert objects specifically into containers
 *
 * This action is container-specific, unlike putting which handles both
 * containers and supporters. It's more explicit about the container relationship.
 * In many cases, this delegates to the putting action with 'in' preposition.
 *
 * Uses four-phase pattern:
 * 1. validate: Check item and container exist and are compatible
 * 2. execute: Delegate to putting action with 'in' preposition
 * 3. blocked: Generate error events when validation fails
 * 4. report: Generate success events (delegates to putting)
 *
 * Supports multi-object commands:
 * - "insert all in box" - inserts all carried items in box
 * - "insert all but X in box" - inserts all except specified items
 * - "insert X and Y in box" - inserts multiple specified items
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { puttingAction } from '../putting';
import { createActionContext } from '../../enhanced-context';
import { InsertingMessages } from './inserting-messages';
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
 * Interceptor surface (ADR-228). D6-B delegation-seam ruling: inserting
 * consults `if.action.inserting` on its own entities FIRST, then
 * delegates into putting — whose engine wiring runs the
 * `if.action.putting` hooks inside the delegated context. So `on
 * inserting it` (previously dead) AND `on putting it` both fire for an
 * INSERT command. Authors: one physical operation fires hooks under two
 * ids — register a trait's interceptor under exactly ONE of them to
 * avoid double-mutation.
 */
export const insertingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.INSERTING,
  slots: [
    {
      id: 'item',
      actionIds: [IFActions.INSERTING],
      resolve: (ctx) => ctx.command.directObject?.entity,
      seedData: (ctx, entity) => ({
        itemId: entity.id,
        itemName: entity.name,
        targetId: ctx.command.indirectObject?.entity?.id,
        targetName: ctx.command.indirectObject?.entity?.name
      })
    },
    {
      id: 'container',
      actionIds: [IFActions.INSERTING],
      resolve: (ctx) => ctx.command.indirectObject?.entity,
      seedData: (ctx, entity) => ({
        itemId: ctx.command.directObject?.entity?.id,
        itemName: ctx.command.directObject?.entity?.name,
        targetId: entity.id,
        targetName: entity.name
      })
    }
  ]
};

/**
 * Shared data passed between execute and report phases
 */
interface InsertingSharedData {
  modifiedContext?: ActionContext;
}

function getInsertingSharedData(context: ActionContext): InsertingSharedData {
  return context.sharedData as InsertingSharedData;
}

/**
 * Create a modified command with 'in' preposition for delegation to putting
 */
function createModifiedCommand(context: ActionContext) {
  return {
    ...context.command,
    parsed: {
      ...context.command.parsed,
      structure: {
        ...context.command.parsed.structure,
        preposition: {
          tokens: [],
          text: 'in'
        }
      },
      preposition: 'in'
    }
  };
}

export const insertingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.INSERTING,

  // Default scope requirements for this action's slots
  defaultScope: {
    item: ScopeLevel.REACHABLE,  // REACHABLE allows implicit take
    container: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'no_destination',
    'not_held',
    'not_insertable',
    'not_container',
    'already_there',
    'inserted',
    'wont_fit',
    'container_closed',
    'nothing_to_insert'
  ],
  group: 'object_manipulation',

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: true,
    directObjectScope: ScopeLevel.REACHABLE,  // REACHABLE allows implicit take
    indirectObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    const item = context.command.directObject?.entity;
    const container = context.command.indirectObject?.entity;

    // For single-object commands, validate we have an item
    // (Multi-object commands may not have a resolved entity yet)
    const isMultiObject = context.command.parsed.structure.directObject?.isAll ||
                          context.command.parsed.structure.directObject?.isList;

    if (!isMultiObject && !item) {
      return {
        valid: false,
        error: InsertingMessages.NO_TARGET
      };
    }

    // Validate we have a destination
    if (!container) {
      return {
        valid: false,
        error: InsertingMessages.NO_DESTINATION,
        params: { item: item ? nounPhraseFor(item) : undefined }
      };
    }

    // D6-B: consult the INSERTING-id hooks first (on the outer context) —
    // the delegated putting phases run the PUTTING-id hooks themselves.
    const state = resolveLifecycle(context, insertingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    // Create modified command with 'in' preposition for delegation to putting
    const modifiedCommand = createModifiedCommand(context);

    // Create a new context for the putting action with the modified command
    const modifiedContext = createActionContext(
      context.world,
      context.player,
      puttingAction,
      modifiedCommand
    );

    // Store modified context for execute/report phases (preserves implicit take events)
    const sharedData = getInsertingSharedData(context);
    sharedData.modifiedContext = modifiedContext;

    // Delegate validation to putting action
    // This includes implicit take check - events stored in modifiedContext.sharedData
    const puttingValidation = puttingAction.validate(modifiedContext);

    if (!puttingValidation.valid) {
      return puttingValidation as ValidationResult;
    }

    // Canonical placement (ADR-228): postValidate after ALL standard
    // validation, including the delegated putting validation.
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Reuse the modified context from validate (preserves implicit take events)
    const sharedData = getInsertingSharedData(context);
    const modifiedContext = sharedData.modifiedContext;

    if (!modifiedContext) {
      // Shouldn't happen, but create one defensively
      const modifiedCommand = createModifiedCommand(context);
      sharedData.modifiedContext = createActionContext(
        context.world,
        context.player,
        puttingAction,
        modifiedCommand
      );
    }

    // Execute putting action (runs the PUTTING-id hooks internally)
    puttingAction.execute(sharedData.modifiedContext!);

    // Then the INSERTING-id hooks on the outer context (D6-B order)
    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  /**
   * Report events after successful inserting
   *
   * Delegates to putting action which uses simplified event pattern (ADR-097).
   */
  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getInsertingSharedData(context);
    const modifiedContext = sharedData.modifiedContext;

    if (!modifiedContext) {
      // Shouldn't happen, but handle gracefully with domain event
      const item = context.command.directObject?.entity;
      const container = context.command.indirectObject?.entity;
      return [context.event('if.event.insert_blocked', {
        messageId: `${context.action.id}.${InsertingMessages.CANT_INSERT}`,
        // params carry EntityInfo for the formatter chain (ADR-158)
        params: {
          item: item ? nounPhraseFor(item) : undefined,
          container: container ? nounPhraseFor(container) : undefined
        },
        itemId: item?.id,
        itemName: item?.name,
        containerId: container?.id,
        containerName: container?.name,
        reason: 'cant_insert'
      })];
    }

    // Delegate to putting action's report (runs the PUTTING-id hooks)
    if ('report' in puttingAction && typeof puttingAction.report === 'function') {
      const events = puttingAction.report(modifiedContext);

      // Then the INSERTING-id hooks on the outer context (D6-B order).
      // Inserting is always 'in', so putting's primary event is put_in.
      const state = getLifecycleState(context);
      if (state) runPostReport(context, state, events, 'if.event.put_in');

      return events;
    }

    // Shouldn't happen since putting is migrated
    return [];
  },

  /**
   * Generate events when validation fails
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const item = context.command.directObject?.entity;
    const container = context.command.indirectObject?.entity;

    const events: ISemanticEvent[] = [context.event('if.event.insert_blocked', {
      // Rendering data — EntityInfo for the formatter chain (ADR-158)
      messageId: blockedMessageId(context, result),
      params: {
        ...result.params,
        item: item ? nounPhraseFor(item) : undefined,
        container: container ? nounPhraseFor(container) : undefined
      },
      // Domain data — strings for handlers
      itemId: item?.id,
      itemName: item?.name,
      containerId: container?.id,
      containerName: container?.name,
      reason: result.error
    })];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.insert_blocked', result.error);
    }

    return events;
  }
};
