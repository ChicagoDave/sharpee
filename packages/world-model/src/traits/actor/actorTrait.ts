/**
 * Actor trait - represents entities that can perform actions
 * 
 * This is a minimal actor trait for core IF functionality.
 * More complex NPC/Player behaviors should be implemented as extensions.
 */

import { Trait } from '../trait';
import { TraitType } from '../trait-types';

export interface ActorData {
  /** Whether this actor can currently perform actions */
  canAct?: boolean;
  
  /** Whether this is the player character */
  isPlayer?: boolean;
  
  /** Current state of the actor (for simple state tracking) */
  state?: string;
}

/**
 * Basic actor trait for entities that can perform actions
 * 
 * This is a minimal implementation for core IF. It provides:
 * - Basic ability to mark entities as actors
 * - Simple active/inactive state
 * - Player identification
 * 
 * More complex features (dialogue, AI, etc.) should be extensions.
 */
export class ActorTrait implements Trait, ActorData {
  static readonly type = TraitType.ACTOR;
  readonly type = TraitType.ACTOR;
  
  // ActorData properties
  canAct: boolean;
  isPlayer: boolean;
  state: string;
  
  constructor(data: ActorData = {}) {
    // Set defaults and merge with provided data
    this.canAct = data.canAct ?? true;
    this.isPlayer = data.isPlayer ?? false;
    this.state = data.state ?? 'idle';
  }
}
