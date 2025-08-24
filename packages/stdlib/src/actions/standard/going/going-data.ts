/**
 * Data builder for going action
 * 
 * Centralizes all room and movement snapshot logic for the going action.
 * This separates data structure concerns from business logic.
 */

import { ActionDataBuilder, ActionDataConfig } from '../../data-builder-types';
import { ActionContext } from '../../enhanced-types';
import { WorldModel, TraitType, IFEntity, RoomBehavior } from '@sharpee/world-model';
import { captureRoomSnapshot, captureEntitySnapshot } from '../../base/snapshot-utils';

/**
 * Normalize direction input to standard form
 */
export function normalizeDirection(direction: string): string {
  const normalized = direction.toLowerCase().trim();
  
  // Handle abbreviations
  const abbreviations: Record<string, string> = {
    'n': 'north',
    's': 'south',
    'e': 'east',
    'w': 'west',
    'ne': 'northeast',
    'nw': 'northwest',
    'se': 'southeast',
    'sw': 'southwest',
    'u': 'up',
    'd': 'down',
    'in': 'inside',
    'out': 'outside'
  };
  
  return abbreviations[normalized] || normalized;
}

/**
 * Get the opposite direction for arrival messages
 */
export function getOppositeDirection(direction: string): string {
  const opposites: Record<string, string> = {
    'north': 'south',
    'south': 'north',
    'east': 'west',
    'west': 'east',
    'northeast': 'southwest',
    'northwest': 'southeast',
    'southeast': 'northwest',
    'southwest': 'northeast',
    'up': 'down',
    'down': 'up',
    'inside': 'outside',
    'outside': 'inside'
  };
  
  return opposites[direction] || direction;
}

/**
 * Find the source room (where we came from)
 * Since we've already moved, we need to find which room has an exit to our current location
 */
function findSourceRoom(
  currentRoom: IFEntity,
  normalizedDirection: string,
  world: WorldModel
): IFEntity {
  const allEntities = world.getAllEntities();
  const allRooms = allEntities.filter(e => e.has(TraitType.ROOM));
  
  // Find the room that has an exit leading to our current location
  for (const room of allRooms) {
    const exitConfig = RoomBehavior.getExit(room, normalizedDirection);
    if (exitConfig && exitConfig.destination === currentRoom.id) {
      return room;
    }
  }
  
  // If we can't find source room, use the current room as a fallback
  return currentRoom;
}

/**
 * Build actor moved event data
 */
export const buildActorMovedData: ActionDataBuilder<Record<string, unknown>> = (
  context: ActionContext,
  preState?: WorldModel,
  postState?: WorldModel
): Record<string, unknown> => {
  const actor = context.player;
  
  // Get and normalize direction
  const direction = context.command.parsed.extras?.direction as string || 
                   context.command.directObject?.entity?.name || '';
  const normalizedDirection = normalizeDirection(direction);
  const oppositeDir = getOppositeDirection(normalizedDirection);
  
  // Get current location (destination, since we've already moved)
  const currentRoom = context.currentLocation;
  
  // Find source room
  const sourceRoom = findSourceRoom(currentRoom, normalizedDirection, context.world);
  
  // Capture room snapshots for atomic events
  const sourceSnapshot = captureRoomSnapshot(sourceRoom, context.world, false);
  const destinationSnapshot = captureRoomSnapshot(currentRoom, context.world, false);
  const actorSnapshot = captureEntitySnapshot(actor, context.world, false);
  
  // Check if this was the first visit
  const roomTrait = currentRoom.get(TraitType.ROOM) as any;
  const firstVisit = roomTrait?.visited ? false : true;
  
  return {
    // New atomic structure
    actor: actorSnapshot,
    sourceRoom: sourceSnapshot,
    destinationRoom: destinationSnapshot,
    // Backward compatibility
    direction: normalizedDirection,
    fromRoom: sourceRoom.id,
    toRoom: currentRoom.id,
    oppositeDirection: oppositeDir,
    firstVisit: firstVisit
  };
};

/**
 * Build actor exited event data
 */
export const buildActorExitedData: ActionDataBuilder<Record<string, unknown>> = (
  context: ActionContext,
  preState?: WorldModel,
  postState?: WorldModel
): Record<string, unknown> => {
  const actor = context.player;
  
  // Get and normalize direction
  const direction = context.command.parsed.extras?.direction as string || 
                   context.command.directObject?.entity?.name || '';
  const normalizedDirection = normalizeDirection(direction);
  
  // Get current location (destination)
  const currentRoom = context.currentLocation;
  
  return {
    actorId: actor.id,
    direction: normalizedDirection,
    toRoom: currentRoom.id
  };
};

/**
 * Build actor entered event data
 */
export const buildActorEnteredData: ActionDataBuilder<Record<string, unknown>> = (
  context: ActionContext,
  preState?: WorldModel,
  postState?: WorldModel
): Record<string, unknown> => {
  const actor = context.player;
  
  // Get and normalize direction
  const direction = context.command.parsed.extras?.direction as string || 
                   context.command.directObject?.entity?.name || '';
  const normalizedDirection = normalizeDirection(direction);
  const oppositeDir = getOppositeDirection(normalizedDirection);
  
  // Get current location (destination)
  const currentRoom = context.currentLocation;
  
  // Find source room
  const sourceRoom = findSourceRoom(currentRoom, normalizedDirection, context.world);
  
  return {
    actorId: actor.id,
    direction: oppositeDir,
    fromRoom: sourceRoom.id
  };
};

/**
 * Determine the success message for going action
 */
export function determineGoingMessage(
  movedData: Record<string, unknown>
): { messageId: string; params: Record<string, any> } {
  const messageId = movedData.firstVisit ? 'first_visit' : 'moved_to';
  
  return {
    messageId,
    params: {
      direction: movedData.direction as string,
      destination: (movedData.destinationRoom as any)?.name || 'unknown'
    }
  };
}

/**
 * Configuration for going data builders
 */
export const actorMovedDataConfig: ActionDataConfig<Record<string, unknown>> = {
  builder: buildActorMovedData,
  protectedFields: ['direction', 'fromRoom', 'toRoom']
};

export const actorExitedDataConfig: ActionDataConfig<Record<string, unknown>> = {
  builder: buildActorExitedData,
  protectedFields: ['actorId', 'direction']
};

export const actorEnteredDataConfig: ActionDataConfig<Record<string, unknown>> = {
  builder: buildActorEnteredData,
  protectedFields: ['actorId', 'direction']
};