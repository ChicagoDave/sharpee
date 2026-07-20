/**
 * Trait implementations map
 * 
 * Maps trait types to their implementation classes
 */

import { TraitType } from './trait-types.js';
import { ITrait, ITraitConstructor } from './trait.js';
import { setTraitRehydrator } from '../entities/trait-rehydrator.js';

// Import all trait implementations from their new locations
import { IdentityTrait } from './identity/identityTrait.js';
import { ContainerTrait } from './container/containerTrait.js';
import { SupporterTrait } from './supporter/supporterTrait.js';
import { RoomTrait } from './room/roomTrait.js';
import { WearableTrait } from './wearable/wearableTrait.js';
import { ClothingTrait } from './clothing/clothingTrait.js';
import { EdibleTrait } from './edible/edibleTrait.js';
import { SceneryTrait } from './scenery/sceneryTrait.js';

import { OpenableTrait } from './openable/openableTrait.js';
import { LockableTrait } from './lockable/lockableTrait.js';
import { CuttableTrait } from './cuttable/cuttableTrait.js';
import { DiggableTrait } from './diggable/diggableTrait.js';
import { SwitchableTrait } from './switchable/switchableTrait.js';
import { ReadableTrait } from './readable/readableTrait.js';
import { LightSourceTrait } from './light-source/lightSourceTrait.js';

// Spatial traits
import { DoorTrait } from './door/doorTrait.js';
import { ClimbableTrait } from './climbable/climbableTrait.js';
import { RegionTrait } from './region/regionTrait.js';
import { SceneTrait } from './scene/sceneTrait.js';

// Basic traits
import { ActorTrait } from './actor/actorTrait.js';

// New traits
import { ExitTrait } from './exit/exitTrait.js';

// Manipulation traits
import { PullableTrait } from './pullable/pullableTrait.js';
import { AttachedTrait } from './attached/attachedTrait.js';
import { PushableTrait } from './pushable/pushableTrait.js';
import { ButtonTrait } from './button/buttonTrait.js';
import { MoveableSceneryTrait } from './moveable-scenery/moveableSceneryTrait.js';

// Combat traits
import { WeaponTrait } from './weapon/weaponTrait.js';
import { BreakableTrait } from './breakable/breakableTrait.js';
import { DestructibleTrait } from './destructible/destructibleTrait.js';
import { CombatantTrait } from './combatant/combatantTrait.js';
import { EquippedTrait } from './equipped/equippedTrait.js';

// Health / life-state (ADR-226, ADR-223 child A)
import { HealthTrait } from './health/healthTrait.js';
import { DeadlyRoomTrait } from './deadly-room/deadlyRoomTrait.js';

// NPC traits (ADR-070)
import { NpcTrait } from './npc/npcTrait.js';
import { OpenInventoryTrait } from './open-inventory/openInventoryTrait.js';

// Character model (ADR-141)
import { CharacterModelTrait } from './character-model/characterModelTrait.js';

// Transport traits
import { VehicleTrait } from './vehicle/vehicleTrait.js';
import { EnterableTrait } from './enterable/enterableTrait.js';

// Concealment traits (ADR-148)
import { ConcealmentTrait } from './concealment/concealmentTrait.js';
import { ConcealedStateTrait } from './concealment/concealedStateTrait.js';

// Spatial sound traits (ADR-172)
import { AcousticTrait } from './acoustic/acousticTrait.js';
import { AcousticDampenerTrait } from './acoustic/acousticDampenerTrait.js';
import { ListenerTrait } from './listener/listenerTrait.js';

// System traits
import { StoryInfoTrait } from './story-info/storyInfoTrait.js';

/**
 * Map of trait types to their constructors
 */
