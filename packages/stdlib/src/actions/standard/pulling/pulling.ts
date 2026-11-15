/**
 * Pulling action — pull a thing that says it can be pulled, or pull an
 * attached thing free.
 *
 * Pulling has no standard meaning: what a pull does is the thing's own
 * interceptor to say. So a thing can be pulled when it carries the marker
 * (`PullableTrait`) or when an interceptor claims the pull for it, as
 * turning and the other implementation-dispatching verbs read it (ADR-371
 * D1a); a Chord `on the player pulling` clause is such an interceptor. A
 * pull succeeds every time it is tried (GH #706: the action once latched
 * the trait to `pulled` and refused every pull after the first, and
 * refused a thing whose only say was its clause). An attached thing
 * comes free if it is detachable and otherwise won't budge, pullable or
 * not (ADR-373 D1).
 *
 * Uses four-phase pattern:
 * 1. validate: target, reach, attachment, the marker or a claiming
 *    interceptor, not worn
 * 2. execute: detach an attached thing; a plain pull mutates nothing
 * 3. blocked: the refusal event
 * 4. report: the pulled event, or the detached event
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `pullingLifecycle` — no hand-rolled hook plumbing.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import { TraitType, WearableTrait, AttachedBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { PulledEventData } from './pulling-events.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { hasInterceptorImplementation } from '../dispatch-shared.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the pulled target is the only consultable
 * entity of a PULL command.
 */
export const pullingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.PULLING,
  reportEventType: 'if.event.pulled',
  blockedEventType: 'if.event.pulled',
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.PULLING],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

/**
 * Shared data passed between execute and report phases
 */
interface PullingSharedData {
  targetId: string;
  targetName: string;
  /** Set when the pull freed an attached thing (ADR-373 D1) */
  detachedFrom?: string;
}

function getPullingSharedData(context: ActionContext): PullingSharedData {
  return context.sharedData as PullingSharedData;
}

export const pullingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.PULLING,

  // Default scope requirements for this action's slots
  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  group: "interaction",

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'not_visible',
    'not_reachable',
    'cant_pull_that',
    'worn',
    'pulled',
    'detached',
    'wont_budge'
  ],

  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity;

    // Must have something to pull
    if (!target) {
      return { valid: false, error: 'no_target' };
    }

    // Check scope - must be able to reach the target
    const scopeCheck = context.requireScope(target, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // An attached thing comes free if it is detachable and otherwise won't
    // budge, pullable or not (ADR-373 D1)
    if (AttachedBehavior.isAttached(target)) {
      if (!AttachedBehavior.isDetachable(target)) {
        return { valid: false, error: 'wont_budge', params: { target: nounPhraseFor(target) } };
      }
      return { valid: true };
    }

    // A thing can be pulled when it says so (the marker) or when it says
    // what a pull does: an interceptor that claims it, as for the verbs
    // with no standard meaning (ADR-371 D1a).
    if (!target.has(TraitType.PULLABLE) && !hasInterceptorImplementation(context.world, target, IFActions.PULLING)) {
      return { valid: false, error: 'cant_pull_that', params: { target: nounPhraseFor(target) } };
    }

    // Can't pull worn items
    if (target.has(TraitType.WEARABLE)) {
      const wearable = target.getTrait(WearableTrait);
      if (wearable?.isWorn) {
        return { valid: false, error: 'worn', params: { target: nounPhraseFor(target) } };
      }
    }

    return { valid: true };
  },

  /**
   * Execute the pull: an attached thing is detached; a plain pull changes
   * nothing itself and leaves the outcome to the thing's interceptors.
   * Assumes validation has already passed.
   */
  execute(context: ActionContext): void {
    const target = context.command.directObject!.entity!;
    const sharedData = getPullingSharedData(context);

    // Pulling an attached thing frees it and moves nothing else
    if (AttachedBehavior.isAttached(target)) {
      sharedData.targetId = target.id;
      sharedData.targetName = target.name;
      sharedData.detachedFrom = AttachedBehavior.detach(target).anchorId;
      return;
    }

    sharedData.targetId = target.id;
    sharedData.targetName = target.name;
  },

  /**
   * Generate events when validation fails
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    const events: ISemanticEvent[] = [context.event('if.event.pulled', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      // params carry EntityInfo for the formatter chain (ADR-158);
      // top-level fields stay strings for handlers.
      params: { target: target ? nounPhraseFor(target) : undefined, ...result.params },
      reason: result.error,
      targetId: target?.id,
      targetName: target?.name
    })];

    return events;
  },

  /**
   * Report phase - generates all events after successful execution
   */
  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getPullingSharedData(context);
    const target = context.command.directObject?.entity;

    if (sharedData.detachedFrom) {
      const anchor = context.world.getEntity(sharedData.detachedFrom);
      events.push(context.event('if.event.detached', {
        messageId: `${context.action.id}.detached`,
        // params carry EntityInfo for the formatter chain (ADR-158)
        params: {
          target: target ? nounPhraseFor(target) : { name: sharedData.targetName },
          anchor: anchor ? nounPhraseFor(anchor) : undefined
        },
        targetId: sharedData.targetId,
        targetName: sharedData.targetName,
        anchorId: sharedData.detachedFrom
      }));
      return events;
    }

    // Emit pulled event with messageId for text rendering
    events.push(context.event('if.event.pulled', {
      messageId: `${context.action.id}.pulled`,
      // params carry EntityInfo for the formatter chain (ADR-158)
      params: { target: target ? nounPhraseFor(target) : { name: sharedData.targetName } },
      target: sharedData.targetId,
      targetName: sharedData.targetName
    }));

    return events;
  }
};
