/**
 * Throwing action - throw objects at targets or in directions
 * 
 * This action handles throwing objects, which can result in:
 * - Object moving to a location
 * - Object hitting and possibly breaking
 * - Target reacting to being hit
 */

import { Action, ActionContext } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, IdentityTrait, ActorTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope/types';
import { ThrowingEventMap } from './throwing-events';

export const throwingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.THROWING,
  requiredMessages: [
    'no_item',
    'not_holding',
    'target_not_visible',
    'target_not_here',
    'no_exit',
    'too_heavy',
    'self',
    'thrown',
    'thrown_down',
    'thrown_gently',
    'thrown_at',
    'hits_target',
    'misses_target',
    'bounces_off',
    'lands_on',
    'lands_in',
    'thrown_direction',
    'sails_through',
    'breaks_on_impact',
    'breaks_against',
    'fragile_breaks',
    'target_ducks',
    'target_catches',
    'target_angry'
  ],
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: true,
    directObjectScope: ScopeLevel.CARRIED,
    indirectObjectScope: ScopeLevel.VISIBLE
  },
  
  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    const target = context.command.indirectObject?.entity;
    const direction = context.command.parsed.extras?.direction as string;
    
    // Must have an item to throw
    if (!item) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_item',
        reason: 'no_item'
      })];
    }
    
    // Scope checks handled by parser based on metadata
    
    // Determine throw type and validate
    let throwType: 'at_target' | 'directional' | 'general';
    let throwTarget = target;
    let throwDirection = direction;
    
    if (target) {
      // Throwing at a specific target
      throwType = 'at_target';
      
      // Target visibility handled by parser based on metadata
      
      // Target should be in the same room (can't throw through walls)
      const targetLocation = context.world.getLocation?.(target.id);
      const actorLocation = context.world.getLocation?.(actor.id);
      
      if (targetLocation !== actorLocation) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'target_not_here',
        reason: 'target_not_here',
        params: { target: target.name }
      })];
      }
      
      // Prevent throwing at self
      if (target.id === actor.id) {
        return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'self',
        reason: 'self'
      })];
      }
    } else if (direction) {
      // Throwing in a direction
      throwType = 'directional';
      throwDirection = direction.toLowerCase();
      
      // Check if there's an exit in that direction
      const currentRoom = context.currentLocation;
      if (currentRoom.has(TraitType.ROOM)) {
        const roomTrait = currentRoom.get(TraitType.ROOM) as { exits?: Record<string, any> };
        if (!roomTrait.exits || !roomTrait.exits[throwDirection]) {
          // Can't throw through solid walls
          return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_exit',
        reason: 'no_exit',
        params: { direction: throwDirection }
      })];
        }
      }
    } else {
      // General throwing (drops in current location)
      throwType = 'general';
    }
    
    // Check item properties for throwing
    let isFragile = false;
    let isHeavy = false;
    let itemWeight = 0;
    
    if (item.has(TraitType.IDENTITY)) {
      const identity = item.get(TraitType.IDENTITY) as IdentityTrait;
      
      // Check weight for throwing difficulty
      if (identity.weight) {
        itemWeight = identity.weight;
        isHeavy = itemWeight > 10; // kg
      }
      
      // Check if item might break
      const name = identity.name?.toLowerCase() || '';
      const desc = identity.description?.toLowerCase() || '';
      isFragile = name.includes('glass') || name.includes('fragile') || 
                  desc.includes('glass') || desc.includes('fragile') ||
                  name.includes('bottle') || name.includes('vase');
    }
    
    // Heavy items are harder to throw far
    if (isHeavy && throwType !== 'general') {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'too_heavy',
        reason: 'too_heavy',
        params: { item: item.name, weight: itemWeight }
      })];
    }
    
    // Build event data
    const eventData: ThrowingEventMap['if.event.thrown'] = {
      item: item.id,
      itemName: item.name,
      throwType,
      isFragile,
      weight: itemWeight,
      willBreak: false, // Will be determined below
      finalLocation: context.world.getLocation?.(actor.id) || '' // Default: drops in current room
    };
    
    const params: Record<string, any> = {
      item: item.name
    };
    
    // Determine outcome and message
    let willBreak = false;
    let hitTarget = false;
    let finalLocation = context.world.getLocation?.(actor.id) || ''; // Default: drops in current room
    let messageId = 'thrown';
    
    if (throwType === 'at_target' && throwTarget) {
      eventData.target = throwTarget.id;
      eventData.targetName = throwTarget.name;
      params.target = throwTarget.name;
      
      // Simple hit calculation
      if (throwTarget.has(TraitType.ACTOR)) {
        hitTarget = Math.random() > 0.3; // 70% chance to hit
        const targetActor = throwTarget.get(TraitType.ACTOR) as ActorTrait;
        
        if (!hitTarget && (targetActor as any).agility > 5) {
          messageId = 'target_ducks';
        } else if ((targetActor as any).canCatch && Math.random() > 0.7) {
          messageId = 'target_catches';
          hitTarget = false; // Caught, not hit
          finalLocation = throwTarget.id;
        }
      } else {
        hitTarget = Math.random() > 0.1; // 90% chance to hit stationary objects
      }
      
      eventData.hit = hitTarget;
      
      if (hitTarget) {
        messageId = 'hits_target';
        
        if (isFragile) {
          willBreak = Math.random() > 0.2; // 80% chance fragile items break on impact
          if (willBreak) {
            messageId = 'breaks_against';
          }
        }
        
        // If we hit a container/supporter, item might land on/in it
        if (!willBreak) {
          if (throwTarget.has(TraitType.SUPPORTER)) {
            finalLocation = throwTarget.id;
            messageId = 'lands_on';
          } else if (throwTarget.has(TraitType.CONTAINER) && throwTarget.has(TraitType.OPENABLE)) {
            const openable = throwTarget.get(TraitType.OPENABLE) as { isOpen?: boolean };
            if (openable.isOpen) {
              finalLocation = throwTarget.id;
              messageId = 'lands_in';
            } else {
              messageId = 'bounces_off';
            }
          }
        }
      } else {
        messageId = 'misses_target';
      }
    } else if (throwType === 'directional' && throwDirection) {
      eventData.direction = throwDirection;
      params.direction = throwDirection;
      
      // Item goes through the exit to the next room
      const currentRoom = context.currentLocation;
      if (currentRoom.has(TraitType.ROOM)) {
        const roomTrait = currentRoom.get(TraitType.ROOM) as { exits?: Record<string, any> };
        if (roomTrait.exits && roomTrait.exits[throwDirection]) {
          finalLocation = roomTrait.exits[throwDirection].destination;
          messageId = 'sails_through';
          
          // Fragile items might break when hitting the ground
          if (isFragile) {
            willBreak = Math.random() > 0.5; // 50% chance to break
            if (willBreak) {
              messageId = 'breaks_on_impact';
            }
          }
        } else {
          messageId = 'thrown_direction';
        }
      }
    } else {
      // General throw - just drops
      if (isFragile) {
        willBreak = Math.random() > 0.7; // 30% chance to break even on gentle toss
        if (willBreak) {
          messageId = 'fragile_breaks';
        } else {
          messageId = 'thrown_gently';
        }
      } else {
        messageId = 'thrown_down';
      }
    }
    
    eventData.willBreak = willBreak;
    eventData.finalLocation = willBreak ? null : finalLocation;
    
    // Create events
    const events: SemanticEvent[] = [];
    
    // Create THROWN event for world model
    events.push(context.event('if.event.thrown', eventData));
    
    // Add success message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId,
        params
      }));
    
    // If item breaks, also create ITEM_DESTROYED event
    if (willBreak) {
      const destroyedData: ThrowingEventMap['if.event.item_destroyed'] = {
        item: item.id,
        itemName: item.name,
        cause: 'thrown'
      };
      events.push(context.event('if.event.item_destroyed', destroyedData));
    }
    
    // Add target reaction for actors
    if (hitTarget && throwTarget?.has(TraitType.ACTOR)) {
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'target_angry',
        params
      }));
    }
    
    return events;
  },
  
  group: "interaction"
};