export const TRAIT_IMPLEMENTATIONS: Record<TraitType, ITraitConstructor> = {
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
  [TraitType.CUTTABLE]: CuttableTrait,
  [TraitType.DIGGABLE]: DiggableTrait,
  [TraitType.SWITCHABLE]: SwitchableTrait,
  [TraitType.READABLE]: ReadableTrait,
  [TraitType.LIGHT_SOURCE]: LightSourceTrait,

  // Spatial traits
  [TraitType.DOOR]: DoorTrait,
  [TraitType.CLIMBABLE]: ClimbableTrait,
  [TraitType.REGION]: RegionTrait,
  [TraitType.SCENE]: SceneTrait,

  // Basic traits
  [TraitType.ACTOR]: ActorTrait,

  // New traits
  [TraitType.EXIT]: ExitTrait,

  // Manipulation traits
  [TraitType.PULLABLE]: PullableTrait,
  [TraitType.ATTACHED]: AttachedTrait,
  [TraitType.PUSHABLE]: PushableTrait,
  [TraitType.BUTTON]: ButtonTrait,
  [TraitType.MOVEABLE_SCENERY]: MoveableSceneryTrait,

  // Combat traits
  [TraitType.WEAPON]: WeaponTrait,
  [TraitType.BREAKABLE]: BreakableTrait,
  [TraitType.DESTRUCTIBLE]: DestructibleTrait,
  [TraitType.COMBATANT]: CombatantTrait,
  [TraitType.EQUIPPED]: EquippedTrait,

  // Health / life-state (ADR-226, ADR-223 child A)
  [TraitType.HEALTH]: HealthTrait,
  [TraitType.DEADLY_ROOM]: DeadlyRoomTrait,

  // NPC traits (ADR-070)
  [TraitType.NPC]: NpcTrait,
  [TraitType.OPEN_INVENTORY]: OpenInventoryTrait,

  // Character model (ADR-141)
  [TraitType.CHARACTER_MODEL]: CharacterModelTrait,

  // Transport traits
  [TraitType.VEHICLE]: VehicleTrait,
  [TraitType.ENTERABLE]: EnterableTrait,

  // Concealment traits (ADR-148)
  [TraitType.CONCEALMENT]: ConcealmentTrait as unknown as ITraitConstructor,
  [TraitType.CONCEALED_STATE]: ConcealedStateTrait as unknown as ITraitConstructor,

  // Spatial sound traits (ADR-172)
  [TraitType.ACOUSTIC]: AcousticTrait as unknown as ITraitConstructor,
  [TraitType.ACOUSTIC_DAMPENER]: AcousticDampenerTrait as unknown as ITraitConstructor,
  [TraitType.LISTENER]: ListenerTrait,

  // System traits
  [TraitType.STORY_INFO]: StoryInfoTrait,

  // Object property traits

  // Deprecated traits - these are handled differently now:
  // LOCATION - tracked by world model internally
  // PORTABLE - objects are takeable by default unless they have SceneryTrait
  // FIXED - replaced by SCENERY
};

/**
 * Get trait implementation by type
 */
export function getTraitImplementation(type: TraitType): ITraitConstructor | undefined {
  return TRAIT_IMPLEMENTATIONS[type];
}

/**
 * Create trait instance by type
 */
export function createTrait(type: TraitType, data?: any): InstanceType<ITraitConstructor> {
  const TraitClass = TRAIT_IMPLEMENTATIONS[type];
  if (!TraitClass) {
    throw new Error(`Unknown trait type: ${type}`);
  }
  return new TraitClass(data);
}

/**
 * Rehydrate a serialized trait to a live instance of its implementation class
 * (platform-issue-sweep Phase 5, 2026-07-20).
 *
 * Serialization captures own enumerable fields only; prototype accessors
 * (WearableTrait.isWorn) and methods (ConcealmentTrait.supportsPosition) live
 * on the class prototype and were LOST by the old raw-JSON rehydration —
 * after save/restore/undo, any consumer of a trait getter or method saw
 * `undefined` / not-a-function (e.g. getContents' worn-item filter reads
 * `wearable.isWorn`, so a restored worn item silently escaped the filter).
 *
 * Object.create + Object.assign restores the prototype and copies exactly
 * the serialized state without running constructor logic (constructor shapes
 * vary per trait; a save of the same code version carries the complete own
 * state). Unknown types — story-defined traits — keep the raw data object,
 * as before: their classes are not registered here.
 *
 * @param traitData a serialized trait ({ type, ...own fields })
 * @returns a prototype-restored instance for known core types; the raw data
 *          object for unknown (story-defined) types
 */
export function rehydrateTrait(traitData: { type: string } & Record<string, unknown>): ITrait {
  const TraitClass = TRAIT_IMPLEMENTATIONS[traitData.type as TraitType];
  if (!TraitClass) {
    return traitData as unknown as ITrait;
  }
  const instance = Object.create(TraitClass.prototype);
  return Object.assign(instance, traitData) as ITrait;
}

// Install the rehydrator into IFEntity.fromJSON's seam at module load. Wired
// through the entities/trait-rehydrator LEAF module — a static import from
// if-entity into this file would create module cycles (this file pulls in
// every trait class, including ConcealedStateTrait → VisibilityBehavior →
// capabilities → world). See trait-rehydrator.ts.
setTraitRehydrator(rehydrateTrait);

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
  CuttableTrait,
  DiggableTrait,
  SwitchableTrait,
  ReadableTrait,
  LightSourceTrait,

  // Spatial
  DoorTrait,
  RegionTrait,
  SceneTrait,

  // Basic
  ActorTrait,

  // New traits
  ExitTrait,
  ClimbableTrait,

  // Manipulation traits
  PullableTrait,
  AttachedTrait,
  PushableTrait,
  ButtonTrait,
  MoveableSceneryTrait,

  // Combat traits
  WeaponTrait,
  BreakableTrait,
  DestructibleTrait,
  CombatantTrait,
  EquippedTrait,

  // Health / life-state (ADR-226, ADR-223 child A)
  HealthTrait,

  // Deadly-room trigger shape (ADR-224)
  DeadlyRoomTrait,

  // NPC traits (ADR-070)
  NpcTrait,
  OpenInventoryTrait,

  // Character model (ADR-141)
  CharacterModelTrait,

  // Transport traits
  VehicleTrait,
  EnterableTrait,

  // System traits
  StoryInfoTrait

  // Object property traits
};
