// packages/world-model/src/traits/door/doorTrait.ts

import { ITrait } from '../trait.js';
import { TraitType } from '../trait-types.js';

/**
 * Door trait marks an entity as a connection between rooms.
 *
 * A door may be **one-sided**: `room2` is the destination, and a story is free to
 * declare the door before it knows where it leads, filling the destination in later
 * (`WorldModel.connectRooms` does exactly that). `room1` is likewise optional, for a
 * door composed before it is placed. Neither is policed here.
 *
 * This is a pure data structure - all validation and logic
 * should be handled by DoorBehavior.
 */
export class DoorTrait implements ITrait {
  static readonly type = TraitType.DOOR;
  readonly type = TraitType.DOOR;
  
  /** First room this door connects (an entity ID, not a name) — unset until placed. */
  room1?: string;
  
  /** Second room this door connects (an entity ID, not a name) — unset on a one-sided door. */
  room2?: string;
  
  /** Whether the door can be traversed in both directions */
  bidirectional = true;
  
  constructor(data?: Partial<DoorTrait>) {
    // Set defaults first
    if (data) {
      Object.assign(this, data);
    }
  }
}
