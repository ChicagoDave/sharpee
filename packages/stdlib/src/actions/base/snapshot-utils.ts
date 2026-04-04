/**
 * Snapshot utilities for capturing entity and room state
 * 
 * These utilities help actions capture complete state snapshots
 * for atomic events during the report phase.
 */

import {
  IFEntity, WorldModel, IdentityTrait, OpenableTrait, LockableTrait,
  ContainerTrait, SupporterTrait, WearableTrait, EdibleTrait,
  PushableTrait, SceneryTrait, RoomTrait, TraitType, DirectionType
} from '@sharpee/world-model';

/**
 * Entity snapshot containing all relevant state
 */
export interface EntitySnapshot {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  /** Message ID for localized name (ADR-107) */
  nameId?: string;
  /** Message ID for localized description (ADR-107) */
  descriptionId?: string;
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
  /** Message ID for localized name (ADR-107) */
  nameId?: string;
  /** Message ID for localized description (ADR-107) */
  descriptionId?: string;
  isDark?: boolean;
  isVisited?: boolean;
  exits?: Record<string, string>;
  /** Direction constant → display name from the active vocabulary (ADR-143) */
  exitDisplayNames?: Record<string, string>;
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
  const identity = entity.getTrait(IdentityTrait);
  const openable = entity.getTrait(OpenableTrait);
  const lockable = entity.getTrait(LockableTrait);
  const container = entity.getTrait(ContainerTrait);
  const supporter = entity.getTrait(SupporterTrait);
  const wearable = entity.getTrait(WearableTrait);
  const edible = entity.getTrait(EdibleTrait);
  const pushable = entity.getTrait(PushableTrait);
  const scenery = entity.getTrait(SceneryTrait);

  const snapshot: EntitySnapshot = {
    id: entity.id,
    name: identity?.name || entity.id,
    description: identity?.description,
    shortDescription: identity?.brief,
    // Include message IDs if present (ADR-107 dual-mode)
    nameId: identity?.nameId,
    descriptionId: identity?.descriptionId,
    location: world.getLocation(entity.id)
  };

  // Portability: entities are portable unless they have SceneryTrait
  if (!scenery) {
    snapshot.isPortable = true;
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
  const identity = room.getTrait(IdentityTrait);
  const roomTrait = room.getTrait(RoomTrait);

  const snapshot: RoomSnapshot = {
    id: room.id,
    name: identity?.name || String(room.attributes?.name || room.id),
    description: identity?.description || (room.attributes?.description as string | undefined),
    // Include message IDs if present (ADR-107 dual-mode)
    nameId: identity?.nameId,
    descriptionId: identity?.descriptionId
  };

  // Add darkness state from room trait
  if (roomTrait?.isDark !== undefined) {
    snapshot.isDark = roomTrait.isDark === true;
  }

  // Add visited state
  if (roomTrait?.visited !== undefined) {
    snapshot.isVisited = roomTrait.visited === true;
  }

  // Capture exits from room trait
  const exits: Record<string, string> = {};
  const exitDisplayNames: Record<string, string> = {};
  if (roomTrait?.exits) {
    const vocab = world.directions();
    for (const [dir, exitInfo] of Object.entries(roomTrait.exits)) {
      if (exitInfo?.destination) {
        exits[dir] = exitInfo.destination;
        exitDisplayNames[dir] = vocab.getDisplayName(dir as DirectionType);
      }
    }
  }

  if (Object.keys(exits).length > 0) {
    snapshot.exits = exits;
    snapshot.exitDisplayNames = exitDisplayNames;
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
  const standardRoomTraits = ['identity', 'room', 'darkness'];
  const customTraits: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(room)) {
    if (!standardRoomTraits.includes(key) && key !== 'id' && key !== 'type') {
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
  const identity = entity.getTrait(IdentityTrait);
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