// packages/world-model/src/traits/entry/entryTrait.ts

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

/**
 * Entry trait for entities that can be entered by actors.
 * Used for vehicles, chairs, beds, closets, or any enterable space.
 * 
 * This trait contains only data - all behavior is in EntryBehavior.
 */
export class EntryTrait implements ITrait {
  static readonly type = TraitType.ENTRY;
  readonly type = TraitType.ENTRY;
  
  /** Whether actors can currently enter this */
  canEnter: boolean = true;
  
  /** Preposition used when entering (in, on, under, behind) */
  preposition: string = 'in';
  
  /** Maximum number of occupants (undefined = unlimited) */
  maxOccupants?: number;
  
  /** Current occupants (entity IDs) */
  occupants: string[] = [];
  
  /** Whether occupants are visible from outside */
  occupantsVisible: boolean = true;
  
  /** Whether occupants can see outside */
  canSeeOut: boolean = true;
  
  /** Whether sound passes through */
  soundproof: boolean = false;
  
  /** Custom message when entering */
  enterMessage?: string;
  
  /** Custom message when exiting */
  exitMessage?: string;
  
  /** Custom message when full */
  fullMessage?: string;
  
  /** Custom message when entry is blocked */
  blockedMessage?: string;
  
  /** Whether this moves with its parent (like a vehicle) */
  mobile: boolean = false;
  
  /** Whether entering requires standing/sitting/lying */
  posture?: 'standing' | 'sitting' | 'lying';
  
  constructor(data?: Partial<EntryTrait>) {
    if (data) {
      if (data.canEnter !== undefined) this.canEnter = data.canEnter;
      if (data.preposition !== undefined) this.preposition = data.preposition;
      if (data.maxOccupants !== undefined) this.maxOccupants = data.maxOccupants;
      if (data.occupants !== undefined) this.occupants = data.occupants;
      if (data.occupantsVisible !== undefined) this.occupantsVisible = data.occupantsVisible;
      if (data.canSeeOut !== undefined) this.canSeeOut = data.canSeeOut;
      if (data.soundproof !== undefined) this.soundproof = data.soundproof;
      if (data.enterMessage !== undefined) this.enterMessage = data.enterMessage;
      if (data.exitMessage !== undefined) this.exitMessage = data.exitMessage;
      if (data.fullMessage !== undefined) this.fullMessage = data.fullMessage;
      if (data.blockedMessage !== undefined) this.blockedMessage = data.blockedMessage;
      if (data.mobile !== undefined) this.mobile = data.mobile;
      if (data.posture !== undefined) this.posture = data.posture;
    }
  }
}