/**
 * Valve trait implementation
 */

import { Trait } from '../trait';
import { TraitType } from '../trait-types';

export interface ValveData {
  /**
   * Type of valve
   */
  valveType?: 'gate' | 'ball' | 'butterfly' | 'needle' | 'wheel';
  
  /**
   * Current state of the valve
   */
  state?: 'open' | 'closed' | 'partial';
  
  /**
   * Percentage open (0-100)
   */
  openPercentage?: number;
  
  /**
   * What flows through the valve
   */
  controlsFlow?: 'water' | 'gas' | 'steam' | 'oil' | 'air' | 'unknown';
  
  /**
   * Pipe or system this valve controls
   */
  connectedTo?: string;
  
  /**
   * Whether the valve is currently stuck
   */
  stuck?: boolean;
  
  /**
   * Pressure level (affects difficulty of turning)
   */
  pressure?: 'low' | 'medium' | 'high';
  
  /**
   * Whether the valve has a pressure gauge
   */
  hasGauge?: boolean;
}

/**
 * Valve trait for valve-specific properties
 * 
 * Valves should also have the TURNABLE trait for turn behavior.
 * This trait adds valve-specific descriptive properties.
 */
export class ValveTrait implements Trait, ValveData {
  static readonly type = TraitType.VALVE;
  readonly type = TraitType.VALVE;
  
  // ValveData properties
  valveType?: 'gate' | 'ball' | 'butterfly' | 'needle' | 'wheel';
  state: 'open' | 'closed' | 'partial';
  openPercentage: number;
  controlsFlow?: 'water' | 'gas' | 'steam' | 'oil' | 'air' | 'unknown';
  connectedTo?: string;
  stuck: boolean;
  pressure?: 'low' | 'medium' | 'high';
  hasGauge: boolean;
  
  constructor(data: ValveData = {}) {
    this.valveType = data.valveType;
    this.state = data.state ?? 'closed';
    this.openPercentage = data.openPercentage ?? (data.state === 'open' ? 100 : data.state === 'closed' ? 0 : 50);
    this.controlsFlow = data.controlsFlow;
    this.connectedTo = data.connectedTo;
    this.stuck = data.stuck ?? false;
    this.pressure = data.pressure;
    this.hasGauge = data.hasGauge ?? false;
  }
}
