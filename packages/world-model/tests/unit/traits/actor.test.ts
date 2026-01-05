// tests/unit/traits/actor.test.ts

import { ActorTrait, PRONOUNS, type PronounSet } from '../../../src/traits/actor/actorTrait';
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
      // Default pronouns are THEY_THEM (ADR-089)
      expect(trait.pronouns).toEqual(PRONOUNS.THEY_THEM);
      expect(trait.capacity).toBeUndefined();
      expect(trait.customProperties).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new ActorTrait({
        isPlayer: true,
        isPlayable: false,
        state: 'alert',
        pronouns: PRONOUNS.SHE_HER,
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
      expect(trait.pronouns).toEqual(PRONOUNS.SHE_HER);
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

    it('should support multiple pronoun sets (ADR-089)', () => {
      const trait = new ActorTrait({
        pronouns: [PRONOUNS.HE_HIM, PRONOUNS.THEY_THEM]
      });

      expect(Array.isArray(trait.pronouns)).toBe(true);
      expect((trait.pronouns as PronounSet[])[0]).toEqual(PRONOUNS.HE_HIM);
      expect((trait.pronouns as PronounSet[])[1]).toEqual(PRONOUNS.THEY_THEM);
      expect(trait.getPrimaryPronouns()).toEqual(PRONOUNS.HE_HIM);
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

      trait.setPronouns(PRONOUNS.HE_HIM);

      expect(trait.pronouns).toEqual(PRONOUNS.HE_HIM);
    });

    it('should set multiple pronoun sets', () => {
      const trait = new ActorTrait({ pronouns: PRONOUNS.SHE_HER });

      trait.setPronouns([PRONOUNS.SHE_HER, PRONOUNS.THEY_THEM]);

      expect(Array.isArray(trait.pronouns)).toBe(true);
      expect(trait.getPrimaryPronouns()).toEqual(PRONOUNS.SHE_HER);
    });

    it('should get primary pronouns from single set', () => {
      const trait = new ActorTrait({ pronouns: PRONOUNS.XE_XEM });

      expect(trait.getPrimaryPronouns()).toEqual(PRONOUNS.XE_XEM);
    });

    it('should get primary pronouns from array (first element)', () => {
      const trait = new ActorTrait({
        pronouns: [PRONOUNS.ZE_ZIR, PRONOUNS.THEY_THEM]
      });

      expect(trait.getPrimaryPronouns()).toEqual(PRONOUNS.ZE_ZIR);
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

      trait.setPronouns(PRONOUNS.HE_HIM);
      trait.setCustomProperty('alertLevel', 'high');

      expect(trait.state).toBe('patrolling');
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('Palace Guard', 'actor');
      const trait = new ActorTrait();
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.ACTOR)).toBe(true);
      expect(entity.getTrait(TraitType.ACTOR)).toBe(trait);
    });

    it('should work with container trait for inventory', () => {
      const entity = world.createEntity('Hero', 'actor');
      
      entity.add(new ActorTrait({ isPlayer: true }));
      entity.add(new ContainerTrait());
      
      expect(entity.hasTrait(TraitType.ACTOR)).toBe(true);
      expect(entity.hasTrait(TraitType.CONTAINER)).toBe(true);
      
      const actor = entity.getTrait(TraitType.ACTOR) as ActorTrait;
      expect(actor.isPlayer).toBe(true);
    });

    it('should create NPCs with custom properties', () => {
      const merchant = world.createEntity('Shop Keeper', 'actor');

      const actorTrait = new ActorTrait({
        state: 'trading',
        pronouns: PRONOUNS.HE_HIM,
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
      expect(trait.getPrimaryPronouns().subject).toBe('he');
    });

    it('should create player with inventory limits', () => {
      const player = world.createEntity('You', 'actor');
      
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
      expect(trait.pronouns).toEqual(PRONOUNS.THEY_THEM);
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

    it('should support custom pronoun sets', () => {
      const customPronouns: PronounSet = {
        subject: 'ne',
        object: 'nem',
        possessive: 'nes',
        possessiveAdj: 'nes',
        reflexive: 'nemself',
        verbForm: 'singular'
      };

      const trait = new ActorTrait({ pronouns: customPronouns });
      expect(trait.pronouns).toEqual(customPronouns);
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
      const player = world.createEntity('Hero', 'actor');
      const guard = world.createEntity('Guard', 'actor');
      const merchant = world.createEntity('Merchant', 'actor');

      player.add(new ActorTrait({
        isPlayer: true
        // Default they/them pronouns for 2nd person narrative
      }));

      guard.add(new ActorTrait({
        state: 'patrolling',
        pronouns: PRONOUNS.HE_HIM,
        customProperties: { faction: 'castle_guards' }
      }));

      merchant.add(new ActorTrait({
        state: 'trading',
        pronouns: PRONOUNS.SHE_HER,
        isPlayable: false
      }));

      // Each should maintain independent state
      const playerTrait = player.getTrait(TraitType.ACTOR) as ActorTrait;
      const guardTrait = guard.getTrait(TraitType.ACTOR) as ActorTrait;
      const merchantTrait = merchant.getTrait(TraitType.ACTOR) as ActorTrait;

      expect(playerTrait.isPlayer).toBe(true);
      expect(guardTrait.state).toBe('patrolling');
      expect(guardTrait.getPrimaryPronouns().subject).toBe('he');
      expect(merchantTrait.isPlayable).toBe(false);
      expect(merchantTrait.getPrimaryPronouns().subject).toBe('she');
    });

    it('should support actor transformation', () => {
      const entity = world.createEntity('Villager', 'actor');

      const humanForm = new ActorTrait({
        state: 'human',
        pronouns: PRONOUNS.HE_HIM,
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
      expect(actor.getPrimaryPronouns().subject).toBe('he');
    });

    it('should support ADR-089 identity fields', () => {
      const npc = world.createEntity('Dr. Smith', 'actor');

      npc.add(new ActorTrait({
        pronouns: PRONOUNS.SHE_HER,
        honorific: 'Dr.',
        grammaticalGender: 'feminine',
        briefDescription: 'the scientist'
      }));

      const trait = npc.getTrait(TraitType.ACTOR) as ActorTrait;
      expect(trait.honorific).toBe('Dr.');
      expect(trait.grammaticalGender).toBe('feminine');
      expect(trait.briefDescription).toBe('the scientist');
    });
  });
});