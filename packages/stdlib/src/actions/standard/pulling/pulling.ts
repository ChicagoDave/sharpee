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
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, PullableTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { PulledEventData } from './pulling-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

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

    // Check scope - must be able to reach the target
    const scopeCheck = context.requireScope(target, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Check if object is pullable
    if (!target.has(TraitType.PULLABLE)) {
      return { valid: false, error: 'cant_pull_that', params: { target: target.name } };
    }

    // Can't pull worn items
    if (target.has(TraitType.WEARABLE)) {
      const wearable = target.get(TraitType.WEARABLE) as any;
      if (wearable?.isWorn) {
        return { valid: false, error: 'worn', params: { target: target.name } };
      }
    }

    // Check state of pullable
    const pullable = target.get(TraitType.PULLABLE) as PullableTrait;
    if (pullable.state === 'pulled') {
      return { valid: false, error: 'already_pulled', params: { target: target.name } };
    }

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
  },

  /**
   * Generate events when validation fails
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    return [context.event('if.event.pull_blocked', {
      blocked: true,
      messageId: `${context.action.id}.${result.error}`,
      reason: result.error,
      targetId: target?.id,
      targetName: target?.name,
      ...result.params
    })];
  },

  /**
   * Report phase - generates all events after successful execution
   */
  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getPullingSharedData(context);

    // Emit pulled event with messageId for text rendering
    events.push(context.event('if.event.pulled', {
      messageId: `${context.action.id}.pulled`,
      target: sharedData.targetId,
      targetName: sharedData.targetName,
      pullCount: sharedData.pullCount,
      pullType: sharedData.pullType
    }));

    return events;
  }
};
