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

// Inflatable Entering Interceptor (ADR-118)
export { InflatableEnteringInterceptor, BoatPunctureMessages } from '../interceptors/inflatable-entering-interceptor';

// Glacier (meltable by lit torch)
export {
  GlacierTrait,
  GlacierTraitConfig,
  GlacierTraitConstructor
} from './glacier-trait';

// Glacier Throwing Interceptor (ADR-118)
export { GlacierThrowingInterceptor, GlacierMessages } from '../interceptors/glacier-throwing-interceptor';

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

// Balloon Receptacle (brazier in balloon basket)
export {
  BalloonReceptacleTrait,
  BalloonReceptacleTraitConfig,
  BalloonReceptacleTraitConstructor
} from './balloon-receptacle-trait';

// Receptacle Putting Interceptor (ADR-118)
export { ReceptaclePuttingInterceptor, ReceptacleMessages } from '../interceptors/receptacle-putting-interceptor';

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

// Machine State (coal machine activation)
export {
  MachineStateTrait,
  MachineStateTraitConfig,
  MachineStateTraitConstructor
} from './machine-state-trait';

// Round Room (spinning carousel state)
export {
  RoundRoomTrait,
  RoundRoomTraitConfig,
  RoundRoomTraitConstructor
} from './round-room-trait';

// Rope State (dome room rope attachment)
export {
  RopeStateTrait,
  RopeStateTraitConfig,
  RopeStateTraitConstructor
} from './rope-state-trait';

// Riddle Room (puzzle solved state)
export {
  RiddleRoomTrait,
  RiddleRoomTraitConfig,
  RiddleRoomTraitConstructor
} from './riddle-room-trait';

// Bucket (water container state)
export {
  BucketTrait,
  BucketTraitConfig,
  BucketTraitConstructor
} from './bucket-trait';

// Hades Entry (spirits blocking state)
export {
  HadesEntryTrait,
  HadesEntryTraitConfig,
  HadesEntryTraitConstructor
} from './hades-entry-trait';

// Frame Piece (ghost ritual dropping interceptor)
export {
  FramePieceTrait,
  FramePieceTraitConstructor
} from './frame-piece-trait';

// Ghost Ritual Dropping Interceptor (ADR-118)
export { GhostRitualDroppingInterceptor, GhostRitualInterceptorMessages } from '../interceptors/ghost-ritual-dropping-interceptor';

// Basin Room (ritual basin trap state)
export {
  BasinRoomTrait,
  BasinRoomTraitConfig,
  BasinRoomTraitConstructor,
  BasinState
} from './basin-room-trait';

// Royal Puzzle (sliding block puzzle state)
export {
  RoyalPuzzleTrait,
  RoyalPuzzleTraitConfig,
  RoyalPuzzleTraitConstructor
} from './royal-puzzle-trait';
