/**
 * Tests for CombatService (ADR-072; life-state migrated to HealthTrait per ADR-226).
 *
 * Moved from packages/stdlib/tests/unit/combat/ to basic-combat extension.
 * Health/alive/conscious now live on HealthTrait (ADR-226 / ADR-223 child A); combat
 * stats (skill/baseDamage/armor) stay on CombatantTrait. Entities under test carry
 * both traits.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CombatService,
  createCombatService,
  CombatContext,
  CombatMessages,
} from '../src';
import { createSeededRandom } from '@sharpee/core';
import {
  IFEntity,
  WorldModel,
  TraitType,
  CombatantTrait,
  HealthTrait,
  WeaponTrait,
} from '@sharpee/world-model';

// Helper to create mock entity
function createMockEntity(
  id: string,
  name: string,
  traits: Record<string, unknown> = {}
): IFEntity {
  const entity = {
    id,
    name,
    has: vi.fn((type: string) => type in traits),
    get: vi.fn((type: string) => traits[type]),
    traits,
  } as unknown as IFEntity;
  return entity;
}

// Helper to create mock world
function createMockWorld(): WorldModel {
  return {
    getContents: vi.fn().mockReturnValue([]),
  } as unknown as WorldModel;
}

describe('CombatService', () => {
  let service: CombatService;
  let random: ReturnType<typeof createSeededRandom>;

  beforeEach(() => {
    service = new CombatService();
    random = createSeededRandom(12345); // Fixed seed for determinism
  });

  describe('calculateHitChance', () => {
    it('should return 50% for equal skills', () => {
      const chance = service.calculateHitChance(50, 50, 0);
      expect(chance).toBe(50);
    });

    it('should increase chance with skill advantage', () => {
      const chance = service.calculateHitChance(70, 50, 0);
      expect(chance).toBe(70);
    });

    it('should decrease chance with skill disadvantage', () => {
      const chance = service.calculateHitChance(30, 50, 0);
      expect(chance).toBe(30);
    });

    it('should include weapon bonus', () => {
      const chance = service.calculateHitChance(50, 50, 20);
      expect(chance).toBe(70);
    });

    it('should clamp to minimum 10%', () => {
      const chance = service.calculateHitChance(10, 100, 0);
      expect(chance).toBe(10);
    });

    it('should clamp to maximum 95%', () => {
      const chance = service.calculateHitChance(100, 10, 50);
      expect(chance).toBe(95);
    });
  });

  describe('resolveAttack', () => {
    it('should miss when roll exceeds hit chance', () => {
      // Use a seed that gives a high roll
      const highRollRandom = createSeededRandom(99999);

      const attacker = createMockEntity('attacker', 'Attacker', {
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 20 }), // Low skill = ~30% hit chance
      });

      const target = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 50 }),
        [TraitType.HEALTH]: new HealthTrait({ health: 10, maxHealth: 10 }),
      });

      const context: CombatContext = {
        attacker,
        target,
        world: createMockWorld(),
        random: highRollRandom,
      };

      // Keep trying until we get a miss (should happen quickly with low skill)
      let result;
      for (let i = 0; i < 10; i++) {
        highRollRandom.setSeed(99999 + i * 1000);
        result = service.resolveAttack(context);
        if (!result.hit) break;
      }

      expect(result!.hit).toBe(false);
      expect(result!.damage).toBe(0);
      expect(result!.messageId).toBe(CombatMessages.ATTACK_MISSED);
    });

    it('should hit and deal damage', () => {
      // Use a seed that gives a low roll (guaranteed hit with 95% max)
      random.setSeed(1); // Low roll

      const attacker = createMockEntity('attacker', 'Attacker', {
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 80, baseDamage: 2 }),
      });

      const target = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 20 }),
        [TraitType.HEALTH]: new HealthTrait({ health: 10, maxHealth: 10 }),
      });

      const context: CombatContext = {
        attacker,
        target,
        world: createMockWorld(),
        random,
      };

      const result = service.resolveAttack(context);

      expect(result.hit).toBe(true);
      expect(result.damage).toBeGreaterThan(0);
    });

    it('should add weapon damage', () => {
      random.setSeed(1);

      const attacker = createMockEntity('attacker', 'Attacker', {
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 80, baseDamage: 1 }),
      });

      const weapon = createMockEntity('sword', 'Sword', {
        [TraitType.WEAPON]: new WeaponTrait({ damage: 3, skillBonus: 10 }),
      });

      const target = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 20 }),
        [TraitType.HEALTH]: new HealthTrait({ health: 10, maxHealth: 10 }),
      });

      const context: CombatContext = {
        attacker,
        target,
        weapon,
        world: createMockWorld(),
        random,
      };

      const result = service.resolveAttack(context);

      expect(result.hit).toBe(true);
      expect(result.damage).toBe(4); // 1 base + 3 weapon
    });

    it('should apply armor reduction', () => {
      random.setSeed(1);

      const attacker = createMockEntity('attacker', 'Attacker', {
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 80, baseDamage: 3 }),
      });

      const target = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 20, armor: 2 }),
        [TraitType.HEALTH]: new HealthTrait({ health: 10, maxHealth: 10 }),
      });

      const context: CombatContext = {
        attacker,
        target,
        world: createMockWorld(),
        random,
      };

      const result = service.resolveAttack(context);

      expect(result.hit).toBe(true);
      expect(result.damage).toBe(1); // 3 - 2 armor = 1 (minimum 1)
    });

    it('should kill target when health reaches 0', () => {
      random.setSeed(1);

      const attacker = createMockEntity('attacker', 'Attacker', {
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 95, baseDamage: 10 }),
      });

      const target = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 10 }),
        [TraitType.HEALTH]: new HealthTrait({ health: 5, maxHealth: 10 }),
      });

      const context: CombatContext = {
        attacker,
        target,
        world: createMockWorld(),
        random,
      };

      const result = service.resolveAttack(context);

      expect(result.hit).toBe(true);
      expect(result.targetKilled).toBe(true);
      expect(result.targetNewHealth).toBe(0);
      expect(result.messageId).toBe(CombatMessages.ATTACK_KILLED);
    });

    it('should knock out target at 20% health', () => {
      // Force the hit roll to a known value so the test is fully deterministic.
      // resolveAttack calls random.int(1, 100); returning 1 guarantees a hit
      // against any hit chance >= 1%.
      const controlledRandom = createSeededRandom(1);
      vi.spyOn(controlledRandom, 'int').mockReturnValue(1); // Always roll 1 → guaranteed hit

      const attacker = createMockEntity('attacker', 'Attacker', {
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 95, baseDamage: 7 }),
      });

      // Target: health 9, maxHealth 10, no armor
      // Damage = baseDamage 7, newHealth = 9 - 7 = 2
      // 2 / 10 = 20% → exactly at knockout threshold (<=20% and not killed)
      const target = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 10 }),
        [TraitType.HEALTH]: new HealthTrait({ health: 9, maxHealth: 10 }),
      });

      const context: CombatContext = {
        attacker,
        target,
        world: createMockWorld(),
        random: controlledRandom,
      };

      const result = service.resolveAttack(context);

      expect(result.hit).toBe(true);
      expect(result.targetKilled).toBe(false);
      expect(result.targetNewHealth).toBe(2);
      expect(result.targetKnockedOut).toBe(true);
      expect(result.messageId).toBe(CombatMessages.ATTACK_KNOCKED_OUT);
    });
  });

  describe('canAttack', () => {
    it('should allow attacking combatant', () => {
      const attacker = createMockEntity('attacker', 'Attacker', {});
      const target = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({}),
        [TraitType.HEALTH]: new HealthTrait({ health: 10, maxHealth: 10 }),
      });

      const result = service.canAttack(attacker, target);

      expect(result.valid).toBe(true);
    });

    it('should reject attacking non-combatant', () => {
      const attacker = createMockEntity('attacker', 'Attacker', {});
      const target = createMockEntity('rock', 'Rock', {}); // No combatant trait

      const result = service.canAttack(attacker, target);

      expect(result.valid).toBe(false);
      expect(result.messageId).toBe(CombatMessages.CANNOT_ATTACK);
    });

    it('should reject attacking dead target', () => {
      const attacker = createMockEntity('attacker', 'Attacker', {});
      const target = createMockEntity('corpse', 'Corpse', {
        [TraitType.COMBATANT]: new CombatantTrait({}),
        [TraitType.HEALTH]: new HealthTrait({ dead: true, causeOfDeath: 'combat' }),
      });

      const result = service.canAttack(attacker, target);

      expect(result.valid).toBe(false);
      expect(result.messageId).toBe(CombatMessages.ALREADY_DEAD);
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy for full health', () => {
      const entity = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({}),
        [TraitType.HEALTH]: new HealthTrait({ health: 10, maxHealth: 10 }),
      });

      expect(service.getHealthStatus(entity)).toBe('healthy');
    });

    it('should return wounded for 60% health', () => {
      const entity = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({}),
        [TraitType.HEALTH]: new HealthTrait({ health: 6, maxHealth: 10 }),
      });

      expect(service.getHealthStatus(entity)).toBe('wounded');
    });

    it('should return badly_wounded for 30% health (conscious, above the 20% threshold)', () => {
      // 3/10 = 30%: still conscious (>20%), so the health-percent tier applies.
      // (Was health:2 = 20% pre-ADR-226 — that is now derived-unconscious; see below.)
      const entity = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({}),
        [TraitType.HEALTH]: new HealthTrait({ health: 3, maxHealth: 10 }),
      });

      expect(service.getHealthStatus(entity)).toBe('badly_wounded');
    });

    it('should return unconscious at/below 20% health (derived consciousness, ADR-226/ADR-072)', () => {
      // 1/10 = 10%: at or below the 20% threshold the entity is unconscious by
      // derivation, so getHealthStatus reports 'unconscious'. The 'near_death'
      // percent tier is unreachable while conscious (it requires >20% health) —
      // this matches ADR-072's own knockout-at-20% rule.
      const entity = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({}),
        [TraitType.HEALTH]: new HealthTrait({ health: 1, maxHealth: 10 }),
      });

      expect(service.getHealthStatus(entity)).toBe('unconscious');
    });

    it('should return unconscious for an unconscious entity', () => {
      const entity = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({}),
        [TraitType.HEALTH]: new HealthTrait({ health: 2, maxHealth: 10 }), // <=20% → unconscious
      });

      expect(service.getHealthStatus(entity)).toBe('unconscious');
    });

    it('should return dead for dead entity', () => {
      const entity = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({}),
        [TraitType.HEALTH]: new HealthTrait({ health: 0, maxHealth: 10, dead: true }),
      });

      expect(service.getHealthStatus(entity)).toBe('dead');
    });

    it('should return healthy for non-combatant', () => {
      const entity = createMockEntity('rock', 'Rock', {});

      expect(service.getHealthStatus(entity)).toBe('healthy');
    });
  });
});

describe('createCombatService', () => {
  it('should create a combat service', () => {
    const service = createCombatService();
    expect(service).toBeDefined();
    expect(service.resolveAttack).toBeDefined();
    expect(service.canAttack).toBeDefined();
    expect(service.getHealthStatus).toBeDefined();
  });
});
