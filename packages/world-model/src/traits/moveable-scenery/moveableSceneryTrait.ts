/**
 * Moveable scenery trait implementation
 */

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

export interface IMoveableSceneryData {
  /**
   * Weight class of the object
   */
  weightClass?: 'light' | 'medium' | 'heavy' | 'immense';
  
  /**
   * Whether it reveals something when moved
   */
  revealsWhenMoved?: boolean;
  
  /**
   * Entity ID of what is revealed
   */
  reveals?: string;
  
  /**
   * Whether it blocks exits in its current position
   */
  blocksExits?: boolean;
  
  /**
   * Which exits it blocks (direction names)
   */
  blockedExits?: string[];
  
  /**
   * Whether it has been moved from its original position
   */
  moved?: boolean;
  
  /**
   * Original room ID (to track if it's been moved between rooms)
   */
  originalRoom?: string;
  
  /**
   * Sound made when moving
   */
  moveSound?: string;
  
  /**
   * Whether multiple people are needed to move it
   */
  requiresMultiplePeople?: boolean;
  
  /**
   * Number of people required
   */
  peopleRequired?: number;
}

/**
 * Moveable scenery trait for large pushable/pullable objects
 * 
 * Objects with this trait should also have PUSHABLE and/or PULLABLE
 * traits to define how they can be moved. This trait adds properties
 * specific to large moveable scenery objects.
 */
export class MoveableSceneryTrait implements ITrait, IMoveableSceneryData {
  static readonly type = TraitType.MOVEABLE_SCENERY;
  readonly type = TraitType.MOVEABLE_SCENERY;
  
  // MoveableSceneryData properties
  weightClass: 'light' | 'medium' | 'heavy' | 'immense';
  revealsWhenMoved: boolean;
  reveals?: string;
  blocksExits: boolean;
  blockedExits?: string[];
  moved: boolean;
  originalRoom?: string;
  moveSound?: string;
  requiresMultiplePeople: boolean;
  peopleRequired?: number;
  
  constructor(data: IMoveableSceneryData = {}) {
    this.weightClass = data.weightClass ?? 'heavy';
    this.revealsWhenMoved = data.revealsWhenMoved ?? false;
    this.reveals = data.reveals;
    this.blocksExits = data.blocksExits ?? false;
    this.blockedExits = data.blockedExits;
    this.moved = data.moved ?? false;
    this.originalRoom = data.originalRoom;
    this.moveSound = data.moveSound;
    this.requiresMultiplePeople = data.requiresMultiplePeople ?? false;
    this.peopleRequired = data.peopleRequired;
  }
}
