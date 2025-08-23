/**
 * Snapshot utilities for capturing entity and room state
 * 
 * These utilities help actions capture complete state snapshots
 * for atomic events during the report phase.
 */

import { IFEntity, WorldModel } from '@sharpee/world-model';

/**
 * Entity snapshot containing all relevant state
 */
export interface EntitySnapshot {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  location?: string;
  isOpenable?: boolean;
  isOpen?: boolean;
  isLockable?: boolean;
  isLocked?: boolean;
  isContainer?: boolean;
  isSupporter?: boolean;
  isWearable?: boolean;
  isWorn?: boolean;
  isEdible?: boolean;
  isPushable?: boolean;
  isScenery?: boolean;
  isPortable?: boolean;
  contents?: EntitySnapshot[];
  traits?: Record<string, unknown>;
}

/**
 * Room snapshot containing complete room state
 */
export interface RoomSnapshot {
  id: string;
  name: string;
  description?: string;
  isDark?: boolean;
  isVisited?: boolean;
  exits?: Record<string, string>;
  contents?: EntitySnapshot[];
  traits?: Record<string, unknown>;
}

/**
 * Capture a complete snapshot of an entity's current state
 * 
 * @param entity The entity to snapshot
 * @param world The world model (for getting contents)
 * @param includeContents Whether to include contents recursively
 * @returns Complete entity snapshot
 */
export function captureEntitySnapshot(
  entity: IFEntity,
  world: WorldModel,
  includeContents = true
): EntitySnapshot {
  const identity = entity.get?.('identity') as any;
  const physical = entity.get?.('physical') as any;
  const openable = entity.get?.('openable') as any;
  const lockable = entity.get?.('lockable') as any;
  const container = entity.get?.('container') as any;
  const supporter = entity.get?.('supporter') as any;
  const wearable = entity.get?.('wearable') as any;
  const edible = entity.get?.('edible') as any;
  const pushable = entity.get?.('pushable') as any;
  const scenery = entity.get?.('scenery') as any;
  
  const snapshot: EntitySnapshot = {
    id: entity.id,
    name: identity?.name || entity.id,
    description: identity?.description,
    shortDescription: identity?.shortDescription,
    location: world.getLocation(entity.id)
  };
  
  // Add physical properties
  if (physical) {
    snapshot.isPortable = physical.portable !== false;
  }
  
  // Add openable properties
  if (openable !== undefined) {
    snapshot.isOpenable = true;
    snapshot.isOpen = openable.isOpen === true;
  }
  
  // Add lockable properties
  if (lockable !== undefined) {
    snapshot.isLockable = true;
    snapshot.isLocked = lockable.isLocked === true;
  }
  
  // Add container properties
  if (container !== undefined) {
    snapshot.isContainer = true;
  }
  
  // Add supporter properties
  if (supporter !== undefined) {
    snapshot.isSupporter = true;
  }
  
  // Add wearable properties
  if (wearable !== undefined) {
    snapshot.isWearable = true;
    snapshot.isWorn = wearable.isWorn === true;
  }
  
  // Add other trait flags
  if (edible !== undefined) {
    snapshot.isEdible = true;
  }
  
  if (pushable !== undefined) {
    snapshot.isPushable = true;
  }
  
  if (scenery !== undefined) {
    snapshot.isScenery = true;
  }
  
  // Capture contents if requested
  if (includeContents && (container || supporter)) {
    const contents = world.getContents(entity.id);
    if (contents.length > 0) {
      snapshot.contents = contents.map(item => 
        captureEntitySnapshot(item, world, false) // Don't recurse deeply
      );
    }
  }
  
  // Add any custom traits (excluding standard ones we've already captured)
  const standardTraits = [
    'identity', 'physical', 'openable', 'lockable', 
    'container', 'supporter', 'wearable', 'edible', 
    'pushable', 'scenery'
  ];
  
  const customTraits: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entity)) {
    if (!standardTraits.includes(key) && key !== 'id' && key !== 'type') {
      customTraits[key] = value;
    }
  }
  
  if (Object.keys(customTraits).length > 0) {
    snapshot.traits = customTraits;
  }
  
  return snapshot;
}

/**
 * Capture a complete snapshot of a room's current state
 * 
 * @param room The room entity to snapshot
 * @param world The world model
 * @param includeContents Whether to include room contents
 * @returns Complete room snapshot
 */
export function captureRoomSnapshot(
  room: IFEntity,
  world: WorldModel,
  includeContents = true
): RoomSnapshot {
  const identity = room.get?.('identity') as any;
  const roomTrait = room.get?.('room') as any;
  const darknessTrait = room.get?.('darkness') as any;
  
  const snapshot: RoomSnapshot = {
    id: room.id,
    name: identity?.name || room.id,
    description: identity?.description
  };
  
  // Add darkness state
  if (darknessTrait !== undefined) {
    snapshot.isDark = darknessTrait.isDark === true;
  }
  
  // Add visited state
  if (roomTrait?.visited !== undefined) {
    snapshot.isVisited = roomTrait.visited === true;
  }
  
  // Capture exits
  const exits: Record<string, string> = {};
  const exitDirs = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 
                     'southeast', 'southwest', 'up', 'down', 'in', 'out'];
  
  for (const dir of exitDirs) {
    const exitId = (room as any)[dir];
    if (exitId && typeof exitId === 'string') {
      exits[dir] = exitId;
    }
  }
  
  if (Object.keys(exits).length > 0) {
    snapshot.exits = exits;
  }
  
  // Capture contents if requested
  if (includeContents) {
    const contents = world.getContents(room.id);
    if (contents.length > 0) {
      snapshot.contents = contents.map(item => 
        captureEntitySnapshot(item, world, true)
      );
    }
  }
  
  // Add any custom traits
  const standardTraits = ['identity', 'room', 'darkness'];
  const customTraits: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(room)) {
    if (!standardTraits.includes(key) && !exitDirs.includes(key) && 
        key !== 'id' && key !== 'type') {
      customTraits[key] = value;
    }
  }
  
  if (Object.keys(customTraits).length > 0) {
    snapshot.traits = customTraits;
  }
  
  return snapshot;
}

/**
 * Capture snapshots of multiple entities
 * 
 * @param entities Array of entities to snapshot
 * @param world The world model
 * @returns Array of entity snapshots
 */
export function captureEntitySnapshots(
  entities: IFEntity[],
  world: WorldModel
): EntitySnapshot[] {
  return entities.map(entity => captureEntitySnapshot(entity, world, true));
}

/**
 * Create a minimal entity reference (just id and name)
 * 
 * @param entity The entity to reference
 * @returns Minimal entity reference
 */
export function createEntityReference(entity: IFEntity): { id: string; name: string } {
  const identity = entity.get?.('identity') as any;
  return {
    id: entity.id,
    name: identity?.name || entity.id
  };
}

/**
 * Create references for multiple entities
 * 
 * @param entities Array of entities
 * @returns Array of entity references
 */
export function createEntityReferences(entities: IFEntity[]): { id: string; name: string }[] {
  return entities.map(createEntityReference);
}