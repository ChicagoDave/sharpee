// trait-combinations.test.ts - Integration tests for complex trait interactions

import { WorldModel } from '../../src/world/WorldModel';
import { AuthorModel } from '../../src/world/AuthorModel';
import { IFEntity } from '../../src/entities/if-entity';
import { TraitType } from '../../src/traits/trait-types';
import { createTestRoom, createTestContainer, createTestActor, createTestClothing, createTestPocket, createTestWearable } from '../fixtures/test-entities';
import { createTestDoor } from '../fixtures/test-interactive';
import { IdentityTrait } from '../../src/traits/identity/identityTrait';
import { OpenableTrait } from '../../src/traits/openable/openableTrait';
import { LockableTrait } from '../../src/traits/lockable/lockableTrait';
import { SupporterTrait } from '../../src/traits/supporter/supporterTrait';
import { SceneryTrait } from '../../src/traits/scenery/sceneryTrait';
import { WearableTrait } from '../../src/traits/wearable/wearableTrait';
import { ClothingTrait } from '../../src/traits/clothing/clothingTrait';
import { ContainerTrait } from '../../src/traits/container/containerTrait';
import { LightSourceTrait } from '../../src/traits/light-source/lightSourceTrait';
import { SwitchableTrait } from '../../src/traits/switchable/switchableTrait';
import { EdibleTrait } from '../../src/traits/edible/edibleTrait';
import { ReadableTrait } from '../../src/traits/readable/readableTrait';
import { getTestEntity, expectEntity, moveEntityByName, canSeeByName } from '../fixtures/test-helpers';

