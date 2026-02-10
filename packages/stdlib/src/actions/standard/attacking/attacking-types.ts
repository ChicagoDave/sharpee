/**
 * Type definitions for the attacking action's shared data
 */

import { EntityId } from '@sharpee/core';

/**
 * Result from attack behaviors
 */
export interface AttackResult {
  success: boolean;
  type: 'broke' | 'damaged' | 'destroyed' | 'killed' | 'hit' | 'ineffective' | 'missed' | 'knocked_out';
  damage?: number;
  remainingHitPoints?: number;
  targetDestroyed?: boolean;
  targetKilled?: boolean;
  targetKnockedOut?: boolean;
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

  /**
   * Full combat result from combat extension (when attacking combatants).
   * Type is opaque — each combat system defines its own result shape.
   */
  combatResult?: unknown;

  /**
   * Whether CombatService was used (vs AttackBehavior)
   */
  usedCombatService?: boolean;
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