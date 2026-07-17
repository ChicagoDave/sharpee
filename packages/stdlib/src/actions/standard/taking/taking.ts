/**
 * Taking action - picks up objects
 *
 * Uses four-phase pattern:
 * 1. validate: Check object can be taken (not scenery, not self, etc.)
 * 2. execute: Transfer the item to actor's inventory
 * 3. report: Generate success events with item and container snapshots
 * 4. blocked: Generate error events when validation fails
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228): `takingLifecycle` declares the interceptor surface and
 * the engine owns hook order, veto semantics, and multi-object per-item
 * lifecycles. This file contains no hand-rolled hook plumbing.
 *
 * Supports multi-object commands:
 * - "take all" - takes all portable reachable items
 * - "take all but X" - takes all except specified items
 * - "take X and Y" - takes multiple specified items
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, SceneryBehavior, ActorBehavior, WearableBehavior, ContainerBehavior, IdentityBehavior, IFEntity, IdentityTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope/types';
import { TakingMessages } from './taking-messages';
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
  runMultiObjectValidate,
  getMultiObjectLifecycle,
  runMultiObjectExecute,
  runMultiObjectReport,
  blockedMessageId
} from '../../lifecycle';

// Import type guards and typed interfaces
import {
  isWearableTrait,
  hasCapacityLimit,
  getTakingSharedData,
  TakingItemScratch
} from './taking-types';

// Import multi-object helpers
import { isMultiObjectCommand, expandMultiObject } from '../../../helpers/multi-object-handler';

/**
 * Interceptor surface (ADR-228): the taken item is the only consultable
 * entity of a TAKE command.
 */
