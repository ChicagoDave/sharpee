// tests/fixtures/test-entities.ts
// Reusable test entity factories for the new ID system

import { WorldModel } from '../../src/world/WorldModel';
import { IFEntity } from '../../src/entities/if-entity';
import { TraitType } from '../../src/traits/trait-types';
import { IdentityTrait } from '../../src/traits/identity/identityTrait';
import { ContainerTrait } from '../../src/traits/container/containerTrait';
import { RoomTrait } from '../../src/traits/room/roomTrait';
import { OpenableTrait } from '../../src/traits/openable/openableTrait';
import { LockableTrait } from '../../src/traits/lockable/lockableTrait';
import { ActorTrait } from '../../src/traits/actor/actorTrait';
import { SceneryTrait } from '../../src/traits/scenery/sceneryTrait';
import { WearableTrait } from '../../src/traits/wearable/wearableTrait';
import { ClothingTrait } from '../../src/traits/clothing/clothingTrait';

// Container factory
export function createTestContainer(
  world: WorldModel,
  displayName: string,
  props: Record<string, any> = {}
): IFEntity {
  const container = world.createEntity(displayName, 'container');
  
  const containerTrait = new ContainerTrait();
  const identityTrait = new IdentityTrait();
  identityTrait.name = displayName;
  
  container.add(identityTrait);
  container.add(containerTrait);
  
  // Set container properties
  container.attributes.capacity = props.capacity || 10;
  container.attributes.open = props.open !== false; // Default to open
  
  return container;
}

// Room factory
export function createTestRoom(
  world: WorldModel,
  displayName: string,
  description?: string
): IFEntity {
  const room = world.createEntity(displayName, 'room');
  
  const roomTrait = new RoomTrait();
  const containerTrait = new ContainerTrait();
  const identity = new IdentityTrait();
  identity.name = displayName;
  identity.description = description || `You are in the ${displayName}.`;
  
  room.add(identity);
  room.add(roomTrait);
  room.add(containerTrait);
  
  // Set room attributes
  room.attributes.description = description || `You are in the ${displayName}.`;
  room.attributes.visited = false;
  room.attributes.lit = true; // Rooms are lit by default
  
  return room;
}

// Openable container factory
export function createTestOpenableContainer(
  world: WorldModel,
  displayName: string,
  isOpen: boolean = false
): IFEntity {
  const container = createTestContainer(world, displayName);
  
  const openableTrait = new OpenableTrait();
  (openableTrait as any).isOpen = isOpen;
  container.add(openableTrait);
  
  container.attributes.open = isOpen;
  
  return container;
}

// Lockable container factory
export function createTestLockableContainer(
  world: WorldModel,
  displayName: string,
  isLocked: boolean = true,
  keyId?: string
): IFEntity {
  const container = createTestOpenableContainer(world, displayName, false);
  
  const lockableTrait = new LockableTrait();
  (lockableTrait as any).isLocked = isLocked;
  if (keyId) {
    (lockableTrait as any).keyId = keyId;
  }
  container.add(lockableTrait);
  
  container.attributes.locked = isLocked;
  if (keyId) {
    container.attributes.keyId = keyId;
  }
  
  return container;
}

// Actor factory
export function createTestActor(
  world: WorldModel,
  displayName: string,
  isPlayer: boolean = false
): IFEntity {
  const actor = world.createEntity(displayName, 'actor');
  
  const actorTrait = new ActorTrait();
  (actorTrait as any).isPlayer = isPlayer || displayName === 'Player';
  
  const containerTrait = new ContainerTrait();
  const identity = new IdentityTrait();
  identity.name = displayName;
  
  actor.add(identity);
  actor.add(actorTrait);
  actor.add(containerTrait);
  
  // Set actor attributes
  actor.attributes.isPlayer = isPlayer || displayName === 'Player';
  actor.attributes.capacity = 10; // Default inventory size
  
  return actor;
}

