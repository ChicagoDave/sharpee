/**
 * Health Trait (ADR-226 — the HEALTH layer of ADR-223's four-layer NPC model).
 *
 * The single creature life-state model: current/max health, a derived
 * consciousness threshold, an `asleep` flag, and a first-class terminal
 * dead-by-cause state. This is the one source of mortality/consciousness truth —
 * `CombatantTrait` and `NpcTrait` no longer carry their own `isAlive`/`isConscious`.
 *
 * Data only — no methods. All derivation (alive/conscious/can-act) and mutation
 * (takeDamage/heal/kill) live in {@link HealthBehavior}, because a getter on the
 * trait does not survive `loadJSON()` deserialization (the `npc-service` `canAct`
 * footgun this layer removes).
 *
 * Public interface: read life-state via `HealthBehavior.{isAlive,isConscious,canAct}`
 * and mutate via `HealthBehavior.{takeDamage,heal,kill}`.
 * Owner context: `@sharpee/world-model` — HEALTH layer (ADR-223 child A).
 */

import { ITrait } from '../trait';

/**
 * Constructor/serialization data for {@link HealthTrait}. Every field is optional;
 * see the class constructor for defaults.
 */
export interface IHealthData {
  /** Current health. Defaults to `maxHealth`. */
  health?: number;

  /** Maximum health; `heal` clamps to this. Defaults to `health`, else 10. */
  maxHealth?: number;

  /** Terminal dead-by-cause flag (ADR-224). Defaults to `false`. */
  dead?: boolean;

  /** Cause recorded alongside `dead` (e.g. 'combat', 'grue', 'fall'). */
  causeOfDeath?: string;

  /** Full health but voluntarily not acting (a daemon/story concern). Defaults to `false`. */
  asleep?: boolean;

  /**
   * Fraction of `maxHealth` at/below which the entity is unconscious.
   * Defaults to `0.2` (ADR-072 20%-health parity).
   */
  unconsciousThreshold?: number;
}

/**
 * The creature life-state trait. Data-only; see file header.
 *
 * Invariants (enforced by {@link HealthBehavior}, not by getters here):
 * - `alive`   ⇔ `!dead && health > 0`
 * - `conscious` ⇔ `alive && !asleep && health > maxHealth * unconsciousThreshold`
 * There is no stored knocked-out flag and no recovery timer — consciousness is
 * purely derived from `health` (ADR-226 §1 F1).
 */
export class HealthTrait implements ITrait, IHealthData {
  static readonly type = 'health' as const;
  readonly type = 'health' as const;

  health: number;
  maxHealth: number;
  dead: boolean;
  causeOfDeath?: string;
  asleep: boolean;
  unconsciousThreshold: number;

  constructor(data: IHealthData = {}) {
    this.maxHealth = data.maxHealth ?? data.health ?? 10;
    this.health = data.health ?? this.maxHealth;
    this.dead = data.dead ?? false;
    this.causeOfDeath = data.causeOfDeath;
    this.asleep = data.asleep ?? false;
    this.unconsciousThreshold = data.unconsciousThreshold ?? 0.2;
  }
}
