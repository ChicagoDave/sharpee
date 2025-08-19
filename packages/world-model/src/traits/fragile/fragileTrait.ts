/**
 * Fragile trait implementation
 */

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

export interface IFragileData {
  /**
   * Sound made when breaking
   */
  breakSound?: string;
  
  /**
   * Entity IDs of fragments created when broken
   */
  breaksInto?: string[];
  
  /**
   * Force threshold before breaking (0-10, where 0 is extremely fragile)
   */
  breakThreshold?: number;
  
  /**
   * Material that makes it fragile
   */
  fragileMaterial?: 'glass' | 'crystal' | 'porcelain' | 'ceramic' | 'thin_metal' | 'ice' | 'paper';
  
  /**
   * Whether it's already cracked or damaged
   */
  damaged?: boolean;
  
  /**
   * Whether breaking it triggers something
   */
  triggersOnBreak?: string;
  
  /**
   * Custom message key when it breaks
   */
  breakMessage?: string;
  
  /**
   * Whether the fragments are sharp/dangerous
   */
  sharpFragments?: boolean;
  
  /**
   * Value lost when broken (for valuable fragile items)
   */
  valueWhenBroken?: number;
}

/**
 * Fragile trait for objects that break easily
 * 
 * This trait contains only data - all logic for breaking
 * is handled by the attacking/dropping actions.
 */
export class FragileTrait implements ITrait, IFragileData {
  static readonly type = TraitType.FRAGILE;
  readonly type = TraitType.FRAGILE;
  
  // FragileData properties
  breakSound?: string;
  breaksInto?: string[];
  breakThreshold: number;
  fragileMaterial?: 'glass' | 'crystal' | 'porcelain' | 'ceramic' | 'thin_metal' | 'ice' | 'paper';
  damaged: boolean;
  triggersOnBreak?: string;
  breakMessage?: string;
  sharpFragments: boolean;
  valueWhenBroken?: number;
  
  constructor(data: IFragileData = {}) {
    this.breakSound = data.breakSound;
    this.breaksInto = data.breaksInto;
    this.breakThreshold = data.breakThreshold ?? 2; // Very fragile by default
    this.fragileMaterial = data.fragileMaterial;
    this.damaged = data.damaged ?? false;
    this.triggersOnBreak = data.triggersOnBreak;
    this.breakMessage = data.breakMessage;
    this.sharpFragments = data.sharpFragments ?? (
      data.fragileMaterial === 'glass' || 
      data.fragileMaterial === 'crystal'
    );
    this.valueWhenBroken = data.valueWhenBroken;
  }
}