// Item factory
export function createTestItem(
  world: WorldModel,
  displayName: string,
  props: Record<string, any> = {}
): IFEntity {
  const item = world.createEntity(displayName, 'item');
  
  const identity = new IdentityTrait();
  identity.name = displayName;
  item.add(identity);
  
  // Set item attributes
  item.attributes.portable = props.portable !== false;
  item.attributes.weight = props.weight || 1;
  Object.assign(item.attributes, props);
  
  return item;
}

// Key factory
export function createTestKey(
  world: WorldModel,
  displayName: string,
  keyId: string
): IFEntity {
  const key = createTestItem(world, displayName, {
    keyId: keyId
  });
  
  return key;
}

// Clothing factory
export function createTestClothing(
  world: WorldModel,
  displayName: string,
  props: Record<string, any> = {}
): IFEntity {
  const clothing = world.createEntity(displayName, 'item');
  
  const identity = new IdentityTrait();
  identity.name = displayName;
  clothing.add(identity);
  
  clothing.add(new ClothingTrait(props));
  
  // Add ContainerTrait so clothing can hold pockets
  clothing.add(new ContainerTrait());
  
  return clothing;
}

// Pocket factory - creates a container that's meant to be part of clothing
export function createTestPocket(
  world: WorldModel,
  displayName: string,
  capacity: number = 5
): IFEntity {
  const pocket = createTestContainer(world, displayName, { capacity });
  
  pocket.add(new SceneryTrait({ 
    cantTakeMessage: "The pocket is sewn into the garment."
  }));
  
  return pocket;
}

// Wearable item factory (for non-clothing wearables like jewelry)
export function createTestWearable(
  world: WorldModel,
  displayName: string,
  props: Record<string, any> = {}
): IFEntity {
  const wearable = world.createEntity(displayName, 'item');
  
  const identity = new IdentityTrait();
  identity.name = displayName;
  wearable.add(identity);
  
  wearable.add(new WearableTrait(props));
  
  return wearable;
}

// World setup helper
export interface TestWorld {
  world: WorldModel;
  player: IFEntity;
  startRoom: IFEntity;
}

export function createTestWorld(): TestWorld {
  const world = new WorldModel();
  const startRoom = createTestRoom(world, 'Test Room');
  const player = createTestActor(world, 'Player', true);
  
  // Place player in start room
  world.moveEntity(player.id, startRoom.id);
  
  // Set player as the world's player entity
  world.setPlayer(player.id);
  
  return {
    world,
    player,
    startRoom
  };
}

// Utility to create connected rooms
export function createConnectedRooms(
  world: WorldModel,
  names: string[],
  connections: Array<[number, number, string]> // [fromIndex, toIndex, direction]
): IFEntity[] {
  const rooms = names.map(name => createTestRoom(world, name));
  
  connections.forEach(([fromIdx, toIdx, direction]) => {
    const fromRoom = rooms[fromIdx];
    const toRoom = rooms[toIdx];
    
    const fromRoomTrait = fromRoom.get(TraitType.ROOM) as RoomTrait;
    if (fromRoomTrait) {
      // Set up exit
      fromRoomTrait.exits[direction] = { destination: toRoom.id };
      
      // Set up reverse direction if applicable
      const reverseDir = getOppositeDirection(direction);
      if (reverseDir) {
        const toRoomTrait = toRoom.get(TraitType.ROOM) as RoomTrait;
        if (toRoomTrait) {
          toRoomTrait.exits[reverseDir] = { destination: fromRoom.id };
        }
      }
    }
  });
  
  return rooms;
}

// Helper to get opposite direction
function getOppositeDirection(direction: string): string | null {
  const opposites: Record<string, string> = {
    'north': 'south',
    'south': 'north',
    'east': 'west',
    'west': 'east',
    'up': 'down',
    'down': 'up',
    'in': 'out',
    'out': 'in'
  };
  
  return opposites[direction] || null;
}
