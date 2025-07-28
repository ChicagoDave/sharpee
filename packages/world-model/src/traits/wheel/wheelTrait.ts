/**
 * Wheel trait implementation
 */

import { Trait } from '../trait';
import { TraitType } from '../trait-types';

export interface WheelData {
  /**
   * Diameter of the wheel
   */
  diameter?: 'small' | 'medium' | 'large' | 'huge';
  
  /**
   * Number of spokes
   */
  spokeCount?: number;
  
  /**
   * Whether it's a steering wheel, valve wheel, etc.
   */
  wheelType?: 'steering' | 'valve' | 'control' | 'mill';
  
  /**
   * Material of the wheel
   */
  material?: string;
  
  /**
   * Whether the wheel has handles/grips
   */
  hasHandles?: boolean;
  
  /**
   * Whether the wheel is mounted horizontally or vertically
   */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Wheel trait for wheel-specific properties
 * 
 * Wheels should also have the TURNABLE trait for turn behavior.
 * This trait adds wheel-specific descriptive properties.
 */
export class WheelTrait implements Trait, WheelData {
  static readonly type = TraitType.WHEEL;
  readonly type = TraitType.WHEEL;
  
  // WheelData properties
  diameter?: 'small' | 'medium' | 'large' | 'huge';
  spokeCount?: number;
  wheelType?: 'steering' | 'valve' | 'control' | 'mill';
  material?: string;
  hasHandles: boolean;
  orientation?: 'horizontal' | 'vertical';
  
  constructor(data: WheelData = {}) {
    this.diameter = data.diameter;
    this.spokeCount = data.spokeCount;
    this.wheelType = data.wheelType;
    this.material = data.material;
    this.hasHandles = data.hasHandles ?? false;
    this.orientation = data.orientation;
  }
}
