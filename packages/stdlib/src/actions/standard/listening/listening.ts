/**
 * Listening action - listen for sounds in the environment
 * 
 * This action allows players to listen for sounds in their current location
 * or from specific objects.
 */

import { Action, ActionContext } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { SemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { ListenedEventData } from './listening-events';

export const listeningAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.LISTENING,
  requiredMessages: [
    'not_visible',
    'silence',
    'ambient_sounds',
    'active_devices',
    'no_sound',
    'device_running',
    'device_off',
    'container_sounds',
    'liquid_sounds',
    'listened_to',
    'listened_environment'
  ],
  
  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    
    // Scope checks handled by framework due to directObjectScope: AUDIBLE
    
    // Build event data
    const eventData: ListenedEventData = {};
    const params: Record<string, any> = {};
    let messageId: string;
    
    if (target) {
      eventData.target = target.id;
      params.target = target.name;
      
      // Check if the target has any sound-related properties
      let hasSound = false;
      
      if (target.has(TraitType.SWITCHABLE)) {
        const switchableTrait = target.get(TraitType.SWITCHABLE) as { isOn?: boolean };
        if (switchableTrait.isOn) {
          hasSound = true;
          eventData.hasSound = true;
          eventData.soundType = 'device';
          messageId = 'device_running';
        } else {
          messageId = 'device_off';
        }
      } else if (target.has(TraitType.CONTAINER)) {
        const contents = context.world.getContents(target.id);
        if (contents.length > 0) {
          eventData.hasContents = true;
          eventData.contentCount = contents.length;
          
          // Check if any contents are liquid (edible with isDrink)
          const hasLiquid = contents.some(item => {
            if (item.has(TraitType.EDIBLE)) {
              const edibleTrait = item.get(TraitType.EDIBLE) as { isDrink?: boolean };
              return edibleTrait.isDrink;
            }
            return false;
          });
          
          messageId = hasLiquid ? 'liquid_sounds' : 'container_sounds';
          hasSound = true;
        } else {
          messageId = 'no_sound';
        }
      } else {
        messageId = 'no_sound';
      }
      
      // Override with generic message if no specific sound
      if (!hasSound && !messageId) {
        messageId = 'listened_to';
      }
    } else {
      // Listening to the general environment
      eventData.listeningToEnvironment = true;
      
      // Check for any active sound sources in the location
      const location = context.currentLocation;
      const contents = context.world.getContents(location.id);
      
      const soundSources = contents.filter(item => {
        if (item.has(TraitType.SWITCHABLE)) {
          const switchableTrait = item.get(TraitType.SWITCHABLE) as { isOn?: boolean };
          return switchableTrait.isOn;
        }
        return false;
      });
      
      if (soundSources.length > 0) {
        eventData.soundSources = soundSources.map(s => s.id);
        params.devices = soundSources.map(s => s.name).join(', ');
        messageId = 'active_devices';
      } else {
        messageId = 'silence';
      }
      
      eventData.roomId = location.id;
    }
    
    // Create LISTENED event for world model
    const events: SemanticEvent[] = [];
    events.push(context.event('if.event.listened', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      }));
    
    return events;
  },
  
  group: "sensory",
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.AUDIBLE
  }
};
