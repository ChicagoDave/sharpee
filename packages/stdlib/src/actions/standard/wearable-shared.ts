/**
 * Shared helpers for wearing and taking_off actions
 * 
 * Centralizes common logic for wearable item manipulation including:
 * - Layering conflict detection
 * - Event data building
 * - Wearable validation helpers
 */

import { ActionContext } from '../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import { IFEntity, TraitType, WearableTrait } from '@sharpee/world-model';
import { nounPhraseFor } from '../../utils/index.js';

/**
 * Context analysis for wearable actions
 */
export interface WearableContext {
  item: IFEntity;
  actor: IFEntity;
  wearableTrait: WearableTrait;
  inventory: IFEntity[];
}

/**
 * Analyzes the wearable context for an action
 */
export function analyzeWearableContext(
  context: ActionContext,
  item: IFEntity,
  actor: IFEntity
): WearableContext {
  const wearableTrait = item.get(TraitType.WEARABLE) as WearableTrait;
  const inventory = context.world.getContents(actor.id);
  
  return {
    item,
    actor,
    wearableTrait,
    inventory
  };
}

/** How a worn item stands in the way of wearing another on the same body part. */
export type WearingConflictKind =
  /** Same part, same layer — the part is taken. */
  | 'same-layer'
  /** Same part, the worn item is a higher layer — the new one would go under it. */
  | 'under-outer';

/** A worn item that refuses the wearing, and why. */
export interface WearingConflict {
  item: IFEntity;
  kind: WearingConflictKind;
}

/**
 * The worn wearables in the actor's inventory other than `item`, with their traits.
 */
function wornOthers(
  item: IFEntity,
  inventory: IFEntity[]
): Array<{ entity: IFEntity; wearable: WearableTrait }> {
  const worn: Array<{ entity: IFEntity; wearable: WearableTrait }> = [];
  for (const other of inventory) {
    if (other.id === item.id) continue;
    const wearable = other.getTrait(WearableTrait);
    if (wearable?.worn) worn.push({ entity: other, wearable });
  }
  return worn;
}

/**
 * Checks for body-part and layering conflicts when wearing an item.
 *
 * A simple wearable (no placement) never conflicts. A placed one conflicts
 * with a worn item on the same body part at the same layer, and cannot go on
 * under a worn item of a higher layer on that part.
 *
 * @returns the conflicting worn item and the kind of conflict, or null
 */
export function checkWearingConflicts(
  wearableContext: WearableContext
): WearingConflict | null {
  const { item, wearableTrait, inventory } = wearableContext;
  const placement = wearableTrait.placement;
  if (!placement) return null;

  for (const { entity, wearable } of wornOthers(item, inventory)) {
    const other = wearable.placement;
    if (!other || other.bodyPart !== placement.bodyPart) continue;
    if (other.layer === placement.layer) return { item: entity, kind: 'same-layer' };
    if (other.layer > placement.layer) return { item: entity, kind: 'under-outer' };
  }

  return null;
}

/**
 * Checks for items blocking removal due to layering: a worn item of a higher
 * layer on the same body part. A simple wearable is never blocked.
 *
 * @returns the blocking worn item, or null
 */
export function checkRemovalBlockers(
  wearableContext: WearableContext
): IFEntity | null {
  const { item, wearableTrait, inventory } = wearableContext;
  const placement = wearableTrait.placement;
  if (!placement) return null;

  for (const { entity, wearable } of wornOthers(item, inventory)) {
    const other = wearable.placement;
    if (other && other.bodyPart === placement.bodyPart && other.layer > placement.layer) {
      return entity;
    }
  }

  return null;
}

/**
 * Builds event parameters including body part and layer info
 */
export function buildWearableEventParams(
  item: IFEntity,
  wearableTrait: WearableTrait
): Record<string, unknown> {
  // params carry EntityInfo for the formatter chain (ADR-158)
  const params: Record<string, unknown> = {
    item: nounPhraseFor(item)
  };
  
  if (wearableTrait.placement) {
    params.bodyPart = wearableTrait.placement.bodyPart;
    params.layer = wearableTrait.placement.layer;
  }

  return params;
}

/**
 * Creates a blocked event for wearable actions
 *
 * Uses domain event pattern (ADR-097): event carries messageId directly.
 */
export function createWearableBlockedEvent(
  context: ActionContext,
  messageId: string,
  reason: string,
  params?: Record<string, unknown>
): ISemanticEvent {
  const eventType = context.action.id === 'if.action.wearing'
    ? 'if.event.wear_blocked'
    : 'if.event.take_off_blocked';
  return context.event(eventType, {
    messageId: `${context.action.id}.${messageId}`,
    params: params || {},
    reason
  });
}

/**
 * Creates a success event for wearable actions
 *
 * Uses domain event pattern (ADR-097): event carries messageId directly.
 */
export function createWearableSuccessEvent(
  context: ActionContext,
  messageId: string,
  params: Record<string, unknown>
): ISemanticEvent {
  const eventType = context.action.id === 'if.action.wearing'
    ? 'if.event.worn'
    : 'if.event.removed';
  return context.event(eventType, {
    messageId: `${context.action.id}.${messageId}`,
    params
  });
}

/**
 * Checks if an item is currently worn by the actor
 */
export function isWornByActor(
  item: IFEntity,
  actor: IFEntity
): boolean {
  if (!item.has(TraitType.WEARABLE)) return false;
  
  const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
  return wearable.worn && wearable.wornBy === actor.id;
}

/**
 * Checks if an item refuses to come off once worn (a cursed ring, a welded
 * collar): the trait's own `canRemove` flag, false.
 */
export function hasRemovalRestrictions(
  wearableTrait: WearableTrait
): boolean {
  return !wearableTrait.canRemove;
}