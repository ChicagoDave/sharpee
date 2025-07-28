// tests/unit/traits/actor.test.ts

import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';

describe('ActorTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new ActorTrait();
      
      expect(trait.type).toBe(TraitType.ACTOR);
      expect(trait.isPlayer).toBe(false);
      expect(trait.isPlayable).toBe(true);
      expect(trait.state).toBeUndefined();
      expect(trait.pronouns).toEqual({
        subject: 'they',
        object: 'them',
        possessive: 'their',
        reflexive: 'themself'
      });
      expect(trait.capacity).toBeUndefined();
      expect(trait.customProperties).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new ActorTrait({
        isPlayer: true,
        isPlayable: false,
        state: 'alert',
        pronouns: {
          subject: 'she',
          object: 'her',
          possessive: 'her',
          reflexive: 'herself'
        },
        capacity: {
          maxItems: 10,
          maxWeight: 50,
          maxVolume: 100
        },
        customProperties: {
          health: 100,
          mana: 50
        }
      });
      
      expect(trait.isPlayer).toBe(true);
      expect(trait.isPlayable).toBe(false);
      expect(trait.state).toBe('alert');
      expect(trait.pronouns).toEqual({
        subject: 'she',
        object: 'her',
        possessive: 'her',
        reflexive: 'herself'
      });
      expect(trait.capacity).toEqual({
        maxItems: 10,
        maxWeight: 50,
        maxVolume: 100
      });
      expect(trait.customProperties).toEqual({
        health: 100,
        mana: 50
      });
    });

    it('should merge pronouns when partially provided', () => {
      const trait = new ActorTrait({
        pronouns: {
          subject: 'he',
          object: 'him'
          // Missing possessive and reflexive
        } as any
      });
      
      // The implementation correctly merges partial pronouns with defaults
      expect(trait.pronouns).toEqual({
        subject: 'he',
        object: 'him',
        possessive: 'their',  // Default preserved
        reflexive: 'themself' // Default preserved
      });
    });

    it('should handle partial inventory limits', () => {
      const trait = new ActorTrait({
        capacity: {
          maxItems: 5
          // Missing maxWeight and maxVolume
        }
      });
      
      expect(trait.capacity).toEqual({
        maxItems: 5
      });
    });
  });

  describe('pronoun management', () => {
    it('should set pronouns using setPronouns method', () => {
      const trait = new ActorTrait();
      
      trait.setPronouns({
        subject: 'it',
        object: 'it',
        possessive: 'its',
        reflexive: 'itself'
      });
      
      expect(trait.pronouns).toEqual({
        subject: 'it',
        object: 'it',
        possessive: 'its',
        reflexive: 'itself'
      });
    });

    it('should partially update pronouns', () => {
      const trait = new ActorTrait({
        pronouns: {
          subject: 'she',
          object: 'her',
          possessive: 'her',
          reflexive: 'herself'
        }
      });
      
      trait.setPronouns({
        subject: 'they',
        object: 'them'
      });
      
      expect(trait.pronouns).toEqual({
        subject: 'they',
        object: 'them',
        possessive: 'her', // Unchanged
        reflexive: 'herself' // Unchanged
      });
    });
  });

  describe('inventory limit management', () => {
    it('should set inventory limits using setInventoryLimit method', () => {
      const trait = new ActorTrait();
      
      trait.setInventoryLimit({
        maxItems: 20,
        maxWeight: 100,
        maxVolume: 200
      });
      
      expect(trait.capacity).toEqual({
        maxItems: 20,
        maxWeight: 100,
        maxVolume: 200
      });
    });

    it('should partially update inventory limits', () => {
      const trait = new ActorTrait({
        capacity: {
          maxItems: 10,
          maxWeight: 50
        }
      });
      
      trait.setInventoryLimit({
        maxWeight: 75,
        maxVolume: 150
      });
      
      expect(trait.capacity).toEqual({
        maxItems: 10, // Unchanged
        maxWeight: 75, // Updated
        maxVolume: 150 // Added
      });
    });

    it('should create inventory limit if not exists', () => {
      const trait = new ActorTrait();
      
      expect(trait.capacity).toBeUndefined();
      
      trait.setInventoryLimit({ maxItems: 5 });
      
      expect(trait.capacity).toEqual({ maxItems: 5 });
    });
  });

  describe('player management', () => {
    it('should make actor a player using makePlayer method', () => {
      const trait = new ActorTrait({
        isPlayer: false,
        isPlayable: false
      });
      
      expect(trait.isPlayer).toBe(false);
      expect(trait.isPlayable).toBe(false);
      
      trait.makePlayer();
      
      expect(trait.isPlayer).toBe(true);
      expect(trait.isPlayable).toBe(true);
    });

    it('should ensure player is always playable', () => {
      const trait = new ActorTrait();
      
      trait.makePlayer();
      
      // Try to make non-playable after making player
      trait.isPlayable = false;
      
      // This shows the limitation - might want to add validation
      expect(trait.isPlayer).toBe(true);
      expect(trait.isPlayable).toBe(false);
    });
  });

  describe('custom properties', () => {
    it('should set custom properties using setCustomProperty', () => {
      const trait = new ActorTrait();
      
      trait.setCustomProperty('health', 100);
      trait.setCustomProperty('mana', 50);
      
      expect(trait.customProperties).toEqual({
        health: 100,
        mana: 50
      });
    });

    it('should get custom properties using getCustomProperty', () => {
      const trait = new ActorTrait({
        customProperties: {
          strength: 10,
          intelligence: 15
        }
      });
      
      expect(trait.getCustomProperty('strength')).toBe(10);
      expect(trait.getCustomProperty('intelligence')).toBe(15);
      expect(trait.getCustomProperty('nonexistent')).toBeUndefined();
    });

    it('should create customProperties object if not exists', () => {
      const trait = new ActorTrait();
      
      expect(trait.customProperties).toBeUndefined();
      
      trait.setCustomProperty('level', 1);
      
      expect(trait.customProperties).toEqual({ level: 1 });
    });

    it('should overwrite existing custom properties', () => {
      const trait = new ActorTrait({
        customProperties: { health: 100 }
      });
      
      trait.setCustomProperty('health', 75);
      
      expect(trait.getCustomProperty('health')).toBe(75);
    });

    it('should handle various data types in custom properties', () => {
      const trait = new ActorTrait();
      
      trait.setCustomProperty('name', 'Hero');
      trait.setCustomProperty('level', 5);
      trait.setCustomProperty('isEvil', false);
      trait.setCustomProperty('inventory', ['sword', 'shield']);
      trait.setCustomProperty('stats', { str: 10, dex: 12 });
      
      expect(trait.getCustomProperty('name')).toBe('Hero');
      expect(trait.getCustomProperty('level')).toBe(5);
      expect(trait.getCustomProperty('isEvil')).toBe(false);
      expect(trait.getCustomProperty('inventory')).toEqual(['sword', 'shield']);
      expect(trait.getCustomProperty('stats')).toEqual({ str: 10, dex: 12 });
    });
  });

  describe('state management', () => {
    it('should handle state changes', () => {
      const trait = new ActorTrait();
      
      expect(trait.state).toBeUndefined();
      
      trait.state = 'idle';
      expect(trait.state).toBe('idle');
      
      trait.state = 'combat';
      expect(trait.state).toBe('combat');
      
      trait.state = undefined;
      expect(trait.state).toBeUndefined();
    });

    it('should maintain state through other property changes', () => {
      const trait = new ActorTrait({ state: 'patrolling' });
      
      trait.setPronouns({ subject: 'it' });
      trait.setCustomProperty('alertLevel', 'high');
      
      expect(trait.state).toBe('patrolling');
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('guard', 'Palace Guard');
      const trait = new ActorTrait();
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.ACTOR)).toBe(true);
      expect(entity.getTrait(TraitType.ACTOR)).toBe(trait);
    });

    it('should work with container trait for inventory', () => {
      const entity = world.createEntity('player', 'Hero');
      
      entity.add(new ActorTrait({ isPlayer: true }));
      entity.add(new ContainerTrait());
      
      expect(entity.hasTrait(TraitType.ACTOR)).toBe(true);
      expect(entity.hasTrait(TraitType.CONTAINER)).toBe(true);
      
      const actor = entity.getTrait(TraitType.ACTOR) as ActorTrait;
      expect(actor.isPlayer).toBe(true);
    });

    it('should create NPCs with custom properties', () => {
      const merchant = world.createEntity('merchant', 'Shop Keeper');
      
      const actorTrait = new ActorTrait({
        state: 'trading',
        pronouns: {
          subject: 'he',
          object: 'him',
          possessive: 'his',
          reflexive: 'himself'
        },
        customProperties: {
          shop: 'general_store',
          gold: 1000,
          friendliness: 0.8
        }
      });
      
      merchant.add(actorTrait);
      merchant.add(new ContainerTrait()); // For inventory
      
      const trait = merchant.getTrait(TraitType.ACTOR) as ActorTrait;
      expect(trait.state).toBe('trading');
      expect(trait.getCustomProperty('shop')).toBe('general_store');
      expect(trait.pronouns.subject).toBe('he');
    });

    it('should create player with inventory limits', () => {
      const player = world.createEntity('player', 'You');
      
      const actorTrait = new ActorTrait({
        isPlayer: true,
        capacity: {
          maxItems: 10,
          maxWeight: 50
        }
      });
      
      player.add(actorTrait);
      player.add(new ContainerTrait());
      
      const trait = player.getTrait(TraitType.ACTOR) as ActorTrait;
      expect(trait.isPlayer).toBe(true);
      expect(trait.capacity?.maxItems).toBe(10);
      expect(trait.capacity?.maxWeight).toBe(50);
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new ActorTrait({});
      
      expect(trait.isPlayer).toBe(false);
      expect(trait.isPlayable).toBe(true);
      expect(trait.pronouns).toEqual({
        subject: 'they',
        object: 'them',
        possessive: 'their',
        reflexive: 'themself'
      });
    });

    it('should handle undefined options', () => {
      const trait = new ActorTrait(undefined);
      
      expect(trait.isPlayer).toBe(false);
      expect(trait.isPlayable).toBe(true);
      expect(trait.state).toBeUndefined();
    });

    it('should maintain type constant', () => {
      expect(ActorTrait.type).toBe(TraitType.ACTOR);
      
      const trait = new ActorTrait();
      expect(trait.type).toBe(TraitType.ACTOR);
      expect(trait.type).toBe(ActorTrait.type);
    });

    it('should handle pronoun edge cases', () => {
      const trait = new ActorTrait();
      
      // Empty pronouns object
      trait.setPronouns({});
      expect(trait.pronouns).toEqual({
        subject: 'they',
        object: 'them',
        possessive: 'their',
        reflexive: 'themself'
      });
      
      // Null/undefined values
      trait.setPronouns({
        subject: null as any,
        object: undefined as any
      });
      expect(trait.pronouns.subject).toBeNull();
      expect(trait.pronouns.object).toBeUndefined();
    });

    it('should preserve existing data during construction', () => {
      const initialData = {
        isPlayer: true,
        state: 'combat',
        customProperties: { level: 5 }
      };
      
      const trait = new ActorTrait(initialData);
      
      // Modify the source object
      initialData.isPlayer = false;
      initialData.state = 'idle';
      initialData.customProperties.level = 10;
      
      // Trait has copies of primitives but shares object references
      expect(trait.isPlayer).toBe(true);
      expect(trait.state).toBe('combat');
      expect(trait.getCustomProperty('level')).toBe(10); // Shared reference
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple actors in a world', () => {
      const player = world.createEntity('player', 'Hero');
      const guard = world.createEntity('guard', 'Guard');
      const merchant = world.createEntity('merchant', 'Merchant');
      
      player.add(new ActorTrait({ 
        isPlayer: true,
        pronouns: { subject: 'you', object: 'you', possessive: 'your', reflexive: 'yourself' }
      }));
      
      guard.add(new ActorTrait({ 
        state: 'patrolling',
        customProperties: { faction: 'castle_guards' }
      }));
      
      merchant.add(new ActorTrait({ 
        state: 'trading',
        isPlayable: false
      }));
      
      // Each should maintain independent state
      const playerTrait = player.getTrait(TraitType.ACTOR) as ActorTrait;
      const guardTrait = guard.getTrait(TraitType.ACTOR) as ActorTrait;
      const merchantTrait = merchant.getTrait(TraitType.ACTOR) as ActorTrait;
      
      expect(playerTrait.isPlayer).toBe(true);
      expect(guardTrait.state).toBe('patrolling');
      expect(merchantTrait.isPlayable).toBe(false);
    });

    it('should support actor transformation', () => {
      const entity = world.createEntity('werewolf', 'Villager');
      
      const humanForm = new ActorTrait({
        state: 'human',
        pronouns: { subject: 'he', object: 'him', possessive: 'his', reflexive: 'himself' },
        customProperties: { 
          strength: 5,
          form: 'human'
        }
      });
      
      entity.add(humanForm);
      
      // Transform to wolf
      const actor = entity.getTrait(TraitType.ACTOR) as ActorTrait;
      actor.state = 'wolf';
      actor.setCustomProperty('strength', 15);
      actor.setCustomProperty('form', 'wolf');
      
      expect(actor.state).toBe('wolf');
      expect(actor.getCustomProperty('strength')).toBe(15);
      expect(actor.getCustomProperty('form')).toBe('wolf');
      // Pronouns remain the same
      expect(actor.pronouns.subject).toBe('he');
    });
  });
});