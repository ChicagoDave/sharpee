/**
 * Pushable trait implementation
 */

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

export interface IPushableData {
  /**
   * Type of pushable object - determines behavior
   */
  pushType?: 'button' | 'heavy' | 'moveable';
  
  /**
   * Whether pushing reveals a hidden passage
   */
  revealsPassage?: boolean;
  
  /**
   * Sound made when pushed
   */
  pushSound?: string;
  
  /**
   * Minimum strength required to push (for heavy objects)
   */
  requiresStrength?: number;
  
  /**
   * Whether this can be pushed multiple times
   */
  repeatable?: boolean;
  
  /**
   * Current state for toggleable pushables
   */
  state?: 'default' | 'pushed' | 'activated';
  
  /**
   * Number of times this has been pushed
   */
  pushCount?: number;
  
  /**
   * Maximum number of pushes allowed
   */
  maxPushes?: number;
  
  /**
   * Direction it can be pushed (for moveable objects)
   */
  pushDirection?: 'north' | 'south' | 'east' | 'west' | 'any';
  
  /**
   * Entity ID that this activates when pushed
   */
  activates?: string;
  
  /**
   * Custom effects when pushed
   */
  effects?: {
    onPush?: string; // Event to emit
    onMaxPushes?: string; // Event when max pushes reached
    onMove?: string; // Event when moved (for moveable type)
  };
}

/**
 * Pushable trait for objects that can be pushed
 * 
 * This trait contains only data - all logic for pushing
 * is handled by the pushing action.
 */
export class PushableTrait implements ITrait, IPushableData {
  static readonly type = TraitType.PUSHABLE;
  readonly type = TraitType.PUSHABLE;
  
  // PushableData properties
  pushType: 'button' | 'heavy' | 'moveable';
  revealsPassage?: boolean;
  pushSound?: string;
  requiresStrength?: number;
  repeatable: boolean;
  state: 'default' | 'pushed' | 'activated';
  pushCount: number;
  maxPushes?: number;
  pushDirection?: 'north' | 'south' | 'east' | 'west' | 'any';
  activates?: string;
  effects?: {
    onPush?: string;
    onMaxPushes?: string;
    onMove?: string;
  };
  
  constructor(data: IPushableData = {}) {
    this.pushType = data.pushType ?? 'button';
    this.revealsPassage = data.revealsPassage;
    this.pushSound = data.pushSound;
    this.requiresStrength = data.requiresStrength;
    this.repeatable = data.repeatable ?? true;
    this.state = data.state ?? 'default';
    this.pushCount = data.pushCount ?? 0;
    this.maxPushes = data.maxPushes;
    this.pushDirection = data.pushDirection;
    this.activates = data.activates;
    this.effects = data.effects;
  }
}
