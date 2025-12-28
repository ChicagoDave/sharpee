/**
 * Combatant trait for entities that can engage in combat
 */

import { ITrait } from '../trait';

export interface ICombatantData {
  /** Current health points */
  health?: number;

  /** Maximum health points */
  maxHealth?: number;

  /** Combat skill (0-100, affects hit/dodge chance) - ADR-072 */
  skill?: number;

  /** Natural damage (if no weapon) - ADR-072 */
  baseDamage?: number;

  /** Whether this combatant is conscious (false = knocked out) - ADR-072 */
  isConscious?: boolean;

  /** Turns until consciousness recovery - ADR-072 */
  recoveryTurns?: number;

  /** Armor value that reduces damage */
  armor?: number;

  /** Attack power modifier (legacy, use baseDamage) */
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
  skill: number;
  baseDamage: number;
  isConscious: boolean;
  recoveryTurns?: number;
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
    this.skill = data.skill ?? 30; // Default skill level (ADR-072)
    this.baseDamage = data.baseDamage ?? data.attackPower ?? 1; // ADR-072
    this.isConscious = data.isConscious ?? true; // ADR-072
    this.recoveryTurns = data.recoveryTurns; // ADR-072
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

  /**
   * Check if combatant can act (alive and conscious)
   */
  get canAct(): boolean {
    return this.isAlive && this.isConscious;
  }

  /**
   * Knock out this combatant (unconscious but alive)
   */
  knockOut(recoveryTurns?: number): void {
    this.isConscious = false;
    if (recoveryTurns !== undefined) {
      this.recoveryTurns = recoveryTurns;
    }
  }

  /**
   * Wake up this combatant
   */
  wakeUp(): void {
    if (this.isAlive) {
      this.isConscious = true;
      this.recoveryTurns = undefined;
    }
  }

  /**
   * Kill this combatant
   */
  kill(): void {
    this.health = 0;
    this.isAlive = false;
    this.isConscious = false;
  }

  /**
   * Take damage
   * @returns true if combatant was killed
   */
  takeDamage(amount: number): boolean {
    const effectiveDamage = Math.max(0, amount - this.armor);
    this.health = Math.max(0, this.health - effectiveDamage);

    if (this.health <= 0) {
      this.kill();
      return true;
    }

    // Check for knockout (20% health threshold per ADR-072)
    if (this.health <= this.maxHealth * 0.2) {
      this.knockOut();
    }

    return false;
  }

  /**
   * Heal this combatant
   */
  heal(amount: number): void {
    if (this.isAlive) {
      this.health = Math.min(this.maxHealth, this.health + amount);
      if (this.health > this.maxHealth * 0.2) {
        this.wakeUp();
      }
    }
  }
}