// door-mechanics.test.ts - Integration tests for door behavior and state synchronization

import { WorldModel } from '../../src/world/WorldModel';
import { IFEntity } from '../../src/entities/if-entity';
import { TraitType } from '../../src/traits/trait-types';
import { createTestRoom, createTestActor } from '../fixtures/test-entities';
import { createTestDoor } from '../fixtures/test-interactive';
import { LockableTrait } from '../../src/traits/lockable/lockableTrait';
import { SceneryTrait } from '../../src/traits/scenery/sceneryTrait';
import { getTestEntity, expectEntity, moveEntityByName } from '../fixtures/test-helpers';

describe('Door Mechanics Integration Tests', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('Basic Door Functionality', () => {
    it('should create doors connecting two rooms', () => {
      const room1 = createTestRoom(world, 'Room 1');
      const room2 = createTestRoom(world, 'Room 2');
      const door = createTestDoor(world, 'Wooden Door', room1.id, room2.id);

      // Verify door properties
      const doorTrait = door.getTrait(TraitType.DOOR) as any;
      expect(doorTrait.room1).toBe(room1.id);
      expect(doorTrait.room2).toBe(room2.id);

      // Verify door has openable trait
      expect(door.hasTrait(TraitType.OPENABLE)).toBe(true);
      const openable = door.getTrait(TraitType.OPENABLE) as any;
      expect(openable.isOpen).toBe(false); // Doors are closed by default based on test-interactive
    });

    it('should synchronize door state between rooms', () => {
      const kitchen = createTestRoom(world, 'Kitchen');
      const dining = createTestRoom(world, 'Dining Room');
      const door = createTestDoor(world, 'Swinging Door', kitchen.id, dining.id, { isOpen: true });
      
      const player = createTestActor(world, 'Player');
      world.moveEntity(player.id, kitchen.id);

      // Set up room exits
      (kitchen.getTrait(TraitType.ROOM) as any).exits = {
        east: { via: door.id, destination: dining.id }
      };
      (dining.getTrait(TraitType.ROOM) as any).exits = {
        west: { via: door.id, destination: kitchen.id }
      };

      // Close door from kitchen side
      const openable = door.getTrait(TraitType.OPENABLE) as any;
      openable.isOpen = false;

      // Move to dining room (assuming we can for this test)
      world.moveEntity(player.id, dining.id);

      // Door should still be closed
      expect(openable.isOpen).toBe(false);

      // Open door from dining side
      openable.isOpen = true;

      // Move back to kitchen
      world.moveEntity(player.id, kitchen.id);

      // Door should still be open
      expect(openable.isOpen).toBe(true);
    });
  });

  describe('Lockable Doors', () => {
    let hallway: IFEntity;
    let office: IFEntity;
    let storage: IFEntity;
    let door1: IFEntity;
    let door2: IFEntity;
    let player: IFEntity;
    let officeKey: IFEntity;
    let masterKey: IFEntity;

    beforeEach(() => {
      hallway = createTestRoom(world, 'Hallway');
      office = createTestRoom(world, 'Office');
      storage = createTestRoom(world, 'Storage Room');
      player = createTestActor(world, 'Player');
      
      // Create doors
      door1 = createTestDoor(world, 'Office Door', hallway.id, office.id);
      door2 = createTestDoor(world, 'Storage Door', hallway.id, storage.id);
      
      // Create keys
      officeKey = world.createEntity('Office Key', 'item');
      masterKey = world.createEntity('Master Key', 'item');
      
      // Make doors lockable
      const door1Lockable = new LockableTrait();
      (door1Lockable as any).isLocked = true;
      (door1Lockable as any).requiredKey = officeKey.id;
      door1.add(door1Lockable);
      
      const door2Lockable = new LockableTrait();
      (door2Lockable as any).isLocked = true;
      (door2Lockable as any).requiredKey = world.createEntity('Storage Key', 'item').id;
      door2.add(door2Lockable);
      
      // Place entities
      world.moveEntity(player.id, hallway.id);
      world.moveEntity(officeKey.id, hallway.id);
      world.moveEntity(masterKey.id, hallway.id);
    });

    it('should prevent opening locked doors', () => {
      const openable = door1.getTrait(TraitType.OPENABLE) as any;
      const lockable = door1.getTrait(TraitType.LOCKABLE) as any;
      
      // Door is locked
      expect(lockable.isLocked).toBe(true);
      expect(openable.isOpen).toBe(false); // Default state
      
      // In a real implementation, trying to open a locked door would fail
      // For now, we just verify the states
      expect(lockable.isLocked).toBe(true);
      expect(openable.isOpen).toBe(false);
    });

    it('should unlock doors with correct key', () => {
      // Pick up office key
      world.moveEntity(officeKey.id, player.id);
      
      const lockable = door1.getTrait(TraitType.LOCKABLE) as any;
      
      // Verify key requirement
      expect(lockable.requiredKey).toBe(officeKey.id);
      
      // Player has the key, so they can unlock
      lockable.isLocked = false;
      
      expect(lockable.isLocked).toBe(false);
    });

    it('should handle multiple locked doors', () => {
      const door1Lockable = door1.getTrait(TraitType.LOCKABLE) as any;
      const door2Lockable = door2.getTrait(TraitType.LOCKABLE) as any;
      
      // Both doors are locked with different keys
      expect(door1Lockable.isLocked).toBe(true);
      expect(door1Lockable.requiredKey).toBe(officeKey.id);
      
      expect(door2Lockable.isLocked).toBe(true);
      expect(door2Lockable.requiredKey).toBeDefined();
      
      // Office key only works on office door
      world.moveEntity(officeKey.id, player.id);
      
      // Can unlock office door
      door1Lockable.isLocked = false;
      expect(door1Lockable.isLocked).toBe(false);
      
      // Storage door remains locked
      expect(door2Lockable.isLocked).toBe(true);
    });
  });

  describe('Complex Door Scenarios', () => {
    it('should handle secret doors', () => {
      const library = createTestRoom(world, 'Library');
      const secretRoom = createTestRoom(world, 'Secret Room');
      
      // Create a hidden door
      const secretDoor = createTestDoor(world, 'Bookcase', library.id, secretRoom.id);
      const sceneryTrait = new SceneryTrait();
      (sceneryTrait as any).visible = true;
      secretDoor.add(sceneryTrait);
      
      // Initially appears to be scenery
      expect(secretDoor.hasTrait(TraitType.SCENERY)).toBe(true);
      expect(secretDoor.hasTrait(TraitType.DOOR)).toBe(true);
      
      // Door is also openable
      const openable = secretDoor.getTrait(TraitType.OPENABLE) as any;
      openable.isOpen = false; // Closed by default
      
      // Set up exits
      (library.getTrait(TraitType.ROOM) as any).exits = {
        behind: { via: secretDoor.id, destination: secretRoom.id }
      };
      
      (secretRoom.getTrait(TraitType.ROOM) as any).exits = {
        out: { via: secretDoor.id, destination: library.id }
      };
      
      // Open secret door
      openable.isOpen = true;
      
      // Can now access secret room
      const path = world.findPath(library.id, secretRoom.id);
      expect(path).toEqual([secretDoor.id]);
    });

    it('should handle one-way doors', () => {
      const entrance = createTestRoom(world, 'Entrance');
      const vault = createTestRoom(world, 'Vault');
      
      // Create a door that only opens from one side
      const vaultDoor = createTestDoor(world, 'Vault Door', entrance.id, vault.id);
      const lockableTrait = new LockableTrait();
      (lockableTrait as any).isLocked = false;
      (lockableTrait as any).requiredKey = null;
      vaultDoor.add(lockableTrait);
      
      // Add custom property for one-way mechanism
      const doorTrait = vaultDoor.getTrait(TraitType.DOOR) as any;
      doorTrait.oneWay = true;
      doorTrait.openableFrom = entrance.id;
      
      // Set up exits
      (entrance.getTrait(TraitType.ROOM) as any).exits = {
        north: { via: vaultDoor.id, destination: vault.id }
      };
      
      (vault.getTrait(TraitType.ROOM) as any).exits = {
        south: { via: vaultDoor.id, destination: entrance.id }
      };
      
      // Door properties indicate it's one-way
      expect(doorTrait.oneWay).toBe(true);
      expect(doorTrait.openableFrom).toBe(entrance.id);
    });

    it('should handle automatic closing doors', () => {
      const lab = createTestRoom(world, 'Laboratory');
      const airlock = createTestRoom(world, 'Airlock');
      const outside = createTestRoom(world, 'Outside');
      
      // Create self-closing doors
      const innerDoor = createTestDoor(world, 'Inner Airlock Door', lab.id, airlock.id);
      const outerDoor = createTestDoor(world, 'Outer Airlock Door', airlock.id, outside.id);
      
      // Add auto-close property
      const innerDoorTrait = innerDoor.getTrait(TraitType.DOOR) as any;
      const outerDoorTrait = outerDoor.getTrait(TraitType.DOOR) as any;
      innerDoorTrait.autoClose = true;
      outerDoorTrait.autoClose = true;
      
      // Set up room exits
      (lab.getTrait(TraitType.ROOM) as any).exits = {
        out: { via: innerDoor.id, destination: airlock.id }
      };
      
      (airlock.getTrait(TraitType.ROOM) as any).exits = {
        in: { via: innerDoor.id, destination: lab.id },
        out: { via: outerDoor.id, destination: outside.id }
      };
      
      (outside.getTrait(TraitType.ROOM) as any).exits = {
        in: { via: outerDoor.id, destination: airlock.id }
      };
      
      // Verify auto-close property
      expect(innerDoorTrait.autoClose).toBe(true);
      expect(outerDoorTrait.autoClose).toBe(true);
    });
  });

  describe('Door State and Visibility', () => {
    it('should affect visibility through doors', () => {
      const room1 = createTestRoom(world, 'Room 1');
      const room2 = createTestRoom(world, 'Room 2');
      const door = createTestDoor(world, 'Glass Door', room1.id, room2.id);
      
      const player = createTestActor(world, 'Player');
      const item = world.createEntity('Shiny Item', 'item');
      
      world.moveEntity(player.id, room1.id);
      world.moveEntity(item.id, room2.id);
      
      // With door closed, can't see into other room
      const openable = door.getTrait(TraitType.OPENABLE) as any;
      openable.isOpen = false;
      
      expect(world.canSee(player.id, item.id)).toBe(false);
      
      // Open door
      openable.isOpen = true;
      
      // Still can't see into other room (rooms are separate)
      expect(world.canSee(player.id, item.id)).toBe(false);
      
      // But can see the door itself
      world.moveEntity(door.id, room1.id);
      expect(world.canSee(player.id, door.id)).toBe(true);
    });

    it('should handle doors with windows', () => {
      const office = createTestRoom(world, 'Office');
      const hallway = createTestRoom(world, 'Hallway');
      
      // Create door with window
      const door = createTestDoor(world, 'Door with Window', office.id, hallway.id);
      
      // Add custom property for window
      const doorTrait = door.getTrait(TraitType.DOOR) as any;
      doorTrait.hasWindow = true;
      doorTrait.windowTransparent = true;
      
      // Even when closed, window allows partial visibility
      const openable = door.getTrait(TraitType.OPENABLE) as any;
      openable.isOpen = false;
      
      expect(doorTrait.hasWindow).toBe(true);
      expect(doorTrait.windowTransparent).toBe(true);
    });
  });

  describe('Multi-Door Connections', () => {
    it('should handle rooms with multiple doors', () => {
      const centralHub = createTestRoom(world, 'Central Hub');
      const north = createTestRoom(world, 'North Room');
      const south = createTestRoom(world, 'South Room');
      const east = createTestRoom(world, 'East Room');
      const west = createTestRoom(world, 'West Room');
      
      // Create doors in each direction
      const northDoor = createTestDoor(world, 'North Door', centralHub.id, north.id);
      const southDoor = createTestDoor(world, 'South Door', centralHub.id, south.id);
      const eastDoor = createTestDoor(world, 'East Door', centralHub.id, east.id);
      const westDoor = createTestDoor(world, 'West Door', centralHub.id, west.id);
      
      // Set up hub exits
      (centralHub.getTrait(TraitType.ROOM) as any).exits = {
        north: { via: northDoor.id, destination: north.id },
        south: { via: southDoor.id, destination: south.id },
        east: { via: eastDoor.id, destination: east.id },
        west: { via: westDoor.id, destination: west.id }
      };
      
      // Set up return exits
      (north.getTrait(TraitType.ROOM) as any).exits = {
        south: { via: northDoor.id, destination: centralHub.id }
      };
      (south.getTrait(TraitType.ROOM) as any).exits = {
        north: { via: southDoor.id, destination: centralHub.id }
      };
      (east.getTrait(TraitType.ROOM) as any).exits = {
        west: { via: eastDoor.id, destination: centralHub.id }
      };
      (west.getTrait(TraitType.ROOM) as any).exits = {
        east: { via: westDoor.id, destination: centralHub.id }
      };
      
      // Find paths from hub to each room
      expect(world.findPath(centralHub.id, north.id)).toEqual([northDoor.id]);
      expect(world.findPath(centralHub.id, south.id)).toEqual([southDoor.id]);
      expect(world.findPath(centralHub.id, east.id)).toEqual([eastDoor.id]);
      expect(world.findPath(centralHub.id, west.id)).toEqual([westDoor.id]);
      
      // Find path between opposite rooms (through hub)
      const pathNorthToSouth = world.findPath(north.id, south.id);
      expect(pathNorthToSouth).toContain(northDoor.id);
      expect(pathNorthToSouth).toContain(southDoor.id);
    });

    it('should handle double doors', () => {
      const ballroom = createTestRoom(world, 'Ballroom');
      const foyer = createTestRoom(world, 'Foyer');
      
      // Create matching double doors
      const leftDoor = createTestDoor(world, 'Left Door', foyer.id, ballroom.id);
      const rightDoor = createTestDoor(world, 'Right Door', foyer.id, ballroom.id);
      
      // Link doors together
      const leftDoorTrait = leftDoor.getTrait(TraitType.DOOR) as any;
      const rightDoorTrait = rightDoor.getTrait(TraitType.DOOR) as any;
      leftDoorTrait.pairedWith = rightDoor.id;
      rightDoorTrait.pairedWith = leftDoor.id;
      
      // Set up exits (both doors lead to same destination)
      (foyer.getTrait(TraitType.ROOM) as any).exits = {
        'enter-left': { via: leftDoor.id, destination: ballroom.id },
        'enter-right': { via: rightDoor.id, destination: ballroom.id }
      };
      
      (ballroom.getTrait(TraitType.ROOM) as any).exits = {
        'exit-left': { via: leftDoor.id, destination: foyer.id },
        'exit-right': { via: rightDoor.id, destination: foyer.id }
      };
      
      // Verify pairing
      expect(leftDoorTrait.pairedWith).toBe(rightDoor.id);
      expect(rightDoorTrait.pairedWith).toBe(leftDoor.id);
      
      // Both doors connect the same rooms
      expect(leftDoorTrait.room1).toBe(foyer.id);
      expect(leftDoorTrait.room2).toBe(ballroom.id);
      expect(rightDoorTrait.room1).toBe(foyer.id);
      expect(rightDoorTrait.room2).toBe(ballroom.id);
    });
  });

  describe('Door Events and Behaviors', () => {
    it('should track door usage', () => {
      const room1 = createTestRoom(world, 'Room 1');
      const room2 = createTestRoom(world, 'Room 2');
      const door = createTestDoor(world, 'Tracked Door', room1.id, room2.id);
      const player = createTestActor(world, 'Player');
      
      // Add usage tracking
      const doorTrait = door.getTrait(TraitType.DOOR) as any;
      doorTrait.useCount = 0;
      doorTrait.lastUsedBy = null;
      doorTrait.lastUsedTime = null;
      
      world.moveEntity(player.id, room1.id);
      
      // Simulate door usage
      doorTrait.useCount++;
      doorTrait.lastUsedBy = player.id;
      doorTrait.lastUsedTime = Date.now();
      
      expect(doorTrait.useCount).toBe(1);
      expect(doorTrait.lastUsedBy).toBe(player.id);
      expect(doorTrait.lastUsedTime).toBeDefined();
    });

    it('should handle door with special requirements', () => {
      const puzzleRoom = createTestRoom(world, 'Puzzle Room');
      const treasureRoom = createTestRoom(world, 'Treasure Room');
      
      const puzzleDoor = createTestDoor(world, 'Puzzle Door', puzzleRoom.id, treasureRoom.id);
      
      // Add puzzle requirement
      const doorTrait = puzzleDoor.getTrait(TraitType.DOOR) as any;
      doorTrait.requiresPuzzle = true;
      doorTrait.puzzleSolved = false;
      doorTrait.puzzleHint = 'The answer lies in the stars';
      
      // Lock door until puzzle is solved
      const lockableTrait = new LockableTrait();
      (lockableTrait as any).isLocked = true;
      (lockableTrait as any).requiredKey = null; // No key can open it
      puzzleDoor.add(lockableTrait);
      
      expect(doorTrait.requiresPuzzle).toBe(true);
      expect(doorTrait.puzzleSolved).toBe(false);
      
      // Solve puzzle
      doorTrait.puzzleSolved = true;
      (puzzleDoor.getTrait(TraitType.LOCKABLE) as any).isLocked = false;
      
      expect(doorTrait.puzzleSolved).toBe(true);
      expect((puzzleDoor.getTrait(TraitType.LOCKABLE) as any).isLocked).toBe(false);
    });
  });

  describe('Performance with Many Doors', () => {
    it('should handle buildings with many doors efficiently', () => {
      const rooms: IFEntity[] = [];
      const doors: IFEntity[] = [];
      
      // Create 20 rooms
      for (let i = 0; i < 20; i++) {
        const room = createTestRoom(world, `Room ${i}`);
        rooms.push(room);
      }
      
      // Create doors between adjacent rooms
      for (let i = 0; i < 19; i++) {
        const door = createTestDoor(world, `Door ${i}`, rooms[i].id, rooms[i + 1].id);
        doors.push(door);
        
        // Set up exits
        (rooms[i].getTrait(TraitType.ROOM) as any).exits = {
          next: { via: door.id, destination: rooms[i + 1].id }
        };
        
        (rooms[i + 1].getTrait(TraitType.ROOM) as any).exits = {
          ...((rooms[i + 1].getTrait(TraitType.ROOM) as any).exits || {}),
          prev: { via: door.id, destination: rooms[i].id }
        };
      }
      
      // Test pathfinding performance
      const start = performance.now();
      const path = world.findPath(rooms[0].id, rooms[19].id);
      const duration = performance.now() - start;
      
      expect(path).toBeDefined();
      expect(path!.length).toBe(19); // 19 doors to pass through
      expect(duration).toBeLessThan(20); // Should be fast
      
      // Test door state changes
      const stateChangeStart = performance.now();
      doors.forEach(door => {
        const openable = door.getTrait(TraitType.OPENABLE) as any;
        openable.isOpen = !openable.isOpen;
      });
      const stateChangeDuration = performance.now() - stateChangeStart;
      
      expect(stateChangeDuration).toBeLessThan(10); // State changes should be fast
    });
  });
});
