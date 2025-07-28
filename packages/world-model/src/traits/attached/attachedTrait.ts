/**
 * Attached trait implementation
 */

import { Trait } from '../trait';
import { TraitType } from '../trait-types';

export interface AttachedData {
  /**
   * What this is attached to (entity ID)
   */
  attachedTo?: string;
  
  /**
   * How it's attached
   */
  attachmentType?: 'glued' | 'nailed' | 'screwed' | 'tied' | 'welded' | 'magnetic' | 'stuck';
  
  /**
   * Whether it can be detached by pulling
   */
  detachable?: boolean;
  
  /**
   * Force required to detach (if detachable)
   */
  detachForce?: number;
  
  /**
   * Whether it's currently loose
   */
  loose?: boolean;
  
  /**
   * Sound when detached
   */
  detachSound?: string;
  
  /**
   * What happens when detached
   */
  onDetach?: {
    breaksObject?: boolean; // Does the object break when detached?
    breaksAttachment?: boolean; // Does what it's attached to break?
    leavesResidue?: boolean; // Does it leave glue, nails, etc?
  };
}

/**
 * Attached trait for objects that are attached, fastened, or connected to something
 * 
 * This trait contains only data - all logic for detachment
 * is handled by the pulling action.
 */
export class AttachedTrait implements Trait, AttachedData {
  static readonly type = TraitType.ATTACHED;
  readonly type = TraitType.ATTACHED;
  
  // AttachedData properties
  attachedTo?: string;
  attachmentType: 'glued' | 'nailed' | 'screwed' | 'tied' | 'welded' | 'magnetic' | 'stuck';
  detachable: boolean;
  detachForce?: number;
  loose: boolean;
  detachSound?: string;
  onDetach?: {
    breaksObject?: boolean;
    breaksAttachment?: boolean;
    leavesResidue?: boolean;
  };
  
  constructor(data: AttachedData = {}) {
    this.attachedTo = data.attachedTo;
    this.attachmentType = data.attachmentType ?? 'stuck';
    this.detachable = data.detachable ?? false;
    this.detachForce = data.detachForce;
    this.loose = data.loose ?? false;
    this.detachSound = data.detachSound;
    this.onDetach = data.onDetach;
  }
}
