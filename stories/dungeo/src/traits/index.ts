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
  TrollAxeTakingInterceptor,
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
  TrollTakingInterceptor,
  TrollTalkingInterceptor,
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

// Treasure (ADR-129: story-level trait for trophy case scoring)
export { TreasureTrait, TreasureTraitConfig } from './treasure-trait';

// Trophy Case (ADR-129: marker trait for trophy case entity)
export { TrophyCaseTrait } from './trophy-case-trait';

// Trophy Case Putting Interceptor (ADR-129)
export { TrophyCasePuttingInterceptor } from '../interceptors/trophy-case-putting-interceptor';

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
export { GhostRitualDroppingInterceptor, GhostRitualInterceptorMessages, GhostRitualMessages } from '../interceptors/ghost-ritual-dropping-interceptor';

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

// Sphere (cage puzzle taking interceptor)
export {
  SphereTrait,
  SphereTraitConfig,
  SphereTraitConstructor
} from './sphere-trait';

// Sphere Taking Interceptor (ADR-118)
export { SphereTakingInterceptor, CageMessages } from '../interceptors/sphere-taking-interceptor';

// Gas Room (destination entry interceptor, ADR-126)
export {
  GasRoomTrait,
  GasRoomTraitConstructor
} from './gas-room-trait';

// Gas Room Entry Interceptor (ADR-126)
export { GasRoomEntryInterceptor, GasRoomEntryMessages } from '../interceptors/gas-room-entry-interceptor';

// Safe (rusty box in Dusty Room, brick explosion puzzle)
export { SafeTrait, SafeTraitConstructor } from './safe-trait';

// Safe Opening/Closing Interceptors
export { SafeOpeningInterceptor, SafeClosingInterceptor, SafeOpeningMessages } from '../interceptors/safe-opening-interceptor';
