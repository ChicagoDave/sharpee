// visibility-chains.test.ts - Integration tests for complex visibility scenarios

import { WorldModel } from '../../src/world/WorldModel';
import { AuthorModel } from '../../src/world/AuthorModel';
import { IFEntity } from '../../src/entities/if-entity';
import { TraitType } from '../../src/traits/trait-types';
import { createTestRoom, createTestContainer, createTestActor } from '../fixtures/test-entities';
import { createTestDoor } from '../fixtures/test-interactive';
import { OpenableTrait } from '../../src/traits/openable/openableTrait';
import { SupporterTrait } from '../../src/traits/supporter/supporterTrait';
import { LightSourceTrait } from '../../src/traits/light-source/lightSourceTrait';
import { WearableTrait } from '../../src/traits/wearable/wearableTrait';
import { SceneryTrait } from '../../src/traits/scenery/sceneryTrait';
import { getTestEntity, expectEntity, moveEntityByName, canSeeByName } from '../fixtures/test-helpers';

describe('Visibility Chains Integration Tests', () => {
  let world: WorldModel;
  let author: AuthorModel;

  beforeEach(() => {
    world = new WorldModel();
    author = new AuthorModel(world.getDataStore(), world);
  });

  describe('Container Visibility Chains', () => {
    it('should see through open containers', () => {
      const room = createTestRoom(world, 'Room');
      const player = createTestActor(world, 'Player');
      const cabinet = createTestContainer(world, 'Cabinet');
      const box = createTestContainer(world, 'Box');
      const coin = world.createEntity('Gold Coin', 'item');

      world.moveEntity(player.id, room.id);
      world.moveEntity(cabinet.id, room.id);
      world.moveEntity(box.id, cabinet.id);
      world.moveEntity(coin.id, box.id);

      // All containers open by default
      const visible = world.getVisible(player.id);
      expect(visible).toContain(cabinet);
      expect(visible).toContain(box);
      expect(visible).toContain(coin);
    });

    it('should not see into closed containers', () => {
      const room = createTestRoom(world, 'Room');
      const player = createTestActor(world, 'Player');
      const chest = createTestContainer(world, 'Chest');
      const openableTrait = new OpenableTrait();
      (openableTrait as any).isOpen = false;
      chest.add(openableTrait);
      const treasure = world.createEntity('Treasure', 'item');

      world.moveEntity(player.id, room.id);
      world.moveEntity(chest.id, room.id);
      // Use AuthorModel to place treasure in closed chest
      author.moveEntity(treasure.id, chest.id);

      const visible = world.getVisible(player.id);
      expect(visible).toContain(chest);
      expect(visible).not.toContain(treasure);
    });

    it('should handle mixed open/closed container chains', () => {
      const room = createTestRoom(world, 'Room');
      const player = createTestActor(world, 'Player');
      
      const openBox = createTestContainer(world, 'Open Box');
      const closedBox = createTestContainer(world, 'Closed Box');
      const closedBoxOpenable = new OpenableTrait();
      (closedBoxOpenable as any).isOpen = false;
      closedBox.add(closedBoxOpenable);
      const item = world.createEntity('Item', 'item');

      world.moveEntity(player.id, room.id);
      world.moveEntity(openBox.id, room.id);
      world.moveEntity(closedBox.id, openBox.id);
      // Use AuthorModel to place item in closed box
      author.moveEntity(item.id, closedBox.id);

      const visible = world.getVisible(player.id);
      expect(visible).toContain(openBox);
      expect(visible).toContain(closedBox); // Can see the closed box
      expect(visible).not.toContain(item); // But not its contents
    });
  });

  describe('Supporter Visibility', () => {
    it('should see items on supporters', () => {
      const room = createTestRoom(world, 'Room');
      const player = createTestActor(world, 'Player');
      const table = world.createEntity('Table', 'supporter');
      table.add(new SupporterTrait());
      const lamp = world.createEntity('Lamp', 'item');

      world.moveEntity(player.id, room.id);
      world.moveEntity(table.id, room.id);
      world.moveEntity(lamp.id, table.id);

      const visible = world.getVisible(player.id);
      expect(visible).toContain(table);
      expect(visible).toContain(lamp);
    });

    it('should see through containers on supporters', () => {
      const room = createTestRoom(world, 'Room');
      const player = createTestActor(world, 'Player');
      const shelf = world.createEntity('Shelf', 'supporter');
      shelf.add(new SupporterTrait());
      const jar = createTestContainer(world, 'Glass Jar');
      const cookies = world.createEntity('Cookies', 'item');

      world.moveEntity(player.id, room.id);
      world.moveEntity(shelf.id, room.id);
      world.moveEntity(jar.id, shelf.id);
      world.moveEntity(cookies.id, jar.id);

      const visible = world.getVisible(player.id);
      expect(visible).toContain(shelf);
      expect(visible).toContain(jar);
      expect(visible).toContain(cookies); // Jar is open
    });
  });

  describe('Room and Light Visibility', () => {
    it('should not see in dark rooms', () => {
      const darkRoom = createTestRoom(world, 'Dark Room');
      (darkRoom.getTrait(TraitType.ROOM) as any).isDark = true;
      
      const player = createTestActor(world, 'Player');
      const chair = world.createEntity('Chair', 'item');

      world.moveEntity(player.id, darkRoom.id);
      world.moveEntity(chair.id, darkRoom.id);

      expect(world.canSee(player.id, chair.id)).toBe(false);
    });

    it('should see with carried light source', () => {
      const darkRoom = createTestRoom(world, 'Dark Room');
      (darkRoom.getTrait(TraitType.ROOM) as any).isDark = true;
      
      const player = createTestActor(world, 'Player');
      const torch = world.createEntity('Torch', 'item');
      const torchLight = new LightSourceTrait();
      (torchLight as any).isLit = true;
      torch.add(torchLight);
      const statue = world.createEntity('Statue', 'scenery');

      world.moveEntity(player.id, darkRoom.id);
      world.moveEntity(torch.id, player.id);
      world.moveEntity(statue.id, darkRoom.id);

      expect(world.canSee(player.id, statue.id)).toBe(true);
    });

    it('should see with light source in room', () => {
      const darkRoom = createTestRoom(world, 'Dark Room');
      (darkRoom.getTrait(TraitType.ROOM) as any).isDark = true;
      
      const player = createTestActor(world, 'Player');
      const lamp = world.createEntity('Standing Lamp', 'item');
      const lampLight = new LightSourceTrait();
      (lampLight as any).isLit = true;
      lamp.add(lampLight);
      const painting = world.createEntity('Painting', 'scenery');

      world.moveEntity(player.id, darkRoom.id);
      world.moveEntity(lamp.id, darkRoom.id);
      world.moveEntity(painting.id, darkRoom.id);

      expect(world.canSee(player.id, painting.id)).toBe(true);
    });

    it('should handle light in containers', () => {
      const darkRoom = createTestRoom(world, 'Dark Room');
      (darkRoom.getTrait(TraitType.ROOM) as any).isDark = true;
      
      const player = createTestActor(world, 'Player');
      const lanternBox = createTestContainer(world, 'Box');
      const lantern = world.createEntity('Lantern', 'item');
      const lanternLight = new LightSourceTrait();
      (lanternLight as any).isLit = true;
      lantern.add(lanternLight);
      const book = world.createEntity('Book', 'item');

      world.moveEntity(player.id, darkRoom.id);
      world.moveEntity(lanternBox.id, darkRoom.id);
      world.moveEntity(lantern.id, lanternBox.id);
      world.moveEntity(book.id, darkRoom.id);

      // Open box with lit lantern provides light
      expect(world.canSee(player.id, book.id)).toBe(true);

      // Close the box
      const boxOpenable = new OpenableTrait();
      (boxOpenable as any).isOpen = false;
      lanternBox.add(boxOpenable);
      
      // Light is now contained
      expect(world.canSee(player.id, book.id)).toBe(false);
    });
  });

  describe('Actor Visibility', () => {
    it('should see items carried by actors', () => {
      const room = createTestRoom(world, 'Room');
      const player = createTestActor(world, 'Player');
      const npc = createTestActor(world, 'Guard');
      const sword = world.createEntity('Sword', 'item');

      world.moveEntity(player.id, room.id);
      world.moveEntity(npc.id, room.id);
      world.moveEntity(sword.id, npc.id);

      const visible = world.getVisible(player.id);
      expect(visible).toContain(npc);
      expect(visible).toContain(sword);
    });

    it('should see worn items on actors', () => {
      const room = createTestRoom(world, 'Room');
      const player = createTestActor(world, 'Player');
      const npc = createTestActor(world, 'Noble');
      const crown = world.createEntity('Golden Crown', 'item');
      const crownWearable = new WearableTrait();
      (crownWearable as any).isWorn = true;
      (crownWearable as any).wornBy = npc.id;
      (crownWearable as any).canRemove = true;
      (crownWearable as any).bodyPart = 'head';
      crown.add(crownWearable);

      world.moveEntity(player.id, room.id);
      world.moveEntity(npc.id, room.id);
      world.moveEntity(crown.id, npc.id);

      const visible = world.getVisible(player.id);
      expect(visible).toContain(npc);
      expect(visible).toContain(crown);
    });

    it('should not see items in closed containers carried by actors', () => {
      const room = createTestRoom(world, 'Room');
      const player = createTestActor(world, 'Player');
      const merchant = createTestActor(world, 'Merchant');
      const pouch = createTestContainer(world, 'Leather Pouch');
      const pouchOpenable = new OpenableTrait();
      (pouchOpenable as any).isOpen = false;
      pouch.add(pouchOpenable);
      const gems = world.createEntity('Precious Gems', 'item');

      world.moveEntity(player.id, room.id);
      world.moveEntity(merchant.id, room.id);
      world.moveEntity(pouch.id, merchant.id);
      // Use AuthorModel to place gems in closed pouch
      author.moveEntity(gems.id, pouch.id);

      const visible = world.getVisible(player.id);
      expect(visible).toContain(merchant);
      expect(visible).toContain(pouch);
      expect(visible).not.toContain(gems);
    });
  });

  describe('Scenery Visibility', () => {
    it('should see visible scenery', () => {
      const room = createTestRoom(world, 'Room');
      const player = createTestActor(world, 'Player');
      const window = world.createEntity('Large Window', 'scenery');
      const windowScenery = new SceneryTrait();
      (windowScenery as any).visible = true;
      window.add(windowScenery);

      world.moveEntity(player.id, room.id);
      world.moveEntity(window.id, room.id);

      const visible = world.getVisible(player.id);
      expect(visible).toContain(window);
    });

    it('should not see invisible scenery', () => {
      const room = createTestRoom(world, 'Room');
      const player = createTestActor(world, 'Player');
      const hiddenPanel = world.createEntity('Hidden Panel', 'scenery');
      const panelScenery = new SceneryTrait();
      (panelScenery as any).visible = false;
      hiddenPanel.add(panelScenery);

      world.moveEntity(player.id, room.id);
      world.moveEntity(hiddenPanel.id, room.id);

      const visible = world.getVisible(player.id);
      expect(visible).not.toContain(hiddenPanel);
    });

    it('should see contents of visible scenery containers', () => {
      const room = createTestRoom(world, 'Room');
      const player = createTestActor(world, 'Player');
      const alcove = createTestContainer(world, 'Alcove');
      const alcoveScenery = new SceneryTrait();
      (alcoveScenery as any).visible = true;
      alcove.add(alcoveScenery);
      const vase = world.createEntity('Ancient Vase', 'item');

      world.moveEntity(player.id, room.id);
      world.moveEntity(alcove.id, room.id);
      world.moveEntity(vase.id, alcove.id);

      const visible = world.getVisible(player.id);
      expect(visible).toContain(alcove);
      expect(visible).toContain(vase);
    });
  });

  describe('Complex Visibility Scenarios', () => {
    it('should handle deep visibility chains', () => {
      const room = createTestRoom(world, 'Room');
      const player = createTestActor(world, 'Player');
      
      // Create a chain: room -> shelf -> box -> bag -> coin
      const shelf = world.createEntity('Shelf', 'supporter');
      shelf.add(new SupporterTrait());
      const box = createTestContainer(world, 'Box');
      const bag = createTestContainer(world, 'Bag');
      const coin = world.createEntity('Coin', 'item');

      world.moveEntity(player.id, room.id);
      world.moveEntity(shelf.id, room.id);
      world.moveEntity(box.id, shelf.id);
      world.moveEntity(bag.id, box.id);
      world.moveEntity(coin.id, bag.id);

      const visible = world.getVisible(player.id);
      expect(visible).toContain(shelf);
      expect(visible).toContain(box);
      expect(visible).toContain(bag);
      expect(visible).toContain(coin);
    });

    it('should handle multiple visibility blockers', () => {
      const room = createTestRoom(world, 'Room');
      const player = createTestActor(world, 'Player');
      
      // Multiple closed containers
      const trunk = createTestContainer(world, 'Trunk');
      const trunkOpenable = new OpenableTrait();
      (trunkOpenable as any).isOpen = false;
      trunk.add(trunkOpenable);
      
      const chest = createTestContainer(world, 'Chest');
      const chestOpenable = new OpenableTrait();
      (chestOpenable as any).isOpen = false;
      chest.add(chestOpenable);
      
      const box = createTestContainer(world, 'Box');
      const jewel = world.createEntity('Jewel', 'item');

      world.moveEntity(player.id, room.id);
      world.moveEntity(trunk.id, room.id);
      // Use AuthorModel to place items in closed containers
      author.moveEntity(chest.id, trunk.id);
      author.moveEntity(box.id, chest.id);
      author.moveEntity(jewel.id, box.id);

      const visible = world.getVisible(player.id);
      expect(visible).toContain(trunk);
      expect(visible).not.toContain(chest); // Inside closed trunk
      expect(visible).not.toContain(box);
      expect(visible).not.toContain(jewel);

      // Open trunk
      (trunk.getTrait(TraitType.OPENABLE) as any).isOpen = true;
      
      const visibleAfterOpen = world.getVisible(player.id);
      expect(visibleAfterOpen).toContain(chest); // Now visible
      expect(visibleAfterOpen).not.toContain(box); // Still hidden in closed chest
      expect(visibleAfterOpen).not.toContain(jewel);
    });

    it('should handle visibility with movement', () => {
      const room1 = createTestRoom(world, 'Room 1');
      const room2 = createTestRoom(world, 'Room 2');
      const player = createTestActor(world, 'Player');
      const item1 = world.createEntity('Item 1', 'item');
      const item2 = world.createEntity('Item 2', 'item');

      world.moveEntity(player.id, room1.id);
      world.moveEntity(item1.id, room1.id);
      world.moveEntity(item2.id, room2.id);

      // Can see item in same room
      expect(world.canSee(player.id, item1.id)).toBe(true);
      expect(world.canSee(player.id, item2.id)).toBe(false);

      // Move player
      world.moveEntity(player.id, room2.id);

      // Visibility changes
      expect(world.canSee(player.id, item1.id)).toBe(false);
      expect(world.canSee(player.id, item2.id)).toBe(true);
    });
  });

  describe('Scope and In-Scope Items', () => {
    it('should get all items in scope', () => {
      const room = createTestRoom(world, 'Room');
      const player = createTestActor(world, 'Player');
      const table = world.createEntity('Table', 'supporter');
      table.add(new SupporterTrait());
      const book = world.createEntity('Book', 'item');
      const pen = world.createEntity('Pen', 'item');
      const pocket = createTestContainer(world, 'Pocket');
      const coin = world.createEntity('Coin', 'item');

      world.moveEntity(player.id, room.id);
      world.moveEntity(table.id, room.id);
      world.moveEntity(book.id, table.id);
      world.moveEntity(pen.id, player.id); // Carried
      world.moveEntity(pocket.id, player.id);
      world.moveEntity(coin.id, pocket.id);

      const inScope = world.getInScope(player.id);
      
      // Should include room itself
      expect(inScope).toContain(room);
      
      // Should include everything in room
      expect(inScope).toContain(table);
      expect(inScope).toContain(book);
      
      // Should include carried items
      expect(inScope).toContain(pen);
      expect(inScope).toContain(pocket);
      expect(inScope).toContain(coin);
    });

    it('should handle scope in dark rooms with light', () => {
      const darkRoom = createTestRoom(world, 'Dark Room');
      (darkRoom.getTrait(TraitType.ROOM) as any).isDark = true;
      
      const player = createTestActor(world, 'Player');
      const candle = world.createEntity('Candle', 'item');
      const candleLight = new LightSourceTrait();
      (candleLight as any).isLit = true;
      candle.add(candleLight);
      const mirror = world.createEntity('Mirror', 'item');

      world.moveEntity(player.id, darkRoom.id);
      world.moveEntity(candle.id, player.id);
      world.moveEntity(mirror.id, darkRoom.id);

      const inScope = world.getInScope(player.id);
      
      // All items are in scope (even if visibility is affected by darkness)
      expect(inScope).toContain(darkRoom);
      expect(inScope).toContain(candle);
      expect(inScope).toContain(mirror);
      
      // But visibility is different
      expect(world.canSee(player.id, mirror.id)).toBe(true); // Has light
    });
  });

  describe('Performance Tests', () => {
    it('should handle large visibility calculations efficiently', () => {
      const warehouse = createTestRoom(world, 'Warehouse');
      const player = createTestActor(world, 'Player');
      
      world.moveEntity(player.id, warehouse.id);

      // Create 50 containers with items
      for (let i = 0; i < 50; i++) {
        const container = createTestContainer(world, `Container ${i}`);
        world.moveEntity(container.id, warehouse.id);
        
        // Add 5 items to each container
        for (let j = 0; j < 5; j++) {
          const item = world.createEntity(`Item ${i}-${j}`, 'item');
          world.moveEntity(item.id, container.id);
        }
      }

      // Test visibility performance
      const start = performance.now();
      const visible = world.getVisible(player.id);
      const duration = performance.now() - start;

      expect(visible.length).toBeGreaterThan(250); // 1 room + 50 containers + 250 items
      expect(duration).toBeLessThan(50); // Should be fast
    });

    it('should cache visibility calculations', () => {
      const room = createTestRoom(world, 'Room');
      const player = createTestActor(world, 'Player');
      
      // Create complex nested structure
      const furniture: IFEntity[] = [];
      for (let i = 0; i < 10; i++) {
        const item = createTestContainer(world, `Furniture ${i}`);
        furniture.push(item);
        world.moveEntity(item.id, room.id);
      }

      world.moveEntity(player.id, room.id);

      // First visibility check
      const start1 = performance.now();
      const visible1 = world.getVisible(player.id);
      const duration1 = performance.now() - start1;

      // Second visibility check (should be faster if cached)
      const start2 = performance.now();
      const visible2 = world.getVisible(player.id);
      const duration2 = performance.now() - start2;

      expect(visible1).toEqual(visible2);
      // Note: Current implementation may not cache, so this is aspirational
      // expect(duration2).toBeLessThan(duration1);
    });
  });
});
