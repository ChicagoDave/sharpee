/**
 * Turnable trait implementation
 */

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

export interface ITurnableData {
  /**
   * Type of turnable object - determines behavior
   */
  turnType?: 'dial' | 'knob' | 'wheel' | 'crank' | 'valve';
  
  /**
   * Available settings (for dials/knobs with discrete positions)
   */
  settings?: string[] | number[];
  
  /**
   * Current setting or position
   */
  currentSetting?: string | number;
  
  /**
   * Number of turns required to fully operate (for cranks/valves)
   */
  turnsRequired?: number;
  
  /**
   * Current number of turns made
   */
  turnsMade?: number;
  
  /**
   * Sound made when turning
   */
  turnSound?: string;
  
  /**
   * Whether it can be turned in both directions
   */
  bidirectional?: boolean;
  
  /**
   * Current direction of turning
   */
  turnDirection?: 'clockwise' | 'counterclockwise';
  
  /**
   * Whether it returns to default position when released
   */
  springLoaded?: boolean;
  
  /**
   * Entity ID that this activates when turned
   */
  activates?: string;
  
  /**
   * Whether it's currently stuck/jammed
   */
  jammed?: boolean;
  
  /**
   * Minimum value (for numeric settings)
   */
  minValue?: number;
  
  /**
   * Maximum value (for numeric settings)
   */
  maxValue?: number;
  
  /**
   * Step size for numeric settings
   */
  stepSize?: number;
  
  /**
   * Custom effects when turned
   */
  effects?: {
    onTurn?: string; // Event to emit
    onComplete?: string; // Event when fully turned
    onSettingChange?: string; // Event when setting changes
  };
}

/**
 * Turnable trait for objects that can be turned
 * 
 * This trait contains only data - all logic for turning
 * is handled by the turning action.
 */
export class TurnableTrait implements ITrait, ITurnableData {
  static readonly type = TraitType.TURNABLE;
  readonly type = TraitType.TURNABLE;
  
  // TurnableData properties
  turnType: 'dial' | 'knob' | 'wheel' | 'crank' | 'valve';
  settings?: string[] | number[];
  currentSetting?: string | number;
  turnsRequired?: number;
  turnsMade: number;
  turnSound?: string;
  bidirectional: boolean;
  turnDirection?: 'clockwise' | 'counterclockwise';
  springLoaded: boolean;
  activates?: string;
  jammed: boolean;
  minValue?: number;
  maxValue?: number;
  stepSize?: number;
  effects?: {
    onTurn?: string;
    onComplete?: string;
    onSettingChange?: string;
  };
  
  constructor(data: ITurnableData = {}) {
    this.turnType = data.turnType ?? 'knob';
    this.settings = data.settings;
    this.currentSetting = data.currentSetting ?? (data.settings ? data.settings[0] : 0);
    this.turnsRequired = data.turnsRequired;
    this.turnsMade = data.turnsMade ?? 0;
    this.turnSound = data.turnSound;
    this.bidirectional = data.bidirectional ?? true;
    this.turnDirection = data.turnDirection;
    this.springLoaded = data.springLoaded ?? false;
    this.activates = data.activates;
    this.jammed = data.jammed ?? false;
    this.minValue = data.minValue;
    this.maxValue = data.maxValue;
    this.stepSize = data.stepSize;
    this.effects = data.effects;
  }
}
