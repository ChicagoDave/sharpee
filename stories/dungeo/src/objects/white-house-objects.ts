/**
 * White House Objects - Items in the White House region
 *
 * Includes:
 * - Mailbox (openable container, starts closed)
 * - Leaflet (readable, inside mailbox)
 * - Front door (scenery, boarded up)
 * - Window (openable, slightly ajar)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ContainerTrait,
  OpenableTrait,
  ReadableTrait,
  SceneryTrait,
  EntityType
} from '@sharpee/world-model';

import { WhiteHouseRoomIds } from '../regions/white-house';

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
  world.moveEntity(leaflet.id, mailbox.id);

  // Create front door scenery in West of House
  const frontDoor = createFrontDoor(world);
  world.moveEntity(frontDoor.id, roomIds.westOfHouse);

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
    article: 'a'
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

  return window;
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
