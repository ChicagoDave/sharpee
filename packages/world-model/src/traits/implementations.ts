/**
 * Trait implementations map
 * 
 * Maps trait types to their implementation classes
 */

import { TraitType } from './trait-types';
import { TraitConstructor } from './trait';

// Import all trait implementations from their new locations
import { IdentityTrait } from './identity/identityTrait';
import { ContainerTrait } from './container/containerTrait';
import { SupporterTrait } from './supporter/supporterTrait';
import { RoomTrait } from './room/roomTrait';
import { WearableTrait } from './wearable/wearableTrait';
import { ClothingTrait } from './clothing/clothingTrait';
import { EdibleTrait } from './edible/edibleTrait';
import { SceneryTrait } from './scenery/sceneryTrait';

import { OpenableTrait } from './openable/openableTrait';
import { LockableTrait } from './lockable/lockableTrait';
import { SwitchableTrait } from './switchable/switchableTrait';
import { ReadableTrait } from './readable/readableTrait';
import { LightSourceTrait } from './light-source/lightSourceTrait';

// Spatial traits
import { DoorTrait } from './door/doorTrait';

// Basic traits
import { ActorTrait } from './actor/actorTrait';

// New traits
import { ExitTrait } from './exit/exitTrait';
import { EntryTrait } from './entry/entryTrait';

/**
 * Map of trait types to their constructors
 */
export const TRAIT_IMPLEMENTATIONS: Record<TraitType, TraitConstructor> = {
  // Core traits (organized in their own folders)
  [TraitType.IDENTITY]: IdentityTrait,
  [TraitType.CONTAINER]: ContainerTrait,
  [TraitType.SUPPORTER]: SupporterTrait,
  [TraitType.ROOM]: RoomTrait,
  [TraitType.WEARABLE]: WearableTrait,
  [TraitType.CLOTHING]: ClothingTrait,
  [TraitType.EDIBLE]: EdibleTrait,
  [TraitType.SCENERY]: SceneryTrait,
  
  // Interactive traits
  [TraitType.OPENABLE]: OpenableTrait,
  [TraitType.LOCKABLE]: LockableTrait,
  [TraitType.SWITCHABLE]: SwitchableTrait,
  [TraitType.READABLE]: ReadableTrait,
  [TraitType.LIGHT_SOURCE]: LightSourceTrait,
  
  // Spatial traits
  [TraitType.DOOR]: DoorTrait,
  
  // Basic traits
  [TraitType.ACTOR]: ActorTrait,
  
  // New traits
  [TraitType.EXIT]: ExitTrait,
  [TraitType.ENTRY]: EntryTrait,
  
  // Deprecated traits - these are handled differently now:
  // LOCATION - tracked by world model internally
  // PORTABLE - objects are takeable by default
  // FIXED - replaced by SCENERY
};

/**
 * Get trait implementation by type
 */
export function getTraitImplementation(type: TraitType): TraitConstructor | undefined {
  return TRAIT_IMPLEMENTATIONS[type];
}

/**
 * Create trait instance by type
 */
export function createTrait(type: TraitType, data?: any): InstanceType<TraitConstructor> {
  const TraitClass = TRAIT_IMPLEMENTATIONS[type];
  if (!TraitClass) {
    throw new Error(`Unknown trait type: ${type}`);
  }
  return new TraitClass(data);
}

// Re-export individual implementations
export {
  // Core traits
  IdentityTrait,
  ContainerTrait,
  SupporterTrait,
  RoomTrait,
  WearableTrait,
  ClothingTrait,
  EdibleTrait,
  SceneryTrait,
  
  // Interactive
  OpenableTrait,
  LockableTrait,
  SwitchableTrait,
  ReadableTrait,
  LightSourceTrait,
  
  // Spatial
  DoorTrait,
  
  // Basic
  ActorTrait,
  
  // New traits
  ExitTrait,
  EntryTrait
};
