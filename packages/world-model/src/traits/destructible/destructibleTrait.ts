/**
 * Destructible trait for entities that require multiple hits or specific tools to destroy
 */

import { ITrait } from '../trait';
import { EntityId } from '@sharpee/core';

export interface IDestructibleData {
  /** Current hit points */
  hitPoints?: number;
  
  /** Maximum hit points */
  maxHitPoints?: number;
  
  /** Whether this requires a weapon to damage */
  requiresWeapon?: boolean;
  
  /** Specific weapon type required (e.g., 'blade', 'magic') */
  requiresType?: string;
  
  /** Entity type to transform into when destroyed */
  transformTo?: string;
  
  /** Exit direction to reveal when destroyed (for barriers) */
  revealExit?: string;
  
  /** Custom message when damaged but not destroyed - injected into events */
  damageMessage?: string;
  
  /** Custom message when destroyed - injected into events */
  destroyMessage?: string;
  
  /** Whether this is invulnerable to normal attacks */
  invulnerable?: boolean;
  
  /** Armor value that reduces damage */
  armor?: number;
}

/**
 * Destructible trait indicates an entity can be destroyed with multiple hits.
 * 
 * This trait contains only data - all destruction logic
 * is in DestructibleBehavior. Messages are stored here to be
 * injected into events during the report phase.
 */
export class DestructibleTrait implements ITrait, IDestructibleData {
  static readonly type = 'destructible' as const;
  readonly type = 'destructible' as const;
  
  // DestructibleData properties
  hitPoints: number;
  maxHitPoints: number;
  requiresWeapon: boolean;
  requiresType?: string;
  transformTo?: string;
  revealExit?: string;
  damageMessage?: string;
  destroyMessage?: string;
  invulnerable: boolean;
  armor: number;
  
  constructor(data: IDestructibleData = {}) {
    // Set defaults and merge with provided data
    this.hitPoints = data.hitPoints ?? data.maxHitPoints ?? 3;
    this.maxHitPoints = data.maxHitPoints ?? 3;
    this.requiresWeapon = data.requiresWeapon ?? false;
    this.requiresType = data.requiresType;
    this.transformTo = data.transformTo;
    this.revealExit = data.revealExit;
    this.damageMessage = data.damageMessage;
    this.destroyMessage = data.destroyMessage;
    this.invulnerable = data.invulnerable ?? false;
    this.armor = data.armor ?? 0;
  }
}