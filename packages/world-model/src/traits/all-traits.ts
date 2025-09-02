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
import { AttachedTrait } from './attached/attachedTrait';
import { ButtonTrait } from './button/buttonTrait';
import { ClothingTrait } from './clothing/clothingTrait';
import { ContainerTrait } from './container/containerTrait';
import { DoorTrait } from './door/doorTrait';
import { ClimbableTrait } from './climbable/climbableTrait';
import { EdibleTrait } from './edible/edibleTrait';
import { ExitTrait } from './exit/exitTrait';
import { IdentityTrait } from './identity/identityTrait';
import { LightSourceTrait } from './light-source/lightSourceTrait';
import { LockableTrait } from './lockable/lockableTrait';
import { MoveableSceneryTrait } from './moveable-scenery/moveableSceneryTrait';
import { OpenableTrait } from './openable/openableTrait';
import { PullableTrait } from './pullable/pullableTrait';
import { PushableTrait } from './pushable/pushableTrait';
import { ReadableTrait } from './readable/readableTrait';
import { RoomTrait } from './room/roomTrait';
import { SceneryTrait } from './scenery/sceneryTrait';
import { SupporterTrait } from './supporter/supporterTrait';
import { SwitchableTrait } from './switchable/switchableTrait';
import { WearableTrait } from './wearable/wearableTrait';
import { WeaponTrait } from './weapon/weaponTrait';
import { BreakableTrait } from './breakable/breakableTrait';
import { DestructibleTrait } from './destructible/destructibleTrait';
import { CombatantTrait } from './combatant/combatantTrait';
import { EquippedTrait } from './equipped/equippedTrait';

// Export as namespace for easy access
export const Traits = {
  ActorTrait,
  AttachedTrait,
  ButtonTrait,
  ClimbableTrait,
  ClothingTrait,
  ContainerTrait,
  DoorTrait,
  EdibleTrait,
  ExitTrait,
  IdentityTrait,
  LightSourceTrait,
  LockableTrait,
  MoveableSceneryTrait,
  OpenableTrait,
  PullableTrait,
  PushableTrait,
  ReadableTrait,
  RoomTrait,
  SceneryTrait,
  SupporterTrait,
  SwitchableTrait,
  WearableTrait,
  WeaponTrait,
  BreakableTrait,
  DestructibleTrait,
  CombatantTrait,
  EquippedTrait,
} as const;

// Also export types for convenience
export type {
  ActorTrait,
  AttachedTrait,
  ButtonTrait,
  ClimbableTrait,
  ClothingTrait,
  ContainerTrait,
  DoorTrait,
  EdibleTrait,
  ExitTrait,
  IdentityTrait,
  LightSourceTrait,
  LockableTrait,
  MoveableSceneryTrait,
  OpenableTrait,
  PullableTrait,
  PushableTrait,
  ReadableTrait,
  RoomTrait,
  SceneryTrait,
  SupporterTrait,
  SwitchableTrait,
  WearableTrait,
  WeaponTrait,
  BreakableTrait,
  DestructibleTrait,
  CombatantTrait,
  EquippedTrait,
};

// Export a union type of all traits
export type AnyTrait =
  | ActorTrait
  | AttachedTrait
  | ButtonTrait
  | ClimbableTrait
  | ClothingTrait
  | ContainerTrait
  | DoorTrait
  | EdibleTrait
  | ExitTrait
  | IdentityTrait
  | LightSourceTrait
  | LockableTrait
  | MoveableSceneryTrait
  | OpenableTrait
  | PullableTrait
  | PushableTrait
  | ReadableTrait
  | RoomTrait
  | SceneryTrait
  | SupporterTrait
  | SwitchableTrait
  | WearableTrait
  | WeaponTrait
  | BreakableTrait
  | DestructibleTrait
  | CombatantTrait
  | EquippedTrait;

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

export function isClothingTrait(trait: any): trait is ClothingTrait {
  return trait?.type === 'clothing';
}

export function isAttachedTrait(trait: any): trait is AttachedTrait {
  return trait?.type === 'attached';
}

export function isPullableTrait(trait: any): trait is PullableTrait {
  return trait?.type === 'pullable';
}

export function isPushableTrait(trait: any): trait is PushableTrait {
  return trait?.type === 'pushable';
}

export function isButtonTrait(trait: any): trait is ButtonTrait {
  return trait?.type === 'button';
}

export function isMoveableSceneryTrait(trait: any): trait is MoveableSceneryTrait {
  return trait?.type === 'moveableScenery';
}

export function isWeaponTrait(trait: any): trait is WeaponTrait {
  return trait?.type === 'weapon';
}

export function isBreakableTrait(trait: any): trait is BreakableTrait {
  return trait?.type === 'breakable';
}

export function isDestructibleTrait(trait: any): trait is DestructibleTrait {
  return trait?.type === 'destructible';
}

export function isCombatantTrait(trait: any): trait is CombatantTrait {
  return trait?.type === 'combatant';
}

export function isEquippedTrait(trait: any): trait is EquippedTrait {
  return trait?.type === 'equipped';
}
