// tests/unit/traits/clothing.test.ts

import { ClothingTrait } from '../../../src/traits/clothing/clothingTrait';
import { WearableTrait } from '../../../src/traits/wearable/wearableTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';
import { createTestClothing, createTestPocket, createTestActor } from '../../fixtures/test-entities';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';

describe('ClothingTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new ClothingTrait();
      
      expect(trait.type).toBe(TraitType.CLOTHING);
      // Check inherited WearableTrait properties
      expect(trait.isWorn).toBe(false);
      expect(trait.wornBy).toBeUndefined();
      expect(trait.slot).toBe('clothing');
      expect(trait.layer).toBe(1);
      expect(trait.canRemove).toBe(true);
      // Check ClothingTrait specific properties
      expect(trait.material).toBe('fabric');
      expect(trait.style).toBe('casual');
      expect(trait.damageable).toBe(true);
      expect(trait.condition).toBe('good');
    });

    it('should create trait with provided data', () => {
      const trait = new ClothingTrait({
        slot: 'torso',
        material: 'silk',
        style: 'formal',
        condition: 'pristine',
        layer: 2,
        canRemove: false
      });
      
      expect(trait.slot).toBe('torso');
      expect(trait.material).toBe('silk');
      expect(trait.style).toBe('formal');
      expect(trait.condition).toBe('pristine');
      expect(trait.layer).toBe(2);
      expect(trait.canRemove).toBe(false);
    });

    it('should have all wearable properties', () => {
      const trait = new ClothingTrait();
      
      // Should have all WearableTrait properties even though it doesn't extend it
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

  describe('clothing materials', () => {
    it('should support various materials', () => {
      const materials = ['cotton', 'wool', 'silk', 'leather', 'denim', 'synthetic'];
      
      materials.forEach(material => {
        const trait = new ClothingTrait({ material });
        expect(trait.material).toBe(material);
      });
    });

    it('should support composite materials', () => {
      const trait = new ClothingTrait({ 
        material: 'wool blend with silk lining' 
      });
      
      expect(trait.material).toBe('wool blend with silk lining');
    });
  });

  describe('clothing conditions', () => {
    it('should track condition states', () => {
      const conditions: Array<'pristine' | 'good' | 'worn' | 'torn' | 'ruined'> = 
        ['pristine', 'good', 'worn', 'torn', 'ruined'];
      
      conditions.forEach(condition => {
        const trait = new ClothingTrait({ condition });
        expect(trait.condition).toBe(condition);
      });
    });

    it('should handle condition degradation', () => {
      const trait = new ClothingTrait({ condition: 'pristine' });
      
      // Simulate wear
      trait.condition = 'good';
      expect(trait.condition).toBe('good');
      
      trait.condition = 'worn';
      expect(trait.condition).toBe('worn');
      
      trait.condition = 'torn';
      expect(trait.condition).toBe('torn');
    });

    it('should handle non-damageable items', () => {
      const trait = new ClothingTrait({ 
        damageable: false,
        material: 'enchanted fabric'
      });
      
      expect(trait.damageable).toBe(false);
      expect(trait.condition).toBe('good');
    });
  });

  describe('clothing styles', () => {
    it('should support various styles', () => {
      const styles = ['casual', 'formal', 'business', 'athletic', 'outdoor', 'vintage'];
      
      styles.forEach(style => {
        const trait = new ClothingTrait({ style });
        expect(trait.style).toBe(style);
      });
    });

    it('should support custom style descriptions', () => {
      const trait = new ClothingTrait({ 
        style: 'punk rock with studs and patches' 
      });
      
      expect(trait.style).toBe('punk rock with studs and patches');
    });
  });

  describe('clothing with pockets', () => {
    it('should create clothing that can contain pockets', () => {
      const coat = createTestClothing(world, 'Winter Coat', {
        slot: 'torso',
        material: 'wool'
      });
      
      expect(coat.hasTrait(TraitType.CLOTHING)).toBe(true);
      expect(coat.hasTrait(TraitType.CONTAINER)).toBe(true);
      
      const containerTrait = coat.getTrait(TraitType.CONTAINER);
      expect(containerTrait).toBeDefined();
    });

    it('should attach pockets to clothing', () => {
      const jacket = createTestClothing(world, 'Leather Jacket', {
        slot: 'torso',
        material: 'leather'
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
        slot: 'torso',
        material: 'cotton'
      });
      const pocket = createTestPocket(world, 'deep pocket', 10);
      const key = world.createEntity('Mysterious Key', 'item');
      
      // Set up hierarchy
      world.moveEntity(pocket.id, coat.id);
      world.moveEntity(key.id, pocket.id);
      world.moveEntity(coat.id, player.id);
      
      // Wear the coat
      const clothingTrait = coat.getTrait(TraitType.CLOTHING) as ClothingTrait;
      clothingTrait.isWorn = true;
      clothingTrait.wornBy = player.id;
      
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
        const trait = clothing.getTrait(TraitType.CLOTHING) as ClothingTrait;
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
      
      expect((undershirt.getTrait(TraitType.CLOTHING) as ClothingTrait).layer).toBe(0);
      expect((shirt.getTrait(TraitType.CLOTHING) as ClothingTrait).layer).toBe(1);
      expect((vest.getTrait(TraitType.CLOTHING) as ClothingTrait).layer).toBe(2);
      expect((jacket.getTrait(TraitType.CLOTHING) as ClothingTrait).layer).toBe(3);
    });
  });

  describe('special clothing properties', () => {
    it('should handle clothing that blocks other slots', () => {
      const fullBodySuit = createTestClothing(world, 'Hazmat Suit', {
        slot: 'torso',
        blocksSlots: ['head', 'hands', 'feet', 'legs']
      });
      
      const trait = fullBodySuit.getTrait(TraitType.CLOTHING) as ClothingTrait;
      expect(trait.blocksSlots).toContain('head');
      expect(trait.blocksSlots).toContain('hands');
      expect(trait.blocksSlots).toContain('feet');
      expect(trait.blocksSlots).toContain('legs');
    });

    it('should handle non-removable clothing', () => {
      const cursedArmor = createTestClothing(world, 'Cursed Armor', {
        slot: 'torso',
        canRemove: false,
        material: 'cursed steel'
      });
      
      const trait = cursedArmor.getTrait(TraitType.CLOTHING) as ClothingTrait;
      expect(trait.canRemove).toBe(false);
    });

    it('should handle custom wear/remove messages', () => {
      const magicCloak = createTestClothing(world, 'Cloak of Invisibility', {
        slot: 'back',
        wearMessage: 'You vanish from sight as you don the cloak.',
        removeMessage: 'You reappear as you remove the cloak.',
        material: 'ethereal fabric'
      });
      
      const trait = magicCloak.getTrait(TraitType.CLOTHING) as ClothingTrait;
      expect(trait.wearMessage).toBe('You vanish from sight as you don the cloak.');
      expect(trait.removeMessage).toBe('You reappear as you remove the cloak.');
    });
  });

  describe('entity integration', () => {
    it('should create various clothing items', () => {
      const items = [
        { name: 'Leather Boots', slot: 'feet', material: 'leather' },
        { name: 'Silk Dress', slot: 'torso', material: 'silk', style: 'formal' },
        { name: 'Work Gloves', slot: 'hands', material: 'leather', condition: 'worn' },
        { name: 'Wool Scarf', slot: 'neck', material: 'wool' },
        { name: 'Denim Jacket', slot: 'torso', material: 'denim', layer: 2 }
      ];
      
      items.forEach(item => {
        const clothing = createTestClothing(world, item.name, item);
        expect(clothing.hasTrait(TraitType.CLOTHING)).toBe(true);
        
        const trait = clothing.getTrait(TraitType.CLOTHING) as ClothingTrait;
        expect(trait.slot).toBe(item.slot);
        expect(trait.material).toBe(item.material);
      });
    });

    it('should distinguish between clothing and simple wearables', () => {
      // Clothing with pockets
      const coat = createTestClothing(world, 'Lab Coat', {
        slot: 'torso',
        material: 'cotton'
      });
      
      // Simple wearable (jewelry)
      const ring = world.createEntity('Gold Ring', 'item');
      ring.add(new WearableTrait({ slot: 'finger' }));
      
      expect(coat.hasTrait(TraitType.CLOTHING)).toBe(true);
      expect(coat.hasTrait(TraitType.CONTAINER)).toBe(true);
      
      expect(ring.hasTrait(TraitType.WEARABLE)).toBe(true);
      expect(ring.hasTrait(TraitType.CLOTHING)).toBe(false);
      expect(ring.hasTrait(TraitType.CONTAINER)).toBe(false);
    });
  });

  describe('complex clothing scenarios', () => {
    it('should handle multi-pocket utility clothing', () => {
      const vest = createTestClothing(world, 'Tactical Vest', {
        slot: 'torso',
        layer: 2,
        material: 'ballistic nylon'
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

    it('should handle outfit sets with matching properties', () => {
      const suit = {
        jacket: createTestClothing(world, 'Suit Jacket', {
          slot: 'torso',
          layer: 2,
          material: 'wool',
          style: 'business'
        }),
        pants: createTestClothing(world, 'Suit Pants', {
          slot: 'legs',
          material: 'wool',
          style: 'business'
        }),
        tie: createTestClothing(world, 'Silk Tie', {
          slot: 'neck',
          material: 'silk',
          style: 'business'
        })
      };
      
      Object.values(suit).forEach(item => {
        const trait = item.getTrait(TraitType.CLOTHING) as ClothingTrait;
        expect(trait.style).toBe('business');
      });
    });

    it('should handle damaged clothing states', () => {
      const armor = createTestClothing(world, 'Chainmail Shirt', {
        slot: 'torso',
        material: 'steel rings',
        condition: 'good',
        damageable: true
      });
      
      const trait = armor.getTrait(TraitType.CLOTHING) as ClothingTrait;
      
      // Simulate combat damage
      trait.condition = 'worn';
      expect(trait.condition).toBe('worn');
      
      // More damage
      trait.condition = 'torn';
      expect(trait.condition).toBe('torn');
      
      // Repair (in a real game)
      trait.condition = 'good';
      expect(trait.condition).toBe('good');
    });
  });
});
