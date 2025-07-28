/**
 * Knob trait implementation
 */

import { Trait } from '../trait';
import { TraitType } from '../trait-types';

export interface KnobData {
  /**
   * Shape of the knob
   */
  shape?: 'round' | 'pointer' | 'lever' | 'star';
  
  /**
   * Material of the knob
   */
  material?: string;
  
  /**
   * Size of the knob
   */
  size?: 'tiny' | 'small' | 'medium' | 'large';
  
  /**
   * Whether the knob has a pointer or indicator
   */
  hasIndicator?: boolean;
  
  /**
   * Color of the knob
   */
  color?: string;
  
  /**
   * Whether the knob is recessed into a panel
   */
  recessed?: boolean;
}

/**
 * Knob trait for knob-specific properties
 * 
 * Knobs should also have the TURNABLE trait for turn behavior.
 * This trait adds knob-specific descriptive properties.
 */
export class KnobTrait implements Trait, KnobData {
  static readonly type = TraitType.KNOB;
  readonly type = TraitType.KNOB;
  
  // KnobData properties
  shape?: 'round' | 'pointer' | 'lever' | 'star';
  material?: string;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  hasIndicator: boolean;
  color?: string;
  recessed: boolean;
  
  constructor(data: KnobData = {}) {
    this.shape = data.shape;
    this.material = data.material;
    this.size = data.size;
    this.hasIndicator = data.hasIndicator ?? false;
    this.color = data.color;
    this.recessed = data.recessed ?? false;
  }
}
