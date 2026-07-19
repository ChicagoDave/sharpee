/**
 * Putting action - put objects in containers or on supporters
 *
 * This action handles putting objects into containers or onto supporters.
 * It determines the appropriate preposition based on the target's traits.
 *
 * Uses four-phase pattern with interceptor support (ADR-118):
 * 1. validate: preValidate hook → standard checks → postValidate hook
 * 2. execute: standard mutation → postExecute hook
 * 3. blocked: onBlocked hook (if validation failed)
 * 4. report: standard events → postReport hook (additional effects)
 *
 * Supports multi-object commands:
 * - "put all in box" - puts all carried items in box
 * - "put all but X in box" - puts all except specified items
 * - "put X and Y in box" - puts multiple specified items
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  ContainerBehavior,
  SupporterBehavior,
  OpenableBehavior,
  IAddItemResult,
  IAddItemToSupporterResult,
  IFEntity
} from '@sharpee/world-model';
import { captureEntitySnapshot } from '../../base/snapshot-utils.js';
import { IFActions } from '../../constants.js';
import { PuttingMessages } from './putting-messages.js';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked,
  runMultiObjectValidate,
  getMultiObjectLifecycle,
  runMultiObjectExecute,
  runMultiObjectReport,
  blockedMessageId
} from '../../lifecycle/index.js';

// Import types
import { getPuttingSharedData, PuttingItemScratch } from './putting-types.js';

// Import multi-object helpers
import { isMultiObjectCommand, expandMultiObject } from '../../../helpers/multi-object-handler.js';
import { nounPhraseFor } from '../../../utils/index.js';

/**
 * Interceptor surface (ADR-228): BOTH the item and the container/supporter
 * are consulted (D3-B order: direct object first). Each side's sharedData
 * is seeded with the other's identity (D3 sub-ruling — symmetric context);
 * in a multi-object command the container's seed carries the item
 * currently being processed, which is what makes the trophy-case
 * postExecute award score once per deposited treasure (D4).
 */
export const puttingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.PUTTING,
  slots: [
    {
      id: 'item',
      actionIds: [IFActions.PUTTING],
      resolve: (ctx) => ctx.command.directObject?.entity,
      seedData: (ctx, entity) => ({
        itemId: entity.id,
        itemName: entity.name,
        targetId: ctx.command.indirectObject?.entity?.id,
        targetName: ctx.command.indirectObject?.entity?.name,
        preposition: ctx.command.parsed.structure.preposition?.text
      })
    },
    {
      id: 'container',
      actionIds: [IFActions.PUTTING],
      resolve: (ctx) => ctx.command.indirectObject?.entity,
      seedData: (ctx, entity, multiObjectItem) => {
        const item = multiObjectItem ?? ctx.command.directObject?.entity;
        return {
          itemId: item?.id,
          itemName: item?.name,
          targetId: entity.id,
          targetName: entity.name,
          preposition: ctx.command.parsed.structure.preposition?.text
        };
      }
    }
  ]
};

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

  // `move X to Y` (ADR-230 D4, Phase 1 move ruling): `to` names no
  // in/on choice — resolve by destination type like the bare form.
  if (preposition === 'to') {
    preposition = undefined;
  }

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
          params: { destination: nounPhraseFor(target) }
        };
      } else {
        return {
          targetPreposition: 'on',
          error: PuttingMessages.NOT_SURFACE,
          params: { destination: nounPhraseFor(target) }
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
        params: { destination: nounPhraseFor(target) }
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
      params: { item: nounPhraseFor(item) }
    };
  }

  // Check if item is already in/on target
  if (context.world.getLocation(item.id) === target.id) {
    const relation = target.has(TraitType.SUPPORTER) ? 'on' : 'in';
    return {
      valid: false,
      error: PuttingMessages.ALREADY_THERE,
      params: {
        item: nounPhraseFor(item),
        relation: relation,
        destination: nounPhraseFor(target)
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
        params: { container: nounPhraseFor(target) }
      };
    }

    // Check capacity
    if (!ContainerBehavior.canAccept(target, item, context.world)) {
      return {
        valid: false,
        error: PuttingMessages.NO_ROOM,
        params: { container: nounPhraseFor(target) }
      };
    }
  }

  // Supporter-specific checks
  if (targetPreposition === 'on') {
    if (!SupporterBehavior.canAccept(target, item, context.world)) {
      return {
        valid: false,
        error: PuttingMessages.NO_SPACE,
        params: { surface: nounPhraseFor(target) }
      };
    }
  }

  return { valid: true, targetPreposition };
}

/**
 * Execute putting a single entity. Mutation results are written into
 * `scratch` — the single-object sharedData or the item's multi-object
 * itemData (ADR-228 D4).
 */
function executeSingleEntity(
  context: ActionContext,
  item: IFEntity,
  target: IFEntity,
  scratch: PuttingItemScratch,
  targetPreposition: 'in' | 'on'
): void {
  scratch.targetPreposition = targetPreposition;

  // Delegate to appropriate behavior
  if (targetPreposition === 'in') {
    const putResult: IAddItemResult = ContainerBehavior.addItem(target, item, context.world);
    scratch.putResult = putResult;
  } else {
    const putResult: IAddItemToSupporterResult = SupporterBehavior.addItem(target, item, context.world);
    scratch.putResult = putResult;
  }

  // Actually move the item to the target
  context.world.moveEntity(item.id, target.id);
}

