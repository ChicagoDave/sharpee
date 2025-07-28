/**
 * Pullable trait implementation
 */

import { Trait } from '../trait';
import { TraitType } from '../trait-types';

export interface PullableData {
  /**
   * Type of pullable object - determines behavior
   */
  pullType?: 'lever' | 'cord' | 'attached' | 'heavy';
  
  /**
   * Entity ID that this activates when pulled
   */
  activates?: string;
  
  /**
   * Entity ID that this is linked to (for levers)
   */
  linkedTo?: string;
  
  /**
   * Sound made when pulled
   */
  pullSound?: string;
  
  /**
   * Minimum strength required to pull (for heavy objects)
   */
  requiresStrength?: number;
  
  /**
   * Whether this can be pulled multiple times
   */
  repeatable?: boolean;
  
  /**
   * Current state for toggleable pullables
   */
  state?: 'default' | 'pulled' | 'activated';
  
  /**
   * Number of times this has been pulled
   */
  pullCount?: number;
  
  /**
   * Maximum number of pulls allowed
   */
  maxPulls?: number;
  
  /**
   * Whether pulling detaches this object
   */
  detachesOnPull?: boolean;
  
  /**
   * Custom effects when pulled
   */
  effects?: {
    onPull?: string; // Event to emit
    onMaxPulls?: string; // Event when max pulls reached
    onDetach?: string; // Event when detached
  };
}

/**
 * Pullable trait for objects that can be pulled
 * 
 * This trait contains only data - all logic for pulling
 * is handled by the pulling action.
 */
export class PullableTrait implements Trait, PullableData {
  static readonly type = TraitType.PULLABLE;
  readonly type = TraitType.PULLABLE;
  
  // PullableData properties
  pullType: 'lever' | 'cord' | 'attached' | 'heavy';
  activates?: string;
  linkedTo?: string;
  pullSound?: string;
  requiresStrength?: number;
  repeatable: boolean;
  state: 'default' | 'pulled' | 'activated';
  pullCount: number;
  maxPulls?: number;
  detachesOnPull: boolean;
  effects?: {
    onPull?: string;
    onMaxPulls?: string;
    onDetach?: string;
  };
  
  constructor(data: PullableData = {}) {
    this.pullType = data.pullType ?? 'lever';
    this.activates = data.activates;
    this.linkedTo = data.linkedTo;
    this.pullSound = data.pullSound;
    this.requiresStrength = data.requiresStrength;
    this.repeatable = data.repeatable ?? true;
    this.state = data.state ?? 'default';
    this.pullCount = data.pullCount ?? 0;
    this.maxPulls = data.maxPulls;
    this.detachesOnPull = data.detachesOnPull ?? false;
    this.effects = data.effects;
  }
}
