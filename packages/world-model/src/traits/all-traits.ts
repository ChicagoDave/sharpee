/**
 * All trait classes in one convenient import
 * 
 * Usage:
 * import { Traits } from '@sharpee/world-model';
 * 
 * const openable = entity.get(TraitType.OPENABLE) as Traits.OpenableTrait;
 */

// Import all trait classes
import { ActorTrait } from './actor/actorTrait';
import { ContainerTrait } from './container/containerTrait';
import { DoorTrait } from './door/doorTrait';
import { EdibleTrait } from './edible/edibleTrait';
import { EntryTrait } from './entry/entryTrait';
import { ExitTrait } from './exit/exitTrait';
import { IdentityTrait } from './identity/identityTrait';
import { LightSourceTrait } from './light-source/lightSourceTrait';
import { LockableTrait } from './lockable/lockableTrait';
import { OpenableTrait } from './openable/openableTrait';
import { ReadableTrait } from './readable/readableTrait';
import { RoomTrait } from './room/roomTrait';
import { SceneryTrait } from './scenery/sceneryTrait';
import { SupporterTrait } from './supporter/supporterTrait';
import { SwitchableTrait } from './switchable/switchableTrait';
import { WearableTrait } from './wearable/wearableTrait';

// Export as namespace for easy access
export const Traits = {
  ActorTrait,
  ContainerTrait,
  DoorTrait,
  EdibleTrait,
  EntryTrait,
  ExitTrait,
  IdentityTrait,
  LightSourceTrait,
  LockableTrait,
  OpenableTrait,
  ReadableTrait,
  RoomTrait,
  SceneryTrait,
  SupporterTrait,
  SwitchableTrait,
  WearableTrait,
} as const;

// Also export types for convenience
export type {
  ActorTrait,
  ContainerTrait,
  DoorTrait,
  EdibleTrait,
  EntryTrait,
  ExitTrait,
  IdentityTrait,
  LightSourceTrait,
  LockableTrait,
  OpenableTrait,
  ReadableTrait,
  RoomTrait,
  SceneryTrait,
  SupporterTrait,
  SwitchableTrait,
  WearableTrait,
};

// Export a union type of all traits
export type AnyTrait = 
  | ActorTrait
  | ContainerTrait
  | DoorTrait
  | EdibleTrait
  | EntryTrait
  | ExitTrait
  | IdentityTrait
  | LightSourceTrait
  | LockableTrait
  | OpenableTrait
  | ReadableTrait
  | RoomTrait
  | SceneryTrait
  | SupporterTrait
  | SwitchableTrait
  | WearableTrait;

// Type guards for each trait
export function isActorTrait(trait: any): trait is ActorTrait {
  return trait?.type === 'actor';
}

export function isContainerTrait(trait: any): trait is ContainerTrait {
  return trait?.type === 'container';
}

export function isDoorTrait(trait: any): trait is DoorTrait {
  return trait?.type === 'door';
}

export function isEdibleTrait(trait: any): trait is EdibleTrait {
  return trait?.type === 'edible';
}

export function isEntryTrait(trait: any): trait is EntryTrait {
  return trait?.type === 'entry';
}

export function isExitTrait(trait: any): trait is ExitTrait {
  return trait?.type === 'exit';
}

export function isIdentityTrait(trait: any): trait is IdentityTrait {
  return trait?.type === 'identity';
}

export function isLightSourceTrait(trait: any): trait is LightSourceTrait {
  return trait?.type === 'lightSource';
}

export function isLockableTrait(trait: any): trait is LockableTrait {
  return trait?.type === 'lockable';
}

export function isOpenableTrait(trait: any): trait is OpenableTrait {
  return trait?.type === 'openable';
}

export function isReadableTrait(trait: any): trait is ReadableTrait {
  return trait?.type === 'readable';
}

export function isRoomTrait(trait: any): trait is RoomTrait {
  return trait?.type === 'room';
}

export function isSceneryTrait(trait: any): trait is SceneryTrait {
  return trait?.type === 'scenery';
}

export function isSupporterTrait(trait: any): trait is SupporterTrait {
  return trait?.type === 'supporter';
}

export function isSwitchableTrait(trait: any): trait is SwitchableTrait {
  return trait?.type === 'switchable';
}

export function isWearableTrait(trait: any): trait is WearableTrait {
  return trait?.type === 'wearable';
}
