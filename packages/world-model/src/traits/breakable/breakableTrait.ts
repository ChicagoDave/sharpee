/**
 * Breakable trait implementation
 */

import { Trait } from '../trait';
import { TraitType } from '../trait-types';

export interface BreakableData {
  /**
   * How it can be broken
   */
  breakMethod?: 'force' | 'cutting' | 'heat' | 'any';
  
  /**
   * Tool required to break it
   */
  requiresTool?: string;
  
  /**
   * Minimum strength required to break
   */
  strengthRequired?: number;
  
  /**
   * Sound made when breaking
   */
  breakSound?: string;
  
  /**
   * What it becomes when broken
   */
  breaksInto?: string[];
  
  /**
   * Whether it's partially broken
   */
  partiallyBroken?: boolean;
  
  /**
   * Number of hits/attempts to break
   */
  hitsToBreak?: number;
  
  /**
   * Current number of hits taken
   */
  hitsTaken?: number;
  
  /**
   * Whether breaking reveals something inside
   */
  revealsContents?: boolean;
  
  /**
   * Custom effects when broken
   */
  effects?: {
    onBreak?: string; // Event to emit
    onPartialBreak?: string; // Event when partially broken
  };
}

/**
 * Breakable trait for objects that can be broken with effort
 * 
 * This is more general than FRAGILE - these objects require
 * deliberate effort or tools to break.
 */
export class BreakableTrait implements Trait, BreakableData {
  static readonly type = TraitType.BREAKABLE;
  readonly type = TraitType.BREAKABLE;
  
  // BreakableData properties
  breakMethod: 'force' | 'cutting' | 'heat' | 'any';
  requiresTool?: string;
  strengthRequired?: number;
  breakSound?: string;
  breaksInto?: string[];
  partiallyBroken: boolean;
  hitsToBreak: number;
  hitsTaken: number;
  revealsContents: boolean;
  effects?: {
    onBreak?: string;
    onPartialBreak?: string;
  };
  
  constructor(data: BreakableData = {}) {
    this.breakMethod = data.breakMethod ?? 'force';
    this.requiresTool = data.requiresTool;
    this.strengthRequired = data.strengthRequired;
    this.breakSound = data.breakSound;
    this.breaksInto = data.breaksInto;
    this.partiallyBroken = data.partiallyBroken ?? false;
    this.hitsToBreak = data.hitsToBreak ?? 1;
    this.hitsTaken = data.hitsTaken ?? 0;
    this.revealsContents = data.revealsContents ?? false;
    this.effects = data.effects;
  }
}
