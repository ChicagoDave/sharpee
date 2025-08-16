/**
 * Knob trait implementation
 */

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

export interface IKnobData {
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
export class KnobTrait implements ITrait, IKnobData {
  static readonly type = TraitType.KNOB;
  readonly type = TraitType.KNOB;
  
  // KnobData properties
  shape?: 'round' | 'pointer' | 'lever' | 'star';
  material?: string;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  hasIndicator: boolean;
  color?: string;
  recessed: boolean;
  
  constructor(data: IKnobData = {}) {
    this.shape = data.shape;
    this.material = data.material;
    this.size = data.size;
    this.hasIndicator = data.hasIndicator ?? false;
    this.color = data.color;
    this.recessed = data.recessed ?? false;
  }
}
