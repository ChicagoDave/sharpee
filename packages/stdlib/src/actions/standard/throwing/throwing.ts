/**
 * Throwing action - throw objects at targets or in directions
 * 
 * This action handles throwing objects, which can result in:
 * - Object moving to a location
 * - Object hitting and possibly breaking
 * - Target reacting to being hit
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, IdentityBehavior, ActorBehavior, RoomBehavior, OpenableBehavior, ContainerBehavior, SupporterBehavior, Direction } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope/types';
import { ThrowingEventMap } from './throwing-events';

/**
 * Helper to convert a string direction to Direction constant
 * Returns null if not a valid direction
 */
function parseDirectionString(dir: string | undefined): Direction | null {
  if (!dir) return null;
  
  // Map string directions to Direction constants
  const directionMap: Record<string, Direction> = {
    'north': Direction.NORTH,
    'south': Direction.SOUTH,
    'east': Direction.EAST,
    'west': Direction.WEST,
    'northeast': Direction.NORTHEAST,
    'northwest': Direction.NORTHWEST,
    'southeast': Direction.SOUTHEAST,
    'southwest': Direction.SOUTHWEST,
    'up': Direction.UP,
    'down': Direction.DOWN,
    'in': Direction.IN,
    'out': Direction.OUT,
    // Common abbreviations
    'n': Direction.NORTH,
    's': Direction.SOUTH,
    'e': Direction.EAST,
    'w': Direction.WEST,
    'ne': Direction.NORTHEAST,
    'nw': Direction.NORTHWEST,
    'se': Direction.SOUTHEAST,
    'sw': Direction.SOUTHWEST,
    'u': Direction.UP,
    'd': Direction.DOWN
  };
  
  return directionMap[dir.toLowerCase()] || null;
}

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
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    const target = context.command.indirectObject?.entity;
    const direction = context.command.parsed.extras?.direction as string;
    
    // Must have an item to throw
    if (!item) {
      return { 
        valid: false, 
        error: 'no_item'
      };
    }
    
    // Determine throw type and validate
    if (target) {
      // Throwing at a specific target
      
      // Target should be in the same room (can't throw through walls)
      const targetLocation = context.world.getLocation?.(target.id);
      const actorLocation = context.world.getLocation?.(actor.id);
      
      if (targetLocation !== actorLocation) {
        return { 
          valid: false, 
          error: 'target_not_here',
          params: { target: target.name }
        };
      }
      
      // Prevent throwing at self
      if (target.id === actor.id) {
        return { 
          valid: false, 
          error: 'self'
        };
      }
    } else if (direction) {
      // Throwing in a direction
      const throwDirection = parseDirectionString(direction);
      
      if (!throwDirection) {
        return {
          valid: false,
          error: 'no_exit'
        };
      }
      
      // Check if there's an exit in that direction
      const currentRoom = context.currentLocation;
      if (currentRoom.has(TraitType.ROOM)) {
        const exit = RoomBehavior.getExit(currentRoom, throwDirection);
        if (!exit) {
          // Can't throw through solid walls
          return { 
            valid: false, 
            error: 'no_exit',
            params: { direction: throwDirection }
          };
        }
      }
    }
    
    // Check if item is too heavy to throw (except for general throwing)
    if (target || direction) {
      const itemWeight = IdentityBehavior.getWeight(item);
      const isHeavy = itemWeight > 10; // kg
      
      if (isHeavy) {
        return { 
          valid: false, 
          error: 'too_heavy',
          params: { item: item.name, weight: itemWeight }
        };
      }
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    // Call validate at the start
    const validation = this.validate(context);
    if (!validation.valid) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: validation.error!,
        reason: validation.error!
      })];
    }
    
    const actor = context.player;
    const item = context.command.directObject?.entity!;
    const target = context.command.indirectObject?.entity;
    const direction = context.command.parsed.extras?.direction as string;
    
    // Determine throw type
    let throwType: 'at_target' | 'directional' | 'general';
    let throwTarget = target;
    let throwDirection = parseDirectionString(direction);
    
    if (target) {
      throwType = 'at_target';
    } else if (throwDirection) {
      throwType = 'directional';
    } else {
      throwType = 'general';
    }
    
    // Check item properties for throwing
    const itemWeight = IdentityBehavior.getWeight(item);
    
    // Check if item is fragile based on name or description
    const itemName = item.name.toLowerCase();
    const identity = item.get(TraitType.IDENTITY) as any;
    const description = (identity?.description || '').toLowerCase();
    
    const fragileKeywords = ['glass', 'crystal', 'delicate', 'fragile', 'bottle', 'vase', 'china', 'porcelain'];
    const isFragile = fragileKeywords.some(keyword => 
      itemName.includes(keyword) || description.includes(keyword)
    );
    
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
        
        const agility = ActorBehavior.getCustomProperty(throwTarget, 'agility');
        const canCatch = ActorBehavior.getCustomProperty(throwTarget, 'canCatch');
        
        if (!hitTarget && agility > 5) {
          messageId = 'target_ducks';
        } else if (canCatch && Math.random() > 0.7) {
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
          } else if (throwTarget.has(TraitType.CONTAINER)) {
            if (throwTarget.has(TraitType.OPENABLE)) {
              if (OpenableBehavior.isOpen(throwTarget)) {
                finalLocation = throwTarget.id;
                messageId = 'lands_in';
              } else {
                messageId = 'bounces_off';
              }
            } else {
              // Container without openable trait is always open
              finalLocation = throwTarget.id;
              messageId = 'lands_in';
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
        const exit = RoomBehavior.getExit(currentRoom, throwDirection);
        if (exit) {
          finalLocation = exit.destination;
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
    const events: ISemanticEvent[] = [];
    
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
