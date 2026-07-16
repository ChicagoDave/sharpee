/**
 * Behavior for the HEALTH layer (ADR-226).
 *
 * All derivation and mutation over {@link HealthTrait} data. Consumers call these
 * static methods rather than reading the trait's fields through getters, so the
 * model survives `loadJSON()` (the `npc-service` `canAct`-getter footgun this layer
 * removes). Consciousness is purely derived from `health` — there is no stored
 * knocked-out flag, no `knockOut`/`wakeUp`, and no recovery timer (ADR-226 §1 F1).
 *
 * Public interface: `isAlive` / `isConscious` / `canAct` (pure derivation) and
 * `takeDamage` / `heal` / `kill` (mutation). All operate on a `HealthTrait` directly;
 * callers first confirm the entity has one (an entity with no `HealthTrait` is alive
 * and conscious by default — ADR-226 §3 opt-in rule — a check owned by the caller).
 * Owner context: `@sharpee/world-model` — HEALTH layer (ADR-223 child A).
 */

import { Behavior } from '../../behaviors/behavior';
import { TraitType } from '../trait-types';
import { HealthTrait } from './healthTrait';

export class HealthBehavior extends Behavior {
  static requiredTraits = [TraitType.HEALTH];

  // ---- Derivation (pure — no mutation) ----

  /**
   * Whether the entity is alive: not terminally dead and above zero health.
   * @param t the entity's health trait
   */
  static isAlive(t: HealthTrait): boolean {
    return !t.dead && t.health > 0;
  }

  /**
   * Whether the entity is conscious: alive, not asleep, and above the
   * unconsciousness threshold. Consciousness is derived from `health` alone.
   * @param t the entity's health trait
   */
  static isConscious(t: HealthTrait): boolean {
    return (
      HealthBehavior.isAlive(t) &&
      !t.asleep &&
      t.health > t.maxHealth * t.unconsciousThreshold
    );
  }

  /**
   * Whether the entity can take a turn / act. Alias of {@link isConscious} — the
   * turn loop's eligibility predicate (replaces `NpcTrait.canAct`).
   * @param t the entity's health trait
   */
  static canAct(t: HealthTrait): boolean {
    return HealthBehavior.isConscious(t);
  }

  // ---- Mutation (behaviors own mutations) ----

  /**
   * Apply damage to health. Armor is the caller's concern (a `CombatantTrait` stat),
   * so `amount` is already post-armor. On reaching zero health the entity dies with
   * the given `cause`.
   * @param t the entity's health trait
   * @param amount post-armor damage; negatives are treated as zero
   * @param cause cause recorded if this blow is lethal (default 'damage')
   * @returns `true` iff the entity is now dead
   */
  static takeDamage(t: HealthTrait, amount: number, cause: string = 'damage'): boolean {
    if (t.dead) return true; // a corpse takes no further damage (idempotent)
    t.health = Math.max(0, t.health - Math.max(0, amount));
    if (t.health <= 0) {
      HealthBehavior.kill(t, cause);
      return true;
    }
    return false;
  }

  /**
   * Restore health, clamped to `maxHealth`. Healing back above the unconsciousness
   * threshold *is* regaining consciousness (no separate wake step). The dead do not
   * heal — resurrection is a deliberate separate act, not `heal`.
   * @param t the entity's health trait
   * @param amount healing; negatives are treated as zero
   * @returns the actual amount healed
   */
  static heal(t: HealthTrait, amount: number): number {
    if (t.dead) return 0;
    const before = t.health;
    t.health = Math.min(t.maxHealth, t.health + Math.max(0, amount));
    return t.health - before;
  }

  /**
   * Kill the entity: set the terminal `dead` flag and its `cause`, leaving `health`
   * untouched. This is death's single writer — non-damage deaths (grue/fall/drown,
   * ADR-224 `killPlayer`) call it directly; `takeDamage` calls it on a lethal blow.
   * Death is distinct from `health === 0` (an entity can be dead at full health).
   * @param t the entity's health trait
   * @param cause the cause of death (e.g. 'grue', 'fall', 'combat')
   */
  static kill(t: HealthTrait, cause: string): void {
    t.dead = true;
    t.causeOfDeath = cause;
  }
}
