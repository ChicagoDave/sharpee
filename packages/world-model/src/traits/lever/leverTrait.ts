/**
 * Lever trait implementation
 */

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

export interface ILeverData {
  /**
   * Current position of the lever
   */
  position?: 'up' | 'down' | 'neutral';
  
  /**
   * Entity ID that this lever controls
   */
  controls?: string;
  
  /**
   * Whether the lever springs back to neutral
   */
  springLoaded?: boolean;
  
  /**
   * Whether the lever is currently stuck
   */
  stuck?: boolean;
  
  /**
   * Sound when lever moves
   */
  leverSound?: string;
  
  /**
   * Custom position names for messages
   */
  positionNames?: {
    up?: string;
    down?: string;
    neutral?: string;
  };
}

/**
 * Lever trait for pullable levers that toggle or activate mechanisms
 * 
 * This trait contains only data - all logic for lever operation
 * is handled by the pulling action when combined with PULLABLE trait.
 */
export class LeverTrait implements ITrait, ILeverData {
  static readonly type = TraitType.LEVER;
  readonly type = TraitType.LEVER;
  
  // LeverData properties
  position: 'up' | 'down' | 'neutral';
  controls?: string;
  springLoaded: boolean;
  stuck: boolean;
  leverSound?: string;
  positionNames?: {
    up?: string;
    down?: string;
    neutral?: string;
  };
  
  constructor(data: ILeverData = {}) {
    this.position = data.position ?? 'neutral';
    this.controls = data.controls;
    this.springLoaded = data.springLoaded ?? false;
    this.stuck = data.stuck ?? false;
    this.leverSound = data.leverSound;
    this.positionNames = data.positionNames;
  }
}
