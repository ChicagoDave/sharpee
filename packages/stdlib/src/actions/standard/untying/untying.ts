/**
 * Untying action — untie a tied thing (ADR-373 D6).
 *
 * `untie <item>` (or `untie <item> from <anchor>`) frees a thing that was
 * tied: its attachment is cleared and it stays where it is, ready to take.
 * Only a tied attachment unties; a thing glued, nailed or otherwise
 * `attached to` something refuses as not tied (pulling is how a detachable
 * one comes free).
 *
 * Uses four-phase pattern:
 * 1. validate: the item is tied, to the named anchor when one is named
 * 2. execute: detach it through AttachedBehavior
 * 3. blocked: a refusal or a story's veto
 * 4. report: emits if.event.untied
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `untyingLifecycle`: the item is the one consultable
 * entity.
 *
 * Public interface: untyingAction, untyingLifecycle, UntiedEventData.
 * Owner context: stdlib / standard actions / object manipulation
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import { TraitType, AttachedBehavior, AttachedTrait, type IFEntity } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { ActionLifecycleDescriptor, blockedMessageId } from '../../lifecycle/index.js';

/** Payload of `if.event.untied`. */
export interface UntiedEventData {
  itemId: string;
  itemName: string;
  anchorId?: string;
}

/** Shared data between execute and report. */
interface UntyingSharedData {
  anchorId?: string;
}

/**
 * Whether the entity is held by a tied attachment.
 * @param entity The entity to test
 * @returns true when attached and the attachment type is `tied`
 */
function isTied(entity: IFEntity): boolean {
  return AttachedBehavior.isAttached(entity) &&
    entity.get<AttachedTrait>(TraitType.ATTACHED)!.attachmentType === 'tied';
}

/**
 * Interceptor surface (ADR-228): the thing untied is the only consultable
 * entity.
 */
export const untyingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.UNTYING,
  reportEventType: 'if.event.untied',
  blockedEventType: 'if.event.untie_blocked',
  slots: [
    {
      id: 'item',
      actionIds: [IFActions.UNTYING],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

export const untyingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.UNTYING,

  defaultScope: {
    item: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'not_tied',
    'untied'
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
    if (!item) {
      return { valid: false, error: 'no_target' };
    }
    const scopeCheck = context.requireScope(item, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }
    const named = context.command.indirectObject?.entity;
    if (!isTied(item) || (named && AttachedBehavior.anchorOf(item) !== named.id)) {
      return { valid: false, error: 'not_tied', params: { item: nounPhraseFor(item) } };
    }
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const item = context.command.directObject!.entity!;
    (context.sharedData as UntyingSharedData).anchorId = AttachedBehavior.detach(item).anchorId;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const item = context.command.directObject?.entity;
    return [context.event('if.event.untie_blocked', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      // params carry EntityInfo for the formatter chain (ADR-158)
      params: { ...result.params, item: item ? nounPhraseFor(item) : undefined },
      reason: result.error,
      itemId: item?.id
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const item = context.command.directObject!.entity!;
    const anchorId = (context.sharedData as UntyingSharedData).anchorId;
    const anchor = anchorId ? context.world.getEntity(anchorId) : undefined;
    return [context.event('if.event.untied', {
      messageId: `${context.action.id}.untied`,
      params: { item: nounPhraseFor(item), anchor: anchor ? nounPhraseFor(anchor) : undefined },
      itemId: item.id,
      itemName: item.name,
      anchorId
    } satisfies UntiedEventData & { messageId: string; params: Record<string, unknown> })];
  }
};