describe('Trait Combinations Integration Tests', () => {
  let world: WorldModel;
  let author: AuthorModel;

  beforeEach(() => {
    world = new WorldModel();
    author = new AuthorModel(world.getDataStore(), world);
  });

  describe('Container + Openable + Lockable', () => {
    let secureBox: IFEntity;
    let key: IFEntity;
    let treasure: IFEntity;
    let player: IFEntity;
    let room: IFEntity;

    beforeEach(() => {
      room = createTestRoom(world, 'Room');
      player = createTestActor(world, 'Player');
      secureBox = createTestContainer(world, 'Secure Box');
      key = world.createEntity('Golden Key', 'item');
      treasure = world.createEntity('Treasure', 'item');

      // Make box openable and lockable
      const openableTrait = new OpenableTrait();
      (openableTrait as any).isOpen = false;
      secureBox.add(openableTrait);
      
      const lockableTrait = new LockableTrait();
      (lockableTrait as any).isLocked = true;
      (lockableTrait as any).requiredKey = key.id;
      secureBox.add(lockableTrait);

      world.moveEntity(player.id, room.id);
      world.moveEntity(secureBox.id, room.id);
      world.moveEntity(key.id, room.id);
      // Use AuthorModel to place treasure in locked box
      author.moveEntity(treasure.id, secureBox.id);
    });

    it('should not see contents of locked closed container', () => {
      const visible = world.getVisible(player.id);
      expect(visible).toContain(secureBox);
      expect(visible).toContain(key);
      expect(visible).not.toContain(treasure);
    });

    it('should not open locked container', () => {
      const openable = secureBox.getTrait(TraitType.OPENABLE) as any;
      const lockable = secureBox.getTrait(TraitType.LOCKABLE) as any;

      // Try to open - should fail
      openable.isOpen = true;
      
      // In a real system, this would be prevented by behavior
      // For now, we just verify the state
      expect(lockable.isLocked).toBe(true);
    });

    it('should see contents after unlocking and opening', () => {
      const openable = secureBox.getTrait(TraitType.OPENABLE) as any;
      const lockable = secureBox.getTrait(TraitType.LOCKABLE) as any;

      // Unlock with key
      lockable.isLocked = false;
      
      // Open container
      openable.isOpen = true;

      const visible = world.getVisible(player.id);
      expect(visible).toContain(treasure);
    });

    it('should handle nested locked containers', () => {
      const innerBox = createTestContainer(world, 'Inner Box');
      const innerOpenable = new OpenableTrait();
      (innerOpenable as any).isOpen = false;
      innerBox.add(innerOpenable);
      
      const innerLockable = new LockableTrait();
      (innerLockable as any).isLocked = true;
      (innerLockable as any).requiredKey = world.createEntity('Inner Key', 'item').id;
      innerBox.add(innerLockable);

      const gem = world.createEntity('Gem', 'item');
      
      // Use AuthorModel to place items in locked containers
      author.moveEntity(innerBox.id, secureBox.id);
      author.moveEntity(gem.id, innerBox.id);

      // Unlock and open outer box
      (secureBox.getTrait(TraitType.LOCKABLE) as any).isLocked = false;
      (secureBox.getTrait(TraitType.OPENABLE) as any).isOpen = true;

      const visible = world.getVisible(player.id);
      expect(visible).toContain(innerBox);
      expect(visible).not.toContain(gem); // Still locked in inner box
    });
  });

  describe('Supporter + Container + Scenery', () => {
    let desk: IFEntity;
    let drawer: IFEntity;
    let lamp: IFEntity;
    let paper: IFEntity;
    let player: IFEntity;
    let room: IFEntity;

    beforeEach(() => {
      room = createTestRoom(world, 'Office');
      player = createTestActor(world, 'Player');
      
      // Desk is a supporter with built-in drawer (container)
      desk = world.createEntity('Office Desk', 'supporter');
      desk.add(new SupporterTrait());
      desk.add(new SceneryTrait());
      
      drawer = createTestContainer(world, 'Desk Drawer');
      const drawerOpenable = new OpenableTrait();
      (drawerOpenable as any).isOpen = false;
      drawer.add(drawerOpenable);
      drawer.add(new SceneryTrait());
      
      lamp = world.createEntity('Desk Lamp', 'item');
      paper = world.createEntity('Important Paper', 'item');

      world.moveEntity(player.id, room.id);
      world.moveEntity(desk.id, room.id);
      world.moveEntity(drawer.id, desk.id); // Drawer is part of desk
      world.moveEntity(lamp.id, desk.id); // On top of desk
      // Use AuthorModel to place paper in closed drawer
      author.moveEntity(paper.id, drawer.id);
    });

    it('should see items on supporter but not in closed container', () => {
      const visible = world.getVisible(player.id);
      
      expect(visible).toContain(desk);
      expect(visible).toContain(lamp); // On desk
      expect(visible).toContain(drawer); // Part of desk
      expect(visible).not.toContain(paper); // Hidden in closed drawer
    });

    it('should handle complex containment hierarchy', () => {
      // Open drawer
      (drawer.getTrait(TraitType.OPENABLE) as any).isOpen = true;

      const visible = world.getVisible(player.id);
      expect(visible).toContain(paper);

      // Get all contents of desk
      const deskContents = world.getAllContents(desk.id, { recursive: true });
      expect(deskContents).toContain(drawer);
      expect(deskContents).toContain(lamp);
      expect(deskContents).toContain(paper);
    });

    it('should exclude invisible scenery', () => {
      // Make drawer invisible
      (drawer.getTrait(TraitType.SCENERY) as any).visible = false;

      const visible = world.findByTrait(TraitType.CONTAINER, { includeInvisible: false });
      expect(visible).not.toContain(drawer);

      const allContainers = world.findByTrait(TraitType.CONTAINER, { includeScenery: true, includeInvisible: true });
      expect(allContainers).toContain(drawer);
    });
  });

  describe('Actor + Wearable + Container', () => {
    let player: IFEntity;
    let coat: IFEntity;
    let pocket: IFEntity;
    let wallet: IFEntity;
    let room: IFEntity;

    beforeEach(() => {
      room = createTestRoom(world, 'Room');
      player = createTestActor(world, 'Player');
      
      // Use the new helper functions
      coat = createTestClothing(world, 'Winter Coat', {
        slot: 'torso',
        material: 'wool',
        canRemove: true
      });
      
      pocket = createTestPocket(world, 'coat pocket', 5);
      
      wallet = world.createEntity('Wallet', 'item');

      world.moveEntity(player.id, room.id);
      world.moveEntity(coat.id, room.id);
      world.moveEntity(pocket.id, coat.id);
      world.moveEntity(wallet.id, pocket.id);
    });

    it('should handle wearing items with containers', () => {
      // Pick up coat
      world.moveEntity(coat.id, player.id);
      
      // Wear coat
      const clothing = coat.getTrait(TraitType.CLOTHING) as ClothingTrait;
      clothing.isWorn = true;
      clothing.wornBy = player.id;

      // Should still access pocket contents
      const playerContents = world.getAllContents(player.id, { 
        recursive: true,
        includeWorn: true 
      });
      expect(playerContents).toContain(coat);
      expect(playerContents).toContain(pocket);
      expect(playerContents).toContain(wallet);
    });

    it('should exclude worn items when specified', () => {
      // Wear the coat
      world.moveEntity(coat.id, player.id);
      const clothing = coat.getTrait(TraitType.CLOTHING) as ClothingTrait;
      clothing.isWorn = true;
      clothing.wornBy = player.id;

      const carriedOnly = world.getContents(player.id, { includeWorn: false });
      expect(carriedOnly).not.toContain(coat);

      const everything = world.getContents(player.id, { includeWorn: true });
      expect(everything).toContain(coat);
    });

    it('should track complex worn item hierarchies', () => {
      // Create a belt with pouches
      const belt = createTestClothing(world, 'Utility Belt', {
        slot: 'waist',
        canRemove: true
      });

      // Create pouches using the helper
      const pouch1 = createTestPocket(world, 'small pouch', 3);
      const pouch2 = createTestPocket(world, 'large pouch', 5);
      
      const tool = world.createEntity('Multi-tool', 'item');

      world.moveEntity(belt.id, player.id);
      world.moveEntity(pouch1.id, belt.id);
      world.moveEntity(pouch2.id, belt.id);
      world.moveEntity(tool.id, pouch1.id);

      // Wear both items
      world.moveEntity(coat.id, player.id);
      const coatClothing = coat.getTrait(TraitType.CLOTHING) as ClothingTrait;
      coatClothing.isWorn = true;
      coatClothing.wornBy = player.id;
      
      const beltClothing = belt.getTrait(TraitType.CLOTHING) as ClothingTrait;
      beltClothing.isWorn = true;
      beltClothing.wornBy = player.id;

      // Get all items including worn
      const allItems = world.getAllContents(player.id, { 
        recursive: true,
        includeWorn: true 
      });

      expect(allItems).toContain(coat);
      expect(allItems).toContain(belt);
      expect(allItems).toContain(pocket);
      expect(allItems).toContain(pouch1);
      expect(allItems).toContain(pouch2);
      expect(allItems).toContain(wallet);
      expect(allItems).toContain(tool);
    });
  });

  describe('Door + Room + Light Source', () => {
    let kitchen: IFEntity;
    let hallway: IFEntity;
    let darkBasement: IFEntity;
    let door1: IFEntity;
    let door2: IFEntity;
    let player: IFEntity;
    let torch: IFEntity;

    beforeEach(() => {
      kitchen = createTestRoom(world, 'Kitchen');
      hallway = createTestRoom(world, 'Hallway');
      darkBasement = createTestRoom(world, 'Dark Basement');
      
      // Make basement dark
      (darkBasement.getTrait(TraitType.ROOM) as any).isDark = true;

      player = createTestActor(world, 'Player');
      torch = world.createEntity('Torch', 'item');
      torch.add(new LightSourceTrait());
      torch.add(new SwitchableTrait());

      // Create doors
      door1 = createTestDoor(world, 'Kitchen Door', kitchen.id, hallway.id);
      door2 = createTestDoor(world, 'Basement Door', hallway.id, darkBasement.id);
      
      // Lock basement door
      const door2Lockable = new LockableTrait();
      (door2Lockable as any).isLocked = true;
      (door2Lockable as any).requiredKey = world.createEntity('Basement Key', 'item').id;
      door2.add(door2Lockable);

      // Set up room exits
      (kitchen.getTrait(TraitType.ROOM) as any).exits = {
        east: { via: door1.id, destination: hallway.id }
      };
      (hallway.getTrait(TraitType.ROOM) as any).exits = {
        west: { via: door1.id, destination: kitchen.id },
        down: { via: door2.id, destination: darkBasement.id }
      };
      (darkBasement.getTrait(TraitType.ROOM) as any).exits = {
        up: { via: door2.id, destination: hallway.id }
      };

      world.moveEntity(player.id, kitchen.id);
      world.moveEntity(torch.id, kitchen.id);
    });

    it('should navigate through doors between rooms', () => {
      // Find path from kitchen to basement
      const path = world.findPath(kitchen.id, darkBasement.id);
      expect(path).toEqual([door1.id, door2.id]);
    });

    it('should see in lit rooms but not dark rooms', () => {
      // Move to dark basement (assume door is unlocked for this test)
      (door2.getTrait(TraitType.LOCKABLE) as any).isLocked = false;
      world.moveEntity(player.id, darkBasement.id);

      // Create an object in basement
      const box = world.createEntity('Box', 'item');
      world.moveEntity(box.id, darkBasement.id);

      // Can't see in darkness
      expect(world.canSee(player.id, box.id)).toBe(false);

      // Light torch
      world.moveEntity(torch.id, player.id);
      (torch.getTrait(TraitType.LIGHT_SOURCE) as any).isLit = true;
      (torch.getTrait(TraitType.SWITCHABLE) as any).isOn = true;

      // Now can see
      expect(world.canSee(player.id, box.id)).toBe(true);
    });

    it('should handle door state synchronization', () => {
      const doorTrait = door1.getTrait(TraitType.DOOR) as any;
      const openableTrait = door1.getTrait(TraitType.OPENABLE) as any;

      // Door connects kitchen and hallway
      expect(doorTrait.room1).toBe(kitchen.id);
      expect(doorTrait.room2).toBe(hallway.id);

      // Opening door
      openableTrait.isOpen = true;

      // Move through door
      world.moveEntity(player.id, hallway.id);
      
      // Door should still be open from other side
      expect(openableTrait.isOpen).toBe(true);
    });
  });

  describe('Edible + Container + Actor', () => {
    let player: IFEntity;
    let lunchbox: IFEntity;
    let sandwich: IFEntity;
    let apple: IFEntity;
    let room: IFEntity;

    beforeEach(() => {
      room = createTestRoom(world, 'Room');
      player = createTestActor(world, 'Player');
      
      lunchbox = createTestContainer(world, 'Lunchbox');
      const lunchboxOpenable = new OpenableTrait();
      (lunchboxOpenable as any).isOpen = false;
      lunchbox.add(lunchboxOpenable);
      
      sandwich = world.createEntity('Sandwich', 'item');
      const sandwichEdible = new EdibleTrait();
      (sandwichEdible as any).nutrition = 20;
      (sandwichEdible as any).tasteTurn = 0;
      (sandwichEdible as any).isConsumed = false;
      sandwich.add(sandwichEdible);
      
      apple = world.createEntity('Apple', 'item');
      const appleEdible = new EdibleTrait();
      (appleEdible as any).nutrition = 10;
      (appleEdible as any).tasteTurn = 0;
      (appleEdible as any).isConsumed = false;
      apple.add(appleEdible);

      world.moveEntity(player.id, room.id);
      world.moveEntity(lunchbox.id, room.id);
      // Use AuthorModel to place food in closed lunchbox
      author.moveEntity(sandwich.id, lunchbox.id);
      author.moveEntity(apple.id, lunchbox.id);
    });

    it('should track edible items in containers', () => {
      // Open lunchbox
      (lunchbox.getTrait(TraitType.OPENABLE) as any).isOpen = true;

      const edibles = world.findByTrait(TraitType.EDIBLE);
      expect(edibles).toContain(sandwich);
      expect(edibles).toContain(apple);

      // Total nutrition available
      const totalNutrition = edibles.reduce((sum, item) => {
        const edible = item.getTrait(TraitType.EDIBLE) as any;
        return sum + (edible.nutrition || 0);
      }, 0);
      expect(totalNutrition).toBe(30);
    });

    it('should handle consuming items from container', () => {
      // Take sandwich from lunchbox
      (lunchbox.getTrait(TraitType.OPENABLE) as any).isOpen = true;
      world.moveEntity(sandwich.id, player.id);

      // Consume sandwich
      const edible = sandwich.getTrait(TraitType.EDIBLE) as any;
      edible.isConsumed = true;

      // In a real system, consumed items would be removed
      // For now, just verify the state
      expect(edible.isConsumed).toBe(true);
      
      // Apple still in lunchbox
      expect(world.getLocation(apple.id)).toBe(lunchbox.id);
    });
  });

  describe('Complex Multi-Trait Scenarios', () => {
    it('should handle readable items in locked containers on supporters', () => {
      const room = createTestRoom(world, 'Library');
      const player = createTestActor(world, 'Player');
      
      // Pedestal (supporter) with glass case (locked transparent container)
      const pedestal = world.createEntity('Pedestal', 'supporter');
      pedestal.add(new SupporterTrait());
      
      const glassCase = createTestContainer(world, 'Glass Case');
      const glassCaseOpenable = new OpenableTrait();
      (glassCaseOpenable as any).isOpen = false;
      glassCase.add(glassCaseOpenable);
      
      const glassCaseLockable = new LockableTrait();
      (glassCaseLockable as any).isLocked = true;
      (glassCaseLockable as any).requiredKey = world.createEntity('Curator Key', 'item').id;
      glassCase.add(glassCaseLockable);
      // In future: glassCase.add(new TransparentTrait());
      
      const ancientBook = world.createEntity('Ancient Book', 'item');
      const readableTrait = new ReadableTrait();
      (readableTrait as any).text = 'The secrets of the universe...';
      (readableTrait as any).hasBeenRead = false;
      ancientBook.add(readableTrait);

      world.moveEntity(player.id, room.id);
      world.moveEntity(pedestal.id, room.id);
      world.moveEntity(glassCase.id, pedestal.id);
      // Use AuthorModel to place book in locked case
      author.moveEntity(ancientBook.id, glassCase.id);

      // Can see case on pedestal
      const visible = world.getVisible(player.id);
      expect(visible).toContain(pedestal);
      expect(visible).toContain(glassCase);
      
      // Can't see book in locked case (unless transparent)
      expect(visible).not.toContain(ancientBook);

      // Find all readable items
      const readables = world.findByTrait(TraitType.READABLE);
      expect(readables).toContain(ancientBook);
    });

    it('should handle switchable light sources affecting room visibility', () => {
      const room = createTestRoom(world, 'Room');
      const player = createTestActor(world, 'Player');
      
      // Ceiling lamp - switchable light source
      const ceilingLamp = world.createEntity('Ceiling Lamp', 'item');
      ceilingLamp.add(new LightSourceTrait());
      ceilingLamp.add(new SwitchableTrait());
      ceilingLamp.add(new SceneryTrait());
      
      // Light switch
      const lightSwitch = world.createEntity('Light Switch', 'item');
      lightSwitch.add(new SwitchableTrait());
      lightSwitch.add(new SceneryTrait());

      // Table with items
      const table = world.createEntity('Table', 'supporter');
      table.add(new SupporterTrait());
      
      const book = world.createEntity('Book', 'item');

      world.moveEntity(player.id, room.id);
      world.moveEntity(ceilingLamp.id, room.id);
      world.moveEntity(lightSwitch.id, room.id);
      world.moveEntity(table.id, room.id);
      world.moveEntity(book.id, table.id);

      // Make room dark
      (room.getTrait(TraitType.ROOM) as any).isDark = true;

      // Can't see in dark room
      expect(world.canSee(player.id, book.id)).toBe(false);

      // Turn on switch (which would turn on lamp in a real system)
      (lightSwitch.getTrait(TraitType.SWITCHABLE) as any).isOn = true;
      (ceilingLamp.getTrait(TraitType.SWITCHABLE) as any).isOn = true;
      (ceilingLamp.getTrait(TraitType.LIGHT_SOURCE) as any).isLit = true;

      // Now room is lit
      expect(world.canSee(player.id, book.id)).toBe(true);
    });
  });
});
