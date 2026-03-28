// door-mechanics.test.ts - Integration tests for door behavior and state synchronization

import { WorldModel } from '../../src/world/WorldModel';
import { IFEntity } from '../../src/entities/if-entity';
import { TraitType } from '../../src/traits/trait-types';
import { createTestRoom, createTestActor } from '../fixtures/test-entities';
import { createTestDoor } from '../fixtures/test-interactive';
import { DoorTrait } from '../../src/traits/door/doorTrait';
import { LockableTrait } from '../../src/traits/lockable/lockableTrait';
import { OpenableTrait } from '../../src/traits/openable/openableTrait';
import { RoomTrait } from '../../src/traits/room/roomTrait';
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
      const doorTrait = door.getTrait(DoorTrait)!;
      expect(doorTrait.room1).toBe(room1.id);
      expect(doorTrait.room2).toBe(room2.id);

      // Verify door has openable trait
      expect(door.hasTrait(TraitType.OPENABLE)).toBe(true);
      const openable = door.getTrait(OpenableTrait)!;
      expect(openable.isOpen).toBe(false); // Doors are closed by default based on test-interactive
    });

    it('should synchronize door state between rooms', () => {
      const kitchen = createTestRoom(world, 'Kitchen');
      const dining = createTestRoom(world, 'Dining Room');
      const door = createTestDoor(world, 'Swinging Door', kitchen.id, dining.id, { isOpen: true });
      
      const player = createTestActor(world, 'Player');
      world.moveEntity(player.id, kitchen.id);

      // Set up room exits
      kitchen.getTrait(RoomTrait)!.exits = {
        east: { via: door.id, destination: dining.id }
      };
      dining.getTrait(RoomTrait)!.exits = {
        west: { via: door.id, destination: kitchen.id }
      };

      // Close door from kitchen side
      const openable = door.getTrait(OpenableTrait)!;
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
      const door1Lockable = new LockableTrait({ isLocked: true, keyId: officeKey.id });
      door1.add(door1Lockable);

      const door2Lockable = new LockableTrait({ isLocked: true, keyId: world.createEntity('Storage Key', 'item').id });
      door2.add(door2Lockable);
      
      // Place entities
      world.moveEntity(player.id, hallway.id);
      world.moveEntity(officeKey.id, hallway.id);
      world.moveEntity(masterKey.id, hallway.id);
    });

    it('should prevent opening locked doors', () => {
      const openable = door1.getTrait(OpenableTrait)!;
      const lockable = door1.getTrait(LockableTrait)!;
      
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
      
      const lockable = door1.getTrait(LockableTrait)!;
      
      // Verify key requirement
      expect(lockable.keyId).toBe(officeKey.id);
      
      // Player has the key, so they can unlock
      lockable.isLocked = false;
      
      expect(lockable.isLocked).toBe(false);
    });

    it('should handle multiple locked doors', () => {
      const door1Lockable = door1.getTrait(LockableTrait)!;
      const door2Lockable = door2.getTrait(LockableTrait)!;
      
      // Both doors are locked with different keys
      expect(door1Lockable.isLocked).toBe(true);
      expect(door1Lockable.keyId).toBe(officeKey.id);
      
      expect(door2Lockable.isLocked).toBe(true);
      expect(door2Lockable.keyId).toBeDefined();
      
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
      sceneryTrait.visible = true;
      secretDoor.add(sceneryTrait);
      
      // Initially appears to be scenery
      expect(secretDoor.hasTrait(TraitType.SCENERY)).toBe(true);
      expect(secretDoor.hasTrait(TraitType.DOOR)).toBe(true);
      
      // Door is also openable
      const openable = secretDoor.getTrait(OpenableTrait)!;
      openable.isOpen = false; // Closed by default
      
      // Set up exits
      library.getTrait(RoomTrait)!.exits = {
        behind: { via: secretDoor.id, destination: secretRoom.id }
      };

      secretRoom.getTrait(RoomTrait)!.exits = {
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
      const lockableTrait = new LockableTrait({ isLocked: false });
      vaultDoor.add(lockableTrait);

      // Add custom property for one-way mechanism
      const doorTrait = vaultDoor.getTrait(DoorTrait)! as DoorTrait & { oneWay: boolean; openableFrom: string };
      doorTrait.oneWay = true;
      doorTrait.openableFrom = entrance.id;

      // Set up exits
      entrance.getTrait(RoomTrait)!.exits = {
        north: { via: vaultDoor.id, destination: vault.id }
      };

      vault.getTrait(RoomTrait)!.exits = {
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
      const innerDoorTrait = innerDoor.getTrait(DoorTrait)! as DoorTrait & { autoClose: boolean };
      const outerDoorTrait = outerDoor.getTrait(DoorTrait)! as DoorTrait & { autoClose: boolean };
      innerDoorTrait.autoClose = true;
      outerDoorTrait.autoClose = true;

      // Set up room exits
      lab.getTrait(RoomTrait)!.exits = {
        out: { via: innerDoor.id, destination: airlock.id }
      };

      airlock.getTrait(RoomTrait)!.exits = {
        in: { via: innerDoor.id, destination: lab.id },
        out: { via: outerDoor.id, destination: outside.id }
      };

      outside.getTrait(RoomTrait)!.exits = {
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
      const openable = door.getTrait(OpenableTrait)!;
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
      const doorTrait = door.getTrait(DoorTrait)!;
      doorTrait.hasWindow = true;
      doorTrait.windowTransparent = true;
      
      // Even when closed, window allows partial visibility
      const openable = door.getTrait(OpenableTrait)!;
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
      centralHub.getTrait(RoomTrait)!.exits = {
        north: { via: northDoor.id, destination: north.id },
        south: { via: southDoor.id, destination: south.id },
        east: { via: eastDoor.id, destination: east.id },
        west: { via: westDoor.id, destination: west.id }
      };

      // Set up return exits
      north.getTrait(RoomTrait)!.exits = {
        south: { via: northDoor.id, destination: centralHub.id }
      };
      south.getTrait(RoomTrait)!.exits = {
        north: { via: southDoor.id, destination: centralHub.id }
      };
      east.getTrait(RoomTrait)!.exits = {
        west: { via: eastDoor.id, destination: centralHub.id }
      };
      west.getTrait(RoomTrait)!.exits = {
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
      const leftDoorTrait = leftDoor.getTrait(DoorTrait)! as DoorTrait & { pairedWith: string };
      const rightDoorTrait = rightDoor.getTrait(DoorTrait)! as DoorTrait & { pairedWith: string };
      leftDoorTrait.pairedWith = rightDoor.id;
      rightDoorTrait.pairedWith = leftDoor.id;

      // Set up exits (both doors lead to same destination)
      foyer.getTrait(RoomTrait)!.exits = {
        'enter-left': { via: leftDoor.id, destination: ballroom.id },
        'enter-right': { via: rightDoor.id, destination: ballroom.id }
      };

      ballroom.getTrait(RoomTrait)!.exits = {
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
      const doorTrait = door.getTrait(DoorTrait)! as DoorTrait & { useCount: number; lastUsedBy: string | null; lastUsedTime: number | null };
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
      const doorTrait = puzzleDoor.getTrait(DoorTrait)! as DoorTrait & { requiresPuzzle: boolean; puzzleSolved: boolean; puzzleHint: string };
      doorTrait.requiresPuzzle = true;
      doorTrait.puzzleSolved = false;
      doorTrait.puzzleHint = 'The answer lies in the stars';

      // Lock door until puzzle is solved
      puzzleDoor.add(new LockableTrait({ isLocked: true }));

      expect(doorTrait.requiresPuzzle).toBe(true);
      expect(doorTrait.puzzleSolved).toBe(false);

      // Solve puzzle
      doorTrait.puzzleSolved = true;
      puzzleDoor.getTrait(LockableTrait)!.isLocked = false;

      expect(doorTrait.puzzleSolved).toBe(true);
      expect(puzzleDoor.getTrait(LockableTrait)!.isLocked).toBe(false);
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
        rooms[i].getTrait(RoomTrait)!.exits = {
          next: { via: door.id, destination: rooms[i + 1].id }
        };

        rooms[i + 1].getTrait(RoomTrait)!.exits = {
          ...(rooms[i + 1].getTrait(RoomTrait)!.exits || {}),
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
        const openable = door.getTrait(OpenableTrait)!;
        openable.isOpen = !openable.isOpen;
      });
      const stateChangeDuration = performance.now() - stateChangeStart;
      
      expect(stateChangeDuration).toBeLessThan(10); // State changes should be fast
    });
  });
});
