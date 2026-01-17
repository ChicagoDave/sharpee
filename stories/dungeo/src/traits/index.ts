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
