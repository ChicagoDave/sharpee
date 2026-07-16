/**
 * Combatant trait for entities that can engage in combat.
 *
 * Combat STATS only (ADR-226 / ADR-223 child A): a combatant's health, alive/
 * conscious state, and recovery live on the entity's {@link HealthTrait} — the single
 * life-state source — not here. `CombatantTrait` *requires* a `HealthTrait`
 * (enforced at load; ADR-226 §2 / AC-7). Hostility stays here for now (moves to
 * disposition in ADR-223 child C).
 *
 * Data only — all combat logic is in `CombatBehavior`, which reads/writes health
 * through `HealthBehavior`.
 * Owner context: `@sharpee/world-model` — combat stats (requires the HEALTH layer).
 */

import { ITrait } from '../trait';

export interface ICombatantData {
  /** Combat skill (0-100, affects hit/dodge chance) - ADR-072 */
  skill?: number;

  /** Natural damage (if no weapon) - ADR-072 */
  baseDamage?: number;

  /** Armor value that reduces damage */
  armor?: number;

  /** Attack power modifier (legacy, use baseDamage) */
  attackPower?: number;

  /** Defense modifier */
  defense?: number;

  /** Custom message when hit */
  hitMessage?: string;

  /** Custom message when killed */
  deathMessage?: string;

  /** Custom message when attacking */
  attackMessage?: string;

  /** Whether this combatant is hostile by default (moves to disposition, ADR-223 child C) */
  hostile?: boolean;

  /** Whether this combatant can retaliate */
  canRetaliate?: boolean;

  /** Whether inventory drops when killed */
  dropsInventory?: boolean;

  /** Experience points awarded when defeated */
  experienceValue?: number;

  /** Whether this combatant is undead/spirit (affects blessed weapon bonus) */
  isUndead?: boolean;
}

/**
 * Combatant trait indicates an entity can engage in combat.
 *
 * This trait contains only combat *stats* — health and life-state are on the
 * required {@link HealthTrait}. All combat logic is in `CombatBehavior`.
 */
export class CombatantTrait implements ITrait, ICombatantData {
  static readonly type = 'combatant' as const;
  readonly type = 'combatant' as const;

  skill: number;
  baseDamage: number;
  armor: number;
  attackPower: number;
  defense: number;
  hitMessage?: string;
  deathMessage?: string;
  attackMessage?: string;
  hostile: boolean;
  canRetaliate: boolean;
  dropsInventory: boolean;
  experienceValue: number;
  isUndead: boolean;

  constructor(data: ICombatantData = {}) {
    // Set defaults and merge with provided data
    this.skill = data.skill ?? 30; // Default skill level (ADR-072)
    this.baseDamage = data.baseDamage ?? data.attackPower ?? 1; // ADR-072
    this.armor = data.armor ?? 0;
    this.attackPower = data.attackPower ?? 1;
    this.defense = data.defense ?? 0;
    this.hitMessage = data.hitMessage;
    this.deathMessage = data.deathMessage;
    this.attackMessage = data.attackMessage;
    this.hostile = data.hostile ?? false;
    this.canRetaliate = data.canRetaliate ?? true;
    this.dropsInventory = data.dropsInventory ?? true;
    this.experienceValue = data.experienceValue ?? 0;
    this.isUndead = data.isUndead ?? false;
  }
}
