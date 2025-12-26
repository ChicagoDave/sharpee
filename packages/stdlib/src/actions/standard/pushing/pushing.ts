/**
 * Pushing action - push objects, buttons, or move heavy items
 *
 * This action handles pushing objects, which can result in:
 * - Moving heavy scenery objects
 * - Activating buttons or switches
 * - Revealing hidden passages
 * - General pushing feedback
 *
 * Uses three-phase pattern:
 * 1. validate: Check if target exists and is pushable
 * 2. execute: Toggle switchable state if applicable, store data
 * 3. report: Generate events for output
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, PushableTrait, SwitchableTrait, SwitchableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope/types';
import { PushedEventData } from './pushing-events';
import { handleReportErrors } from '../../base/report-helpers';

/**
 * Shared data passed between execute and report phases
 */
interface PushingSharedData {
  targetId: string;
  targetName: string;
  direction?: string;
  pushType?: 'button' | 'heavy' | 'moveable';
  // For button types
  activated?: boolean;
  willToggle?: boolean;
  currentState?: boolean;
  newState?: boolean;
  sound?: string;
  // For heavy/moveable
  moved?: boolean;
  moveDirection?: string;
  nudged?: boolean;
  revealsPassage?: boolean;
  requiresStrength?: number;
  // Message data
  messageId: string;
  messageParams: Record<string, any>;
}

function getPushingSharedData(context: ActionContext): PushingSharedData {
  return context.sharedData as PushingSharedData;
}

export const pushingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.PUSHING,
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
  },

  /**
   * Report phase - generates all events after successful execution
   */
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    const errorEvents = handleReportErrors(context, validationResult, executionError);
    if (errorEvents) return errorEvents;

    const events: ISemanticEvent[] = [];
    const sharedData = getPushingSharedData(context);

    // Build event data from sharedData
    const eventData: PushedEventData = {
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
    };

    // Emit the PUSHED event for world model
    events.push(context.event('if.event.pushed', eventData));

    // Add success message
    events.push(context.event('action.success', {
      actionId: this.id,
      messageId: sharedData.messageId,
      params: sharedData.messageParams
    }));

    return events;
  },

  group: "device_manipulation"
};
