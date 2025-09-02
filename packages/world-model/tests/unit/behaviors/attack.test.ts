import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AttackBehavior } from '../../../src/behaviors/attack';
import { IFEntity, TraitType } from '../../../src';
import { WeaponTrait } from '../../../src/traits/weapon/weaponTrait';
import { BreakableTrait } from '../../../src/traits/breakable/breakableTrait';
import { DestructibleTrait } from '../../../src/traits/destructible/destructibleTrait';
import { CombatantTrait } from '../../../src/traits/combatant/combatantTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';

describe('AttackBehavior', () => {
  let mockWorld: any;
  let attacker: IFEntity;
  let weapon: IFEntity;

  beforeEach(() => {
    attacker = new IFEntity('player', 'player');

    weapon = new IFEntity('sword', 'weapon');
    weapon.add({
      type: TraitType.WEAPON,
      minDamage: 5,
      maxDamage: 10,
      weaponType: 'blade'
    } as WeaponTrait);

    mockWorld = {
      getEntity: vi.fn(),
      updateEntity: vi.fn(),
      removeEntity: vi.fn(),
      createEntity: vi.fn((name, type) => {
        const entity = new IFEntity(`${type}_${Date.now()}`, type);
        return entity;
      }),
      moveEntity: vi.fn(),
      getLocation: vi.fn(() => 'room'),
      getRoom: vi.fn(() => ({ id: 'room', exits: {} })),
      updateRoom: vi.fn(),
      getContents: vi.fn(() => [])
    };
  });

  describe('attack breakable entity', () => {
    it('should break a breakable entity', () => {
      const vase = new IFEntity('vase', 'container');
      vase.add({
        type: TraitType.BREAKABLE,
        broken: false,
        breaksInto: 'shards',
        material: 'glass'
      } as BreakableTrait);

      mockWorld.getEntity.mockImplementation((id) => {
        if (id === 'vase') return vase;
        return null;
      });

      const result = AttackBehavior.attack(vase, undefined, mockWorld);

      expect(result.type).toBe('broke');
      // Debris creation is now story-specific via event handlers
      // The core behavior only marks the entity as broken
      
      // Check that the vase is marked as broken
      const breakableTrait = vase.get(TraitType.BREAKABLE) as BreakableTrait;
      expect(breakableTrait.broken).toBe(true);
    });

    it('should not break already broken entity', () => {
      const vase = new IFEntity('vase', 'container');
      vase.add({
        type: TraitType.BREAKABLE,
        broken: true,
        breaksInto: 'shards',
        material: 'glass'
      } as BreakableTrait);

      const result = AttackBehavior.attack(vase, undefined, mockWorld);

      expect(result.type).toBe('ineffective');
    });
  });

  describe('attack destructible entity', () => {
    it('should damage destructible entity with weapon', () => {
      const wall = new IFEntity('wall', 'barrier');
      wall.add({
        type: TraitType.DESTRUCTIBLE,
        hitPoints: 10,
        maxHitPoints: 10,
        armor: 0,
        requiresWeapon: true,
        requiresType: 'blade'
      } as DestructibleTrait);

      mockWorld.getEntity.mockImplementation((id) => {
        if (id === 'wall') return wall;
        return null;
      });

      // Mock weapon damage calculation
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const result = AttackBehavior.attack(wall, weapon, mockWorld);

      expect(result.type).toBe('damaged');
      expect(result.damage).toBeGreaterThan(0);
      expect(result.remainingHitPoints).toBeLessThan(10);
    });

    it('should destroy destructible entity when HP reaches 0', () => {
      const wall = new IFEntity('wall', 'barrier');
      wall.add({
        type: TraitType.DESTRUCTIBLE,
        hitPoints: 1,
        maxHitPoints: 10,
        armor: 0,
        requiresWeapon: false
      } as DestructibleTrait);

      mockWorld.getEntity.mockImplementation((id) => {
        if (id === 'wall') return wall;
        return null;
      });

      const result = AttackBehavior.attack(wall, undefined, mockWorld);

      expect(result.type).toBe('destroyed');
      expect(result.targetDestroyed).toBe(true);
    });

    it('should fail without required weapon', () => {
      const wall = new IFEntity('wall', 'barrier');
      wall.add({
        type: TraitType.DESTRUCTIBLE,
        hitPoints: 10,
        maxHitPoints: 10,
        armor: 0,
        requiresWeapon: true,
        requiresType: 'blunt'
      } as DestructibleTrait);

      const result = AttackBehavior.attack(wall, undefined, mockWorld);

      expect(result.type).toBe('ineffective');
      expect(result.success).toBe(false);
    });

    it('should fail with wrong weapon type', () => {
      const wall = new IFEntity('wall', 'barrier');
      wall.add({
        type: TraitType.DESTRUCTIBLE,
        hitPoints: 10,
        maxHitPoints: 10,
        armor: 0,
        requiresWeapon: true,
        requiresType: 'blunt'
      } as DestructibleTrait);

      const result = AttackBehavior.attack(wall, weapon, mockWorld);

      expect(result.type).toBe('ineffective');
      expect(result.success).toBe(false);
    });
  });

  describe('attack combatant entity', () => {
    it('should damage combatant with weapon', () => {
      const goblin = new IFEntity('goblin', 'npc');
      goblin.add({
        type: TraitType.COMBATANT,
        health: 20,
        maxHealth: 20,
        isAlive: true,
        armor: 2,
        dropsInventory: true
      } as CombatantTrait);

      mockWorld.getEntity.mockImplementation((id) => {
        if (id === 'goblin') return goblin;
        return null;
      });

      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const result = AttackBehavior.attack(goblin, weapon, mockWorld);

      expect(result.type).toBe('hit');
      expect(result.damage).toBeGreaterThan(0);
    });

    it('should kill combatant when health reaches 0', () => {
      const goblin = new IFEntity('goblin', 'npc');
      goblin.add({
        type: TraitType.COMBATANT,
        health: 2,
        maxHealth: 20,
        isAlive: true,
        armor: 0,
        dropsInventory: true
      } as CombatantTrait);
      
      goblin.add({
        type: TraitType.CONTAINER,
        canContain: true,
        contents: ['gold']
      } as ContainerTrait);

      mockWorld.getEntity.mockImplementation((id) => {
        if (id === 'goblin') return goblin;
        if (id === 'gold') return new IFEntity('gold', 'item');
        return null;
      });
      
      mockWorld.getContents = vi.fn(() => [
        { id: 'gold', type: 'item' }
      ]);

      vi.spyOn(Math, 'random').mockReturnValue(0.9); // High damage

      const result = AttackBehavior.attack(goblin, weapon, mockWorld);

      expect(result.type).toBe('killed');
      expect(result.targetKilled).toBe(true);
      expect(result.itemsDropped).toContain('gold');
    });

    it('should do unarmed damage without weapon', () => {
      const goblin = new IFEntity('goblin', 'npc');
      goblin.add({
        type: TraitType.COMBATANT,
        health: 20,
        maxHealth: 20,
        isAlive: true,
        armor: 0
      } as CombatantTrait);

      const result = AttackBehavior.attack(goblin, undefined, mockWorld);

      expect(result.type).toBe('hit');
      expect(result.damage).toBeGreaterThanOrEqual(1);
      expect(result.damage).toBeLessThanOrEqual(3); // Unarmed damage range
    });
  });

  describe('attack non-special entity', () => {
    it('should return ineffective for entity with no combat traits', () => {
      const chair = new IFEntity('chair', 'furniture');

      const result = AttackBehavior.attack(chair, undefined, mockWorld);

      expect(result.type).toBe('ineffective');
      expect(result.success).toBe(false);
    });
  });

  describe('priority order', () => {
    it('should prioritize breakable over destructible', () => {
      const entity = new IFEntity('test', 'object');
      entity.add({
        type: TraitType.BREAKABLE,
        broken: false,
        breaksInto: 'pieces'
      } as BreakableTrait);
      entity.add({
        type: TraitType.DESTRUCTIBLE,
        hitPoints: 10,
        maxHitPoints: 10,
        armor: 0
      } as DestructibleTrait);

      mockWorld.getEntity.mockImplementation((id) => {
        if (id === 'test') return entity;
        return null;
      });

      const result = AttackBehavior.attack(entity, undefined, mockWorld);

      expect(result.type).toBe('broke'); // Breakable wins
    });

    it('should try destructible if breakable is already broken', () => {
      const entity = new IFEntity('test', 'object');
      entity.add({
        type: TraitType.BREAKABLE,
        broken: true,
        breaksInto: 'pieces'
      } as BreakableTrait);
      entity.add({
        type: TraitType.DESTRUCTIBLE,
        hitPoints: 10,
        maxHitPoints: 10,
        armor: 0,
        requiresWeapon: false
      } as DestructibleTrait);

      mockWorld.getEntity.mockImplementation((id) => {
        if (id === 'test') return entity;
        return null;
      });

      const result = AttackBehavior.attack(entity, undefined, mockWorld);

      expect(result.type).toBe('damaged'); // Destructible used
    });
  });
});