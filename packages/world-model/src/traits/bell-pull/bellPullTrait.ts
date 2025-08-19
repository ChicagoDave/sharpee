/**
 * Bell pull trait implementation
 */

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

export interface IBellPullData {
  /**
   * Entity ID of the bell that rings
   */
  ringsBellId?: string;
  
  /**
   * Description of the bell sound
   */
  bellSound?: string;
  
  /**
   * How many times the bell rings per pull
   */
  ringCount?: number;
  
  /**
   * Whether the bell can be heard from other rooms
   */
  audibleDistance?: number;
  
  /**
   * Whether the bell pull is currently broken
   */
  broken?: boolean;
  
  /**
   * Custom ring patterns
   */
  ringPattern?: 'single' | 'double' | 'triple' | 'continuous';
}

/**
 * Bell pull trait for cords that ring bells when pulled
 * 
 * This trait contains only data - all logic for bell operation
 * is handled by the pulling action when combined with PULLABLE trait.
 */
export class BellPullTrait implements ITrait, IBellPullData {
  static readonly type = TraitType.BELL_PULL;
  readonly type = TraitType.BELL_PULL;
  
  // BellPullData properties
  ringsBellId?: string;
  bellSound: string;
  ringCount: number;
  audibleDistance: number;
  broken: boolean;
  ringPattern: 'single' | 'double' | 'triple' | 'continuous';
  
  constructor(data: IBellPullData = {}) {
    this.ringsBellId = data.ringsBellId;
    this.bellSound = data.bellSound ?? 'ding';
    this.ringCount = data.ringCount ?? 1;
    this.audibleDistance = data.audibleDistance ?? 1;
    this.broken = data.broken ?? false;
    this.ringPattern = data.ringPattern ?? 'single';
  }
}
