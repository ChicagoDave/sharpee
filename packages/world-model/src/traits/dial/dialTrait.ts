/**
 * Dial trait implementation
 */

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

export interface IDialData {
  /**
   * Whether the dial has numbered markings
   */
  numbered?: boolean;
  
  /**
   * Whether the dial has tick marks
   */
  hasTickMarks?: boolean;
  
  /**
   * Number of tick marks or positions
   */
  tickCount?: number;
  
  /**
   * Labels for the dial positions
   */
  labels?: string[];
  
  /**
   * Whether the dial can be turned continuously or has stops
   */
  continuous?: boolean;
  
  /**
   * Display type for the dial
   */
  displayType?: 'analog' | 'digital' | 'both';
  
  /**
   * Units shown on the dial (e.g., "degrees", "MHz")
   */
  units?: string;
}

/**
 * Dial trait for dial-specific properties
 * 
 * Dials should also have the TURNABLE trait for turn behavior.
 * This trait adds dial-specific descriptive properties.
 */
export class DialTrait implements ITrait, IDialData {
  static readonly type = TraitType.DIAL;
  readonly type = TraitType.DIAL;
  
  // DialData properties
  numbered: boolean;
  hasTickMarks: boolean;
  tickCount?: number;
  labels?: string[];
  continuous: boolean;
  displayType?: 'analog' | 'digital' | 'both';
  units?: string;
  
  constructor(data: IDialData = {}) {
    this.numbered = data.numbered ?? true;
    this.hasTickMarks = data.hasTickMarks ?? true;
    this.tickCount = data.tickCount;
    this.labels = data.labels;
    this.continuous = data.continuous ?? false;
    this.displayType = data.displayType;
    this.units = data.units;
  }
}