/**
 * Generate success events for putting a single entity
 *
 * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
 */
function reportSingleSuccess(
  context: ActionContext,
  item: IFEntity,
  target: IFEntity,
  scratch: PuttingItemScratch,
  events: ISemanticEvent[]
): void {
  const targetPreposition = scratch.targetPreposition as 'in' | 'on';

  if (targetPreposition === 'in') {
    const params = { item: nounPhraseFor(item), container: nounPhraseFor(target) };
    events.push(context.event('if.event.put_in', {
      // Rendering data (messageId + params for text-service)
      messageId: `${context.action.id}.${PuttingMessages.PUT_IN}`,
      params,
      // Domain data (for event sourcing / handlers)
      itemId: item.id,
      itemName: item.name,
      targetId: target.id,
      targetName: target.name,
      actorId: context.player.id,
      preposition: 'in' as const,
      itemSnapshot: captureEntitySnapshot(item, context.world, true),
      targetSnapshot: captureEntitySnapshot(target, context.world, true)
    }));
  } else {
    const params = { item: nounPhraseFor(item), surface: nounPhraseFor(target) };
    events.push(context.event('if.event.put_on', {
      // Rendering data (messageId + params for text-service)
      messageId: `${context.action.id}.${PuttingMessages.PUT_ON}`,
      params,
      // Domain data (for event sourcing / handlers)
      itemId: item.id,
      itemName: item.name,
      targetId: target.id,
      targetName: target.name,
      actorId: context.player.id,
      preposition: 'on' as const,
      itemSnapshot: captureEntitySnapshot(item, context.world, true),
      targetSnapshot: captureEntitySnapshot(target, context.world, true)
    }));
  }
}

/**
 * Generate blocked event for a single entity that couldn't be put
 *
 * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
 */
function reportSingleBlocked(
  context: ActionContext,
  item: IFEntity,
  target: IFEntity,
  result: ValidationResult,
  events: ISemanticEvent[]
): void {
  events.push(context.event('if.event.put_blocked', {
    // Rendering data — EntityInfo for the formatter chain (ADR-158)
    messageId: blockedMessageId(context, result),
    params: { ...result.params, item: nounPhraseFor(item), destination: nounPhraseFor(target) },
    // Domain data — strings for handlers
    itemId: item.id,
    itemName: item.name,
    targetId: target.id,
    targetName: target.name,
    reason: result.error
  }));
}

// ============================================================================
// Action Definition
// ============================================================================

