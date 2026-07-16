/**
 * Tests for the HEALTH layer — `HealthTrait` (data) + `HealthBehavior` (logic),
 * ADR-226 / ADR-223 child A.
 *
 * Verifies:
 *  - Trait shape/defaults (maxHealth, threshold, terminal fields).
 *  - Derivation: isAlive / isConscious / canAct across the unconsciousness
 *    threshold, with no stored KO flag (purely derived from health).
 *  - Mutation: takeDamage (non-lethal, unconsciousness, lethal-with-cause,
 *    idempotent-on-dead), heal (clamp, wake-by-healing, dead-does-not-heal),
 *    kill (terminal dead-by-cause at full health — AC-6).
 *  - Save/load: a damaged-to-unconscious entity round-trips through
 *    toJSON/fromJSON and `HealthBehavior` still reads consciousness correctly,
 *    with NO reliance on a trait getter (the `npc-service` loadJSON footgun) — AC-3
 *    (world-model half).
 *
 * Owner context: `@sharpee/world-model` — HEALTH layer (ADR-223 child A).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { HealthTrait } from '../../../src/traits/health/healthTrait';
import { HealthBehavior } from '../../../src/traits/health/healthBehavior';

describe('HealthTrait — shape & defaults', () => {
  it('defaults health to maxHealth, threshold to 0.2, not dead / not asleep', () => {
    const t = new HealthTrait({ maxHealth: 10 });
    expect(t.type).toBe(TraitType.HEALTH);
    expect(t.maxHealth).toBe(10);
    expect(t.health).toBe(10);
    expect(t.dead).toBe(false);
    expect(t.asleep).toBe(false);
    expect(t.unconsciousThreshold).toBe(0.2);
    expect(t.causeOfDeath).toBeUndefined();
  });

  it('derives maxHealth from health when only health is given', () => {
    const t = new HealthTrait({ health: 30 });
    expect(t.maxHealth).toBe(30);
    expect(t.health).toBe(30);
  });
});

describe('HealthBehavior — derivation (no stored KO flag)', () => {
  it('is alive and conscious at full health', () => {
    const t = new HealthTrait({ maxHealth: 10 });
    expect(HealthBehavior.isAlive(t)).toBe(true);
    expect(HealthBehavior.isConscious(t)).toBe(true);
    expect(HealthBehavior.canAct(t)).toBe(true);
  });

  it('is unconscious at/below the 20% threshold but still alive', () => {
    const t = new HealthTrait({ maxHealth: 10, health: 2 }); // 2 is NOT > 10*0.2
    expect(HealthBehavior.isAlive(t)).toBe(true);
    expect(HealthBehavior.isConscious(t)).toBe(false);
    expect(HealthBehavior.canAct(t)).toBe(false);
  });

  it('is conscious just above the threshold', () => {
    const t = new HealthTrait({ maxHealth: 10, health: 3 });
    expect(HealthBehavior.isConscious(t)).toBe(true);
  });

  it('asleep at full health is not conscious, but is alive', () => {
    const t = new HealthTrait({ maxHealth: 10, asleep: true });
    expect(HealthBehavior.isAlive(t)).toBe(true);
    expect(HealthBehavior.isConscious(t)).toBe(false);
  });

  it('dead is neither alive nor conscious', () => {
    const t = new HealthTrait({ maxHealth: 10, dead: true, causeOfDeath: 'grue' });
    expect(HealthBehavior.isAlive(t)).toBe(false);
    expect(HealthBehavior.isConscious(t)).toBe(false);
  });
});

describe('HealthBehavior.takeDamage', () => {
  it('reduces health and reports not-dead for a non-lethal blow', () => {
    const t = new HealthTrait({ maxHealth: 10 });
    const killed = HealthBehavior.takeDamage(t, 7);
    expect(killed).toBe(false);
    expect(t.health).toBe(3); // DOES: health mutated
    expect(t.dead).toBe(false);
  });

  it('drops the entity to unconscious without killing at the threshold', () => {
    const t = new HealthTrait({ maxHealth: 10 });
    HealthBehavior.takeDamage(t, 8); // -> health 2
    expect(t.health).toBe(2);
    expect(HealthBehavior.isAlive(t)).toBe(true);
    expect(HealthBehavior.isConscious(t)).toBe(false);
  });

  it('kills at zero health, defaulting the cause to "damage"', () => {
    const t = new HealthTrait({ maxHealth: 10 });
    const killed = HealthBehavior.takeDamage(t, 10);
    expect(killed).toBe(true);
    expect(t.health).toBe(0);
    expect(t.dead).toBe(true);
    expect(t.causeOfDeath).toBe('damage');
  });

  it('records a caller-supplied cause on a lethal blow', () => {
    const t = new HealthTrait({ maxHealth: 10 });
    HealthBehavior.takeDamage(t, 99, 'combat');
    expect(t.dead).toBe(true);
    expect(t.causeOfDeath).toBe('combat');
    expect(t.health).toBe(0); // floored, never negative
  });

  it('is idempotent on an already-dead entity (REJECTS WHEN dead)', () => {
    const t = new HealthTrait({ maxHealth: 10, health: 0, dead: true, causeOfDeath: 'grue' });
    const killed = HealthBehavior.takeDamage(t, 5);
    expect(killed).toBe(true);
    expect(t.health).toBe(0); // unchanged
    expect(t.causeOfDeath).toBe('grue'); // original cause preserved
  });
});

describe('HealthBehavior.heal', () => {
  it('restores health, clamped to maxHealth, returning the amount healed', () => {
    const t = new HealthTrait({ maxHealth: 10, health: 8 });
    const healed = HealthBehavior.heal(t, 10);
    expect(t.health).toBe(10); // clamped
    expect(healed).toBe(2);
  });

  it('healing above the threshold restores consciousness (no wake step)', () => {
    const t = new HealthTrait({ maxHealth: 10, health: 2 }); // unconscious
    expect(HealthBehavior.isConscious(t)).toBe(false);
    HealthBehavior.heal(t, 5); // -> 7
    expect(t.health).toBe(7);
    expect(HealthBehavior.isConscious(t)).toBe(true);
  });

  it('does not heal the dead (REJECTS WHEN dead)', () => {
    const t = new HealthTrait({ maxHealth: 10, health: 0, dead: true, causeOfDeath: 'combat' });
    const healed = HealthBehavior.heal(t, 5);
    expect(healed).toBe(0);
    expect(t.health).toBe(0);
    expect(t.dead).toBe(true);
  });
});

describe('HealthBehavior.kill — AC-6 (terminal dead-by-cause at full health)', () => {
  it('sets dead + cause without touching health; entity reads as not-alive', () => {
    const t = new HealthTrait({ maxHealth: 10 }); // full health
    HealthBehavior.kill(t, 'grue');
    expect(t.dead).toBe(true);
    expect(t.causeOfDeath).toBe('grue');
    expect(t.health).toBe(10); // untouched — death is distinct from health===0
    expect(HealthBehavior.isAlive(t)).toBe(false);
    expect(HealthBehavior.canAct(t)).toBe(false);
  });
});

describe('save/load — AC-3 (world-model half)', () => {
  it('unconscious state survives toJSON/fromJSON via HealthBehavior, not a getter', () => {
    const entity = new IFEntity('h01', 'actor');
    entity.add(new HealthTrait({ maxHealth: 10 }));
    HealthBehavior.takeDamage(entity.get<HealthTrait>(TraitType.HEALTH)!, 8); // -> health 2, unconscious

    const restored = IFEntity.fromJSON(JSON.parse(JSON.stringify(entity.toJSON())));
    const loaded = restored.get<HealthTrait>(TraitType.HEALTH)!;

    // The loaded trait is plain data — no class methods/getters survived.
    expect((loaded as unknown as { isConscious?: unknown }).isConscious).toBeUndefined();
    expect(loaded.health).toBe(2);

    // Behavior reads the plain data correctly after the round-trip.
    expect(HealthBehavior.isAlive(loaded)).toBe(true);
    expect(HealthBehavior.isConscious(loaded)).toBe(false);
  });

  it('terminal dead-by-cause survives the round-trip', () => {
    const entity = new IFEntity('h02', 'actor');
    const t = new HealthTrait({ maxHealth: 10 });
    entity.add(t);
    HealthBehavior.kill(t, 'grue');

    const restored = IFEntity.fromJSON(JSON.parse(JSON.stringify(entity.toJSON())));
    const loaded = restored.get<HealthTrait>(TraitType.HEALTH)!;

    expect(loaded.dead).toBe(true);
    expect(loaded.causeOfDeath).toBe('grue');
    expect(HealthBehavior.isAlive(loaded)).toBe(false);
  });
});
