/**
 * Stealing Action — take an item out of another actor's possession (ADR-328 D5)
 *
 * Run by the thief through the engine's execution entry; there is no
 * player grammar for it. Validates that the item is held by an actor who
 * stands in the same room as the thief; moves it; reports the pipeline's
 * own fact — `if.event.taken` with `fromLocation` naming the victim — so
 * act detection and any handler see a theft exactly as they would a take.
 * The behavior narrates the theft itself (Dungeo's own line); a refused
 * theft narrates nothing.
 *
 * Public interface: stealingAction.
 * Owner context: Dungeo / actions
 */

import { type Action, type ActionContext, type ValidationResult } from '@sharpee/stdlib';
import { type ISemanticEvent } from '@sharpee/core';
import { TraitType, type IFEntity } from '@sharpee/world-model';
import { STEAL_ACTION_ID, StealMessages } from './types';

interface StealingSharedData {
  itemId?: string;
  fromId?: string;
}

/** The actor holding the item, if any. */
function holderOf(context: ActionContext, item: IFEntity): IFEntity | undefined {
  const holderId = context.world.getLocation(item.id);
  const holder = holderId ? context.world.getEntity(holderId) : undefined;
  return holder && holder.has(TraitType.ACTOR) ? holder : undefined;
}

export const stealingAction: Action = {
  id: STEAL_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const item = context.command.directObject?.entity;
    if (!item) {
      return { valid: false, error: StealMessages.NO_TARGET };
    }

    const holder = holderOf(context, item);
    if (!holder || holder.id === context.actor.id) {
      return { valid: false, error: StealMessages.NOT_HELD };
    }

    const thiefRoom = context.world.getContainingRoom(context.actor.id)?.id;
    const victimRoom = context.world.getContainingRoom(holder.id)?.id;
    if (!thiefRoom || thiefRoom !== victimRoom) {
      return { valid: false, error: StealMessages.NOT_HERE };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const item = context.command.directObject!.entity!;
    const sharedData = context.sharedData as StealingSharedData;
    sharedData.itemId = item.id;
    sharedData.fromId = context.world.getLocation(item.id);
    context.world.moveEntity(item.id, context.actor.id);
  },

  report(context: ActionContext): ISemanticEvent[] {
    const item = context.command.directObject!.entity!;
    const sharedData = context.sharedData as StealingSharedData;
    // The pipeline's own fact, with the victim as the prior holder. No
    // messageId: the behavior narrates the theft in Dungeo's words.
    return [
      context.event('if.event.taken', {
        item: item.name,
        itemId: item.id,
        actorId: context.actor.id,
        fromLocation: sharedData.fromId,
      }),
    ];
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    // Silent refusal: a thwarted theft is the thief's problem, not prose.
    return [
      context.event('if.event.take_blocked', {
        item: context.command.directObject?.entity?.name,
        itemId: context.command.directObject?.entity?.id,
        reason: result.error,
        blocked: true,
      }),
    ];
  },
};
