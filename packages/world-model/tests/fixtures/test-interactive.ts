// tests/fixtures/test-interactive.ts
// Test fixtures for interactive traits (openable, lockable, switchable, door)

import { IFEntity } from '../../src/entities/if-entity';
import { WorldModel } from '../../src/world/WorldModel';
import { ContainerTrait } from '../../src/traits/container/containerTrait';
import { OpenableTrait } from '../../src/traits/openable/openableTrait';
import { LockableTrait } from '../../src/traits/lockable/lockableTrait';
import { SwitchableTrait } from '../../src/traits/switchable/switchableTrait';
import { DoorTrait } from '../../src/traits/door/doorTrait';
import { RoomTrait } from '../../src/traits/room/roomTrait';

export interface DoorOptions {
  isOpen?: boolean;
  isLocked?: boolean;
  keyId?: string;
}

/**
 * Creates a test door between two rooms
 */
export function createTestDoor(
  world: WorldModel,
  doorName: string,
  room1Id: string,
  room2Id: string,
  options?: DoorOptions
): IFEntity {
  const door = world.createEntity(doorName, 'door');
  
  // Add door trait with room connections
  door.add(new DoorTrait({
    room1: room1Id,
    room2: room2Id
  }));
  
  // Add openable trait
  door.add(new OpenableTrait({
    isOpen: options?.isOpen ?? false
  }));
  
  // Add lockable trait if needed
  if (options?.keyId || options?.isLocked) {
    door.add(new LockableTrait({
      isLocked: options.isLocked ?? false,
      keyId: options.keyId
    }));
  }
  
  // Place door in first room by default
  world.moveEntity(door.id, room1Id);
  
  return door;
}

/**
 * Creates two connected rooms with a door between them
 */
export function createConnectedRoomsWithDoor(
  world: WorldModel,
  room1Name: string,
  room2Name: string,
  doorName: string,
  doorOptions?: DoorOptions
): { room1: IFEntity; room2: IFEntity; door: IFEntity } {
  // Create rooms
  const room1 = world.createEntity(room1Name, 'room');
  room1.add(new RoomTrait());
  room1.add(new ContainerTrait());
  
  const room2 = world.createEntity(room2Name, 'room');
  room2.add(new RoomTrait());
  room2.add(new ContainerTrait());
  
  // Create door
  const door = createTestDoor(world, doorName, room1.id, room2.id, doorOptions);
  
  // Set up exits in rooms
  const room1Trait = room1.getTrait('room') as any;
  const room2Trait = room2.getTrait('room') as any;
  
  room1Trait.exits = {
    east: { destination: room2.id, via: door.id }
  };
  
  room2Trait.exits = {
    west: { destination: room1.id, via: door.id }
  };
  
  return { room1, room2, door };
}

/**
 * Creates a key entity for lockable objects
 */
export function createTestKey(
  world: WorldModel,
  name: string
): IFEntity {
  const key = world.createEntity(name, 'item');
  key.attributes.isKey = true; // Mark as key in attributes
  return key;
}

// Alias for backwards compatibility
export { createConnectedRoomsWithDoor as createConnectedRooms };
