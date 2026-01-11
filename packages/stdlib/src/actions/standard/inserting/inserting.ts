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
        params: { item: item?.name }
      };
    }

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

    // Execute putting action
    puttingAction.execute(sharedData.modifiedContext!);
  },

  /**
   * Report events after successful inserting
   * Only called on success path - delegates to putting action
   */
  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getInsertingSharedData(context);
    const modifiedContext = sharedData.modifiedContext;

    if (!modifiedContext) {
      // Shouldn't happen, but handle gracefully
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: InsertingMessages.CANT_INSERT,
        reason: 'cant_insert',
        params: {}
      })];
    }

    // Delegate to putting action's report
    if ('report' in puttingAction && typeof puttingAction.report === 'function') {
      return puttingAction.report(modifiedContext);
    }

    // Shouldn't happen since putting is migrated
    return [];
  },

  /**
   * Generate events when validation fails
   * Called instead of execute/report when validate returns invalid
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const item = context.command.directObject?.entity;
    const container = context.command.indirectObject?.entity;

    return [context.event('action.blocked', {
      actionId: context.action.id,
      messageId: result.error,
      params: {
        ...result.params,
        item: item?.name,
        container: container?.name
      }
    })];
  }
};
