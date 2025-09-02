import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CombatBehavior } from '../../../src/traits/combatant/combatantBehavior';
import { IFEntity, TraitType } from '../../../src';
import { CombatantTrait } from '../../../src/traits/combatant/combatantTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';

describe('CombatBehavior', () => {
  let goblin: IFEntity;
  let mockWorld: any;

  beforeEach(() => {
    goblin = new IFEntity('goblin', 'npc');
    goblin.add({
      type: TraitType.COMBATANT,
      health: 20,
      maxHealth: 20,
      isAlive: true,
      armor: 2,
      dropsInventory: true
    } as CombatantTrait);
    
    goblin.add({
      type: TraitType.CONTAINER,
      canContain: true,
      maxCapacity: 10,
      contents: ['gold', 'dagger']
    } as ContainerTrait);

    mockWorld = {
      getEntity: vi.fn((id) => {
        if (id === 'goblin') return goblin;
        if (id === 'gold') {
          const gold = new IFEntity('gold', 'item');
          return gold;
        }
        if (id === 'dagger') {
          const dagger = new IFEntity('dagger', 'weapon');
          return dagger;
        }
        return null;
      }),
      updateEntity: vi.fn(),
      moveEntity: vi.fn(),
      getLocation: vi.fn(() => 'room'),
      getContents: vi.fn(() => [
        { id: 'gold', type: 'item' },
        { id: 'dagger', type: 'weapon' }
      ])
    };
  });

  describe('attack', () => {
    it('should reduce health by damage minus armor', () => {
      const result = CombatBehavior.attack(goblin, 10, mockWorld);
      
      expect(result.success).toBe(true);
      expect(result.killed).toBe(false);
      expect(result.damage).toBe(8); // 10 - 2 armor
      expect(result.remainingHealth).toBe(12); // 20 - 8
      
      const combatantTrait = goblin.get(TraitType.COMBATANT) as CombatantTrait;
      expect(combatantTrait.health).toBe(12);
    });

    it('should handle armor reducing damage to 0', () => {
      const result = CombatBehavior.attack(goblin, 2, mockWorld);
      
      expect(result.damage).toBe(1); // Min damage is 1
      expect(result.remainingHealth).toBe(19);
    });

    it('should kill when health reaches 0', () => {
      const result = CombatBehavior.attack(goblin, 22, mockWorld);
      
      expect(result.success).toBe(true);
      expect(result.killed).toBe(true);
      expect(result.remainingHealth).toBe(0);
      
      const combatantTrait = goblin.get(TraitType.COMBATANT) as CombatantTrait;
      expect(combatantTrait.health).toBe(0);
      expect(combatantTrait.isAlive).toBe(false);
    });

    it('should drop inventory when killed', () => {
      const result = CombatBehavior.attack(goblin, 22, mockWorld);
      
      expect(result.droppedItems).toEqual(['gold', 'dagger']);
      expect(mockWorld.moveEntity).toHaveBeenCalledWith('gold', 'room');
      expect(mockWorld.moveEntity).toHaveBeenCalledWith('dagger', 'room');
    });

    it('should not drop inventory if dropsInventory is false', () => {
      const combatantTrait = goblin.get(TraitType.COMBATANT) as CombatantTrait;
      combatantTrait.dropsInventory = false;
      
      const result = CombatBehavior.attack(goblin, 22, mockWorld);
      
      expect(result.droppedItems).toBeUndefined();
      expect(mockWorld.moveEntity).not.toHaveBeenCalled();
    });

    it('should fail when attacking dead combatant', () => {
      const combatantTrait = goblin.get(TraitType.COMBATANT) as CombatantTrait;
      combatantTrait.isAlive = false;
      
      const result = CombatBehavior.attack(goblin, 10, mockWorld);
      
      expect(result.success).toBe(false);
    });

    it('should fail for non-combatant entities', () => {
      const nonCombatant = new IFEntity('rock', 'item');
      const result = CombatBehavior.attack(nonCombatant, 10, mockWorld);
      
      expect(result.success).toBe(false);
    });
  });

  describe('heal', () => {
    it('should increase health up to max', () => {
      const combatantTrait = goblin.get(TraitType.COMBATANT) as CombatantTrait;
      combatantTrait.health = 10;
      
      const healed = CombatBehavior.heal(goblin, 5);
      
      expect(healed).toBe(5);
      expect(combatantTrait.health).toBe(15);
    });

    it('should cap healing at max health', () => {
      const combatantTrait = goblin.get(TraitType.COMBATANT) as CombatantTrait;
      combatantTrait.health = 18;
      
      const healed = CombatBehavior.heal(goblin, 5);
      
      expect(healed).toBe(2);
      expect(combatantTrait.health).toBe(20);
    });

    it('should fail when healing dead combatant', () => {
      const combatantTrait = goblin.get(TraitType.COMBATANT) as CombatantTrait;
      combatantTrait.isAlive = false;
      
      const healed = CombatBehavior.heal(goblin, 10);
      
      expect(healed).toBe(0);
    });
  });

  describe('resurrect', () => {
    it('should bring dead combatant back to life', () => {
      const combatantTrait = goblin.get(TraitType.COMBATANT) as CombatantTrait;
      combatantTrait.health = 0;
      combatantTrait.isAlive = false;
      
      const resurrected = CombatBehavior.resurrect(goblin);
      
      expect(resurrected).toBe(true);
      expect(combatantTrait.health).toBe(20);
      expect(combatantTrait.isAlive).toBe(true);
    });

    it('should resurrect to full health if no health specified', () => {
      const combatantTrait = goblin.get(TraitType.COMBATANT) as CombatantTrait;
      combatantTrait.health = 0;
      combatantTrait.isAlive = false;
      
      const resurrected = CombatBehavior.resurrect(goblin);
      
      expect(combatantTrait.health).toBe(20);
    });

    it('should fail when resurrecting living combatant', () => {
      const resurrected = CombatBehavior.resurrect(goblin);
      
      expect(resurrected).toBe(false);
    });
  });

  describe('isAlive', () => {
    it('should return true for living combatants', () => {
      expect(CombatBehavior.isAlive(goblin)).toBe(true);
    });

    it('should return false for dead combatants', () => {
      const combatantTrait = goblin.get(TraitType.COMBATANT) as CombatantTrait;
      combatantTrait.isAlive = false;
      
      expect(CombatBehavior.isAlive(goblin)).toBe(false);
    });

    it('should return true for non-combatant entities', () => {
      const nonCombatant = new IFEntity('rock', 'item');
      expect(CombatBehavior.isAlive(nonCombatant)).toBe(true);
    });
  });
});