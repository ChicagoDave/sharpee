/**
 * Cord trait implementation
 */

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

export interface ICordData {
  /**
   * What type of cord this is (affects messages)
   */
  cordType?: 'rope' | 'cord' | 'chain' | 'string' | 'cable' | 'wire';
  
  /**
   * Entity ID that this cord activates
   */
  activates?: string;
  
  /**
   * Whether the cord is taut or slack
   */
  tension?: 'taut' | 'slack';
  
  /**
   * Maximum length the cord can extend
   */
  maxLength?: number;
  
  /**
   * Current extended length
   */
  currentLength?: number;
  
  /**
   * Whether the cord can break if pulled too hard
   */
  breakable?: boolean;
  
  /**
   * Strength required to break (if breakable)
   */
  breakStrength?: number;
  
  /**
   * Sound when pulled
   */
  pullSound?: string;
  
  /**
   * Sound when it breaks
   */
  breakSound?: string;
}

/**
 * Cord trait for pullable cords, ropes, chains, etc.
 * 
 * This trait contains only data - all logic for cord operation
 * is handled by the pulling action when combined with PULLABLE trait.
 */
export class CordTrait implements ITrait, ICordData {
  static readonly type = TraitType.CORD;
  readonly type = TraitType.CORD;
  
  // CordData properties
  cordType: 'rope' | 'cord' | 'chain' | 'string' | 'cable' | 'wire';
  activates?: string;
  tension: 'taut' | 'slack';
  maxLength?: number;
  currentLength?: number;
  breakable: boolean;
  breakStrength?: number;
  pullSound?: string;
  breakSound?: string;
  
  constructor(data: ICordData = {}) {
    this.cordType = data.cordType ?? 'cord';
    this.activates = data.activates;
    this.tension = data.tension ?? 'slack';
    this.maxLength = data.maxLength;
    this.currentLength = data.currentLength;
    this.breakable = data.breakable ?? false;
    this.breakStrength = data.breakStrength;
    this.pullSound = data.pullSound;
    this.breakSound = data.breakSound;
  }
}