export const takingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.TAKING,
  slots: [
    {
      id: 'item',
      actionIds: [IFActions.TAKING],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

// ============================================================================
// Helper Functions (standalone to avoid `this` issues in object literal)
// ============================================================================

/**
 * Standard validation for taking a single entity (no interceptor logic —
 * the lifecycle engine wraps this with pre/postValidate hooks).
 */
function validateSingleEntity(context: ActionContext, noun: IFEntity): ValidationResult {
  const actor = context.player;

  // Check scope - must be able to reach the item
  const scopeCheck = context.requireScope(noun, ScopeLevel.REACHABLE);
  if (!scopeCheck.ok) {
    return scopeCheck.error!;
  }

  // Can't take yourself
  if (noun.id === actor.id) {
    return { valid: false, error: TakingMessages.CANT_TAKE_SELF };
  }

  // Check if already holding the item
  const currentLocation = context.world.getLocation(noun.id);
  if (currentLocation === actor.id) {
    return {
      valid: false,
      error: TakingMessages.ALREADY_HAVE,
      params: { item: nounPhraseFor(noun) }
    };
  }

  // Can't take rooms (business rule)
  if (noun.has(TraitType.ROOM)) {
    return {
      valid: false,
      error: TakingMessages.CANT_TAKE_ROOM,
      params: { item: nounPhraseFor(noun) }
    };
  }

  // Can't take scenery (fixed in place)
  if (noun.has(TraitType.SCENERY)) {
    const customMessage = SceneryBehavior.getCantTakeMessage(noun);
    return {
      valid: false,
      error: customMessage || TakingMessages.FIXED_IN_PLACE,
      params: { item: nounPhraseFor(noun) }
    };
  }

  // Use ActorBehavior to validate capacity constraints
  if (!ActorBehavior.canTakeItem(actor, noun, context.world)) {
    // Check if it's a container capacity issue
    if (actor.has(TraitType.CONTAINER)) {
      const containerTrait = actor.get(TraitType.CONTAINER);
      if (hasCapacityLimit(containerTrait)) {
        // Check item count limit
        if (containerTrait.capacity.maxItems !== undefined) {
          const contents = context.world.getContents(actor.id);
          const currentCount = contents.filter((item: any) => {
            if (!item.has || !item.has(TraitType.WEARABLE)) {
              return true;
            }
            const wearableTrait = item.get(TraitType.WEARABLE);
            return !isWearableTrait(wearableTrait) || !(wearableTrait.isWorn ?? wearableTrait.worn);
          }).length;
          if (currentCount >= containerTrait.capacity.maxItems) {
            return { valid: false, error: TakingMessages.CONTAINER_FULL };
          }
        }

        // Check weight limit
        if (containerTrait.capacity.maxWeight !== undefined) {
          const currentWeight = ContainerBehavior.getTotalWeight(actor, context.world);
          const itemWeight = IdentityBehavior.getWeight(noun);
          if (currentWeight + itemWeight > containerTrait.capacity.maxWeight) {
            return { valid: false, error: TakingMessages.TOO_HEAVY };
          }
        }
      }
    }

    // Otherwise generic failure
    return {
      valid: false,
      error: TakingMessages.CANNOT_TAKE,
      params: { item: nounPhraseFor(noun) }
    };
  }

  return { valid: true };
}

/**
 * Execute taking a single entity. Mutation results (previous location,
 * implicit worn-removal) are written into `scratch` — the single-object
 * sharedData or the item's multi-object itemData.
 */
function executeSingleEntity(
  context: ActionContext,
  noun: IFEntity,
  scratch: TakingItemScratch
): void {
  const actor = context.player;

  // Capture context BEFORE any mutations
  const previousLocation = context.world.getLocation(noun.id);
  scratch.previousLocation = previousLocation;

  // Check if item is worn and needs to be removed first
  if (noun.has(TraitType.WEARABLE)) {
    const wearableTrait = noun.get(TraitType.WEARABLE);
    if (isWearableTrait(wearableTrait) && (wearableTrait.isWorn ?? wearableTrait.worn)) {
      // Mark that we implicitly removed a worn item
      scratch.implicitlyRemoved = true;
      scratch.wasWorn = true;

      // Get the wearer (the one who has the item currently)
      const wearer = previousLocation ? context.world.getEntity(previousLocation) : null;
      // Remove the worn status
      if (wearer) {
        WearableBehavior.remove(noun, wearer);
      }
    }
  }

  // Perform the actual move
  context.world.moveEntity(noun.id, actor.id);

  // Score points for taking items with points value (ADR-129)
  const identity = noun.getTrait(IdentityTrait);
  if (identity?.points) {
    context.world.awardScore(
      noun.id,
      identity.points,
      identity.pointsDescription ?? identity.name ?? noun.id
    );
  }
}

/**
 * Generate success events for taking a single entity
 *
 * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
 * Text-service looks up message from domain event - no separate action.success needed.
 */
function reportSingleSuccess(
  context: ActionContext,
  noun: IFEntity,
  scratch: TakingItemScratch,
  events: ISemanticEvent[],
  isMultiObject: boolean = false
): void {
  const actor = context.player;

  // Check if we implicitly removed a worn item
  if (scratch.implicitlyRemoved) {
    const previousLocation = scratch.previousLocation;
    const container = previousLocation ? context.world.getEntity(previousLocation) : null;

    events.push(context.event('if.event.removed', {
      implicit: true,
      item: noun.name,
      container: container?.name
    }));
  }

  // Determine if taken from a container/supporter
  const previousLocation = scratch.previousLocation;
  const isFromContainerOrSupporter = previousLocation &&
    previousLocation !== context.world.getLocation(actor.id);

  // Get container name for message
  const containerEntity = previousLocation ? context.world.getEntity(previousLocation) : null;

  // Determine message ID based on context
  let messageKey: string;
  if (isMultiObject) {
    messageKey = TakingMessages.TAKEN_MULTI;
  } else if (isFromContainerOrSupporter) {
    messageKey = TakingMessages.TAKEN_FROM;
  } else {
    messageKey = TakingMessages.TAKEN;
  }

  // Build rendering params: entity-valued keys carry EntityInfo so the
  // formatter chain (`{the:cap:item}`, etc.) can pick the right article.
  // See ADR-158.
  const params = {
    item: nounPhraseFor(noun),
    itemId: noun.id,
    actor: actor.name,
    actorId: actor.id,
    previousLocation: scratch.previousLocation,
    container: containerEntity ? nounPhraseFor(containerEntity) : ''
  };

  // Emit domain event with messageId (simplified pattern - ADR-097).
  // Top-level fields are domain data (strings) for event-sourcing handlers;
  // params carries EntityInfo for template rendering.
  events.push(context.event('if.event.taken', {
    messageId: `${context.action.id}.${messageKey}`,
    params,
    item: noun.name,
    itemId: noun.id,
    actor: actor.name,
    actorId: actor.id,
    previousLocation: scratch.previousLocation,
    container: containerEntity?.name || ''
  }));
}

/**
 * Generate blocked event for a single entity that couldn't be taken
 *
 * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
 */
function reportSingleBlocked(
  context: ActionContext,
  noun: IFEntity,
  result: ValidationResult,
  events: ISemanticEvent[]
): void {
  events.push(context.event('if.event.take_blocked', {
    // Rendering data — EntityInfo for the formatter chain (ADR-158)
    messageId: blockedMessageId(context, result),
    params: { ...result.params, item: nounPhraseFor(noun) },
    // Domain data — strings for handlers
    item: noun.name,
    itemId: noun.id,
    reason: result.error
  }));
}

// ============================================================================
// Action Definition
// ============================================================================

export const takingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.TAKING,

  // Default scope requirements for this action's slots
  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'cant_take_self',
    'already_have',
    'cant_take_room',
    'fixed_in_place',
    'container_full',
    'too_heavy',
    'taken',
    'taken_from',
    'nothing_to_take'
  ],

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    // Check for multi-object command — full per-item lifecycle (ADR-228 D4)
    if (isMultiObjectCommand(context)) {
      const playerId = context.player.id;
      const items = expandMultiObject(context, {
        scope: 'reachable',
        // Filter out items already carried by the player
        filter: (entity, world) => world.getLocation(entity.id) !== playerId
      }).map(i => i.entity);

      if (items.length === 0) {
        return { valid: false, error: TakingMessages.NOTHING_TO_TAKE };
      }

      const results = runMultiObjectValidate(
        context, takingLifecycle, 'item', items,
        (ctx, item) => validateSingleEntity(ctx, item)
      );

      // Valid if at least one can be taken; all-fail returns the first error
      if (!results.some(r => r.success)) {
        return { valid: false, error: results[0].error, errorQualified: results[0].errorQualified, params: results[0].errorParams };
      }
      return { valid: true };
    }

    // Single object validation
    const noun = context.command.directObject?.entity;
    if (!noun) {
      return { valid: false, error: TakingMessages.NO_TARGET };
    }

    const state = resolveLifecycle(context, takingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    const standard = validateSingleEntity(context, noun);
    if (!standard.valid) return standard;

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Multi-object command: per-item execute + postExecute hooks (D4)
    const multi = getMultiObjectLifecycle(context);
    if (multi) {
      runMultiObjectExecute(context, multi, (ctx, item, itemData) => {
        executeSingleEntity(ctx, item, itemData as TakingItemScratch);
      });
      return;
    }

    // Single object execution
    const noun = context.command.directObject!.entity!;
    executeSingleEntity(context, noun, getTakingSharedData(context));

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];

    // Multi-object command: per-item success/blocked events + hooks (D4)
    const multi = getMultiObjectLifecycle(context);
    if (multi) {
      // Use compact format when multiple items
      const isMultiObject = multi.length > 1;
      runMultiObjectReport(
        context, multi, events, 'if.event.taken', 'if.event.take_blocked',
        (ctx, item, itemData, evts) => {
          reportSingleSuccess(ctx, item, itemData as TakingItemScratch, evts, isMultiObject);
        },
        (ctx, item, itemResult, evts) => {
          reportSingleBlocked(ctx, item, itemResult, evts);
        }
      );
      return events;
    }

    // Single object report
    const noun = context.command.directObject!.entity!;
    reportSingleSuccess(context, noun, getTakingSharedData(context), events, false);

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.taken');
    return events;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    // blocked() is called when validation fails
    // Uses simplified event pattern (ADR-097)
    const noun = context.command.directObject?.entity;

    const events: ISemanticEvent[] = [context.event('if.event.take_blocked', {
      // Rendering data — EntityInfo for the formatter chain (ADR-158)
      messageId: blockedMessageId(context, result),
      params: {
        ...result.params,
        item: noun ? nounPhraseFor(noun) : undefined
      },
      // Domain data — strings for handlers
      item: noun?.name,
      itemId: noun?.id,
      reason: result.error
    })];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) {
        // Single-object path: notify all consultations (ADR-228 D2/D3)
        runOnBlocked(context, state, events, 'if.event.take_blocked', result.error);
      } else {
        // Multi-object all-fail path: the blocked event carries the FIRST
        // failed item's error, so only that item's consultations are
        // notified here — the other items produced no events for hooks to
        // decorate. (Partial failures are handled per item in report().)
        const multi = getMultiObjectLifecycle(context);
        const first = multi?.[0];
        if (first && !first.success) {
          runOnBlocked(context, first.state, events, 'if.event.take_blocked', first.error ?? result.error);
        }
      }
    }

    return events;
  },

  group: "object_manipulation"
};
