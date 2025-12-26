/**
 * Combatant trait for entities that can engage in combat
 */

import { ITrait } from '../trait';

export interface ICombatantData {
  /** Current health points */
  health?: number;
  
  /** Maximum health points */
  maxHealth?: number;
  
  /** Armor value that reduces damage */
  armor?: number;
  
  /** Attack power modifier */
  attackPower?: number;
  
  /** Defense modifier */
  defense?: number;
  
  /** Whether this combatant is alive */
  isAlive?: boolean;
  
  /** Custom message when hit */
  hitMessage?: string;
  
  /** Custom message when killed */
  deathMessage?: string;
  
  /** Custom message when attacking */
  attackMessage?: string;
  
  /** Whether this combatant is hostile by default */
  hostile?: boolean;
  
  /** Whether this combatant can retaliate */
  canRetaliate?: boolean;
  
  /** Whether inventory drops when killed */
  dropsInventory?: boolean;
  
  /** Experience points awarded when defeated */
  experienceValue?: number;
}

/**
 * Combatant trait indicates an entity can engage in combat.
 * 
 * This trait contains only data - all combat logic
 * is in CombatBehavior.
 */
export class CombatantTrait implements ITrait, ICombatantData {
  static readonly type = 'combatant' as const;
  readonly type = 'combatant' as const;
  
  // CombatantData properties
  health: number;
  maxHealth: number;
  armor: number;
  attackPower: number;
  defense: number;
  isAlive: boolean;
  hitMessage?: string;
  deathMessage?: string;
  attackMessage?: string;
  hostile: boolean;
  canRetaliate: boolean;
  dropsInventory: boolean;
  experienceValue: number;
  
  constructor(data: ICombatantData = {}) {
    // Set defaults and merge with provided data
    this.health = data.health ?? data.maxHealth ?? 10;
    this.maxHealth = data.maxHealth ?? 10;
    this.armor = data.armor ?? 0;
    this.attackPower = data.attackPower ?? 1;
    this.defense = data.defense ?? 0;
    this.isAlive = data.isAlive ?? true;
    this.hitMessage = data.hitMessage;
    this.deathMessage = data.deathMessage;
    this.attackMessage = data.attackMessage;
    this.hostile = data.hostile ?? false;
    this.canRetaliate = data.canRetaliate ?? true;
    this.dropsInventory = data.dropsInventory ?? true;
    this.experienceValue = data.experienceValue ?? 0;
  }
  
  /**
   * Computed property to check if combatant is alive based on health
   */
  get alive(): boolean {
    return this.health > 0;
  }
}