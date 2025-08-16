/**
 * Crank trait implementation
 */

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

export interface ICrankData {
  /**
   * Length of the crank handle
   */
  handleLength?: 'short' | 'medium' | 'long';
  
  /**
   * Whether the crank folds when not in use
   */
  foldable?: boolean;
  
  /**
   * Whether the crank is currently folded
   */
  folded?: boolean;
  
  /**
   * What the crank operates
   */
  operates?: string;
  
  /**
   * Speed of cranking required
   */
  crankSpeed?: 'slow' | 'moderate' | 'fast';
  
  /**
   * Effort required to turn
   */
  effort?: 'easy' | 'moderate' | 'hard';
}

/**
 * Crank trait for crank-specific properties
 * 
 * Cranks should also have the TURNABLE trait for turn behavior.
 * This trait adds crank-specific descriptive properties.
 */
export class CrankTrait implements ITrait, ICrankData {
  static readonly type = TraitType.CRANK;
  readonly type = TraitType.CRANK;
  
  // CrankData properties
  handleLength?: 'short' | 'medium' | 'long';
  foldable: boolean;
  folded: boolean;
  operates?: string;
  crankSpeed?: 'slow' | 'moderate' | 'fast';
  effort?: 'easy' | 'moderate' | 'hard';
  
  constructor(data: ICrankData = {}) {
    this.handleLength = data.handleLength;
    this.foldable = data.foldable ?? false;
    this.folded = data.folded ?? false;
    this.operates = data.operates;
    this.crankSpeed = data.crankSpeed;
    this.effort = data.effort;
  }
}
