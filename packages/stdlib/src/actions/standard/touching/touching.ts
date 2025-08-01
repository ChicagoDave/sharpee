/**
 * Touching action - touch or feel objects
 * 
 * This action allows players to touch objects to discover their
 * texture, temperature, or other tactile properties.
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, IdentityTrait, SwitchableTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { TouchedEventData } from './touching-events';

export const touchingAction: Action = {
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
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    
    // Must have a target to touch
    if (!target) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_target',
        reason: 'no_target'
      })];
    }
    
    // Check if actor can see the target
    if (!context.canSee(target)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_visible',
        reason: 'not_visible',
        params: { target: target.name }
      })];
    }
    
    // Check if actor can reach the target
    if (!context.canReach(target)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_reachable',
        reason: 'not_reachable',
        params: { target: target.name }
      })];
    }
    
    // Build event data with tactile properties
    const eventData: TouchedEventData = {
      target: target.id,
      targetName: target.name
    };
    
    const params: Record<string, any> = {
      target: target.name
    };
    
    let messageId: string = 'feels_normal';
    let temperature: string | undefined;
    let texture: string | undefined;
    let special: string | undefined;
    
    // Check various traits for tactile properties
    
    // Check if it's a light source (might be hot if lit)
    if (target.has(TraitType.LIGHT_SOURCE)) {
      const lightTrait = target.get(TraitType.LIGHT_SOURCE) as { isLit?: boolean };
      if (lightTrait.isLit) {
        temperature = 'hot';
        eventData.temperature = 'hot';
        eventData.isLit = true;
        messageId = 'feels_hot';
      }
    }
    
    // Check if it's a device (might be warm if on)
    if (target.has(TraitType.SWITCHABLE) && !temperature) {
      const switchableTrait = target.get(TraitType.SWITCHABLE) as SwitchableTrait;
      if (switchableTrait.isOn) {
        temperature = 'warm';
        eventData.temperature = 'warm';
        eventData.isActive = true;
        
        // Check if it's vibrating (special case for some devices)
        const identity = target.get(TraitType.IDENTITY) as IdentityTrait;
        if (identity?.description?.toLowerCase().includes('vibrat')) {
          special = 'vibrating';
          messageId = 'device_vibrating';
        } else {
          messageId = 'feels_warm';
        }
      }
    }
    
    // Check material/texture based on object properties
    if (target.has(TraitType.IDENTITY)) {
      const identity = target.get(TraitType.IDENTITY) as IdentityTrait;
      
      // Note: identity.size is a string enum, but TouchedEventData.size expects number
      // So we don't include it in the event data for now
    }
    
    // Determine texture based on traits
    if (target.has(TraitType.WEARABLE)) {
      texture = 'soft';
      eventData.texture = 'soft';
      if (!temperature && !special) {
        messageId = 'feels_soft';
      }
    } else if (target.has(TraitType.DOOR)) {
      texture = 'smooth';
      eventData.texture = 'smooth';
      eventData.material = 'hard';
      if (!temperature && !special) {
        messageId = 'feels_smooth';
      }
    } else if (target.has(TraitType.CONTAINER) || target.has(TraitType.SUPPORTER)) {
      texture = 'solid';
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
          special = 'liquid_inside';
          messageId = 'liquid_container';
        }
      }
      
      if (!temperature && !special && !messageId.startsWith('feels_')) {
        messageId = 'feels_hard';
      }
    } else if (target.has(TraitType.EDIBLE)) {
      const edibleTrait = target.get(TraitType.EDIBLE) as { isDrink?: boolean };
      if (edibleTrait.isDrink) {
        texture = 'liquid';
        eventData.texture = 'liquid';
        if (!temperature && !special) {
          messageId = 'feels_wet';
        }
      }
    }
    
    // Check if it's scenery (usually immovable)
    if (target.has(TraitType.SCENERY)) {
      eventData.immovable = true;
      if (!temperature && !special && !texture) {
        messageId = 'immovable_object';
      }
    }
    
    // Determine touch verb from command
    const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'touch';
    if (!special && messageId === 'feels_normal') {
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
    
    // Create TOUCHED event for world model
    const events: SemanticEvent[] = [];
    events.push(context.event('if.event.touched', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      }));
    
    return events;
  },
  
  group: "sensory"
};
