/**
 * Tying action — tie, fasten or attach a held thing to an anchor
 * (ADR-373 D6).
 *
 * `tie <item> to <anchor>` takes the item if it is not held (the implicit
 * take putting uses), then fastens it: the item moves to wherever the anchor
 * is and is attached to it, tied and detachable, so taking it refuses until
 * it is untied or pulled free. Anything can be tied to anything but a
 * person or itself.
 *
 * Uses four-phase pattern:
 * 1. validate: both nouns present; the anchor is not the item or a person;
 *    the item is held or can be taken
 * 2. execute: move the item beside the anchor and attach it
 * 3. blocked: a refusal or a story's veto
 * 4. report: emits if.event.tied
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `tyingLifecycle`: the item and the anchor are both
 * consultable, each naming the other as its counterpart (ADR-372 D1), so
 * `on the player tying to the cleat` in the line's block is sayable.
 *
 * Public interface: tyingAction, tyingLifecycle, TiedEventData.
 * Owner context: stdlib / standard actions / object manipulation
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import { TraitType, AttachedBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { ActionLifecycleDescriptor, blockedMessageId } from '../../lifecycle/index.js';

/** Payload of `if.event.tied`. */
export interface TiedEventData {
  itemId: string;
  itemName: string;
  anchorId: string;
  anchorName: string;
}

/**
 * Interceptor surface (ADR-228): the thing tied (direct object) and the
 * anchor (indirect object), in that order.
 */
export const tyingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.TYING,
  reportEventType: 'if.event.tied',
  blockedEventType: 'if.event.tie_blocked',
  slots: [
    {
      id: 'item',
      actionIds: [IFActions.TYING],
      resolve: (ctx) => ctx.command.directObject?.entity,
      counterpart: (ctx) => ctx.command.indirectObject?.entity,
      seedData: (ctx, entity) => ({
        itemId: entity.id,
        itemName: entity.name,
        anchorId: ctx.command.indirectObject?.entity?.id,
        anchorName: ctx.command.indirectObject?.entity?.name
      })
    },
    {
      id: 'anchor',
      actionIds: [IFActions.TYING],
      resolve: (ctx) => ctx.command.indirectObject?.entity,
      counterpart: (ctx) => ctx.command.directObject?.entity,
      seedData: (ctx, entity) => ({
        itemId: ctx.command.directObject?.entity?.id,
        itemName: ctx.command.directObject?.entity?.name,
        anchorId: entity.id,
        anchorName: entity.name
      })
    }
  ]
};

export const tyingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.TYING,

  defaultScope: {
    item: ScopeLevel.REACHABLE,
    anchor: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'no_anchor',
    'self',
    'not_to_people',
    'tied'
  ],

  group: 'object_manipulation',

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE,
    indirectObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    const item = context.command.directObject?.entity;
    const anchor = context.command.indirectObject?.entity;
    if (!item) {
      return { valid: false, error: 'no_target' };
    }
    if (!anchor) {
      return { valid: false, error: 'no_anchor', params: { item: nounPhraseFor(item) } };
    }
    if (anchor.id === item.id) {
      return { valid: false, error: 'self', params: { item: nounPhraseFor(item) } };
    }
    if (anchor.has(TraitType.ACTOR)) {
      return { valid: false, error: 'not_to_people', params: { item: nounPhraseFor(item), anchor: nounPhraseFor(anchor) } };
    }
    // Held, or taken on the way (the implicit take also refuses a thing
    // that is itself tied down)
    const carryCheck = context.requireCarriedOrImplicitTake(item);
    if (!carryCheck.ok) {
      return carryCheck.error!;
    }
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const item = context.command.directObject!.entity!;
    const anchor = context.command.indirectObject!.entity!;
    // The item goes where the anchor is: tied to the railing, it hangs
    // from the railing, not from the player's hand
    const anchorLocation = context.world.getLocation(anchor.id);
    if (anchorLocation) {
      context.world.moveEntity(item.id, anchorLocation);
    }
    AttachedBehavior.attach(item, anchor.id, 'tied', true);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const item = context.command.directObject?.entity;
    const anchor = context.command.indirectObject?.entity;
    return [context.event('if.event.tie_blocked', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      // params carry EntityInfo for the formatter chain (ADR-158)
      params: {
        ...result.params,
        item: item ? nounPhraseFor(item) : undefined,
        anchor: anchor ? nounPhraseFor(anchor) : undefined
      },
      reason: result.error,
      itemId: item?.id,
      anchorId: anchor?.id
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const item = context.command.directObject!.entity!;
    const anchor = context.command.indirectObject!.entity!;
    const events: ISemanticEvent[] = [];
    if (context.sharedData.implicitTakeEvents) {
      events.push(...context.sharedData.implicitTakeEvents);
    }
    events.push(context.event('if.event.tied', {
      messageId: `${context.action.id}.tied`,
      params: { item: nounPhraseFor(item), anchor: nounPhraseFor(anchor) },
      itemId: item.id,
      itemName: item.name,
      anchorId: anchor.id,
      anchorName: anchor.name
    } satisfies TiedEventData & { messageId: string; params: Record<string, unknown> }));
    return events;
  }
};
