// tests/unit/traits/clothing.test.ts
//
// ADR-247: ClothingTrait was removed and folded into WearableTrait. The worn
// semantics (worn state, wornBy, placement, canRemove, wear/remove messages)
// live on WearableTrait. "Clothing" is modelled as a WearableTrait item that
// also carries a ContainerTrait so it can hold pockets. The ClothingTrait-only
// extras (material / style / condition / damageable) were dropped and are not
// re-tested here. ADR-392 D1 retired the slot / blocksSlots / wearableOver
// vocabulary; where a thing sits is its placement pair.

import { WearableTrait } from '../../../src/traits/wearable/wearableTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';
import { createTestClothing, createTestPocket, createTestActor } from '../../fixtures/test-entities';

describe('Clothing (WearableTrait) — ADR-247', () => {
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
      expect(trait.placement).toBeUndefined();
      expect(trait.canRemove).toBe(true);
    });

    it('should create trait with provided data', () => {
      const trait = new WearableTrait({
        placement: { bodyPart: 'torso', layer: 2 },
        canRemove: false
      });

      expect(trait.placement).toEqual({ bodyPart: 'torso', layer: 2 });
      expect(trait.canRemove).toBe(false);
    });

    it('should have all wearable properties', () => {
      const trait = new WearableTrait();

      expect(trait).toHaveProperty('worn');
      expect(trait).toHaveProperty('wornBy');
      expect(trait).toHaveProperty('placement');
      expect(trait).toHaveProperty('weight');
      expect(trait).toHaveProperty('bulk');
      expect(trait).toHaveProperty('canRemove');
    });
  });

  describe('worn state', () => {
    it('should track worn state and wearer', () => {
      const trait = new WearableTrait({ placement: { bodyPart: 'torso', layer: 1 } });

      expect(trait.isWorn).toBe(false);
      expect(trait.wornBy).toBeUndefined();

      trait.isWorn = true;
      trait.wornBy = 'player-1';

      expect(trait.isWorn).toBe(true);
      expect(trait.worn).toBe(true);
      expect(trait.wornBy).toBe('player-1');
    });
  });

  describe('clothing with pockets', () => {
    it('should create clothing that can contain pockets', () => {
      const coat = createTestClothing(world, 'Winter Coat', {
        bodyPart: 'torso'
      });

      expect(coat.hasTrait(TraitType.WEARABLE)).toBe(true);
      expect(coat.hasTrait(TraitType.CONTAINER)).toBe(true);

      const containerTrait = coat.getTrait(TraitType.CONTAINER);
      expect(containerTrait).toBeDefined();
    });

    it('should attach pockets to clothing', () => {
      const jacket = createTestClothing(world, 'Leather Jacket', {
        bodyPart: 'torso'
      });

      const innerPocket = createTestPocket(world, 'inner pocket', 3);
      const sidePocket1 = createTestPocket(world, 'left pocket', 5);
      const sidePocket2 = createTestPocket(world, 'right pocket', 5);

      world.moveEntity(innerPocket.id, jacket.id);
      world.moveEntity(sidePocket1.id, jacket.id);
      world.moveEntity(sidePocket2.id, jacket.id);

      const pockets = world.getContents(jacket.id);
      expect(pockets).toHaveLength(3);
      expect(pockets).toContain(innerPocket);
      expect(pockets).toContain(sidePocket1);
      expect(pockets).toContain(sidePocket2);
    });

    it('should maintain pocket contents when clothing is worn', () => {
      const player = createTestActor(world, 'Player');
      const coat = createTestClothing(world, 'Trench Coat', {
        bodyPart: 'torso'
      });
      const pocket = createTestPocket(world, 'deep pocket', 10);
      const key = world.createEntity('Mysterious Key', 'item');

      // Set up hierarchy
      world.moveEntity(pocket.id, coat.id);
      world.moveEntity(key.id, pocket.id);
      world.moveEntity(coat.id, player.id);

      // Wear the coat
      const wearable = coat.getTrait(TraitType.WEARABLE) as WearableTrait;
      wearable.isWorn = true;
      wearable.wornBy = player.id;

      // Check that pocket and contents are still accessible
      const coatContents = world.getContents(coat.id);
      expect(coatContents).toContain(pocket);

      const pocketContents = world.getContents(pocket.id);
      expect(pocketContents).toContain(key);
    });
  });

  describe('clothing placement and layers (ADR-392 D1)', () => {
    it('should place clothing on the body parts an author names', () => {
      const parts = {
        'head': 'Baseball Cap',
        'torso': 'T-Shirt',
        'legs': 'Jeans',
        'feet': 'Sneakers',
        'hands': 'Gloves',
        'waist': 'Belt',
        'back': 'Backpack'
      };

      Object.entries(parts).forEach(([bodyPart, name]) => {
        const clothing = createTestClothing(world, name, { bodyPart });
        const trait = clothing.getTrait(TraitType.WEARABLE) as WearableTrait;
        expect(trait.placement).toEqual({ bodyPart, layer: 1 });
      });
    });

    it('should support layered clothing', () => {
      const undershirt = createTestClothing(world, 'Undershirt', {
        bodyPart: 'torso',
        layer: 0
      });

      const shirt = createTestClothing(world, 'Dress Shirt', {
        bodyPart: 'torso',
        layer: 1
      });

      const vest = createTestClothing(world, 'Vest', {
        bodyPart: 'torso',
        layer: 2
      });

      const jacket = createTestClothing(world, 'Suit Jacket', {
        bodyPart: 'torso',
        layer: 3
      });

      expect((undershirt.getTrait(TraitType.WEARABLE) as WearableTrait).placement?.layer).toBe(0);
      expect((shirt.getTrait(TraitType.WEARABLE) as WearableTrait).placement?.layer).toBe(1);
      expect((vest.getTrait(TraitType.WEARABLE) as WearableTrait).placement?.layer).toBe(2);
      expect((jacket.getTrait(TraitType.WEARABLE) as WearableTrait).placement?.layer).toBe(3);
    });

    it('a layer named without a body part makes a simple wearable', () => {
      const scarf = createTestClothing(world, 'Scarf', { layer: 2 });
      expect((scarf.getTrait(TraitType.WEARABLE) as WearableTrait).placement).toBeUndefined();
    });
  });

  describe('special clothing properties', () => {
    it('should handle non-removable clothing', () => {
      const cursedArmor = createTestClothing(world, 'Cursed Armor', {
        bodyPart: 'torso',
        canRemove: false
      });

      const trait = cursedArmor.getTrait(TraitType.WEARABLE) as WearableTrait;
      expect(trait.canRemove).toBe(false);
    });

    it('should handle custom wear/remove messages', () => {
      const magicCloak = createTestClothing(world, 'Cloak of Invisibility', {
        bodyPart: 'back',
        wearMessage: 'You vanish from sight as you don the cloak.',
        removeMessage: 'You reappear as you remove the cloak.'
      });

      const trait = magicCloak.getTrait(TraitType.WEARABLE) as WearableTrait;
      expect(trait.wearMessage).toBe('You vanish from sight as you don the cloak.');
      expect(trait.removeMessage).toBe('You reappear as you remove the cloak.');
    });
  });

  describe('entity integration', () => {
    it('should create various clothing items', () => {
      const items = [
        { name: 'Leather Boots', bodyPart: 'feet' },
        { name: 'Silk Dress', bodyPart: 'torso' },
        { name: 'Work Gloves', bodyPart: 'hands' },
        { name: 'Wool Scarf', bodyPart: 'neck' },
        { name: 'Denim Jacket', bodyPart: 'torso', layer: 2 }
      ];

      items.forEach(item => {
        const clothing = createTestClothing(world, item.name, item);
        expect(clothing.hasTrait(TraitType.WEARABLE)).toBe(true);

        const trait = clothing.getTrait(TraitType.WEARABLE) as WearableTrait;
        expect(trait.placement).toEqual({ bodyPart: item.bodyPart, layer: item.layer ?? 1 });
      });
    });

    it('should distinguish between clothing and simple wearables', () => {
      // Clothing with pockets
      const coat = createTestClothing(world, 'Lab Coat', {
        bodyPart: 'torso'
      });

      // Simple wearable (jewelry) — WearableTrait without a ContainerTrait, and no placement
      const ring = world.createEntity('Gold Ring', 'item');
      ring.add(new WearableTrait());

      expect(coat.hasTrait(TraitType.WEARABLE)).toBe(true);
      expect(coat.hasTrait(TraitType.CONTAINER)).toBe(true);

      expect(ring.hasTrait(TraitType.WEARABLE)).toBe(true);
      expect(ring.hasTrait(TraitType.CONTAINER)).toBe(false);
      expect((ring.getTrait(TraitType.WEARABLE) as WearableTrait).placement).toBeUndefined();
    });
  });

  describe('complex clothing scenarios', () => {
    it('should handle multi-pocket utility clothing', () => {
      const vest = createTestClothing(world, 'Tactical Vest', {
        bodyPart: 'torso',
        layer: 2
      });

      // Create multiple specialized pockets
      const pockets = [
        createTestPocket(world, 'magazine pouch', 3),
        createTestPocket(world, 'radio pocket', 2),
        createTestPocket(world, 'utility pouch', 5),
        createTestPocket(world, 'map pocket', 4)
      ];

      pockets.forEach(pocket => {
        world.moveEntity(pocket.id, vest.id);
      });

      const vestContents = world.getContents(vest.id);
      expect(vestContents).toHaveLength(4);
      pockets.forEach(pocket => {
        expect(vestContents).toContain(pocket);
      });
    });
  });
});
