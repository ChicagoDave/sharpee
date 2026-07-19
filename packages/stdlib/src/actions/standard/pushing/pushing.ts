/**
 * Pushing action - push objects, buttons, or move heavy items
 *
 * This action handles pushing objects, which can result in:
 * - Moving heavy scenery objects
 * - Activating buttons or switches
 * - Revealing hidden passages
 * - General pushing feedback
 *
 * Uses four-phase pattern:
 * 1. validate: Check target exists and is pushable
 * 2. execute: Perform push-type-specific mutations
 * 3. blocked: Generate error events when validation fails
 * 4. report: Generate success events
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `pushingLifecycle` — no hand-rolled hook plumbing.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  PushableTrait,
  SwitchableTrait,
  SwitchableBehavior
} from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ScopeLevel } from '../../../scope/types.js';
import { PushedEventData } from './pushing-events.js';
import { getPushingSharedData, PushingSharedData } from './pushing-types.js';
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
 * Interceptor surface (ADR-228): the pushed target is the only
 * consultable entity of a PUSH command.
 */
export const pushingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.PUSHING,
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.PUSHING],
      resolve: (ctx) => ctx.command.directObject?.entity,
      // Context the old hand-rolled wiring seeded — kept for story
      // interceptors outside this repo (ADR-228 D3 symmetric-context).
      seedData: (_ctx, entity) => ({
        targetId: entity.id,
        targetName: entity.name
      })
    }
  ]
};

export const pushingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.PUSHING,

  // Default scope requirements for this action's slots
  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'not_visible',
    'not_reachable',
    'too_heavy',
    'wearing_it',
    'button_pushed',
    'button_clicks',
    'switch_toggled',
    'pushed_direction',
    'pushed_nudged',
    'pushed_with_effort',
    'reveals_passage',
    'wont_budge',
    'pushing_does_nothing',
    'fixed_in_place'
  ],

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const target = context.command.directObject?.entity;

    // Must have something to push
    if (!target) {
      return {
        valid: false,
        error: 'no_target'
      };
    }

    const state = resolveLifecycle(context, pushingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    // Check scope - must be able to reach the target
    const scopeCheck = context.requireScope(target, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Can't push worn items
    if (target.has(TraitType.WEARABLE)) {
      const wearableLocation = context.world.getLocation(target.id);
      if (wearableLocation === actor.id) {
        return {
          valid: false,
          error: 'wearing_it'
        };
      }
    }

    // Check if object is pushable
    if (!target.has(TraitType.PUSHABLE)) {
      // Not pushable - check if it's fixed scenery
      if (target.has(TraitType.SCENERY)) {
        return {
          valid: false,
          error: 'fixed_in_place'
        };
      }
      // Regular non-pushable object
      return {
        valid: false,
        error: 'pushing_does_nothing'
      };
    }

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

    return { valid: true };
  },

  /**
   * Execute the push action - performs mutations only
   * Assumes validation has already passed
   */
  execute(context: ActionContext): void {
    const target = context.command.directObject!.entity!;
    const direction = context.command.parsed.extras?.direction as string;
    const sharedData = getPushingSharedData(context);

    // Store basic info
    sharedData.targetId = target.id;
    sharedData.targetName = target.name;
    sharedData.direction = direction;
    sharedData.messageParams = {};

    const pushableTrait = target.get(TraitType.PUSHABLE) as PushableTrait;
    sharedData.pushType = pushableTrait.pushType;

    // Handle based on push type
    switch (pushableTrait.pushType) {
      case 'button':
        sharedData.activated = true;

        // Check if it's also switchable - perform world mutation
        if (target.has(TraitType.SWITCHABLE)) {
          const switchable = target.get(TraitType.SWITCHABLE) as SwitchableTrait;
          sharedData.willToggle = true;
          sharedData.currentState = switchable.isOn;
          sharedData.newState = !switchable.isOn;

          // Perform the toggle (world mutation)
          SwitchableBehavior.toggle(target);

          // Choose message based on whether it has BUTTON trait
          if (target.has(TraitType.BUTTON)) {
            sharedData.messageId = 'button_clicks';
          } else {
            sharedData.messageId = 'switch_toggled';
          }

          sharedData.messageParams.target = nounPhraseFor(target);
          sharedData.messageParams.newState = sharedData.newState ? 'on' : 'off';
        } else {
          // Non-switchable button
          sharedData.messageId = 'button_pushed';
          sharedData.messageParams.target = nounPhraseFor(target);
        }

        // Add push sound if specified
        if (pushableTrait.pushSound) {
          sharedData.sound = pushableTrait.pushSound;
        }
        break;

      case 'heavy':
        // Heavy objects might require strength
        if (pushableTrait.requiresStrength) {
          sharedData.requiresStrength = pushableTrait.requiresStrength;
        }

        if (direction) {
          sharedData.moved = true;
          sharedData.moveDirection = direction;
          sharedData.messageId = 'pushed_with_effort';
          sharedData.messageParams.target = nounPhraseFor(target);
          sharedData.messageParams.direction = direction;
        } else {
          sharedData.moved = false;
          sharedData.nudged = true;
          sharedData.messageId = 'wont_budge';
          sharedData.messageParams.target = nounPhraseFor(target);
        }
        break;

      case 'moveable':
        // Moveable objects can be pushed around
        if (direction) {
          sharedData.moved = true;
          sharedData.moveDirection = direction;

          // Check if pushing reveals a passage
          if (pushableTrait.revealsPassage) {
            sharedData.revealsPassage = true;
            sharedData.messageId = 'reveals_passage';
          } else {
            sharedData.messageId = 'pushed_direction';
          }

          sharedData.messageParams.target = nounPhraseFor(target);
          sharedData.messageParams.direction = direction;
        } else {
          sharedData.moved = false;
          sharedData.nudged = true;
          sharedData.messageId = 'pushed_nudged';
          sharedData.messageParams.target = nounPhraseFor(target);
        }

        // Add push sound if specified
        if (pushableTrait.pushSound) {
          sharedData.sound = pushableTrait.pushSound;
        }
        break;

      default:
        // Fallback for unknown push types
        sharedData.messageId = 'pushing_does_nothing';
        sharedData.messageParams.target = nounPhraseFor(target);
        break;
    }

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  /**
   * Generate events when validation fails
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;

    // Standard blocked handling — params carry EntityInfo for the
    // formatter chain (ADR-158); top-level fields stay strings for handlers.
    const events: ISemanticEvent[] = [context.event('if.event.pushed', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      params: { target: target ? nounPhraseFor(target) : undefined, ...result.params },
      reason: result.error,
      targetId: target?.id,
      targetName: target?.name
    })];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.pushed', result.error);
    }

    return events;
  },

  /**
   * Report phase - generates all events after successful execution
   */
  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getPushingSharedData(context);

    // Emit pushed event with messageId for text rendering
    events.push(context.event('if.event.pushed', {
      messageId: `${context.action.id}.${sharedData.messageId}`,
      params: sharedData.messageParams,
      target: sharedData.targetId,
      targetName: sharedData.targetName,
      direction: sharedData.direction,
      pushType: sharedData.pushType,
      activated: sharedData.activated,
      willToggle: sharedData.willToggle,
      currentState: sharedData.currentState,
      newState: sharedData.newState,
      sound: sharedData.sound,
      moved: sharedData.moved,
      moveDirection: sharedData.moveDirection,
      nudged: sharedData.nudged,
      revealsPassage: sharedData.revealsPassage,
      requiresStrength: sharedData.requiresStrength
    }));

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.pushed');

    return events;
  },

  group: "device_manipulation"
};
