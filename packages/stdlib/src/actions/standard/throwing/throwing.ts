/**
 * Throwing action - throw objects at targets or in directions
 *
 * This action handles throwing objects, which can result in:
 * - Object moving to a location
 * - Object hitting and possibly breaking
 * - Target reacting to being hit
 *
 * Uses four-phase pattern:
 * 1. validate: Check if item can be thrown at target/direction
 * 2. execute: Calculate outcome, store result in sharedData
 * 3. blocked: Generate events when validation fails
 * 4. report: Generate success events from sharedData
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, IdentityBehavior, ActorBehavior, RoomBehavior, OpenableBehavior, Direction, DirectionType } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope/types';
import { ThrowingEventMap } from './throwing-events';

/**
 * Helper to convert a string direction to Direction constant
 */
function parseDirectionString(dir: string | undefined): DirectionType | null {
  if (!dir) return null;

  const directionMap: Record<string, DirectionType> = {
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

/**
 * Shared data passed between execute and report phases
 */
interface ThrowingSharedData {
  itemId: string;
  itemName: string;
  throwType: 'at_target' | 'directional' | 'general';
  isFragile: boolean;
  weight: number;
  willBreak: boolean;
  finalLocation: string | null;
  // Target info
  targetId?: string;
  targetName?: string;
  hit?: boolean;
  // Direction info
  direction?: DirectionType;
  // For actor targets
  targetDucked?: boolean;
  targetCaught?: boolean;
  targetAngry?: boolean;
  // Message info
  messageId: string;
  params: Record<string, any>;
}

function getThrowingSharedData(context: ActionContext): ThrowingSharedData {
  return context.sharedData as ThrowingSharedData;
}

export const throwingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.THROWING,

  // Default scope requirements for this action's slots
  defaultScope: {
    item: ScopeLevel.REACHABLE,  // REACHABLE allows implicit take
    target: ScopeLevel.VISIBLE
  },

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
    directObjectScope: ScopeLevel.REACHABLE,  // REACHABLE allows implicit take
    indirectObjectScope: ScopeLevel.VISIBLE
  },

  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const item = context.command.directObject?.entity;
    const target = context.command.indirectObject?.entity;
    const direction = context.command.parsed.extras?.direction as string;

    if (!item) {
      return { valid: false, error: 'no_item' };
    }

    // Item must be carried (or implicitly takeable)
    // This enables "throw apple at bob" when apple is on the ground
    const carryCheck = context.requireCarriedOrImplicitTake(item);
    if (!carryCheck.ok) {
      return carryCheck.error!;
    }

    if (target) {
      // Throwing at a specific target
      const targetLocation = context.world.getLocation?.(target.id);
      const actorLocation = context.world.getLocation?.(actor.id);

      if (targetLocation !== actorLocation) {
        return {
          valid: false,
          error: 'target_not_here',
          params: { target: target.name }
        };
      }

      if (target.id === actor.id) {
        return { valid: false, error: 'self' };
      }
    } else if (direction) {
      const throwDirection = parseDirectionString(direction);

      if (!throwDirection) {
        return { valid: false, error: 'no_exit' };
      }

      const currentRoom = context.currentLocation;
      if (currentRoom.has(TraitType.ROOM)) {
        const exit = RoomBehavior.getExit(currentRoom, throwDirection);
        if (!exit) {
          return {
            valid: false,
            error: 'no_exit',
            params: { direction: throwDirection }
          };
        }
      }
    }

    // Check if item is too heavy
    if (target || direction) {
      const itemWeight = IdentityBehavior.getWeight(item);
      if (itemWeight > 10) {
        return {
          valid: false,
          error: 'too_heavy',
          params: { item: item.name, weight: itemWeight }
        };
      }
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const actor = context.player;
    const item = context.command.directObject!.entity!;
    const target = context.command.indirectObject?.entity;
    const direction = context.command.parsed.extras?.direction as string;
    const sharedData = getThrowingSharedData(context);

    // Store basic info
    sharedData.itemId = item.id;
    sharedData.itemName = item.name;

    // Determine throw type
    const throwDirection = parseDirectionString(direction);
    if (target) {
      sharedData.throwType = 'at_target';
      sharedData.targetId = target.id;
      sharedData.targetName = target.name;
    } else if (throwDirection) {
      sharedData.throwType = 'directional';
      sharedData.direction = throwDirection;
    } else {
      sharedData.throwType = 'general';
    }

    // Check item properties
    sharedData.weight = IdentityBehavior.getWeight(item);

    // Check if item is fragile
    const itemName = item.name.toLowerCase();
    const identity = item.get(TraitType.IDENTITY) as any;
    const description = (identity?.description || '').toLowerCase();
    const fragileKeywords = ['glass', 'crystal', 'delicate', 'fragile', 'bottle', 'vase', 'china', 'porcelain'];
    sharedData.isFragile = fragileKeywords.some(keyword =>
      itemName.includes(keyword) || description.includes(keyword)
    );

    // Initialize params
    sharedData.params = { item: item.name };

    // Default final location
    let finalLocation = context.world.getLocation?.(actor.id) || '';
    sharedData.willBreak = false;
    sharedData.messageId = 'thrown';

    if (sharedData.throwType === 'at_target' && target) {
      sharedData.params.target = target.name;

      // Calculate hit/miss
      let hitTarget = false;
      if (target.has(TraitType.ACTOR)) {
        hitTarget = Math.random() > 0.3; // 70% chance to hit

        const agility = ActorBehavior.getCustomProperty(target, 'agility');
        const canCatch = ActorBehavior.getCustomProperty(target, 'canCatch');

        if (!hitTarget && agility > 5) {
          sharedData.targetDucked = true;
          sharedData.messageId = 'target_ducks';
        } else if (canCatch && Math.random() > 0.7) {
          sharedData.targetCaught = true;
          hitTarget = false;
          finalLocation = target.id;
          sharedData.messageId = 'target_catches';
        }
      } else {
        hitTarget = Math.random() > 0.1; // 90% chance to hit stationary objects
      }

      sharedData.hit = hitTarget;

      if (hitTarget) {
        sharedData.messageId = 'hits_target';
        sharedData.targetAngry = target.has(TraitType.ACTOR);

        if (sharedData.isFragile) {
          sharedData.willBreak = Math.random() > 0.2;
          if (sharedData.willBreak) {
            sharedData.messageId = 'breaks_against';
          }
        }

        // Check if item lands on/in target
        if (!sharedData.willBreak) {
          if (target.has(TraitType.SUPPORTER)) {
            finalLocation = target.id;
            sharedData.messageId = 'lands_on';
          } else if (target.has(TraitType.CONTAINER)) {
            if (target.has(TraitType.OPENABLE)) {
              if (OpenableBehavior.isOpen(target)) {
                finalLocation = target.id;
                sharedData.messageId = 'lands_in';
              } else {
                sharedData.messageId = 'bounces_off';
              }
            } else {
              finalLocation = target.id;
              sharedData.messageId = 'lands_in';
            }
          }
        }
      } else if (!sharedData.targetDucked && !sharedData.targetCaught) {
        sharedData.messageId = 'misses_target';
      }
    } else if (sharedData.throwType === 'directional' && throwDirection) {
      sharedData.params.direction = throwDirection;

      const currentRoom = context.currentLocation;
      if (currentRoom.has(TraitType.ROOM)) {
        const exit = RoomBehavior.getExit(currentRoom, throwDirection);
        if (exit) {
          finalLocation = exit.destination;
          sharedData.messageId = 'sails_through';

          if (sharedData.isFragile) {
            sharedData.willBreak = Math.random() > 0.5;
            if (sharedData.willBreak) {
              sharedData.messageId = 'breaks_on_impact';
            }
          }
        } else {
          sharedData.messageId = 'thrown_direction';
        }
      }
    } else {
      // General throw
      if (sharedData.isFragile) {
        sharedData.willBreak = Math.random() > 0.7;
        if (sharedData.willBreak) {
          sharedData.messageId = 'fragile_breaks';
        } else {
          sharedData.messageId = 'thrown_gently';
        }
      } else {
        sharedData.messageId = 'thrown_down';
      }
    }

    sharedData.finalLocation = sharedData.willBreak ? null : finalLocation;

    // Perform the actual move - this is the critical mutation!
    // Move to final location, or remove from world if destroyed
    if (sharedData.finalLocation) {
      context.world.moveEntity(item.id, sharedData.finalLocation);
    } else if (sharedData.willBreak) {
      // Item is destroyed - move to limbo/remove from play
      // For now, we'll mark it as destroyed by setting location to null
      // The event system will handle actual removal if needed
      context.world.moveEntity(item.id, ''); // Empty string = nowhere
    }
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const item = context.command.directObject?.entity;
    const target = context.command.indirectObject?.entity;
    return [context.event('if.event.throw_blocked', {
      blocked: true,
      messageId: `${context.action.id}.${result.error}`,
      params: {
        ...result.params,
        item: item?.name,
        target: target?.name
      },
      reason: result.error,
      itemId: item?.id,
      itemName: item?.name,
      targetId: target?.id,
      targetName: target?.name
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getThrowingSharedData(context);
    const events: ISemanticEvent[] = [];

    // Prepend any implicit take events (from requireCarriedOrImplicitTake)
    if (context.sharedData.implicitTakeEvents) {
      events.push(...context.sharedData.implicitTakeEvents);
    }

    // Build event data with messageId for text rendering
    const eventData: ThrowingEventMap['if.event.thrown'] & { messageId: string; params: Record<string, any> } = {
      messageId: `${context.action.id}.${sharedData.messageId}`,
      params: sharedData.params,
      item: sharedData.itemId,
      itemName: sharedData.itemName,
      throwType: sharedData.throwType,
      isFragile: sharedData.isFragile,
      weight: sharedData.weight,
      willBreak: sharedData.willBreak,
      finalLocation: sharedData.finalLocation
    };

    if (sharedData.targetId) {
      eventData.target = sharedData.targetId;
      eventData.targetName = sharedData.targetName;
      eventData.hit = sharedData.hit;
    }

    if (sharedData.direction) {
      eventData.direction = sharedData.direction;
    }

    // Create THROWN event with messageId
    events.push(context.event('if.event.thrown', eventData));

    // If item breaks, create ITEM_DESTROYED event
    if (sharedData.willBreak) {
      const destroyedData: ThrowingEventMap['if.event.item_destroyed'] = {
        item: sharedData.itemId,
        itemName: sharedData.itemName,
        cause: 'thrown'
      };
      events.push(context.event('if.event.item_destroyed', destroyedData));
    }

    // Add target reaction for actors as additional event
    if (sharedData.hit && sharedData.targetAngry) {
      events.push(context.event('if.event.thrown', {
        messageId: `${context.action.id}.target_angry`,
        params: sharedData.params,
        item: sharedData.itemId,
        itemName: sharedData.itemName,
        target: sharedData.targetId,
        targetName: sharedData.targetName
      }));
    }

    return events;
  },

  group: "interaction"
};
