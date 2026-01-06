/**
 * Basket Elevator Trait
 *
 * Trait for the rusty iron basket in the Coal Mine.
 * Declares capabilities for lowering/raising via ADR-090 capability dispatch.
 *
 * The basket is an elevator that moves between the Shaft Room (top)
 * and Bottom of Shaft (bottom).
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Basket position - where the basket currently is
 */
export type BasketPosition = 'top' | 'bottom';

/**
 * Configuration for the basket elevator
 */
export interface BasketElevatorConfig {
  /** Room ID of the top position (Shaft Room) */
  topRoomId: string;
  /** Room ID of the bottom position (Bottom of Shaft) */
  bottomRoomId: string;
  /** Initial position of the basket */
  initialPosition?: BasketPosition;
}

/**
 * Basket Elevator Trait
 *
 * Entities with this trait can be lowered and raised.
 * The trait stores the current position and room IDs for both ends.
 */
export class BasketElevatorTrait implements ITrait {
  static readonly type = 'dungeo.trait.basket_elevator' as const;
  static readonly capabilities = ['if.action.lowering', 'if.action.raising'] as const;

  readonly type = BasketElevatorTrait.type;

  /** Current position of the basket */
  position: BasketPosition;

  /** Room ID at the top of the elevator */
  topRoomId: string;

  /** Room ID at the bottom of the elevator */
  bottomRoomId: string;

  constructor(config: BasketElevatorConfig) {
    this.topRoomId = config.topRoomId;
    this.bottomRoomId = config.bottomRoomId;
    this.position = config.initialPosition ?? 'top';
  }

  /**
   * Get the room ID for the current position
   */
  getCurrentRoomId(): string {
    return this.position === 'top' ? this.topRoomId : this.bottomRoomId;
  }

  /**
   * Get the room ID for the destination after moving
   */
  getDestinationRoomId(): string {
    return this.position === 'top' ? this.bottomRoomId : this.topRoomId;
  }
}

// Ensure the class implements ITraitConstructor
export const BasketElevatorTraitConstructor: ITraitConstructor<BasketElevatorTrait> =
  BasketElevatorTrait;
