/**
 * Vehicle Trait - For enterable containers that transport actors
 *
 * Vehicles are enterable containers (bucket, boat, basket, balloon) where:
 * - Actor enters the vehicle (ENTER BUCKET)
 * - Vehicle moves, taking its contents with it
 * - Actor exits the vehicle (EXIT BUCKET)
 *
 * Based on Infocom's vehicle concept from Zork.
 */

import { TraitType } from '../trait-types';
import { ITrait } from '../trait';

/**
 * Vehicle type determines movement behavior
 */
export type VehicleType =
  | 'counterweight'  // Bucket - moves based on water weight
  | 'watercraft'     // Boat - floats on water, affected by current
  | 'aircraft'       // Balloon - rises/descends based on heat
  | 'cable'          // Basket - raised/lowered by mechanism
  | 'generic';       // Custom vehicle behavior

/**
 * Trait for vehicles - enterable containers that transport actors
 */
export class VehicleTrait implements ITrait {
  static readonly type = TraitType.VEHICLE;
  readonly type = TraitType.VEHICLE;

  /** Type of vehicle determines default behavior */
  vehicleType: VehicleType;

  /**
   * When vehicle moves, all contents (including actors) move with it.
   * This is always true for vehicles.
   */
  readonly movesWithContents: boolean = true;

  /**
   * If true, actor cannot use GO/walk commands while in vehicle.
   * Movement must be through vehicle-specific actions.
   * - Bucket: POUR/FILL moves it
   * - Boat: row, current moves it
   * - Balloon: burn/release moves it
   */
  blocksWalkingMovement: boolean;

  /**
   * If true, actor must EXIT vehicle before leaving the room on foot.
   * Prevents "GO EAST" while sitting in a bucket.
   */
  requiresExitBeforeLeaving: boolean;

  /**
   * Current location/state of the vehicle (e.g., 'top', 'bottom', 'river-1')
   * Used by vehicle-specific logic to track position.
   */
  currentPosition?: string;

  /**
   * Map of position names to room IDs.
   * e.g., { 'top': 'top-of-well', 'bottom': 'well-bottom' }
   */
  positionRooms?: Record<string, string>;

  /**
   * Whether the vehicle is currently operational/usable.
   * Boat might need to be inflated, balloon might need fuel.
   */
  isOperational: boolean;

  /**
   * Reason the vehicle is not operational (for error messages).
   */
  notOperationalReason?: string;

  /**
   * If true, visibility passes through to the containing room.
   * - Bucket, raft, boat: transparent (can see the room you're in)
   * - Airplane, submarine: not transparent (see vehicle interior only)
   */
  transparent: boolean;

  constructor(options: Partial<Omit<VehicleTrait, 'type' | 'movesWithContents'>> = {}) {
    this.vehicleType = options.vehicleType ?? 'generic';
    this.blocksWalkingMovement = options.blocksWalkingMovement ?? true;
    this.requiresExitBeforeLeaving = options.requiresExitBeforeLeaving ?? true;
    this.currentPosition = options.currentPosition;
    this.positionRooms = options.positionRooms;
    this.isOperational = options.isOperational ?? true;
    this.notOperationalReason = options.notOperationalReason;
    this.transparent = options.transparent ?? true; // Default to transparent for most IF vehicles
  }
}

/**
 * Type guard for VehicleTrait
 */
export function isVehicleTrait(trait: ITrait): trait is VehicleTrait {
  return trait.type === TraitType.VEHICLE;
}

/**
 * Factory function for creating VehicleTrait
 */
export function createVehicleTrait(
  options: Partial<Omit<VehicleTrait, 'type' | 'movesWithContents'>> = {}
): VehicleTrait {
  return new VehicleTrait(options);
}
