// tests/unit/traits/wearable.test.ts

import { WearableTrait } from '../../../src/traits/wearable/wearableTrait';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';

describe('WearableTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new WearableTrait();
      
      expect(trait.type).toBe(TraitType.WEARABLE);
      expect(trait.isWorn).toBe(false);
      expect(trait.wornBy).toBeUndefined();
      expect(trait.slot).toBe('clothing');
      expect(trait.layer).toBe(1);
      expect(trait.wearMessage).toBeUndefined();
      expect(trait.removeMessage).toBeUndefined();
      expect(trait.wearableOver).toBe(true);
      expect(trait.blocksSlots).toEqual([]);
      expect(trait.weight).toBe(1);
      expect(trait.bulk).toBe(1);
      expect(trait.canRemove).toBe(true);
      expect(trait.bodyPart).toBe('torso');
    });

    it('should create trait with provided data', () => {
      const trait = new WearableTrait({
        isWorn: true,
        wornBy: 'player',
        slot: 'head',
        layer: 2,
        wearMessage: 'You put on the helmet.',
        removeMessage: 'You take off the helmet.',
        wearableOver: false,
        blocksSlots: ['face', 'ears'],
        weight: 3,
        bulk: 2,
        canRemove: true,
        bodyPart: 'head'
      });
      
      expect(trait.isWorn).toBe(true);
      expect(trait.wornBy).toBe('player');
      expect(trait.slot).toBe('head');
      expect(trait.layer).toBe(2);
      expect(trait.wearMessage).toBe('You put on the helmet.');
      expect(trait.removeMessage).toBe('You take off the helmet.');
      expect(trait.wearableOver).toBe(false);
      expect(trait.blocksSlots).toEqual(['face', 'ears']);
      expect(trait.weight).toBe(3);
      expect(trait.bulk).toBe(2);
      expect(trait.canRemove).toBe(true);
      expect(trait.bodyPart).toBe('head');
    });

    it('should handle partial initialization', () => {
      const trait = new WearableTrait({
        slot: 'hands',
        weight: 0.5
      });
      
      expect(trait.isWorn).toBe(false);
      expect(trait.slot).toBe('hands');
      expect(trait.layer).toBe(1);
      expect(trait.wearableOver).toBe(true);
      expect(trait.blocksSlots).toEqual([]);
      expect(trait.weight).toBe(0.5);
      expect(trait.bulk).toBe(1);
    });

    it('should handle empty blocksSlots array', () => {
      const trait = new WearableTrait({
        blocksSlots: []
      });
      
      expect(trait.blocksSlots).toEqual([]);
      expect(trait.blocksSlots.length).toBe(0);
    });
  });

  describe('slot management', () => {
    it('should support various body slots', () => {
      const headGear = new WearableTrait({ slot: 'head' });
      const shirt = new WearableTrait({ slot: 'torso' });
      const gloves = new WearableTrait({ slot: 'hands' });
      const boots = new WearableTrait({ slot: 'feet' });
      const ring = new WearableTrait({ slot: 'finger' });
      const necklace = new WearableTrait({ slot: 'neck' });
      
      expect(headGear.slot).toBe('head');
      expect(shirt.slot).toBe('torso');
      expect(gloves.slot).toBe('hands');
      expect(boots.slot).toBe('feet');
      expect(ring.slot).toBe('finger');
      expect(necklace.slot).toBe('neck');
    });

    it('should handle custom slot names', () => {
      const trait = new WearableTrait({
        slot: 'left-shoulder-pad'
      });
      
      expect(trait.slot).toBe('left-shoulder-pad');
    });

    it('should block multiple slots', () => {
      const fullHelmet = new WearableTrait({
        slot: 'head',
        blocksSlots: ['face', 'ears', 'hair']
      });
      
      expect(fullHelmet.blocksSlots).toContain('face');
      expect(fullHelmet.blocksSlots).toContain('ears');
      expect(fullHelmet.blocksSlots).toContain('hair');
      expect(fullHelmet.blocksSlots.length).toBe(3);
    });
  });

  describe('layering system', () => {
    it('should support different layers', () => {
      const underwear = new WearableTrait({ slot: 'torso', layer: 0 });
      const shirt = new WearableTrait({ slot: 'torso', layer: 1 });
      const jacket = new WearableTrait({ slot: 'torso', layer: 2 });
      const coat = new WearableTrait({ slot: 'torso', layer: 3 });
      
      expect(underwear.layer).toBe(0);
      expect(shirt.layer).toBe(1);
      expect(jacket.layer).toBe(2);
      expect(coat.layer).toBe(3);
    });

    it('should handle wearableOver property', () => {
      const tightGloves = new WearableTrait({
        slot: 'hands',
        wearableOver: false
      });
      
      const ring = new WearableTrait({
        slot: 'finger',
        wearableOver: true
      });
      
      expect(tightGloves.wearableOver).toBe(false);
      expect(ring.wearableOver).toBe(true);
    });
  });

  describe('worn state', () => {
    it('should track worn status', () => {
      const trait = new WearableTrait();
      
      expect(trait.isWorn).toBe(false);
      expect(trait.wornBy).toBeUndefined();
      
      // Simulate wearing
      trait.isWorn = true;
      trait.wornBy = 'player';
      
      expect(trait.isWorn).toBe(true);
      expect(trait.wornBy).toBe('player');
    });

    it('should handle different wearers', () => {
      const crown = new WearableTrait({
        isWorn: true,
        wornBy: 'king'
      });
      
      expect(crown.isWorn).toBe(true);
      expect(crown.wornBy).toBe('king');
      
      // Transfer to another wearer
      crown.wornBy = 'usurper';
      
      expect(crown.wornBy).toBe('usurper');
    });

    it('should clear wornBy when not worn', () => {
      const trait = new WearableTrait({
        isWorn: true,
        wornBy: 'player'
      });
      
      // Remove item
      trait.isWorn = false;
      trait.wornBy = undefined;
      
      expect(trait.isWorn).toBe(false);
      expect(trait.wornBy).toBeUndefined();
    });
  });

  describe('messages', () => {
    it('should store custom wear and remove messages', () => {
      const trait = new WearableTrait({
        wearMessage: 'You slip on the silk gloves.',
        removeMessage: 'You carefully remove the silk gloves.'
      });
      
      expect(trait.wearMessage).toBe('You slip on the silk gloves.');
      expect(trait.removeMessage).toBe('You carefully remove the silk gloves.');
    });

    it('should allow undefined messages', () => {
      const trait = new WearableTrait({
        slot: 'ring'
        // No messages defined
      });
      
      expect(trait.wearMessage).toBeUndefined();
      expect(trait.removeMessage).toBeUndefined();
    });

    it('should allow only wear message', () => {
      const trait = new WearableTrait({
        wearMessage: 'You don the armor with a satisfying clank.'
      });
      
      expect(trait.wearMessage).toBe('You don the armor with a satisfying clank.');
      expect(trait.removeMessage).toBeUndefined();
    });
  });

  describe('physical properties', () => {
    it('should handle weight and bulk', () => {
      const heavyArmor = new WearableTrait({
        weight: 25,
        bulk: 10
      });
      
      const lightCloak = new WearableTrait({
        weight: 0.5,
        bulk: 2
      });
      
      expect(heavyArmor.weight).toBe(25);
      expect(heavyArmor.bulk).toBe(10);
      expect(lightCloak.weight).toBe(0.5);
      expect(lightCloak.bulk).toBe(2);
    });

    it('should handle zero weight items', () => {
      const feather = new WearableTrait({
        weight: 0,
        bulk: 0
      });
      
      expect(feather.weight).toBe(0);
      expect(feather.bulk).toBe(0);
    });

    it('should handle fractional values', () => {
      const trait = new WearableTrait({
        weight: 1.75,
        bulk: 0.25
      });
      
      expect(trait.weight).toBe(1.75);
      expect(trait.bulk).toBe(0.25);
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('hat', 'Wizard Hat');
      const trait = new WearableTrait({ slot: 'head' });
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.WEARABLE)).toBe(true);
      expect(entity.getTrait(TraitType.WEARABLE)).toBe(trait);
    });

    it('should create various wearable items', () => {
      const helmet = world.createEntity('helmet', 'Steel Helmet');
      helmet.add(new WearableTrait({
        slot: 'head',
        weight: 5,
        blocksSlots: ['hair']
      }));
      
      const gloves = world.createEntity('gloves', 'Leather Gloves');
      gloves.add(new WearableTrait({
        slot: 'hands',
        weight: 0.5,
        layer: 1
      }));
      
      const cloak = world.createEntity('cloak', 'Traveling Cloak');
      cloak.add(new WearableTrait({
        slot: 'back',
        weight: 2,
        layer: 3,
        wearableOver: true
      }));
      
      expect(helmet.hasTrait(TraitType.WEARABLE)).toBe(true);
      expect(gloves.hasTrait(TraitType.WEARABLE)).toBe(true);
      expect(cloak.hasTrait(TraitType.WEARABLE)).toBe(true);
    });

    it('should work with actor wearing items', () => {
      const player = world.createEntity('player', 'Hero');
      player.add(new ActorTrait({ isPlayer: true }));
      player.add(new ContainerTrait()); // For inventory
      
      const shirt = world.createEntity('shirt', 'Cotton Shirt');
      const shirtTrait = new WearableTrait({
        slot: 'torso',
        isWorn: true,
        wornBy: 'player'
      });
      shirt.add(shirtTrait);
      
      expect(shirtTrait.isWorn).toBe(true);
      expect(shirtTrait.wornBy).toBe('player');
    });
  });

  describe('complex wearable scenarios', () => {
    it('should handle layered armor system', () => {
      const padding = new WearableTrait({ slot: 'torso', layer: 0, weight: 2 });
      const chainmail = new WearableTrait({ slot: 'torso', layer: 1, weight: 15 });
      const breastplate = new WearableTrait({ slot: 'torso', layer: 2, weight: 20 });
      const tabard = new WearableTrait({ slot: 'torso', layer: 3, weight: 0.5 });
      
      // All occupy same slot but different layers
      expect(padding.slot).toBe('torso');
      expect(chainmail.slot).toBe('torso');
      expect(breastplate.slot).toBe('torso');
      expect(tabard.slot).toBe('torso');
      
      // Layers increase from inner to outer
      expect(padding.layer < chainmail.layer).toBe(true);
      expect(chainmail.layer < breastplate.layer).toBe(true);
      expect(breastplate.layer < tabard.layer).toBe(true);
    });

    it('should handle jewelry with multiple items per slot', () => {
      const ring1 = new WearableTrait({ slot: 'finger', wearableOver: true });
      const ring2 = new WearableTrait({ slot: 'finger', wearableOver: true });
      const ring3 = new WearableTrait({ slot: 'finger', wearableOver: true });
      
      // All can be worn simultaneously (game logic would handle limits)
      expect(ring1.wearableOver).toBe(true);
      expect(ring2.wearableOver).toBe(true);
      expect(ring3.wearableOver).toBe(true);
    });

    it('should handle outfit sets', () => {
      const wizardHat = new WearableTrait({ 
        slot: 'head', 
        wearMessage: 'You feel magical as you don the pointed hat.'
      });
      
      const wizardRobe = new WearableTrait({ 
        slot: 'torso', 
        layer: 2,
        wearMessage: 'The robe swirls dramatically around you.'
      });
      
      const wizardStaff = new WearableTrait({ 
        slot: 'hand',
        wearMessage: 'Power courses through the staff as you grip it.'
      });
      
      expect(wizardHat.slot).toBe('head');
      expect(wizardRobe.slot).toBe('torso');
      expect(wizardStaff.slot).toBe('hand');
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new WearableTrait({});
      
      expect(trait.isWorn).toBe(false);
      expect(trait.slot).toBe('clothing');
      expect(trait.layer).toBe(1);
      expect(trait.wearableOver).toBe(true);
      expect(trait.blocksSlots).toEqual([]);
      expect(trait.weight).toBe(1);
      expect(trait.bulk).toBe(1);
    });

    it('should handle undefined as parameter', () => {
      const trait = new WearableTrait(undefined as any);
      
      expect(trait.worn).toBe(false);
      expect(trait.slot).toBe('clothing');
      expect(trait.layer).toBe(1);
    });

    it('should maintain type constant', () => {
      expect(WearableTrait.type).toBe(TraitType.WEARABLE);
      
      const trait = new WearableTrait();
      expect(trait.type).toBe(TraitType.WEARABLE);
      expect(trait.type).toBe(WearableTrait.type);
    });

    it('should handle boolean false values correctly', () => {
      const trait = new WearableTrait({
        isWorn: false,
        wearableOver: false
      });
      
      expect(trait.isWorn).toBe(false);
      expect(trait.wearableOver).toBe(false);
    });

    it('should handle zero and negative values', () => {
      const trait = new WearableTrait({
        layer: 0,
        weight: 0,
        bulk: 0
      });
      
      expect(trait.layer).toBe(0);
      expect(trait.weight).toBe(0);
      expect(trait.bulk).toBe(0);
      
      // Negative values (game logic should validate)
      const negativeTrait = new WearableTrait({
        layer: -1,
        weight: -5
      });
      
      expect(negativeTrait.layer).toBe(-1);
      expect(negativeTrait.weight).toBe(-5);
    });

    it('should preserve array reference for blocksSlots', () => {
      const blocks = ['face', 'ears'];
      const trait = new WearableTrait({
        blocksSlots: blocks
      });
      
      // Modify original array
      blocks.push('hair');
      
      // Trait keeps the reference (not a copy)
      expect(trait.blocksSlots).toEqual(['face', 'ears', 'hair']);
      expect(trait.blocksSlots.length).toBe(3);
    });
  });
});