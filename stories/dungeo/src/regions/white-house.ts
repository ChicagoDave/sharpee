/**
 * White House Region - Surface area rooms around the white house
 *
 * 4 rooms: West of House, North of House, South of House, Behind House
 *
 * This is the starting area of Dungeo, based on the classic Zork opening.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType,
  Direction,
  DirectionType,
  ContainerTrait,
  OpenableTrait,
  ReadableTrait,
  SceneryTrait,
  IGameEvent
} from '@sharpee/world-model';

// Simple ID generator for events
let eventCounter = 0;
function generateEventId(): string {
  return `evt-${Date.now()}-${++eventCounter}`;
}

export interface WhiteHouseRoomIds {
  westOfHouse: string;
  northOfHouse: string;
  southOfHouse: string;
  behindHouse: string;
}

// Helper functions

function createRoom(world: WorldModel, name: string, description: string, aliases: string[] = []): IFEntity {
  const room = world.createEntity(name, EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  room.add(new IdentityTrait({
    name,
    aliases,
    description,
    properName: true,
    article: ''
  }));
  return room;
}

function setExits(room: IFEntity, exits: Partial<Record<DirectionType, string>>): void {
  const trait = room.get(RoomTrait);
  if (trait) {
    for (const [dir, dest] of Object.entries(exits)) {
      trait.exits[dir as DirectionType] = { destination: dest! };
    }
  }
}

export function createWhiteHouseRegion(world: WorldModel): WhiteHouseRoomIds {
  // === Create all rooms ===

  const westOfHouse = createRoom(world, 'West of House',
    'This is an open field west of a white house with a boarded front door.',
    ['west of house', 'field', 'open field']);

  const northOfHouse = createRoom(world, 'North of House',
    'You are facing the north side of a white house. There is no door here, and all the windows are barred.',
    ['north of house', 'north side']);

  const southOfHouse = createRoom(world, 'South of House',
    'You are facing the south side of a white house. There is no door here, and all the windows are barred.',
    ['south of house', 'south side']);

  const behindHouse = createRoom(world, 'Behind House',
    'You are behind the white house. A path leads into the forest to the east. In one corner of the house there is a small window which is slightly ajar.',
    ['behind house', 'back of house', 'east of house']);

  const roomIds: WhiteHouseRoomIds = {
    westOfHouse: westOfHouse.id,
    northOfHouse: northOfHouse.id,
    southOfHouse: southOfHouse.id,
    behindHouse: behindHouse.id
  };

  // Connect rooms within this region
  connectWhiteHouseRooms(world, roomIds);

  return roomIds;
}

function connectWhiteHouseRooms(world: WorldModel, roomIds: WhiteHouseRoomIds): void {
  // West of House connections
  const westOfHouse = world.getEntity(roomIds.westOfHouse);
  if (westOfHouse) {
    setExits(westOfHouse, {
      [Direction.NORTH]: roomIds.northOfHouse,
      [Direction.SOUTH]: roomIds.southOfHouse,
      // West leads to forest (connected externally)
      // East is blocked by the boarded front door
    });
  }

  // North of House connections
  const northOfHouse = world.getEntity(roomIds.northOfHouse);
  if (northOfHouse) {
    setExits(northOfHouse, {
      [Direction.WEST]: roomIds.westOfHouse,
      [Direction.EAST]: roomIds.behindHouse,
      // North leads to forest path (connected externally)
    });
  }

  // South of House connections
  const southOfHouse = world.getEntity(roomIds.southOfHouse);
  if (southOfHouse) {
    setExits(southOfHouse, {
      [Direction.WEST]: roomIds.westOfHouse,
      [Direction.EAST]: roomIds.behindHouse,
      // South leads to forest (connected externally)
    });
  }

  // Behind House connections
  const behindHouse = world.getEntity(roomIds.behindHouse);
  if (behindHouse) {
    setExits(behindHouse, {
      [Direction.NORTH]: roomIds.northOfHouse,
      [Direction.SOUTH]: roomIds.southOfHouse,
      // West through the window into Kitchen (connected externally)
      // East leads to clearing (connected externally)
    });
  }
}

// ============================================================================
// OBJECTS
// ============================================================================

/**
 * Create all objects in the White House region
 */
export function createWhiteHouseObjects(world: WorldModel, roomIds: WhiteHouseRoomIds): void {
  // Create mailbox and leaflet in West of House
  const mailbox = createMailbox(world);
  const leaflet = createLeaflet(world);

  // Place mailbox in West of House
  world.moveEntity(mailbox.id, roomIds.westOfHouse);

  // Place leaflet inside mailbox
  // Need to temporarily open the mailbox to place items (canMoveEntity checks isOpen)
  const openable = mailbox.get(OpenableTrait);
  if (openable) {
    openable.isOpen = true;
    world.moveEntity(leaflet.id, mailbox.id);
    openable.isOpen = false;  // Close it again
  }

  // Create front door scenery in West of House
  const frontDoor = createFrontDoor(world);
  world.moveEntity(frontDoor.id, roomIds.westOfHouse);

  // Create welcome mat in West of House (front of door)
  const mat = createWelcomeMat(world);
  world.moveEntity(mat.id, roomIds.westOfHouse);

  // Create window in Behind House
  const window = createWindow(world);
  world.moveEntity(window.id, roomIds.behindHouse);

  // Create house scenery visible from all outdoor areas
  createHouseScenery(world, roomIds);
}

