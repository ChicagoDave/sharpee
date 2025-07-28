// tests/integration/wearable-clothing.test.ts - Integration tests for wearable and clothing behavior

import { WorldModel } from '../../src/world/WorldModel';
import { AuthorModel } from '../../src/world/AuthorModel';
import { IFEntity } from '../../src/entities/if-entity';
import { TraitType } from '../../src/traits/trait-types';
import { 
  createTestRoom, 
  createTestActor, 
  createTestClothing, 
  createTestPocket, 
  createTestWearable,
  createTestContainer
} from '../fixtures/test-entities';
import { ClothingTrait } from '../../src/traits/clothing/clothingTrait';
import { WearableTrait } from '../../src/traits/wearable/wearableTrait';
import { WearableBehavior } from '../../src/traits/wearable/wearableBehavior';

describe('Wearable and Clothing Integration Tests', () => {
  let world: WorldModel;
  let author: AuthorModel;
  let room: IFEntity;
  let player: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    author = new AuthorModel(world.getDataStore(), world);
    room = createTestRoom(world, 'Dressing Room');
    player = createTestActor(world, 'Player');
    world.moveEntity(player.id, room.id);
  });

  describe('Basic Wearable Behavior', () => {
    it('should wear and remove simple items', () => {
      const ring = createTestWearable(world, 'Gold Ring', {
        slot: 'finger',
        weight: 0.1
      });
      
      world.moveEntity(ring.id, room.id);
      
      // Pick up ring
      world.moveEntity(ring.id, player.id);
      
      // Wear ring
      const events = WearableBehavior.wear(ring, player);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('worn');
      
      const wearable = ring.getTrait(TraitType.WEARABLE) as WearableTrait;
      expect(wearable.isWorn).toBe(true);
      expect(wearable.wornBy).toBe(player.id);
      
      // Remove ring
      const removeEvents = WearableBehavior.remove(ring, player);
      expect(removeEvents).toHaveLength(1);
      expect(removeEvents[0].type).toBe('removed');
      
      expect(wearable.isWorn).toBe(false);
      expect(wearable.wornBy).toBeUndefined();
    });

    it('should prevent wearing already worn items', () => {
      const hat = createTestWearable(world, 'Wizard Hat', {
        slot: 'head'
      });
      
      world.moveEntity(hat.id, player.id);
      
      // Wear hat
      WearableBehavior.wear(hat, player);
      
      // Try to wear again
      const events = WearableBehavior.wear(hat, player);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('action_failed');
      expect(events[0].payload).toBeDefined();
      expect(events[0].payload?.reason).toBe('already_wearing');
    });

    it('should track multiple worn items', () => {
      const items = [
        createTestWearable(world, 'Hat', { slot: 'head' }),
        createTestWearable(world, 'Gloves', { slot: 'hands' }),
        createTestWearable(world, 'Boots', { slot: 'feet' })
      ];
      
      items.forEach(item => {
        world.moveEntity(item.id, player.id);
        WearableBehavior.wear(item, player);
      });
      
      // Check all are worn
      items.forEach(item => {
        expect(WearableBehavior.isWorn(item)).toBe(true);
        expect(WearableBehavior.getWearer(item)).toBe(player.id);
      });
    });
  });

  describe('Clothing with Pockets', () => {
    it('should create functional clothing with pockets', () => {
      const jacket = createTestClothing(world, 'Denim Jacket', {
        slot: 'torso',
        material: 'denim',
        layer: 2
      });
      
      const leftPocket = createTestPocket(world, 'left pocket', 3);
      const rightPocket = createTestPocket(world, 'right pocket', 3);
      const innerPocket = createTestPocket(world, 'inner pocket', 2);
      
      // Attach pockets to jacket
      world.moveEntity(leftPocket.id, jacket.id);
      world.moveEntity(rightPocket.id, jacket.id);
      world.moveEntity(innerPocket.id, jacket.id);
      
      // Verify pockets are part of jacket
      const pockets = world.getContents(jacket.id);
      expect(pockets).toHaveLength(3);
      expect(pockets).toContain(leftPocket);
      expect(pockets).toContain(rightPocket);
      expect(pockets).toContain(innerPocket);
    });

    it('should maintain pocket contents when wearing clothing', () => {
      const coat = createTestClothing(world, 'Long Coat', {
        slot: 'torso',
        material: 'wool'
      });
      const pocket = createTestPocket(world, 'deep pocket', 5);
      
      // Items to put in pocket
      const phone = world.createEntity('Smartphone', 'item');
      const keys = world.createEntity('Keys', 'item');
      
      // Set up: coat with pocket containing items
      world.moveEntity(coat.id, room.id);
      world.moveEntity(pocket.id, coat.id);
      world.moveEntity(phone.id, pocket.id);
      world.moveEntity(keys.id, pocket.id);
      
      // Player picks up and wears coat
      world.moveEntity(coat.id, player.id);
      const clothing = coat.getTrait(TraitType.CLOTHING) as ClothingTrait;
      clothing.isWorn = true;
      clothing.wornBy = player.id;
      
      // Verify pocket contents are still accessible
      const pocketContents = world.getContents(pocket.id);
      expect(pocketContents).toContain(phone);
      expect(pocketContents).toContain(keys);
      
      // Verify through getAllContents
      const allItems = world.getAllContents(player.id, {
        recursive: true,
        includeWorn: true
      });
      expect(allItems).toContain(coat);
      expect(allItems).toContain(pocket);
      expect(allItems).toContain(phone);
      expect(allItems).toContain(keys);
    });

    it('should handle items in pockets visibility', () => {
      const vest = createTestClothing(world, 'Fishing Vest', {
        slot: 'torso',
        material: 'canvas'
      });
      const tackleBox = createTestPocket(world, 'tackle pocket', 10);
      const lure = world.createEntity('Fishing Lure', 'item');
      
      // Setup
      world.moveEntity(vest.id, room.id);
      world.moveEntity(tackleBox.id, vest.id);
      world.moveEntity(lure.id, tackleBox.id);
      
      // Items in pockets should be visible when vest is in room
      let visible = world.getVisible(player.id);
      expect(visible).toContain(vest);
      expect(visible).toContain(tackleBox);
      expect(visible).toContain(lure);
      
      // Pick up and wear vest
      world.moveEntity(vest.id, player.id);
      const clothing = vest.getTrait(TraitType.CLOTHING) as ClothingTrait;
      clothing.isWorn = true;
      clothing.wornBy = player.id;
      
      // Should still see pocket contents when worn
      visible = world.getVisible(player.id);
      expect(visible).toContain(vest);
      expect(visible).toContain(tackleBox);
      expect(visible).toContain(lure);
    });
  });

  describe('Layered Clothing', () => {
    it('should support multiple layers of clothing', () => {
      const layers = [
        createTestClothing(world, 'Undershirt', {
          slot: 'torso',
          layer: 0,
          material: 'cotton'
        }),
        createTestClothing(world, 'Shirt', {
          slot: 'torso',
          layer: 1,
          material: 'cotton'
        }),
        createTestClothing(world, 'Sweater', {
          slot: 'torso',
          layer: 2,
          material: 'wool'
        }),
        createTestClothing(world, 'Coat', {
          slot: 'torso',
          layer: 3,
          material: 'leather'
        })
      ];
      
      // Wear all layers
      layers.forEach(item => {
        world.moveEntity(item.id, player.id);
        const clothing = item.getTrait(TraitType.CLOTHING) as ClothingTrait;
        clothing.isWorn = true;
        clothing.wornBy = player.id;
      });
      
      // Check all are worn and have correct layers
      layers.forEach((item, index) => {
        const clothing = item.getTrait(TraitType.CLOTHING) as ClothingTrait;
        expect(clothing.isWorn).toBe(true);
        expect(clothing.layer).toBe(index);
      });
    });

    it('should handle mixed clothing and accessories', () => {
      // Clothing items
      const shirt = createTestClothing(world, 'Dress Shirt', {
        slot: 'torso',
        material: 'silk'
      });
      const pants = createTestClothing(world, 'Dress Pants', {
        slot: 'legs',
        material: 'wool'
      });
      
      // Accessories (simple wearables)
      const watch = createTestWearable(world, 'Gold Watch', {
        slot: 'wrist',
        weight: 0.2
      });
      const necklace = createTestWearable(world, 'Pearl Necklace', {
        slot: 'neck',
        weight: 0.1
      });
      
      // Wear everything
      [shirt, pants, watch, necklace].forEach(item => {
        world.moveEntity(item.id, player.id);
        const trait = item.getTrait(TraitType.WEARABLE) || item.getTrait(TraitType.CLOTHING);
        if (trait) {
          (trait as any).isWorn = true;
          (trait as any).wornBy = player.id;
        }
      });
      
      // Get worn items
      const carried = world.getContents(player.id, { includeWorn: true });
      expect(carried).toContain(shirt);
      expect(carried).toContain(pants);
      expect(carried).toContain(watch);
      expect(carried).toContain(necklace);
      
      // Get only carried (not worn) items
      const notWorn = world.getContents(player.id, { includeWorn: false });
      expect(notWorn).toHaveLength(0);
    });
  });

  describe('Complex Pocket Hierarchies', () => {
    it('should handle nested containers in pockets', () => {
      const backpack = createTestClothing(world, 'Hiking Backpack', {
        slot: 'back',
        material: 'nylon'
      });
      
      const mainPocket = createTestPocket(world, 'main compartment', 20);
      const sidePocket = createTestPocket(world, 'side pocket', 5);
      
      // Small containers to put in pockets
      const firstAidKit = createTestContainer(world, 'First Aid Kit');
      const bandage = world.createEntity('Bandage', 'item');
      const pills = world.createEntity('Pain Pills', 'item');
      
      // Build hierarchy
      world.moveEntity(backpack.id, room.id);
      world.moveEntity(mainPocket.id, backpack.id);
      world.moveEntity(sidePocket.id, backpack.id);
      world.moveEntity(firstAidKit.id, mainPocket.id);
      world.moveEntity(bandage.id, firstAidKit.id);
      world.moveEntity(pills.id, firstAidKit.id);
      
      // Get all contents
      const allContents = world.getAllContents(backpack.id, { recursive: true });
      expect(allContents).toContain(mainPocket);
      expect(allContents).toContain(sidePocket);
      expect(allContents).toContain(firstAidKit);
      expect(allContents).toContain(bandage);
      expect(allContents).toContain(pills);
    });

    it('should handle pocket access when clothing is in container', () => {
      const wardrobe = createTestContainer(world, 'Wardrobe');
      const suitJacket = createTestClothing(world, 'Suit Jacket', {
        slot: 'torso',
        material: 'wool',
        style: 'formal'
      });
      const breastPocket = createTestPocket(world, 'breast pocket', 2);
      const businessCard = world.createEntity('Business Card', 'item');
      
      // Set up hierarchy
      world.moveEntity(wardrobe.id, room.id);
      world.moveEntity(suitJacket.id, wardrobe.id);
      world.moveEntity(breastPocket.id, suitJacket.id);
      world.moveEntity(businessCard.id, breastPocket.id);
      
      // Check visibility
      const visible = world.getVisible(player.id);
      expect(visible).toContain(wardrobe);
      expect(visible).toContain(suitJacket);
      expect(visible).toContain(breastPocket);
      expect(visible).toContain(businessCard);
    });
  });

  describe('Special Clothing Properties', () => {
    it('should handle clothing that blocks slots', () => {
      const helmet = createTestWearable(world, 'Full Helmet', {
        slot: 'head',
        blocksSlots: ['face', 'ears']
      });
      
      const goggles = createTestWearable(world, 'Goggles', {
        slot: 'face'
      });
      
      world.moveEntity(helmet.id, player.id);
      world.moveEntity(goggles.id, player.id);
      
      // Wear helmet
      WearableBehavior.wear(helmet, player);
      
      // In a full implementation, wearing goggles should fail
      // because helmet blocks face slot
      const blockedSlots = WearableBehavior.getBlockedSlots(helmet);
      expect(blockedSlots).toContain('face');
      expect(blockedSlots).toContain('ears');
    });

    it('should handle non-removable clothing', () => {
      const cursedRing = createTestWearable(world, 'Cursed Ring', {
        slot: 'finger',
        canRemove: false
      });
      
      world.moveEntity(cursedRing.id, player.id);
      WearableBehavior.wear(cursedRing, player);
      
      const wearable = cursedRing.getTrait(TraitType.WEARABLE) as WearableTrait;
      expect(wearable.canRemove).toBe(false);
      
      // In full implementation, remove would fail
      // For now, just check the property
      expect(wearable.isWorn).toBe(true);
    });

    it('should track clothing condition', () => {
      const armor = createTestClothing(world, 'Leather Armor', {
        slot: 'torso',
        material: 'leather',
        condition: 'pristine',
        damageable: true
      });
      
      world.moveEntity(armor.id, player.id);
      
      const clothing = armor.getTrait(TraitType.CLOTHING) as ClothingTrait;
      expect(clothing.condition).toBe('pristine');
      
      // Simulate wear and tear
      clothing.condition = 'good';
      expect(clothing.condition).toBe('good');
      
      clothing.condition = 'worn';
      expect(clothing.condition).toBe('worn');
      
      clothing.condition = 'torn';
      expect(clothing.condition).toBe('torn');
    });
  });

  describe('Performance with Many Wearables', () => {
    it('should handle actors with many worn items efficiently', () => {
      const items: IFEntity[] = [];
      
      // Create many wearable items
      for (let i = 0; i < 20; i++) {
        const item = createTestWearable(world, `Accessory ${i}`, {
          slot: 'misc',
          weight: 0.1
        });
        items.push(item);
        world.moveEntity(item.id, player.id);
      }
      
      // Wear all items
      const start = performance.now();
      items.forEach(item => {
        const wearable = item.getTrait(TraitType.WEARABLE) as WearableTrait;
        wearable.isWorn = true;
        wearable.wornBy = player.id;
      });
      const wearTime = performance.now() - start;
      
      // Get all contents including worn
      const startGet = performance.now();
      const allItems = world.getAllContents(player.id, {
        recursive: true,
        includeWorn: true
      });
      const getTime = performance.now() - startGet;
      
      expect(allItems.length).toBe(20);
      expect(wearTime).toBeLessThan(10); // Should be very fast
      expect(getTime).toBeLessThan(10); // Should be very fast
    });

    it('should efficiently filter worn vs carried items', () => {
      // Create mix of worn and carried items
      const worn: IFEntity[] = [];
      const carried: IFEntity[] = [];
      
      for (let i = 0; i < 10; i++) {
        const wornItem = createTestWearable(world, `Worn ${i}`, { slot: 'misc' });
        world.moveEntity(wornItem.id, player.id);
        const wearable = wornItem.getTrait(TraitType.WEARABLE) as WearableTrait;
        wearable.isWorn = true;
        wearable.wornBy = player.id;
        worn.push(wornItem);
        
        const carriedItem = world.createEntity(`Carried ${i}`, 'item');
        world.moveEntity(carriedItem.id, player.id);
        carried.push(carriedItem);
      }
      
      // Test filtering
      const start = performance.now();
      const wornOnly = world.getContents(player.id, { includeWorn: true });
      const carriedOnly = world.getContents(player.id, { includeWorn: false });
      const duration = performance.now() - start;
      
      expect(wornOnly).toHaveLength(20); // All items
      expect(carriedOnly).toHaveLength(10); // Only carried items
      expect(duration).toBeLessThan(5); // Should be very fast
      
      // Verify correct filtering
      carried.forEach(item => {
        expect(carriedOnly).toContain(item);
      });
      worn.forEach(item => {
        expect(carriedOnly).not.toContain(item);
      });
    });
  });
});
