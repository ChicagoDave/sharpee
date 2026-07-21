/**
 * Pulling action - pull objects that have the PULLABLE trait
 *
 * This is a minimal action that validates pulling is possible
 * and emits an event. Story authors handle specific pulling logic.
 *
 * Uses four-phase pattern:
 * 1. validate: Check if target is pullable and not already pulled
 * 2. execute: Update pullable state, store data in sharedData
 * 3. blocked: Generate events when validation fails
 * 4. report: Generate success events
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `pullingLifecycle` — no hand-rolled hook plumbing.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, PullableTrait, WearableTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { PulledEventData } from './pulling-events.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
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
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the pulled target is the only consultable
 * entity of a PULL command.
 */
export const pullingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.PULLING,
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
  pullCount: number;
  pullType?: 'lever' | 'cord' | 'attached' | 'heavy';
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
    'nothing_happens',
    'already_pulled'
  ],

  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity;

    // Must have something to pull
    if (!target) {
      return { valid: false, error: 'no_target' };
    }

    const state = resolveLifecycle(context, pullingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    // Check scope - must be able to reach the target
    const scopeCheck = context.requireScope(target, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Check if object is pullable
    if (!target.has(TraitType.PULLABLE)) {
      return { valid: false, error: 'cant_pull_that', params: { target: nounPhraseFor(target) } };
    }

    // Can't pull worn items
    if (target.has(TraitType.WEARABLE)) {
      const wearable = target.getTrait(WearableTrait);
      if (wearable?.isWorn) {
        return { valid: false, error: 'worn', params: { target: nounPhraseFor(target) } };
      }
    }

    // Check state of pullable
    const pullable = target.get(TraitType.PULLABLE) as PullableTrait;
    if (pullable.state === 'pulled') {
      return { valid: false, error: 'already_pulled', params: { target: nounPhraseFor(target) } };
    }

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

    return { valid: true };
  },

  /**
   * Execute the pull action - performs mutations only
   * Assumes validation has already passed
   */
  execute(context: ActionContext): void {
    const target = context.command.directObject!.entity!;
    const pullable = target.get(TraitType.PULLABLE) as PullableTrait;
    const sharedData = getPullingSharedData(context);

    // Store data for report phase (before mutation)
    sharedData.targetId = target.id;
    sharedData.targetName = target.name;
    sharedData.pullCount = pullable.pullCount || 0;
    sharedData.pullType = pullable.pullType;

    // Perform the mutation
    pullable.state = 'pulled';
    pullable.pullCount = (pullable.pullCount || 0) + 1;

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
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

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.pulled', result.error);
    }

    return events;
  },

  /**
   * Report phase - generates all events after successful execution
   */
  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getPullingSharedData(context);
    const target = context.command.directObject?.entity;

    // Emit pulled event with messageId for text rendering
    events.push(context.event('if.event.pulled', {
      messageId: `${context.action.id}.pulled`,
      // params carry EntityInfo for the formatter chain (ADR-158)
      params: { target: target ? nounPhraseFor(target) : { name: sharedData.targetName } },
      target: sharedData.targetId,
      targetName: sharedData.targetName,
      pullCount: sharedData.pullCount,
      pullType: sharedData.pullType
    }));

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.pulled');

    return events;
  }
};
