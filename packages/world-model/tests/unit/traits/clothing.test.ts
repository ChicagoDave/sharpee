// tests/unit/traits/clothing.test.ts
//
// ADR-247: ClothingTrait was removed and folded into WearableTrait. The worn
// semantics (worn state, slot, wornBy, layering, blocksSlots, canRemove,
// wear/remove messages) now live on WearableTrait. "Clothing" is modelled as a
// WearableTrait item that also carries a ContainerTrait so it can hold pockets.
// The ClothingTrait-only extras (material / style / condition / damageable)
// were dropped and are not re-tested here.

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
      expect(trait.slot).toBe('clothing');
      expect(trait.layer).toBe(1);
      expect(trait.canRemove).toBe(true);
    });

    it('should create trait with provided data', () => {
      const trait = new WearableTrait({
        slot: 'torso',
        layer: 2,
        canRemove: false
      });

      expect(trait.slot).toBe('torso');
      expect(trait.layer).toBe(2);
      expect(trait.canRemove).toBe(false);
    });

    it('should have all wearable properties', () => {
      const trait = new WearableTrait();

      expect(trait).toHaveProperty('isWorn');
      expect(trait).toHaveProperty('wornBy');
      expect(trait).toHaveProperty('slot');
      expect(trait).toHaveProperty('layer');
      expect(trait).toHaveProperty('wearableOver');
      expect(trait).toHaveProperty('blocksSlots');
      expect(trait).toHaveProperty('weight');
      expect(trait).toHaveProperty('bulk');
      expect(trait).toHaveProperty('canRemove');
      expect(trait).toHaveProperty('bodyPart');
    });
  });

  describe('worn state', () => {
    it('should track worn state and wearer', () => {
      const trait = new WearableTrait({ slot: 'torso' });

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
        slot: 'torso'
      });

      expect(coat.hasTrait(TraitType.WEARABLE)).toBe(true);
      expect(coat.hasTrait(TraitType.CONTAINER)).toBe(true);

      const containerTrait = coat.getTrait(TraitType.CONTAINER);
      expect(containerTrait).toBeDefined();
    });

    it('should attach pockets to clothing', () => {
      const jacket = createTestClothing(world, 'Leather Jacket', {
        slot: 'torso'
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
        slot: 'torso'
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

  describe('clothing slots and layers', () => {
    it('should support standard clothing slots', () => {
      const slots = {
        'head': 'Baseball Cap',
        'torso': 'T-Shirt',
        'legs': 'Jeans',
        'feet': 'Sneakers',
        'hands': 'Gloves',
        'waist': 'Belt',
        'back': 'Backpack'
      };

      Object.entries(slots).forEach(([slot, name]) => {
        const clothing = createTestClothing(world, name, { slot });
        const trait = clothing.getTrait(TraitType.WEARABLE) as WearableTrait;
        expect(trait.slot).toBe(slot);
      });
    });

    it('should support layered clothing', () => {
      const undershirt = createTestClothing(world, 'Undershirt', {
        slot: 'torso',
        layer: 0
      });

      const shirt = createTestClothing(world, 'Dress Shirt', {
        slot: 'torso',
        layer: 1
      });

      const vest = createTestClothing(world, 'Vest', {
        slot: 'torso',
        layer: 2
      });

      const jacket = createTestClothing(world, 'Suit Jacket', {
        slot: 'torso',
        layer: 3
      });

      expect((undershirt.getTrait(TraitType.WEARABLE) as WearableTrait).layer).toBe(0);
      expect((shirt.getTrait(TraitType.WEARABLE) as WearableTrait).layer).toBe(1);
      expect((vest.getTrait(TraitType.WEARABLE) as WearableTrait).layer).toBe(2);
      expect((jacket.getTrait(TraitType.WEARABLE) as WearableTrait).layer).toBe(3);
    });
  });

  describe('special clothing properties', () => {
    it('should handle clothing that blocks other slots', () => {
      const fullBodySuit = createTestClothing(world, 'Hazmat Suit', {
        slot: 'torso',
        blocksSlots: ['head', 'hands', 'feet', 'legs']
      });

      const trait = fullBodySuit.getTrait(TraitType.WEARABLE) as WearableTrait;
      expect(trait.blocksSlots).toContain('head');
      expect(trait.blocksSlots).toContain('hands');
      expect(trait.blocksSlots).toContain('feet');
      expect(trait.blocksSlots).toContain('legs');
    });

    it('should handle non-removable clothing', () => {
      const cursedArmor = createTestClothing(world, 'Cursed Armor', {
        slot: 'torso',
        canRemove: false
      });

      const trait = cursedArmor.getTrait(TraitType.WEARABLE) as WearableTrait;
      expect(trait.canRemove).toBe(false);
    });

    it('should handle custom wear/remove messages', () => {
      const magicCloak = createTestClothing(world, 'Cloak of Invisibility', {
        slot: 'back',
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
        { name: 'Leather Boots', slot: 'feet' },
        { name: 'Silk Dress', slot: 'torso' },
        { name: 'Work Gloves', slot: 'hands' },
        { name: 'Wool Scarf', slot: 'neck' },
        { name: 'Denim Jacket', slot: 'torso', layer: 2 }
      ];

      items.forEach(item => {
        const clothing = createTestClothing(world, item.name, item);
        expect(clothing.hasTrait(TraitType.WEARABLE)).toBe(true);

        const trait = clothing.getTrait(TraitType.WEARABLE) as WearableTrait;
        expect(trait.slot).toBe(item.slot);
      });
    });

    it('should distinguish between clothing and simple wearables', () => {
      // Clothing with pockets
      const coat = createTestClothing(world, 'Lab Coat', {
        slot: 'torso'
      });

      // Simple wearable (jewelry) — WearableTrait without a ContainerTrait
      const ring = world.createEntity('Gold Ring', 'item');
      ring.add(new WearableTrait({ slot: 'finger' }));

      expect(coat.hasTrait(TraitType.WEARABLE)).toBe(true);
      expect(coat.hasTrait(TraitType.CONTAINER)).toBe(true);

      expect(ring.hasTrait(TraitType.WEARABLE)).toBe(true);
      expect(ring.hasTrait(TraitType.CONTAINER)).toBe(false);
    });
  });

  describe('complex clothing scenarios', () => {
    it('should handle multi-pocket utility clothing', () => {
      const vest = createTestClothing(world, 'Tactical Vest', {
        slot: 'torso',
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
