/**
 * Pushing action - push objects, buttons, or move heavy items
 *
 * This action handles pushing objects, which can result in:
 * - Moving heavy scenery objects
 * - Activating buttons or switches
 * - Revealing hidden passages
 * - General pushing feedback
 *
 * Uses four-phase pattern with interceptor support (ADR-118):
 * 1. validate: preValidate hook → standard checks → postValidate hook
 * 2. execute: standard mutation → postExecute hook
 * 3. blocked: onBlocked hook (if validation failed)
 * 4. report: standard events → postReport hook (additional effects)
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  PushableTrait,
  SwitchableTrait,
  SwitchableBehavior,
  getInterceptorForAction,
  InterceptorSharedData
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope/types';
import { PushedEventData } from './pushing-events';
import { getPushingSharedData, PushingSharedData } from './pushing-types';

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
    const sharedData = getPushingSharedData(context);

    // Must have something to push
    if (!target) {
      return {
        valid: false,
        error: 'no_target'
      };
    }

    // Check for interceptor on the target entity (ADR-118)
    const interceptorResult = getInterceptorForAction(target, IFActions.PUSHING);
    const interceptor = interceptorResult?.interceptor;
    const interceptorData: InterceptorSharedData = {
      targetId: target.id,
      targetName: target.name
    };

    // Store for later phases
    sharedData.interceptor = interceptor;
    sharedData.interceptorData = interceptorData;

    // === PRE-VALIDATE HOOK ===
    // Called before standard validation - can block early
    if (interceptor?.preValidate) {
      const result = interceptor.preValidate(target, context.world, actor.id, interceptorData);
      if (result !== null) {
        return {
          valid: result.valid,
          error: result.error,
          params: result.params
        };
      }
    }

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

    // === POST-VALIDATE HOOK ===
    // Called after standard validation passes - can add entity-specific conditions
    if (interceptor?.postValidate) {
      const result = interceptor.postValidate(target, context.world, actor.id, interceptorData);
      if (result !== null) {
        return {
          valid: result.valid,
          error: result.error,
          params: result.params
        };
      }
    }

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

          sharedData.messageParams.target = target.name;
          sharedData.messageParams.newState = sharedData.newState ? 'on' : 'off';
        } else {
          // Non-switchable button
          sharedData.messageId = 'button_pushed';
          sharedData.messageParams.target = target.name;
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
          sharedData.messageParams.target = target.name;
          sharedData.messageParams.direction = direction;
        } else {
          sharedData.moved = false;
          sharedData.nudged = true;
          sharedData.messageId = 'wont_budge';
          sharedData.messageParams.target = target.name;
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

          sharedData.messageParams.target = target.name;
          sharedData.messageParams.direction = direction;
        } else {
          sharedData.moved = false;
          sharedData.nudged = true;
          sharedData.messageId = 'pushed_nudged';
          sharedData.messageParams.target = target.name;
        }

        // Add push sound if specified
        if (pushableTrait.pushSound) {
          sharedData.sound = pushableTrait.pushSound;
        }
        break;

      default:
        // Fallback for unknown push types
        sharedData.messageId = 'pushing_does_nothing';
        sharedData.messageParams.target = target.name;
        break;
    }

    // === POST-EXECUTE HOOK ===
    // Called after standard execution - can perform additional mutations
    const interceptor = sharedData.interceptor;
    const interceptorData = sharedData.interceptorData || {};
    if (interceptor?.postExecute) {
      interceptor.postExecute(target, context.world, context.player.id, interceptorData);
    }
  },

  /**
   * Generate events when validation fails
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    const sharedData = getPushingSharedData(context);

    // === ON-BLOCKED HOOK ===
    // Called when action is blocked - can provide custom blocked handling
    const interceptor = sharedData.interceptor;
    const interceptorData = sharedData.interceptorData || {};
    if (interceptor?.onBlocked && target && result.error) {
      const customEffects = interceptor.onBlocked(target, context.world, context.player.id, result.error, interceptorData);
      if (customEffects !== null) {
        // Interceptor provided custom blocked effects
        return customEffects.map(effect => context.event(effect.type, effect.payload));
      }
    }

    // Standard blocked handling
    return [context.event('if.event.pushed', {
      blocked: true,
      messageId: `${context.action.id}.${result.error}`,
      params: { target: target?.name, ...result.params },
      reason: result.error,
      targetId: target?.id,
      targetName: target?.name
    })];
  },

  /**
   * Report phase - generates all events after successful execution
   */
  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getPushingSharedData(context);
    const target = context.command.directObject!.entity!;

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

    // === POST-REPORT HOOK ===
    // Called after standard report - can add additional effects
    const interceptor = sharedData.interceptor;
    const interceptorData = sharedData.interceptorData || {};
    if (interceptor?.postReport) {
      const additionalEffects = interceptor.postReport(target, context.world, context.player.id, interceptorData);
      // Convert CapabilityEffects to ISemanticEvents
      for (const effect of additionalEffects) {
        events.push(context.event(effect.type, effect.payload));
      }
    }

    return events;
  },

  group: "device_manipulation"
};
