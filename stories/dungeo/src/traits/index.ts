/**
 * Dungeo Story Traits
 *
 * Custom traits for Project Dungeo that use capability dispatch (ADR-090).
 */

// Basket Elevator
export {
  BasketElevatorTrait,
  BasketElevatorConfig,
  BasketPosition,
  BasketElevatorTraitConstructor
} from './basket-elevator-trait';

export {
  BasketLoweringBehavior,
  BasketRaisingBehavior,
  BasketElevatorMessages
} from './basket-elevator-behaviors';

// Troll Axe (guardian-blocked taking)
export {
  TrollAxeTrait,
  TrollAxeConfig,
  TrollAxeTraitConstructor
} from './troll-axe-trait';

export {
  TrollAxeTakingBehavior,
  TrollAxeVisibilityBehavior,
  TrollAxeMessages
} from './troll-axe-behaviors';

// Troll NPC trait and behaviors
export {
  TrollTrait,
  TrollTraitConfig,
  TrollTraitConstructor
} from './troll-trait';

export {
  TrollTakingBehavior,
  TrollAttackingBehavior,
  TrollTalkingBehavior,
  TrollCapabilityMessages
} from './troll-capability-behaviors';

// Egg (player can't open, only thief can)
export {
  EggTrait,
  EggTraitConfig,
  EggTraitConstructor
} from './egg-trait';

export {
  EggOpeningBehavior,
  EggMessages
} from './egg-behaviors';

// Treasure (scoring and trophy case)
export {
  TreasureTrait,
  TreasureTraitConfig,
  TreasureTraitConstructor
} from './treasure-trait';

// Inflatable (boat and balloon cloth bag)
export {
  InflatableTrait,
  InflatableTraitConfig,
  InflatableTraitConstructor
} from './inflatable-trait';

// Burnable (incense, candles, guidebook, etc.)
export {
  BurnableTrait,
  BurnableTraitConfig,
  BurnableTraitConstructor
} from './burnable-trait';

// River Navigation (water rooms, launch points, rainbow)
export {
  RiverNavigationTrait,
  RiverNavigationTraitConfig,
  RiverNavigationTraitConstructor
} from './river-navigation-trait';

// Balloon State (hot air balloon in volcano region)
export {
  BalloonStateTrait,
  BalloonStateTraitConfig,
  BalloonStateTraitConstructor,
  BalloonPosition,
  isLedgePosition,
  isMidairPosition,
  nextPositionUp,
  nextPositionDown,
  ledgeToMidair
} from './balloon-state-trait';

// Tiny Room Door Puzzle (key-in-lock puzzle)
export {
  TinyRoomDoorTrait,
  TinyRoomDoorTraitConfig,
  TinyRoomDoorTraitConstructor
} from './tiny-room-door-trait';

export {
  TinyRoomKeyTrait,
  TinyRoomKeyTraitConfig,
  TinyRoomKeyTraitConstructor
} from './tiny-room-key-trait';

export {
  UnderDoorTrait,
  UnderDoorTraitConfig,
  UnderDoorTraitConstructor
} from './under-door-trait';
