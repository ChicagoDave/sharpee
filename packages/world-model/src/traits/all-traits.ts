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
import { BellPullTrait } from './bell-pull/bellPullTrait';
import { BreakableTrait } from './breakable/breakableTrait';
import { ButtonTrait } from './button/buttonTrait';
import { ClothingTrait } from './clothing/clothingTrait';
import { ContainerTrait } from './container/containerTrait';
import { CordTrait } from './cord/cordTrait';
import { CrankTrait } from './crank/crankTrait';
import { DialTrait } from './dial/dialTrait';
import { DoorTrait } from './door/doorTrait';
import { EdibleTrait } from './edible/edibleTrait';
import { EntryTrait } from './entry/entryTrait';
import { ExitTrait } from './exit/exitTrait';
import { FragileTrait } from './fragile/fragileTrait';
import { IdentityTrait } from './identity/identityTrait';
import { KnobTrait } from './knob/knobTrait';
import { LeverTrait } from './lever/leverTrait';
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
import { TurnableTrait } from './turnable/turnableTrait';
import { ValveTrait } from './valve/valveTrait';
import { WearableTrait } from './wearable/wearableTrait';
import { WheelTrait } from './wheel/wheelTrait';

// Export as namespace for easy access
export const Traits = {
  ActorTrait,
  AttachedTrait,
  BellPullTrait,
  BreakableTrait,
  ButtonTrait,
  ClothingTrait,
  ContainerTrait,
  CordTrait,
  CrankTrait,
  DialTrait,
  DoorTrait,
  EdibleTrait,
  EntryTrait,
  ExitTrait,
  FragileTrait,
  IdentityTrait,
  KnobTrait,
  LeverTrait,
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
  TurnableTrait,
  ValveTrait,
  WearableTrait,
  WheelTrait,
} as const;

// Also export types for convenience
export type {
  ActorTrait,
  AttachedTrait,
  BellPullTrait,
  BreakableTrait,
  ButtonTrait,
  ClothingTrait,
  ContainerTrait,
  CordTrait,
  CrankTrait,
  DialTrait,
  DoorTrait,
  EdibleTrait,
  EntryTrait,
  ExitTrait,
  FragileTrait,
  IdentityTrait,
  KnobTrait,
  LeverTrait,
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
  TurnableTrait,
  ValveTrait,
  WearableTrait,
  WheelTrait,
};

// Export a union type of all traits
export type AnyTrait = 
  | ActorTrait
  | AttachedTrait
  | BellPullTrait
  | BreakableTrait
  | ButtonTrait
  | ClothingTrait
  | ContainerTrait
  | CordTrait
  | CrankTrait
  | DialTrait
  | DoorTrait
  | EdibleTrait
  | EntryTrait
  | ExitTrait
  | FragileTrait
  | IdentityTrait
  | KnobTrait
  | LeverTrait
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
  | TurnableTrait
  | ValveTrait
  | WearableTrait
  | WheelTrait;

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

export function isAttachedTrait(trait: any): trait is AttachedTrait {
  return trait?.type === 'attached';
}

export function isBellPullTrait(trait: any): trait is BellPullTrait {
  return trait?.type === 'bellPull';
}

export function isBreakableTrait(trait: any): trait is BreakableTrait {
  return trait?.type === 'breakable';
}

export function isButtonTrait(trait: any): trait is ButtonTrait {
  return trait?.type === 'button';
}

export function isClothingTrait(trait: any): trait is ClothingTrait {
  return trait?.type === 'clothing';
}

export function isCordTrait(trait: any): trait is CordTrait {
  return trait?.type === 'cord';
}

export function isCrankTrait(trait: any): trait is CrankTrait {
  return trait?.type === 'crank';
}

export function isDialTrait(trait: any): trait is DialTrait {
  return trait?.type === 'dial';
}

export function isFragileTrait(trait: any): trait is FragileTrait {
  return trait?.type === 'fragile';
}

export function isKnobTrait(trait: any): trait is KnobTrait {
  return trait?.type === 'knob';
}

export function isLeverTrait(trait: any): trait is LeverTrait {
  return trait?.type === 'lever';
}

export function isMoveableSceneryTrait(trait: any): trait is MoveableSceneryTrait {
  return trait?.type === 'moveableScenery';
}

export function isPullableTrait(trait: any): trait is PullableTrait {
  return trait?.type === 'pullable';
}

export function isPushableTrait(trait: any): trait is PushableTrait {
  return trait?.type === 'pushable';
}

export function isTurnableTrait(trait: any): trait is TurnableTrait {
  return trait?.type === 'turnable';
}

export function isValveTrait(trait: any): trait is ValveTrait {
  return trait?.type === 'valve';
}

export function isWheelTrait(trait: any): trait is WheelTrait {
  return trait?.type === 'wheel';
}
