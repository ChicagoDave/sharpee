/**
 * All trait classes in one convenient import
 * 
 * Usage:
 * import { Traits } from '@sharpee/world-model';
 * 
 * const openable = entity.get(TraitType.OPENABLE) as Traits.OpenableTrait;
 */

// Import all trait classes
import { ActorTrait } from './actor/actorTrait.js';
import { AttachedTrait } from './attached/attachedTrait.js';
import { ButtonTrait } from './button/buttonTrait.js';
import { ContainerTrait } from './container/containerTrait.js';
import { DoorTrait } from './door/doorTrait.js';
import { ClimbableTrait } from './climbable/climbableTrait.js';
import { EdibleTrait } from './edible/edibleTrait.js';
import { ExitTrait } from './exit/exitTrait.js';
import { IdentityTrait } from './identity/identityTrait.js';
import { LightSourceTrait } from './light-source/lightSourceTrait.js';
import { LockableTrait } from './lockable/lockableTrait.js';
import { MoveableSceneryTrait } from './moveable-scenery/moveableSceneryTrait.js';
import { OpenableTrait } from './openable/openableTrait.js';
import { PullableTrait } from './pullable/pullableTrait.js';
import { PushableTrait } from './pushable/pushableTrait.js';
import { ReadableTrait } from './readable/readableTrait.js';
import { RoomTrait } from './room/roomTrait.js';
import { SceneryTrait } from './scenery/sceneryTrait.js';
import { SupporterTrait } from './supporter/supporterTrait.js';
import { SwitchableTrait } from './switchable/switchableTrait.js';
import { WearableTrait } from './wearable/wearableTrait.js';
import { WeaponTrait } from './weapon/weaponTrait.js';
import { BreakableTrait } from './breakable/breakableTrait.js';
import { DestructibleTrait } from './destructible/destructibleTrait.js';
import { CombatantTrait } from './combatant/combatantTrait.js';
import { EquippedTrait } from './equipped/equippedTrait.js';
import { EnterableTrait } from './enterable/enterableTrait.js';
import { CharacterModelTrait } from './character-model/characterModelTrait.js';

// Export as namespace for easy access
export const Traits = {
  ActorTrait,
  AttachedTrait,
  ButtonTrait,
  ClimbableTrait,
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
  EnterableTrait,
  CharacterModelTrait,
} as const;

// Also export types for convenience
export type {
  ActorTrait,
  AttachedTrait,
  ButtonTrait,
  ClimbableTrait,
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
  EnterableTrait,
  CharacterModelTrait,
};

// Export a union type of all traits
export type AnyTrait =
  | ActorTrait
  | AttachedTrait
  | ButtonTrait
  | ClimbableTrait
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
  | EquippedTrait
  | EnterableTrait
  | CharacterModelTrait;

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

export function isCharacterModelTrait(trait: any): trait is CharacterModelTrait {
  return trait?.type === 'characterModel';
}

// Note: isEnterableTrait is exported from ./enterable/enterableTrait.ts
