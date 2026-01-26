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
