/**
 * Putting action - put objects in containers or on supporters
 * 
 * This action handles putting objects into containers or onto supporters.
 * It determines the appropriate preposition based on the target's traits.
 */

import { Action, ActionContext } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, ContainerTrait, SupporterTrait, OpenableTrait, IdentityTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { PuttingEventMap } from './putting-events';

export const puttingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.PUTTING,
  requiredMessages: [
    'no_target',
    'no_destination',
    'not_held',
    'not_container',
    'not_surface',
    'container_closed',
    'already_there',
    'put_in',
    'put_on',
    'cant_put_in_itself',
    'cant_put_on_itself',
    'no_room',
    'no_space'
  ],
  group: 'object_manipulation',
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: true,
    directObjectScope: ScopeLevel.CARRIED,
    indirectObjectScope: ScopeLevel.REACHABLE
  },
  
  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    const target = context.command.indirectObject?.entity;
    const preposition = context.command.parsed.structure.preposition?.text;
    
    // Validate we have an item
    if (!item) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_target',
        reason: 'no_target'
      })];
    }
    
    // Validate we have a destination
    if (!target) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_destination',
        reason: 'no_destination',
        params: { item: item.name }
      })];
    }
    
    // Scope checks handled by parser based on metadata
    
    // Prevent putting something inside/on itself
    if (item.id === target.id) {
      const messageId = preposition === 'on' ? 'cant_put_on_itself' : 'cant_put_in_itself';
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId,
        params: { item: item.name }
      })];
    }
    
    // Check if item is already in/on target
    if (context.world.getLocation(item.id) === target.id) {
      const relation = target.has(TraitType.SUPPORTER) ? 'on' : 'in';
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'already_there',
        reason: 'already_there',
        params: { 
          item: item.name,
          relation: relation,
          destination: target.name 
        }
      })];
    }
    
    // Determine if target is a container or supporter
    const isContainer = target.has(TraitType.CONTAINER);
    const isSupporter = target.has(TraitType.SUPPORTER);
    
    // Determine the appropriate action based on preposition and target type
    let eventType: keyof PuttingEventMap;
    let targetPreposition: 'in' | 'on';
    let successMessageId: string;
    
    if (preposition) {
      // User specified a preposition
      if ((preposition === 'in' || preposition === 'into' || preposition === 'inside') && isContainer) {
        eventType = 'if.event.put_in';
        targetPreposition = 'in';
        successMessageId = 'put_in';
      } else if ((preposition === 'on' || preposition === 'onto') && isSupporter) {
        eventType = 'if.event.put_on';
        targetPreposition = 'on';
        successMessageId = 'put_on';
      } else {
        // Mismatched preposition
        if (preposition === 'in' || preposition === 'into' || preposition === 'inside') {
          return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_container',
        reason: 'not_container',
        params: { destination: target.name }
      })];
        } else {
          return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_surface',
        reason: 'not_surface',
        params: { destination: target.name }
      })];
        }
      }
    } else {
      // Auto-determine based on target type (prefer container over supporter)
      if (isContainer) {
        eventType = 'if.event.put_in';
        targetPreposition = 'in';
        successMessageId = 'put_in';
      } else if (isSupporter) {
        eventType = 'if.event.put_on';
        targetPreposition = 'on';
        successMessageId = 'put_on';
      } else {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_container',
        reason: 'not_container',
        params: { destination: target.name }
      })];
      }
    }
    
    // Container-specific checks
    if (eventType === 'if.event.put_in') {
      // Check if container is open
      if (target.has(TraitType.OPENABLE)) {
        const openableTrait = target.get(TraitType.OPENABLE) as OpenableTrait;
        if (!openableTrait.isOpen) {
          return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'container_closed',
        reason: 'container_closed',
        params: { container: target.name }
      })];
        }
      }
      
      // Check capacity
      const containerTrait = target.get(TraitType.CONTAINER) as ContainerTrait;
      if (containerTrait.capacity) {
        const contents = context.world.getContents(target.id);
        
        // Check item count
        if (containerTrait.capacity.maxItems !== undefined && 
            contents.length >= containerTrait.capacity.maxItems) {
          return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_room',
        reason: 'no_room',
        params: { container: target.name }
      })];
        }
        
        // Check weight/volume if item has these properties
        if (item.has(TraitType.IDENTITY)) {
          const itemIdentity = item.get(TraitType.IDENTITY) as IdentityTrait;
          
          if (containerTrait.capacity.maxWeight !== undefined && itemIdentity.weight) {
            const currentWeight = contents.reduce((sum, e) => {
              if (e.has(TraitType.IDENTITY)) {
                const identity = e.get(TraitType.IDENTITY) as IdentityTrait;
                return sum + (identity.weight || 0);
              }
              return sum;
            }, 0);
            
            if (currentWeight + itemIdentity.weight > containerTrait.capacity.maxWeight) {
              return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_room',
        reason: 'no_room',
        params: { container: target.name }
      })];
            }
          }
          
          if (containerTrait.capacity.maxVolume !== undefined && itemIdentity.volume) {
            const currentVolume = contents.reduce((sum, e) => {
              if (e.has(TraitType.IDENTITY)) {
                const identity = e.get(TraitType.IDENTITY) as IdentityTrait;
                return sum + (identity.volume || 0);
              }
              return sum;
            }, 0);
            
            if (currentVolume + itemIdentity.volume > containerTrait.capacity.maxVolume) {
              return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_room',
        reason: 'no_room',
        params: { container: target.name }
      })];
            }
          }
        }
      }
    }
    
    // Supporter-specific checks
    if (eventType === 'if.event.put_on') {
      const supporterTrait = target.get(TraitType.SUPPORTER) as SupporterTrait;
      if (supporterTrait.capacity) {
        const contents = context.world.getContents(target.id);
        
        // Check item count
        if (supporterTrait.capacity.maxItems !== undefined && 
            contents.length >= supporterTrait.capacity.maxItems) {
          return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_space',
        reason: 'no_space',
        params: { surface: target.name }
      })];
        }
        
        // Check weight
        if (supporterTrait.capacity.maxWeight !== undefined && item.has(TraitType.IDENTITY)) {
          const itemIdentity = item.get(TraitType.IDENTITY) as IdentityTrait;
          if (itemIdentity.weight) {
            const currentWeight = contents.reduce((sum, e) => {
              if (e.has(TraitType.IDENTITY)) {
                const identity = e.get(TraitType.IDENTITY) as IdentityTrait;
                return sum + (identity.weight || 0);
              }
              return sum;
            }, 0);
            
            if (currentWeight + itemIdentity.weight > supporterTrait.capacity.maxWeight) {
              return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_space',
        reason: 'no_space',
        params: { surface: target.name }
      })];
            }
          }
        }
      }
    }
    
    // Build message params for success message
    const params: Record<string, unknown> = {
      item: item.name
    };
    
    if (successMessageId === 'put_in') {
      params.container = target.name;
    } else {
      params.surface = target.name;
    }
    
    const events: SemanticEvent[] = [];
    
    // Create the appropriate event for world model updates
    const eventData = eventType === 'if.event.put_in' 
      ? { itemId: item.id, targetId: target.id, preposition: 'in' as const }
      : { itemId: item.id, targetId: target.id, preposition: 'on' as const };
    
    events.push(context.event(eventType, eventData));
    
    // Create success message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: successMessageId,
        params
      }));
    
    return events;
  }
};
