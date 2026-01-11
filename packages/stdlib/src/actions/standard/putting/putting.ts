/**
 * Putting action - put objects in containers or on supporters
 *
 * This action handles putting objects into containers or onto supporters.
 * It determines the appropriate preposition based on the target's traits.
 *
 * Uses four-phase pattern:
 * 1. validate: Check item and destination exist and are compatible
 * 2. execute: Delegate to ContainerBehavior or SupporterBehavior
 * 3. blocked: Generate error events when validation fails
 * 4. report: Generate success events with put data
 *
 * Supports multi-object commands:
 * - "put all in box" - puts all carried items in box
 * - "put all but X in box" - puts all except specified items
 * - "put X and Y in box" - puts multiple specified items
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, ContainerBehavior, SupporterBehavior, OpenableBehavior, IAddItemResult, IAddItemToSupporterResult, IFEntity } from '@sharpee/world-model';
import { captureEntitySnapshot } from '../../base/snapshot-utils';
import { IFActions } from '../../constants';
import { PuttingMessages } from './putting-messages';

// Import types
import { getPuttingSharedData, PuttingSharedData, PuttingItemResult } from './putting-types';

// Import multi-object helpers
import { isMultiObjectCommand, expandMultiObject } from '../../../helpers/multi-object-handler';

// ============================================================================
// Helper Functions (standalone to avoid `this` issues in object literal)
// ============================================================================

/**
 * Determine the target preposition based on preposition text and target type
 */
function determineTargetPreposition(
  preposition: string | undefined,
  target: IFEntity
): { targetPreposition: 'in' | 'on'; error?: string; params?: Record<string, unknown> } {
  const isContainer = target.has(TraitType.CONTAINER);
  const isSupporter = target.has(TraitType.SUPPORTER);

  if (preposition) {
    // User specified a preposition
    if ((preposition === 'in' || preposition === 'into' || preposition === 'inside') && isContainer) {
      return { targetPreposition: 'in' };
    } else if ((preposition === 'on' || preposition === 'onto') && isSupporter) {
      return { targetPreposition: 'on' };
    } else {
      // Mismatched preposition
      if (preposition === 'in' || preposition === 'into' || preposition === 'inside') {
        return {
          targetPreposition: 'in',
          error: PuttingMessages.NOT_CONTAINER,
          params: { destination: target.name }
        };
      } else {
        return {
          targetPreposition: 'on',
          error: PuttingMessages.NOT_SURFACE,
          params: { destination: target.name }
        };
      }
    }
  } else {
    // Auto-determine based on target type (prefer container over supporter)
    if (isContainer) {
      return { targetPreposition: 'in' };
    } else if (isSupporter) {
      return { targetPreposition: 'on' };
    } else {
      return {
        targetPreposition: 'in',
        error: PuttingMessages.NOT_CONTAINER,
        params: { destination: target.name }
      };
    }
  }
}

/**
 * Validate putting a single entity into/onto target
 */
function validateSingleEntity(
  context: ActionContext,
  item: IFEntity,
  target: IFEntity,
  preposition: string | undefined
): ValidationResult & { targetPreposition?: 'in' | 'on' } {
  // Prevent putting something inside/on itself
  if (item.id === target.id) {
    const messageId = preposition === 'on' ? PuttingMessages.CANT_PUT_ON_ITSELF : PuttingMessages.CANT_PUT_IN_ITSELF;
    return {
      valid: false,
      error: messageId,
      params: { item: item.name }
    };
  }

  // Check if item is already in/on target
  if (context.world.getLocation(item.id) === target.id) {
    const relation = target.has(TraitType.SUPPORTER) ? 'on' : 'in';
    return {
      valid: false,
      error: PuttingMessages.ALREADY_THERE,
      params: {
        item: item.name,
        relation: relation,
        destination: target.name
      }
    };
  }

  // Determine the target preposition
  const { targetPreposition, error, params } = determineTargetPreposition(preposition, target);
  if (error) {
    return { valid: false, error, params };
  }

  // Container-specific checks
  if (targetPreposition === 'in') {
    // Check if container is open
    if (target.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(target)) {
      return {
        valid: false,
        error: PuttingMessages.CONTAINER_CLOSED,
        params: { container: target.name }
      };
    }

    // Check capacity
    if (!ContainerBehavior.canAccept(target, item, context.world)) {
      return {
        valid: false,
        error: PuttingMessages.NO_ROOM,
        params: { container: target.name }
      };
    }
  }

  // Supporter-specific checks
  if (targetPreposition === 'on') {
    if (!SupporterBehavior.canAccept(target, item, context.world)) {
      return {
        valid: false,
        error: PuttingMessages.NO_SPACE,
        params: { surface: target.name }
      };
    }
  }

  return { valid: true, targetPreposition };
}