export const puttingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.PUTTING,

  // Default scope requirements for this action's slots
  defaultScope: {
    item: ScopeLevel.REACHABLE,  // REACHABLE allows implicit take
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
    directObjectScope: ScopeLevel.REACHABLE,  // REACHABLE allows implicit take
    indirectObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    const target = context.command.indirectObject?.entity;
    const preposition = context.command.parsed.structure.preposition?.text;

    // Check for multi-object command — full per-item lifecycle (ADR-228 D4).
    // This is what fixes the live trophy-case bug: every deposited item
    // now runs the container's hooks.
    if (isMultiObjectCommand(context)) {
      // Must have a destination
      if (!target) {
        return { valid: false, error: PuttingMessages.NO_DESTINATION };
      }

      // For putting, scope is 'carried' - only put things we're holding
      const items = expandMultiObject(context, { scope: 'carried' }).map(i => i.entity);

      if (items.length === 0) {
        return { valid: false, error: PuttingMessages.NOTHING_TO_PUT };
      }

      const results = runMultiObjectValidate(
        context, puttingLifecycle, 'item', items,
        (ctx, item, itemData) => {
          const validation = validateSingleEntity(ctx, item, target, preposition);
          (itemData as PuttingItemScratch).targetPreposition = validation.targetPreposition;
          return validation;
        }
      );

      // Valid if at least one can be put; all-fail returns the first error
      if (!results.some(r => r.success)) {
        return { valid: false, error: results[0].error, errorQualified: results[0].errorQualified, params: results[0].errorParams };
      }
      return { valid: true };
    }

    // Single object validation
    const item = context.command.directObject?.entity;

    // Validate we have an item
    if (!item) {
      return { valid: false, error: PuttingMessages.NO_TARGET };
    }

    // Validate we have a destination
    if (!target) {
      return {
        valid: false,
        error: PuttingMessages.NO_DESTINATION,
        params: { item: nounPhraseFor(item) }
      };
    }

    const state = resolveLifecycle(context, puttingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    // Item must be carried (or implicitly takeable)
    // This enables "put apple in box" when apple is on the ground
    const carryCheck = context.requireCarriedOrImplicitTake(item);
    if (!carryCheck.ok) {
      return carryCheck.error!;
    }

    // Standard validation
    const standardResult = validateSingleEntity(context, item, target, preposition);
    if (!standardResult.valid) {
      return standardResult;
    }

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

    return standardResult;
  },

  execute(context: ActionContext): void {
    const sharedData = getPuttingSharedData(context);
    const target = context.command.indirectObject!.entity!;
    const preposition = context.command.parsed.structure.preposition?.text;

    // Multi-object command: per-item execute + hooks (D4 — the container's
    // postExecute fires once per deposited item)
    const multi = getMultiObjectLifecycle(context);
    if (multi) {
      // Determine target preposition once for the batch
      const { targetPreposition } = determineTargetPreposition(preposition, target);

      runMultiObjectExecute(context, multi, (ctx, item, itemData) => {
        executeSingleEntity(ctx, item, target, itemData as PuttingItemScratch, targetPreposition);
      });
      return;
    }

    // Single object execution
    const item = context.command.directObject!.entity!;

    // Determine the target preposition
    const { targetPreposition } = determineTargetPreposition(preposition, target);

    // Store data for report phase
    executeSingleEntity(context, item, target, sharedData, targetPreposition);

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getPuttingSharedData(context);
    const target = context.command.indirectObject!.entity!;
    const events: ISemanticEvent[] = [];

    // Prepend any implicit take events (from requireCarriedOrImplicitTake)
    if (context.sharedData.implicitTakeEvents) {
      events.push(...context.sharedData.implicitTakeEvents);
    }

    // Multi-object command: per-item success/blocked events + hooks (D4)
    const multi = getMultiObjectLifecycle(context);
    if (multi) {
      const preposition = context.command.parsed.structure.preposition?.text;
      const { targetPreposition } = determineTargetPreposition(preposition, target);
      const primaryEventType = targetPreposition === 'in' ? 'if.event.put_in' : 'if.event.put_on';
      runMultiObjectReport(
        context, multi, events, primaryEventType, 'if.event.put_blocked',
        (ctx, item, itemData, evts) => {
          reportSingleSuccess(ctx, item, target, itemData as PuttingItemScratch, evts);
        },
        (ctx, item, itemResult, evts) => {
          reportSingleBlocked(ctx, item, target, itemResult, evts);
        }
      );
      return events;
    }

    // Single object report
    const item = context.command.directObject!.entity!;
    const targetPreposition = sharedData.targetPreposition as 'in' | 'on';

    // Emit domain event with messageId (simplified pattern - ADR-097)
    if (targetPreposition === 'in') {
      const params = { item: nounPhraseFor(item), container: nounPhraseFor(target) };
      events.push(context.event('if.event.put_in', {
        // Rendering data (messageId + params for text-service)
        messageId: `${context.action.id}.${PuttingMessages.PUT_IN}`,
        params,
        // Domain data (for event sourcing / handlers)
        itemId: item.id,
        itemName: item.name,
        targetId: target.id,
        targetName: target.name,
        actorId: context.player.id,
        preposition: 'in' as const,
        itemSnapshot: captureEntitySnapshot(item, context.world, true),
        targetSnapshot: captureEntitySnapshot(target, context.world, true)
      }));
    } else {
      const params = { item: nounPhraseFor(item), surface: nounPhraseFor(target) };
      events.push(context.event('if.event.put_on', {
        // Rendering data (messageId + params for text-service)
        messageId: `${context.action.id}.${PuttingMessages.PUT_ON}`,
        params,
        // Domain data (for event sourcing / handlers)
        itemId: item.id,
        itemName: item.name,
        targetId: target.id,
        targetName: target.name,
        actorId: context.player.id,
        preposition: 'on' as const,
        itemSnapshot: captureEntitySnapshot(item, context.world, true),
        targetSnapshot: captureEntitySnapshot(target, context.world, true)
      }));
    }

    const state = getLifecycleState(context);
    if (state) {
      const primaryEventType = targetPreposition === 'in' ? 'if.event.put_in' : 'if.event.put_on';
      runPostReport(context, state, events, primaryEventType);
    }

    return events;
  },

  /**
   * Generate events when validation fails
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const item = context.command.directObject?.entity;
    const target = context.command.indirectObject?.entity;

    // Standard blocked handling — EntityInfo for formatter chain (ADR-158)
    const events: ISemanticEvent[] = [context.event('if.event.put_blocked', {
      messageId: blockedMessageId(context, result),
      params: {
        ...result.params,
        item: item ? nounPhraseFor(item) : undefined,
        destination: target ? nounPhraseFor(target) : undefined
      },
      itemId: item?.id,
      itemName: item?.name,
      targetId: target?.id,
      targetName: target?.name,
      reason: result.error
    })];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) {
        // Single-object path: notify all consultations (ADR-228 D2/D3)
        runOnBlocked(context, state, events, 'if.event.put_blocked', result.error);
      } else {
        // Multi-object all-fail path: the blocked event carries the FIRST
        // failed item's error, so only that item's consultations are
        // notified here — the other items produced no events for hooks to
        // decorate. (Partial failures are handled per item in report().)
        const multi = getMultiObjectLifecycle(context);
        const first = multi?.[0];
        if (first && !first.success) {
          runOnBlocked(context, first.state, events, 'if.event.put_blocked', first.error ?? result.error);
        }
      }
    }

    return events;
  }
};
