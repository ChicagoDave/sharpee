// Test helpers for working with the new ID system
import { WorldModel } from '../../src/world/WorldModel';
import { IFEntity } from '../../src/entities/if-entity';

/**
 * Gets an entity by name for test assertions
 */
export function getTestEntity(world: WorldModel, name: string): IFEntity | undefined {
  const id = world.getId(name);
  return id ? world.getEntity(id) : undefined;
}

/**
 * Asserts that an entity with the given name exists
 */
export function expectEntity(world: WorldModel, name: string): IFEntity {
  const entity = getTestEntity(world, name);
  if (!entity) {
    throw new Error(`Expected entity with name '${name}' to exist`);
  }
  return entity;
}

/**
 * Gets the location of an entity by name
 */
export function getEntityLocation(world: WorldModel, name: string): string | undefined {
  const entity = getTestEntity(world, name);
  return entity ? world.getLocation(entity.id) : undefined;
}

/**
 * Gets the name of an entity's location
 */
export function getEntityLocationName(world: WorldModel, name: string): string | undefined {
  const entity = getTestEntity(world, name);
  if (!entity) return undefined;
  
  const locationId = world.getLocation(entity.id);
  return locationId ? world.getName(locationId) : undefined;
}

/**
 * Moves an entity by name to a location by name
 */
export function moveEntityByName(world: WorldModel, entityName: string, locationName: string | null): boolean {
  const entityId = world.getId(entityName);
  const locationId = locationName ? world.getId(locationName) : null;
  
  if (!entityId) {
    throw new Error(`Entity '${entityName}' not found`);
  }
  
  if (locationName && !locationId) {
    throw new Error(`Location '${locationName}' not found`);
  }
  
  return world.moveEntity(entityId, locationId);
}

/**
 * Gets contents of a container by name
 */
export function getContentsByName(world: WorldModel, containerName: string): IFEntity[] {
  const container = expectEntity(world, containerName);
  return world.getContents(container.id);
}

/**
 * Checks if one entity can see another by name
 */
export function canSeeByName(world: WorldModel, observerName: string, targetName: string): boolean {
  const observer = getTestEntity(world, observerName);
  const target = getTestEntity(world, targetName);
  
  if (!observer || !target) return false;
  
  return world.canSee(observer.id, target.id);
}

/**
 * Helper to create a test scenario with consistent setup
 */
export interface TestScenario {
  world: WorldModel;
  player: IFEntity;
  rooms: Map<string, IFEntity>;
  items: Map<string, IFEntity>;
}

export function createTestScenario(): TestScenario {
  const world = new WorldModel();
  const rooms = new Map<string, IFEntity>();
  const items = new Map<string, IFEntity>();
  
  // Create a player (will always be 'a01' as first actor)
  const player = world.createEntity('Player', 'actor');
  world.setPlayer(player.id);
  
  return {
    world,
    player,
    rooms,
    items
  };
}

/**
 * Helper to add a room to a test scenario
 */
export function addRoom(scenario: TestScenario, name: string, description?: string): IFEntity {
  const room = scenario.world.createEntity(name, 'room');
  scenario.rooms.set(name, room);
  return room;
}

/**
 * Helper to add an item to a test scenario
 */
export function addItem(scenario: TestScenario, name: string, location?: string): IFEntity {
  const item = scenario.world.createEntity(name, 'item');
  scenario.items.set(name, item);
  
  if (location) {
    const locationEntity = scenario.rooms.get(location) || scenario.player;
    scenario.world.moveEntity(item.id, locationEntity.id);
  }
  
  return item;
}

/**
 * Helper to connect two rooms in a scenario
 */
export function connectRooms(
  scenario: TestScenario, 
  room1Name: string, 
  room2Name: string, 
  direction: string, 
  reverse?: string
): void {
  const room1 = scenario.rooms.get(room1Name);
  const room2 = scenario.rooms.get(room2Name);
  
  if (!room1 || !room2) {
    throw new Error('Both rooms must exist in scenario');
  }
  
  // Add exits
  const room1Trait = room1.getTrait('room') as any;
  const room2Trait = room2.getTrait('room') as any;
  
  room1Trait.exits = room1Trait.exits || {};
  room1Trait.exits[direction] = { destination: room2.id };
  
  if (reverse) {
    room2Trait.exits = room2Trait.exits || {};
    room2Trait.exits[reverse] = { destination: room1.id };
  }
}