/**
 * Validate a multi-object command (put all in box, put X and Y on table)
 */
function validateMultiObject(context: ActionContext): ValidationResult {
  const target = context.command.indirectObject?.entity;
  const preposition = context.command.parsed.structure.preposition?.text;

  // Must have a destination
  if (!target) {
    return { valid: false, error: PuttingMessages.NO_DESTINATION };
  }

  // For putting, scope is 'carried' - only put things we're holding
  const items = expandMultiObject(context, { scope: 'carried' });

  if (items.length === 0) {
    return { valid: false, error: PuttingMessages.NOTHING_TO_PUT };
  }

  // Validate each entity, store results
  const results: PuttingItemResult[] = items.map(item => {
    const validation = validateSingleEntity(context, item.entity, target, preposition);
    return {
      entity: item.entity,
      success: validation.valid,
      error: validation.valid ? undefined : validation.error,
      errorParams: validation.valid ? undefined : validation.params,
      targetPreposition: validation.targetPreposition
    };
  });

  // Store results for execute/report phases
  const sharedData = getPuttingSharedData(context);
  sharedData.multiObjectResults = results;

  // Valid if at least one can be put
  const anySuccess = results.some(r => r.success);
  if (!anySuccess) {
    // All failed - return the first error
    return { valid: false, error: results[0].error, params: results[0].errorParams };
  }

  return { valid: true };
}

/**
 * Execute putting a single entity
 */
function executeSingleEntity(
  context: ActionContext,
  item: IFEntity,
  target: IFEntity,
  result: PuttingItemResult,
  targetPreposition: 'in' | 'on'
): void {
  result.targetPreposition = targetPreposition;

  // Delegate to appropriate behavior
  if (targetPreposition === 'in') {
    const putResult: IAddItemResult = ContainerBehavior.addItem(target, item, context.world);
    result.putResult = putResult;
  } else {
    const putResult: IAddItemToSupporterResult = SupporterBehavior.addItem(target, item, context.world);
    result.putResult = putResult;
  }

  // Actually move the item to the target
  context.world.moveEntity(item.id, target.id);
}

/**
 * Generate success events for putting a single entity
 */
function reportSingleSuccess(
  context: ActionContext,
  item: IFEntity,
  target: IFEntity,
  result: PuttingItemResult,
  events: ISemanticEvent[]
): void {
  const targetPreposition = result.targetPreposition as 'in' | 'on';

  if (targetPreposition === 'in') {
    events.push(context.event('if.event.put_in', {
      itemId: item.id,
      targetId: target.id,
      preposition: 'in' as const,
      itemSnapshot: captureEntitySnapshot(item, context.world, true),
      targetSnapshot: captureEntitySnapshot(target, context.world, true)
    }));

    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: PuttingMessages.PUT_IN,
      params: { item: item.name, container: target.name }
    }));
  } else {
    events.push(context.event('if.event.put_on', {
      itemId: item.id,
      targetId: target.id,
      preposition: 'on' as const,
      itemSnapshot: captureEntitySnapshot(item, context.world, true),
      targetSnapshot: captureEntitySnapshot(target, context.world, true)
    }));

    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: PuttingMessages.PUT_ON,
      params: { item: item.name, surface: target.name }
    }));
  }
}

/**
 * Generate blocked event for a single entity that couldn't be put
 */
function reportSingleBlocked(
  context: ActionContext,
  item: IFEntity,
  target: IFEntity,
  error: string,
  errorParams: Record<string, unknown> | undefined,
  events: ISemanticEvent[]
): void {
  events.push(context.event('action.blocked', {
    actionId: context.action.id,
    messageId: error,
    params: { ...errorParams, item: item.name, destination: target.name }
  }));
}

// ============================================================================
// Action Definition
// ============================================================================

