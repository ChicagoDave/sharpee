/**
 * Type definitions for the attacking action's shared data
 */

import { EntityId } from '@sharpee/core';

/**
 * Result from attack behaviors
 */
export interface AttackResult {
  success: boolean;
  type: 'broke' | 'damaged' | 'destroyed' | 'killed' | 'hit' | 'ineffective';
  damage?: number;
  remainingHitPoints?: number;
  targetDestroyed?: boolean;
  targetKilled?: boolean;
  itemsDropped?: EntityId[];
  debrisCreated?: EntityId[];
  exitRevealed?: string;
  transformedTo?: EntityId;
}

/**
 * Data shared between execute and report phases of the attacking action
 */
export interface AttackingSharedData {
  /**
   * Result from the AttackBehavior.attack() call
   */
  attackResult?: AttackResult;
  
  /**
   * The weapon used (if any)
   */
  weaponUsed?: EntityId;
  
  /**
   * Whether weapon was inferred
   */
  weaponInferred?: boolean;
  
  /**
   * Custom message to use instead of default
   */
  customMessage?: string;
}

/**
 * Type guard to check if sharedData contains attacking data
 */
export function hasAttackingData(data: Record<string, any>): data is AttackingSharedData {
  return 'attackResult' in data;
}

/**
 * Helper to get typed attacking data from context
 */
export function getAttackingData(context: { sharedData: Record<string, any> }): AttackingSharedData {
  return context.sharedData as AttackingSharedData;
}