/**
 * Touching action - touch or feel objects
 *
 * This action allows players to touch objects to discover their
 * texture, temperature, or other tactile properties.
 *
 * Uses four-phase pattern:
 * 1. validate: Check target exists
 * 2. execute: Compute tactile properties (no world mutations)
 * 3. blocked: Generate events when validation fails
 * 4. report: Generate success events
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, IdentityTrait, SwitchableTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { TouchedEventData } from './touching-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

/**
 * Shared data passed between execute and report phases
 */
interface TouchingSharedData {
  targetId?: string;
  targetName?: string;
  messageId?: string;
  eventData?: TouchedEventData;
}

function getTouchingSharedData(context: ActionContext): TouchingSharedData {
  return context.sharedData as TouchingSharedData;
}

export const touchingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.TOUCHING,
  requiredMessages: [
    'no_target',
    'not_visible',
    'not_reachable',
    'feels_normal',
    'feels_warm',
    'feels_hot',
    'feels_cold',
    'feels_soft',
    'feels_hard',
    'feels_smooth',
    'feels_rough',
    'feels_wet',
    'device_vibrating',
    'immovable_object',
    'liquid_container',
    'touched',
    'touched_gently',
    'poked',
    'prodded',
    'patted',
    'stroked'
  ],
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  
  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity;

    // Must have a target to touch
    if (!target) {
      return {
        valid: false,
        error: 'no_target',
        params: {}
      };
    }

    // Scope validation is handled by CommandValidator
    // Tactile property computation happens in execute phase
    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    // Touching has NO world mutations - it's a sensory action
    // Just compute tactile properties and store in sharedData for report phase
    const target = context.command.directObject?.entity!;
    const sharedData = getTouchingSharedData(context);

    // Build event data with tactile properties
    const eventData: TouchedEventData = {
      target: target.id,
      targetName: target.name
    };

    let messageId: string = 'feels_normal';

    // Check various traits for tactile properties

    // Check if it's a light source (might be hot if lit)
    if (target.has(TraitType.LIGHT_SOURCE)) {
      const lightTrait = target.get(TraitType.LIGHT_SOURCE) as { isLit?: boolean };
      if (lightTrait.isLit) {
        eventData.temperature = 'hot';
        eventData.isLit = true;
        messageId = 'feels_hot';
      }
    }

    // Check if it's a device (might be warm if on)
    if (target.has(TraitType.SWITCHABLE) && messageId === 'feels_normal') {
      const switchableTrait = target.get(TraitType.SWITCHABLE) as SwitchableTrait;
      if (switchableTrait.isOn) {
        eventData.temperature = 'warm';
        eventData.isActive = true;

        // Check if it's vibrating (special case for some devices)
        const identity = target.get(TraitType.IDENTITY) as IdentityTrait;
        if (identity?.description?.toLowerCase().includes('vibrat')) {
          messageId = 'device_vibrating';
        } else {
          messageId = 'feels_warm';
        }
      }
    }

    // Determine texture based on traits
    if (target.has(TraitType.WEARABLE)) {
      eventData.texture = 'soft';
      if (messageId === 'feels_normal') {
        messageId = 'feels_soft';
      }
    } else if (target.has(TraitType.DOOR)) {
      eventData.texture = 'smooth';
      eventData.material = 'hard';
      if (messageId === 'feels_normal') {
        messageId = 'feels_smooth';
      }
    } else if (target.has(TraitType.CONTAINER) || target.has(TraitType.SUPPORTER)) {
      eventData.texture = 'solid';

      // Check for liquid contents
      if (target.has(TraitType.CONTAINER)) {
        const contents = context.world.getContents(target.id);
        const hasLiquid = contents.some(item => {
          if (item.has(TraitType.EDIBLE)) {
            const edibleTrait = item.get(TraitType.EDIBLE) as { isDrink?: boolean };
            return edibleTrait.isDrink;
          }
          return false;
        });

        if (hasLiquid) {
          messageId = 'liquid_container';
        }
      }

      if (messageId === 'feels_normal') {
        messageId = 'feels_hard';
      }
    } else if (target.has(TraitType.EDIBLE)) {
      const edibleTrait = target.get(TraitType.EDIBLE) as { isDrink?: boolean };
      if (edibleTrait.isDrink) {
        eventData.texture = 'liquid';
        if (messageId === 'feels_normal') {
          messageId = 'feels_wet';
        }
      }
    }

    // Check if it's scenery (usually immovable)
    if (target.has(TraitType.SCENERY)) {
      eventData.immovable = true;
      if (messageId === 'feels_normal') {
        messageId = 'immovable_object';
      }
    }

    // Determine touch verb from command
    const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'touch';
    if (messageId === 'feels_normal') {
      // Use verb-specific messages for normal touches
      switch (verb) {
        case 'poke':
          messageId = 'poked';
          break;
        case 'prod':
          messageId = 'prodded';
          break;
        case 'pat':
          messageId = 'patted';
          break;
        case 'stroke':
          messageId = 'stroked';
          break;
        case 'feel':
          messageId = 'touched_gently';
          break;
        default:
          messageId = 'touched';
      }
    }

    // Store computed data in sharedData for report phase
    sharedData.targetId = target.id;
    sharedData.targetName = target.name;
    sharedData.messageId = messageId;
    sharedData.eventData = eventData;
  },

  /**
   * Generate events when validation fails
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: this.id,
      messageId: result.error,
      reason: result.error,
      params: result.params || {}
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getTouchingSharedData(context);

    // Emit touched event for world model
    if (sharedData.eventData) {
      events.push(context.event('if.event.touched', sharedData.eventData));
    }

    // Emit success message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: sharedData.messageId || 'touched',
      params: { target: sharedData.targetName }
    }));

    return events;
  },

  group: "sensory"
};