export const puttingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.PUTTING,

  // Default scope requirements for this action's slots
  defaultScope: {
    item: ScopeLevel.CARRIED,
    target: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'no_destination',
    'not_held',
    'not_container',
    'not_surface',
    'container_closed',
    'already_there',
    'put_in',
    'put_on',
    'cant_put_in_itself',
    'cant_put_on_itself',
    'no_room',
    'no_space',
    'nothing_to_put'
  ],
  group: 'object_manipulation',

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: true,
    directObjectScope: ScopeLevel.CARRIED,
    indirectObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    // Check for multi-object command
    if (isMultiObjectCommand(context)) {
      return validateMultiObject(context);
    }

    // Single object validation
    const item = context.command.directObject?.entity;
    const target = context.command.indirectObject?.entity;
    const preposition = context.command.parsed.structure.preposition?.text;

    // Validate we have an item
    if (!item) {
      return { valid: false, error: PuttingMessages.NO_TARGET };
    }

    // Validate we have a destination
    if (!target) {
      return {
        valid: false,
        error: PuttingMessages.NO_DESTINATION,
        params: { item: item.name }
      };
    }

    // Item must be carried (or implicitly takeable)
    // This enables "put apple in box" when apple is on the ground
    const carryCheck = context.requireCarriedOrImplicitTake(item);
    if (!carryCheck.ok) {
      return carryCheck.error!;
    }

    return validateSingleEntity(context, item, target, preposition);
  },

  execute(context: ActionContext): void {
    const sharedData = getPuttingSharedData(context);
    const target = context.command.indirectObject!.entity!;
    const preposition = context.command.parsed.structure.preposition?.text;

    // Check for multi-object command
    if (sharedData.multiObjectResults) {
      // Determine target preposition once for the batch
      const { targetPreposition } = determineTargetPreposition(preposition, target);

      // Execute for each successful validation
      for (const result of sharedData.multiObjectResults) {
        if (result.success) {
          executeSingleEntity(context, result.entity, target, result, targetPreposition);
        }
      }
      return;
    }

    // Single object execution
    const item = context.command.directObject!.entity!;

    // Determine the target preposition
    const { targetPreposition } = determineTargetPreposition(preposition, target);

    // Store data for report phase
    sharedData.targetPreposition = targetPreposition;

    // Delegate to appropriate behavior
    if (targetPreposition === 'in') {
      const result: IAddItemResult = ContainerBehavior.addItem(target, item, context.world);
      sharedData.putResult = result;
    } else {
      const result: IAddItemToSupporterResult = SupporterBehavior.addItem(target, item, context.world);
      sharedData.putResult = result;
    }

    // Actually move the item to the target
    context.world.moveEntity(item.id, target.id);
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getPuttingSharedData(context);
    const target = context.command.indirectObject!.entity!;
    const events: ISemanticEvent[] = [];

    // Prepend any implicit take events (from requireCarriedOrImplicitTake)
    if (context.sharedData.implicitTakeEvents) {
      events.push(...context.sharedData.implicitTakeEvents);
    }

    // Check for multi-object command
    if (sharedData.multiObjectResults) {
      // Generate events for each item (success and failure)
      for (const result of sharedData.multiObjectResults) {
        if (result.success) {
          reportSingleSuccess(context, result.entity, target, result, events);
        } else {
          reportSingleBlocked(context, result.entity, target, result.error!, result.errorParams, events);
        }
      }
      return events;
    }

    // Single object report
    const item = context.command.directObject!.entity!;
    const targetPreposition = sharedData.targetPreposition as 'in' | 'on';

    if (targetPreposition === 'in') {
      events.push(context.event('if.event.put_in', {
        itemId: item.id,
        targetId: target.id,
        preposition: 'in' as const,
        itemSnapshot: captureEntitySnapshot(item, context.world, true),
        targetSnapshot: captureEntitySnapshot(target, context.world, true)
      }));

      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: PuttingMessages.PUT_IN,
        params: { item: item.name, container: target.name }
      }));
    } else {
      events.push(context.event('if.event.put_on', {
        itemId: item.id,
        targetId: target.id,
        preposition: 'on' as const,
        itemSnapshot: captureEntitySnapshot(item, context.world, true),
        targetSnapshot: captureEntitySnapshot(target, context.world, true)
      }));

      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: PuttingMessages.PUT_ON,
        params: { item: item.name, surface: target.name }
      }));
    }

    return events;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const item = context.command.directObject?.entity;
    const target = context.command.indirectObject?.entity;

    return [context.event('action.blocked', {
      actionId: context.action.id,
      messageId: result.error,
      params: {
        ...result.params,
        item: item?.name,
        destination: target?.name
      }
    })];
  }
};
