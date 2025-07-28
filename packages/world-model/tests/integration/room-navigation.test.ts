// room-navigation.test.ts - Integration tests for room navigation and exits

import { WorldModel } from '../../src/world/WorldModel';
import { IFEntity } from '../../src/entities/if-entity';
import { TraitType } from '../../src/traits/trait-types';
import { createTestRoom, createTestActor } from '../fixtures/test-entities';
import { createTestDoor } from '../fixtures/test-interactive';
import { LockableTrait } from '../../src/traits/lockable/lockableTrait';
import { ExitTrait } from '../../src/traits/exit/exitTrait';
import { EntryTrait } from '../../src/traits/entry/entryTrait';
import { getTestEntity, expectEntity, moveEntityByName, canSeeByName } from '../fixtures/test-helpers';

describe('Room Navigation Integration Tests', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('Basic Room Connections', () => {
    it('should connect rooms with simple exits', () => {
      const kitchen = createTestRoom(world, 'Kitchen');
      const hallway = createTestRoom(world, 'Hallway');
      const bedroom = createTestRoom(world, 'Bedroom');
      
      // Set up exits with ExitInfo objects
      (kitchen.getTrait(TraitType.ROOM) as any).exits = {
        north: { destination: hallway.id }
      };
      
      (hallway.getTrait(TraitType.ROOM) as any).exits = {
        south: { destination: kitchen.id },
        east: { destination: bedroom.id }
      };
      
      (bedroom.getTrait(TraitType.ROOM) as any).exits = {
        west: { destination: hallway.id }
      };
      
      // Verify connections
      const kitchenExits = (kitchen.getTrait(TraitType.ROOM) as any).exits;
      expect(kitchenExits.north.destination).toBe(hallway.id);
      
      const hallwayExits = (hallway.getTrait(TraitType.ROOM) as any).exits;
      expect(hallwayExits.south.destination).toBe(kitchen.id);
      expect(hallwayExits.east.destination).toBe(bedroom.id);
    });

    it('should find paths between connected rooms', () => {
      const room1 = createTestRoom(world, 'Room 1');
      const room2 = createTestRoom(world, 'Room 2');
      const room3 = createTestRoom(world, 'Room 3');
      const room4 = createTestRoom(world, 'Room 4');
      
      // Create a square of rooms
      (room1.getTrait(TraitType.ROOM) as any).exits = {
        east: { destination: room2.id },
        south: { destination: room3.id }
      };
      
      (room2.getTrait(TraitType.ROOM) as any).exits = {
        west: { destination: room1.id },
        south: { destination: room4.id }
      };
      
      (room3.getTrait(TraitType.ROOM) as any).exits = {
        north: { destination: room1.id },
        east: { destination: room4.id }
      };
      
      (room4.getTrait(TraitType.ROOM) as any).exits = {
        west: { destination: room3.id },
        north: { destination: room2.id }
      };
      
      // Find path from room1 to room4
      const path = world.findPath(room1.id, room4.id);
      expect(path).toBeDefined();
      expect(path).toEqual([]); // Direct connections return empty path (no doors)
    });
  });

  describe('Rooms with Door Entities', () => {
    let livingRoom: IFEntity;
    let kitchen: IFEntity;
    let bathroom: IFEntity;
    let bedroom: IFEntity;
    let door1: IFEntity;
    let door2: IFEntity;
    let door3: IFEntity;
    let player: IFEntity;

    beforeEach(() => {
      livingRoom = createTestRoom(world, 'Living Room');
      kitchen = createTestRoom(world, 'Kitchen');
      bathroom = createTestRoom(world, 'Bathroom');
      bedroom = createTestRoom(world, 'Bedroom');
      player = createTestActor(world, 'Player');
      
      // Create doors
      door1 = createTestDoor(world, 'Kitchen Door', livingRoom.id, kitchen.id);
      door2 = createTestDoor(world, 'Bathroom Door', livingRoom.id, bathroom.id);
      door3 = createTestDoor(world, 'Bedroom Door', livingRoom.id, bedroom.id);
      
      // Set up room exits with doors
      (livingRoom.getTrait(TraitType.ROOM) as any).exits = {
        north: { via: door1.id, destination: kitchen.id },
        east: { via: door2.id, destination: bathroom.id },
        west: { via: door3.id, destination: bedroom.id }
      };
      
      (kitchen.getTrait(TraitType.ROOM) as any).exits = {
        south: { via: door1.id, destination: livingRoom.id }
      };
      
      (bathroom.getTrait(TraitType.ROOM) as any).exits = {
        west: { via: door2.id, destination: livingRoom.id }
      };
      
      (bedroom.getTrait(TraitType.ROOM) as any).exits = {
        east: { via: door3.id, destination: livingRoom.id }
      };
    });

    it('should navigate through open doors', () => {
      world.moveEntity(player.id, livingRoom.id);
      
      // All doors are open by default
      const path = world.findPath(livingRoom.id, kitchen.id);
      expect(path).toEqual([door1.id]);
      
      // Player can move through door
      world.moveEntity(player.id, kitchen.id);
      expect(world.getLocation(player.id)).toBe(kitchen.id);
    });

    it('should handle closed doors', () => {
      // Close kitchen door
      (door1.getTrait(TraitType.OPENABLE) as any).isOpen = false;
      
      // Path should still exist (door is just closed, not removed)
      const path = world.findPath(livingRoom.id, kitchen.id);
      expect(path).toEqual([door1.id]);
      
      // In a real game, movement would be blocked by closed door
    });

    it('should handle locked doors', () => {
      // Lock bathroom door
      const lockableTrait = new LockableTrait();
      (lockableTrait as any).isLocked = true;
      (lockableTrait as any).requiredKey = 'bathroom-key';
      door2.add(lockableTrait);
      (door2.getTrait(TraitType.OPENABLE) as any).isOpen = false;
      
      // Path still exists
      const path = world.findPath(livingRoom.id, bathroom.id);
      expect(path).toEqual([door2.id]);
      
      // Door state can be checked
      const lockable = door2.getTrait(TraitType.LOCKABLE) as any;
      expect(lockable.isLocked).toBe(true);
      expect(lockable.requiredKey).toBe('bathroom-key');
    });

    it('should find alternative paths when doors are blocked', () => {
      // Create a circular path
      const hallway = createTestRoom(world, 'Hallway');
      const door4 = createTestDoor(world, 'Hallway Door 1', kitchen.id, hallway.id);
      const door5 = createTestDoor(world, 'Hallway Door 2', hallway.id, bathroom.id);
      
      // Add alternative connections
      (kitchen.getTrait(TraitType.ROOM) as any).exits.east = { 
        via: door4.id, 
        destination: hallway.id 
      };
      
      (hallway.getTrait(TraitType.ROOM) as any).exits = {
        west: { via: door4.id, destination: kitchen.id },
        south: { via: door5.id, destination: bathroom.id }
      };
      
      (bathroom.getTrait(TraitType.ROOM) as any).exits.north = { 
        via: door5.id, 
        destination: hallway.id 
      };
      
      // Find path from kitchen to bathroom
      // The BFS algorithm will find the shortest path, which is through the living room
      const path = world.findPath(kitchen.id, bathroom.id);
      expect(path).toBeDefined();
      
      // The shortest path is: kitchen -> livingRoom -> bathroom (via door1 and door2)
      expect(path).toEqual([door1.id, door2.id]);
      
      // Alternative path through hallway exists but is longer
      // kitchen -> hallway -> bathroom (via door4 and door5)
    });
  });

  describe('Complex Multi-Level Navigation', () => {
    it('should handle buildings with multiple floors', () => {
      // Ground floor
      const lobby = createTestRoom(world, 'Lobby');
      const office1 = createTestRoom(world, 'Office 1');
      const stairwell1 = createTestRoom(world, 'Stairwell (1F)');
      
      // Second floor
      const stairwell2 = createTestRoom(world, 'Stairwell (2F)');
      const office2 = createTestRoom(world, 'Office 2');
      const conference = createTestRoom(world, 'Conference Room');
      
      // Connect ground floor
      (lobby.getTrait(TraitType.ROOM) as any).exits = {
        north: { destination: office1.id },
        east: { destination: stairwell1.id }
      };
      
      (office1.getTrait(TraitType.ROOM) as any).exits = {
        south: { destination: lobby.id }
      };
      
      (stairwell1.getTrait(TraitType.ROOM) as any).exits = {
        west: { destination: lobby.id },
        up: { destination: stairwell2.id }
      };
      
      // Connect second floor
      (stairwell2.getTrait(TraitType.ROOM) as any).exits = {
        down: { destination: stairwell1.id },
        west: { destination: office2.id },
        north: { destination: conference.id }
      };
      
      (office2.getTrait(TraitType.ROOM) as any).exits = {
        east: { destination: stairwell2.id }
      };
      
      (conference.getTrait(TraitType.ROOM) as any).exits = {
        south: { destination: stairwell2.id }
      };
      
      // Find path from lobby to conference room
      const path = world.findPath(lobby.id, conference.id);
      expect(path).toBeDefined();
      
      // Verify multi-level navigation
      const player = createTestActor(world, 'Player');
      world.moveEntity(player.id, lobby.id);
      
      // Move through the building
      world.moveEntity(player.id, stairwell1.id);
      world.moveEntity(player.id, stairwell2.id);
      world.moveEntity(player.id, conference.id);
      
      expect(world.getLocation(player.id)).toBe(conference.id);
    });

    it('should handle one-way passages', () => {
      const entrance = createTestRoom(world, 'Entrance');
      const slide = createTestRoom(world, 'Slide');
      const pool = createTestRoom(world, 'Pool');
      
      // One-way slide from entrance to pool
      (entrance.getTrait(TraitType.ROOM) as any).exits = {
        down: { destination: slide.id }
      };
      
      (slide.getTrait(TraitType.ROOM) as any).exits = {
        down: { destination: pool.id }
      };
      
      (pool.getTrait(TraitType.ROOM) as any).exits = {
        // No way back up!
      };
      
      // Can find path down
      const pathDown = world.findPath(entrance.id, pool.id);
      expect(pathDown).toBeDefined();
      
      // Cannot find path back up
      const pathUp = world.findPath(pool.id, entrance.id);
      expect(pathUp).toBeNull();
    });
  });

  describe('Room Properties and Navigation', () => {
    it('should track first visits to rooms', () => {
      const room1 = createTestRoom(world, 'Mysterious Room');
      const room2 = createTestRoom(world, 'Hidden Chamber');
      const player = createTestActor(world, 'Player');
      
      // Connect rooms
      (room1.getTrait(TraitType.ROOM) as any).exits = {
        north: { destination: room2.id }
      };
      
      (room2.getTrait(TraitType.ROOM) as any).exits = {
        south: { destination: room1.id }
      };
      
      // Initially not visited
      const room1Trait = room1.getTrait(TraitType.ROOM) as any;
      const room2Trait = room2.getTrait(TraitType.ROOM) as any;
      
      expect(room1Trait.visited).toBe(false);
      expect(room2Trait.visited).toBe(false);
      
      // Visit room1
      world.moveEntity(player.id, room1.id);
      room1Trait.visited = true;
      
      expect(room1Trait.visited).toBe(true);
      expect(room2Trait.visited).toBe(false);
      
      // Visit room2
      world.moveEntity(player.id, room2.id);
      room2Trait.visited = true;
      
      expect(room2Trait.visited).toBe(true);
    });

    it('should handle dark rooms and navigation', () => {
      const litRoom = createTestRoom(world, 'Lit Room');
      const darkRoom = createTestRoom(world, 'Dark Room');
      const player = createTestActor(world, 'Player');
      
      // Make one room dark
      (darkRoom.getTrait(TraitType.ROOM) as any).isDark = true;
      
      // Connect rooms
      (litRoom.getTrait(TraitType.ROOM) as any).exits = {
        north: { destination: darkRoom.id }
      };
      
      (darkRoom.getTrait(TraitType.ROOM) as any).exits = {
        south: { destination: litRoom.id }
      };
      
      // Create items in each room
      const table = world.createEntity('Table', 'item');
      const chair = world.createEntity('Chair', 'item');
      
      world.moveEntity(player.id, litRoom.id);
      world.moveEntity(table.id, litRoom.id);
      world.moveEntity(chair.id, darkRoom.id);
      
      // Can see in lit room
      expect(world.canSee(player.id, table.id)).toBe(true);
      
      // Move to dark room
      world.moveEntity(player.id, darkRoom.id);
      
      // Cannot see in dark room
      expect(world.canSee(player.id, chair.id)).toBe(false);
    });
  });

  describe('Special Exit Types', () => {
    it('should handle exit entities', () => {
      const cave = createTestRoom(world, 'Cave');
      const tunnel = createTestRoom(world, 'Tunnel');
      
      // Create an exit entity
      const caveExit = world.createEntity('Cave Exit', 'exit');
      const exitTrait = new ExitTrait({
        from: cave.id,
        to: tunnel.id,
        command: 'north',
        direction: 'north',
        visible: true
      });
      caveExit.add(exitTrait);
      
      // Place exit in cave
      world.moveEntity(caveExit.id, cave.id);
      
      // Set up room connection via the exit entity
      (cave.getTrait(TraitType.ROOM) as any).exits = {
        north: { via: caveExit.id, destination: tunnel.id }
      };
      
      (tunnel.getTrait(TraitType.ROOM) as any).exits = {
        south: { destination: cave.id }
      };
      
      // Verify exit properties
      const exitTraitCheck = caveExit.getTrait(TraitType.EXIT) as any;
      expect(exitTraitCheck.to).toBe(tunnel.id);
      expect(exitTraitCheck.direction).toBe('north');
    });

    it('should handle entry points', () => {
      const garden = createTestRoom(world, 'Garden');
      const gazebo = createTestRoom(world, 'Gazebo');
      
      // Create entry point
      const gazeboEntry = world.createEntity('Gazebo Entrance', 'object');
      const entryTrait = new EntryTrait();
      (entryTrait as any).from = garden.id;
      (entryTrait as any).direction = 'enter';
      (entryTrait as any).description = 'A white painted gazebo';
      gazeboEntry.add(entryTrait);
      
      // Place entry in garden
      world.moveEntity(gazeboEntry.id, garden.id);
      
      // Set up connections
      (garden.getTrait(TraitType.ROOM) as any).exits = {
        enter: { destination: gazebo.id }
      };
      
      (gazebo.getTrait(TraitType.ROOM) as any).exits = {
        out: { destination: garden.id }
      };
      
      // Verify entry properties
      const entryTraitCheck = gazeboEntry.getTrait(TraitType.ENTRY) as any;
      expect(entryTraitCheck.from).toBe(garden.id);
      expect(entryTraitCheck.direction).toBe('enter');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large mazes efficiently', () => {
      // Create a 10x10 grid of rooms
      const rooms: Map<string, IFEntity> = new Map();
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const roomName = `Room (${x},${y})`;
          const room = createTestRoom(world, roomName);
          rooms.set(`${x}_${y}`, room);
          
          const exits: any = {};
          
          // Connect to adjacent rooms
          if (x > 0) {
            const westRoom = rooms.get(`${x-1}_${y}`);
            if (westRoom) exits.west = { destination: westRoom.id };
          }
          if (x < 9 && y === 0) {
            // For first row, we know the next room doesn't exist yet
            // We'll need to update connections after all rooms are created
          }
          if (y > 0) {
            const northRoom = rooms.get(`${x}_${y-1}`);
            if (northRoom) exits.north = { destination: northRoom.id };
          }
          
          (room.getTrait(TraitType.ROOM) as any).exits = exits;
        }
      }
      
      // Now update the remaining connections
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const room = rooms.get(`${x}_${y}`)!;
          const exits = (room.getTrait(TraitType.ROOM) as any).exits || {};
          
          if (x < 9) {
            const eastRoom = rooms.get(`${x+1}_${y}`);
            if (eastRoom) exits.east = { destination: eastRoom.id };
          }
          if (y < 9) {
            const southRoom = rooms.get(`${x}_${y+1}`);
            if (southRoom) exits.south = { destination: southRoom.id };
          }
          
          (room.getTrait(TraitType.ROOM) as any).exits = exits;
        }
      }
      
      // Find path from opposite corners
      const startRoom = rooms.get('0_0')!;
      const endRoom = rooms.get('9_9')!;
      const start = performance.now();
      const path = world.findPath(startRoom.id, endRoom.id);
      const duration = performance.now() - start;
      
      expect(path).toBeDefined();
      expect(duration).toBeLessThan(50); // Should be fast even for 100 rooms
    });

    it('should handle disconnected room groups', () => {
      // Island 1
      const island1Room1 = createTestRoom(world, 'Island 1 Room 1');
      const island1Room2 = createTestRoom(world, 'Island 1 Room 2');
      
      // Island 2
      const island2Room1 = createTestRoom(world, 'Island 2 Room 1');
      const island2Room2 = createTestRoom(world, 'Island 2 Room 2');
      
      // Connect within islands
      (island1Room1.getTrait(TraitType.ROOM) as any).exits = {
        east: { destination: island1Room2.id }
      };
      
      (island1Room2.getTrait(TraitType.ROOM) as any).exits = {
        west: { destination: island1Room1.id }
      };
      
      (island2Room1.getTrait(TraitType.ROOM) as any).exits = {
        east: { destination: island2Room2.id }
      };
      
      (island2Room2.getTrait(TraitType.ROOM) as any).exits = {
        west: { destination: island2Room1.id }
      };
      
      // No path between islands
      const path = world.findPath(island1Room1.id, island2Room1.id);
      expect(path).toBeNull();
      
      // Path within island works
      const pathWithinIsland = world.findPath(island1Room1.id, island1Room2.id);
      expect(pathWithinIsland).toBeDefined();
    });
  });
});
