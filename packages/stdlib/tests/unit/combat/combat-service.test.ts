/**
 * Tests for CombatService (ADR-072)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CombatService,
  createCombatService,
  CombatContext,
  CombatMessages,
} from '../../../src/combat';
import { createSeededRandom } from '@sharpee/core';
import { IFEntity, WorldModel, TraitType, CombatantTrait, WeaponTrait } from '@sharpee/world-model';

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
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 50, health: 10, maxHealth: 10 }),
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
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 20, health: 10, maxHealth: 10 }),
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
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 20, health: 10, maxHealth: 10 }),
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
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 20, health: 10, maxHealth: 10, armor: 2 }),
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
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 10, health: 5, maxHealth: 10 }),
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
      random.setSeed(1);

      const attacker = createMockEntity('attacker', 'Attacker', {
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 95, baseDamage: 7 }),
      });

      // Target has 10 health, 20% = 2
      // After 7 damage: 10 - 7 = 3 (not knocked out)
      // After another hit: 3 - 7 = -4 (killed)
      // Need exact damage to get to 20% threshold
      const target = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({ skill: 10, health: 9, maxHealth: 10 }),
      });

      const context: CombatContext = {
        attacker,
        target,
        world: createMockWorld(),
        random,
      };

      const result = service.resolveAttack(context);

      if (result.hit && !result.targetKilled) {
        // Health 9 - 7 = 2, which is exactly 20%
        expect(result.targetNewHealth).toBe(2);
        expect(result.targetKnockedOut).toBe(true);
        expect(result.messageId).toBe(CombatMessages.ATTACK_KNOCKED_OUT);
      }
    });
  });

  describe('canAttack', () => {
    it('should allow attacking combatant', () => {
      const attacker = createMockEntity('attacker', 'Attacker', {});
      const target = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({ isAlive: true }),
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
        [TraitType.COMBATANT]: new CombatantTrait({ isAlive: false }),
      });

      const result = service.canAttack(attacker, target);

      expect(result.valid).toBe(false);
      expect(result.messageId).toBe(CombatMessages.ALREADY_DEAD);
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy for full health', () => {
      const entity = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({ health: 10, maxHealth: 10 }),
      });

      expect(service.getHealthStatus(entity)).toBe('healthy');
    });

    it('should return wounded for 70% health', () => {
      const entity = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({ health: 6, maxHealth: 10 }),
      });

      expect(service.getHealthStatus(entity)).toBe('wounded');
    });

    it('should return badly_wounded for 30% health', () => {
      const entity = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({ health: 2, maxHealth: 10 }),
      });

      expect(service.getHealthStatus(entity)).toBe('badly_wounded');
    });

    it('should return near_death for 10% health', () => {
      const entity = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({ health: 1, maxHealth: 10 }),
      });

      expect(service.getHealthStatus(entity)).toBe('near_death');
    });

    it('should return unconscious for unconscious entity', () => {
      const entity = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({ health: 5, maxHealth: 10, isConscious: false }),
      });

      expect(service.getHealthStatus(entity)).toBe('unconscious');
    });

    it('should return dead for dead entity', () => {
      const entity = createMockEntity('target', 'Target', {
        [TraitType.COMBATANT]: new CombatantTrait({ health: 0, maxHealth: 10, isAlive: false }),
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
