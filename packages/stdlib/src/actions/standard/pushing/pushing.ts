/**
 * Pushing action - push objects, buttons, or move heavy items
 * 
 * This action handles pushing objects, which can result in:
 * - Moving heavy scenery objects
 * - Activating buttons or switches
 * - Revealing hidden passages
 * - General pushing feedback
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, PushableTrait, SwitchableTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { PushedEventData } from './pushing-events';

export const pushingAction: Action = {
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

  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    const direction = context.command.parsed.extras?.direction as string;

    // Must have something to push
    if (!target) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_target',
        reason: 'no_target'
      })];
    }

    // Check if target is visible
    if (!context.canSee(target)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_visible',
        reason: 'not_visible',
        params: { target: target.name }
      })];
    }

    // Check if target is reachable
    if (!context.canReach(target)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_reachable',
        reason: 'not_reachable',
        params: { target: target.name }
      })];
    }

    // Can't push worn items
    if (target.has(TraitType.WEARABLE)) {
      const wearableLocation = context.world.getLocation(target.id);
      if (wearableLocation === actor.id) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'wearing_it',
        reason: 'wearing_it',
        params: { target: target.name }
      })];
      }
    }

    // Check if object is pushable
    if (!target.has(TraitType.PUSHABLE)) {
      // Not pushable - check if it's fixed scenery
      if (target.has(TraitType.SCENERY)) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'fixed_in_place',
        reason: 'fixed_in_place',
        params: { target: target.name }
      })];
      }
      // Regular non-pushable object
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'pushing_does_nothing',
        reason: 'pushing_does_nothing',
        params: { target: target.name }
      })];
    }

    // Get pushable trait data
    const pushableTraitData = target.get(TraitType.PUSHABLE);
    if (!pushableTraitData) {
      // This shouldn't happen since we checked has(PUSHABLE), but TypeScript needs this
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'pushing_does_nothing',
        reason: 'pushing_does_nothing',
        params: { target: target.name }
      })];
    }
    const pushableTrait = pushableTraitData as PushableTrait;

    // Initialize event data
    const eventData: PushedEventData = {
      target: target.id,
      targetName: target.name,
      direction: direction,
      pushType: pushableTrait.pushType
    };

    const params: Record<string, any> = {
      target: target.name,
      direction: direction
    };

    let messageId: string;

    // Handle based on push type
    switch (pushableTrait.pushType) {
      case 'button':
        // Buttons activate when pushed
        eventData.activated = true;

        // Check if it's also switchable
        if (target.has(TraitType.SWITCHABLE)) {
          const switchableData = target.get(TraitType.SWITCHABLE);
          if (switchableData) {
            const switchable = switchableData as SwitchableTrait;
            eventData.willToggle = true;
            eventData.currentState = switchable.isOn;
            eventData.newState = !switchable.isOn;
            params.newState = switchable.isOn ? 'off' : 'on';
          }

          // Choose message based on whether it has BUTTON trait
          if (target.has(TraitType.BUTTON)) {
            messageId = 'button_clicks';
          } else {
            messageId = 'switch_toggled';
          }
        } else {
          // Non-switchable button
          messageId = 'button_pushed';
        }

        // Add push sound if specified
        if (pushableTrait.pushSound) {
          eventData.sound = pushableTrait.pushSound;
        }
        break;

      case 'heavy':
        // Heavy objects might require strength
        if (pushableTrait.requiresStrength) {
          eventData.requiresStrength = pushableTrait.requiresStrength;
          params.requiresStrength = pushableTrait.requiresStrength;

          // For now, assume player has enough strength
          // TODO: Add strength checking when player traits are implemented
        }

        if (direction) {
          eventData.moved = true;
          eventData.moveDirection = direction;
          messageId = 'pushed_with_effort';
        } else {
          eventData.moved = false;
          eventData.nudged = true;
          messageId = 'wont_budge';
        }
        break;

      case 'moveable':
        // Moveable objects can be pushed around
        if (direction) {
          eventData.moved = true;
          eventData.moveDirection = direction;

          // Check if pushing reveals a passage
          if (pushableTrait.revealsPassage) {
            eventData.revealsPassage = true;
            messageId = 'reveals_passage';
          } else {
            messageId = 'pushed_direction';
          }
        } else {
          eventData.moved = false;
          eventData.nudged = true;
          messageId = 'pushed_nudged';
        }

        // Add push sound if specified
        if (pushableTrait.pushSound) {
          eventData.sound = pushableTrait.pushSound;
        }
        break;

      default:
        // Fallback for unknown push types
        messageId = 'pushing_does_nothing';
        break;
    }

    // Create events
    const events: SemanticEvent[] = [];

    // Create the PUSHED event for world model
    events.push(context.event('if.event.pushed', eventData));

    // Create minimal message params based on message type
    const finalMessageParams: Record<string, any> = {};

    // Only include the parameters needed for each specific message
    switch (messageId) {
      case 'button_clicks':
      case 'button_pushed':
        finalMessageParams.target = target.name;
        break;
      case 'switch_toggled':
        finalMessageParams.target = target.name;
        finalMessageParams.newState = params.newState;
        break;
      case 'pushed_direction':
      case 'reveals_passage':
        finalMessageParams.target = target.name;
        finalMessageParams.direction = direction;
        break;
      case 'pushed_with_effort':
        finalMessageParams.target = target.name;
        if (direction) {
          finalMessageParams.direction = direction;
        }
        break;
      case 'too_heavy':
        finalMessageParams.target = target.name;
        if (params.requiresStrength) {
          finalMessageParams.requiresStrength = params.requiresStrength;
        }
        break;
      default:
        finalMessageParams.target = target.name;
        break;
    }

    // Add success message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: finalMessageParams
      }));

    return events;
  },

  group: "device_manipulation"
};
