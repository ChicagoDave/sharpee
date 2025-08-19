// packages/world-model/src/traits/door/doorTrait.ts

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

/**
 * Door trait marks an entity as a connection between two rooms.
 * 
 * This is a pure data structure - all validation and logic
 * should be handled by DoorBehavior.
 */
export class DoorTrait implements ITrait {
  static readonly type = TraitType.DOOR;
  readonly type = TraitType.DOOR;
  
  /** First room this door connects (must be an entity ID, not a name) */
  room1!: string;
  
  /** Second room this door connects (must be an entity ID, not a name) */
  room2!: string;
  
  /** Whether the door can be traversed in both directions */
  bidirectional = true;
  
  constructor(data?: Partial<DoorTrait>) {
    // Set defaults first
    if (data) {
      Object.assign(this, data);
    }
    
    // Validate required fields
    if (!this.room1 || !this.room2) {
      throw new Error('Door must connect two rooms');
    }
  }
}