/**
 * Small mailbox - openable container that starts closed
 * "There is a small mailbox here."
 */
function createMailbox(world: WorldModel): IFEntity {
  const mailbox = world.createEntity('small mailbox', EntityType.CONTAINER);

  mailbox.add(new IdentityTrait({
    name: 'small mailbox',
    aliases: ['mailbox', 'box', 'mail box'],
    description: 'It\'s a small mailbox.',
    properName: false,
    article: 'a'
  }));

  mailbox.add(new ContainerTrait({
    capacity: {
      maxItems: 5
    }
  }));

  mailbox.add(new OpenableTrait({
    isOpen: false
  }));

  // Mailbox is scenery (can't be taken)
  mailbox.add(new SceneryTrait());

  return mailbox;
}

/**
 * Leaflet - readable item inside the mailbox
 * Classic Zork welcome text
 */
function createLeaflet(world: WorldModel): IFEntity {
  const leaflet = world.createEntity('leaflet', EntityType.ITEM);

  leaflet.add(new IdentityTrait({
    name: 'leaflet',
    aliases: ['paper', 'pamphlet', 'advertisement', 'ad'],
    description: 'A small leaflet with some writing on it.',
    properName: false,
    article: 'a',
    weight: 2
  }));

  leaflet.add(new ReadableTrait({
    text: `WELCOME TO DUNGEO!

DUNGEO is a game of adventure, danger, and low cunning. In it you will explore some of the most amazing territory ever seen by mortals. No computer should be without one!`,
    isReadable: true
  }));

  return leaflet;
}

/**
 * Front door - boarded up, cannot be opened
 */
function createFrontDoor(world: WorldModel): IFEntity {
  const door = world.createEntity('front door', EntityType.SCENERY);

  door.add(new IdentityTrait({
    name: 'front door',
    aliases: ['door', 'boarded door', 'entrance'],
    description: 'The door is boarded and you can\'t remove the boards.',
    properName: false,
    article: 'the'
  }));

  door.add(new SceneryTrait());

  // The door is boarded up - no OpenableTrait needed since it can't be opened
  // The description already explains why

  return door;
}

/**
 * Window - starts slightly ajar, can be opened fully
 * This will eventually be the entrance to the Kitchen
 */
function createWindow(world: WorldModel): IFEntity {
  const window = world.createEntity('window', EntityType.SCENERY);

  window.add(new IdentityTrait({
    name: 'window',
    aliases: ['small window', 'kitchen window'],
    description: 'The window is slightly ajar, but not enough to allow entry.',
    properName: false,
    article: 'the'
  }));

  window.add(new SceneryTrait());

  window.add(new OpenableTrait({
    isOpen: false  // Starts "slightly ajar" but not fully open
  }));

  // Handle window opening - custom message
  window.on = {
    'if.event.opened': (event: IGameEvent) => {
      // Update description to reflect open state
      const identity = window.get(IdentityTrait);
      if (identity) {
        identity.description = 'The window is open.';
      }
      // Return custom message for opening
      return [{
        id: generateEventId(),
        type: 'game.message',
        entities: { actor: event.entities.actor, target: window.id },
        data: { messageId: 'dungeo.window.opened' },
        timestamp: Date.now(),
        narrate: true
      }];
    }
  };

  return window;
}

/**
 * Welcome Mat - Can be taken, originally part of classic Zork
 * In the original game, moving the mat reveals a key underneath.
 */
function createWelcomeMat(world: WorldModel): IFEntity {
  const mat = world.createEntity('welcome mat', EntityType.ITEM);

  mat.add(new IdentityTrait({
    name: 'welcome mat',
    aliases: ['mat', 'doormat', 'door mat', 'rug'],
    description: 'A rubber mat saying "Welcome to Dungeon!"',
    properName: false,
    article: 'a',
    weight: 5
  }));

  return mat;
}

/**
 * Create the white house as scenery visible from the surrounding areas
 */
function createHouseScenery(world: WorldModel, roomIds: WhiteHouseRoomIds): void {
  // Create house scenery for each room where it's visible
  const houseRooms = [
    roomIds.westOfHouse,
    roomIds.northOfHouse,
    roomIds.southOfHouse,
    roomIds.behindHouse
  ];

  for (const roomId of houseRooms) {
    const house = world.createEntity('white house', EntityType.SCENERY);

    house.add(new IdentityTrait({
      name: 'white house',
      aliases: ['house', 'building'],
      description: 'The house is a beautiful colonial house which is painted white. It is clear that the owners must have been extremely wealthy.',
      properName: false,
      article: 'the'
    }));

    house.add(new SceneryTrait());

    world.moveEntity(house.id, roomId);
  }
}
