/**
 * Volcano Region - The volcanic area with balloon puzzle
 *
 * 14 rooms: Egyptian Room, Glacier Room, Volcano View, Ruby Room, Lava Room,
 * Volcano Bottom, Volcano Core, Wide Ledge, Narrow Ledge, Dusty Room, Library,
 * Volcano Near Wide Ledge, Volcano Near Viewing Ledge, Volcano Near Small Ledge
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType,
  Direction,
  DirectionType,
  SceneryTrait,
  ContainerTrait,
  OpenableTrait,
  ReadableTrait,
  VehicleTrait,
  EnterableTrait
} from '@sharpee/world-model';
import {
  TreasureTrait,
  InflatableTrait,
  BalloonStateTrait,
  BalloonPosition,
  isLedgePosition,
  isMidairPosition,
  nextPositionUp,
  nextPositionDown,
  ledgeToMidair
} from '../traits';

// Re-export BalloonState types for backward compatibility with existing imports
export type { BalloonPosition };
export { isLedgePosition, isMidairPosition, nextPositionUp, nextPositionDown, ledgeToMidair };

export interface VolcanoRoomIds {
  egyptianRoom: string;
  glacierRoom: string;
  volcanoView: string;
  rubyRoom: string;
  lavaRoom: string;
  volcanoBottom: string;
  volcanoCore: string;
  wideLedge: string;
  narrowLedge: string;
  dustyRoom: string;
  library: string;
  volcanoNearWideLedge: string;
  volcanoNearViewingLedge: string;
  volcanoNearSmallLedge: string;
}

function createRoom(world: WorldModel, name: string, description: string, isDark = true): IFEntity {
  const room = world.createEntity(name, EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark, isOutdoors: false }));
  room.add(new IdentityTrait({ name, description, properName: true, article: 'the' }));
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

export function createVolcanoRegion(world: WorldModel): VolcanoRoomIds {
  // === Create all rooms ===

  const egyptianRoom = createRoom(world, 'Egyptian Room',
    'This is a room which looks like an Egyptian tomb. Hieroglyphics cover the walls.');

  const glacierRoom = createRoom(world, 'Glacier Room',
    'You are in a room carved from ice. The walls sparkle with reflected light.');

  const volcanoView = createRoom(world, 'Volcano View',
    'You are on a ledge overlooking a vast volcanic crater. Molten lava bubbles far below.');

  const rubyRoom = createRoom(world, 'Ruby Room',
    'This is a small room with walls that glitter with embedded rubies.');

  const lavaRoom = createRoom(world, 'Lava Room',
    'You are in a room filled with the glow of molten lava. The heat is intense.');

  const volcanoBottom = createRoom(world, 'Volcano Bottom',
    'You are at the bottom of the volcano. Lava pools nearby.');

  const volcanoCore = createRoom(world, 'Volcano Core',
    'You are in the very core of the volcano. The heat is almost unbearable.');

  const wideLedge = createRoom(world, 'Wide Ledge',
    'You are on a wide ledge overlooking the volcano interior.');

  const narrowLedge = createRoom(world, 'Narrow Ledge',
    'You are on a narrow ledge. One wrong step could be fatal.');

  const dustyRoom = createRoom(world, 'Dusty Room',
    'This is a dusty room that appears to have been abandoned long ago.');

  const library = createRoom(world, 'Library',
    'This is an ancient library. Dusty books line the walls.');

  // Balloon rooms (accessible when balloon rises)
  const volcanoNearWideLedge = createRoom(world, 'Volcano Near Wide Ledge',
    'You are in the middle of the volcano, near a wide ledge.', false);

  const volcanoNearViewingLedge = createRoom(world, 'Volcano Near Viewing Ledge',
    'You are in the middle of the volcano, near a viewing ledge.', false);

  const volcanoNearSmallLedge = createRoom(world, 'Volcano Near Small Ledge',
    'You are in the middle of the volcano, near a small ledge.', false);

  // === Set up connections ===

  setExits(egyptianRoom, {
    // SE → Underground Rocky Crawl connected externally
    [Direction.WEST]: glacierRoom.id,
  });

  // Glacier blocks the north passage initially - see glacier-handler.ts
  // NORTH exit to Volcano View is added when glacier is melted
  setExits(glacierRoom, {
    [Direction.EAST]: egyptianRoom.id,
  });

  setExits(volcanoView, {
    [Direction.SOUTH]: glacierRoom.id,
    [Direction.DOWN]: wideLedge.id,
  });

  setExits(wideLedge, {
    [Direction.UP]: volcanoView.id,
    [Direction.WEST]: narrowLedge.id,
    [Direction.DOWN]: volcanoBottom.id,
  });

  setExits(narrowLedge, {
    [Direction.EAST]: wideLedge.id,
    [Direction.WEST]: dustyRoom.id,
  });

  setExits(dustyRoom, {
    [Direction.EAST]: narrowLedge.id,
    [Direction.NORTH]: library.id,
  });

  setExits(library, {
    [Direction.SOUTH]: dustyRoom.id,
  });

  setExits(volcanoBottom, {
    [Direction.UP]: wideLedge.id,
    [Direction.NORTH]: lavaRoom.id,
  });

  setExits(lavaRoom, {
    [Direction.SOUTH]: volcanoBottom.id,
    [Direction.NORTH]: volcanoCore.id,
  });

  setExits(volcanoCore, {
    [Direction.SOUTH]: lavaRoom.id,
    [Direction.EAST]: rubyRoom.id,
  });

  setExits(rubyRoom, {
    [Direction.WEST]: volcanoCore.id,
  });

  // Balloon rooms - connections depend on balloon position
  // These are "virtual" locations in the volcano shaft

  return {
    egyptianRoom: egyptianRoom.id,
    glacierRoom: glacierRoom.id,
    volcanoView: volcanoView.id,
    rubyRoom: rubyRoom.id,
    lavaRoom: lavaRoom.id,
    volcanoBottom: volcanoBottom.id,
    volcanoCore: volcanoCore.id,
    wideLedge: wideLedge.id,
    narrowLedge: narrowLedge.id,
    dustyRoom: dustyRoom.id,
    library: library.id,
    volcanoNearWideLedge: volcanoNearWideLedge.id,
    volcanoNearViewingLedge: volcanoNearViewingLedge.id,
    volcanoNearSmallLedge: volcanoNearSmallLedge.id,
  };
}

// === External connectors ===

export function connectVolcanoToUnderground(world: WorldModel, ids: VolcanoRoomIds, rockyCrawlId: string): void {
  const er = world.getEntity(ids.egyptianRoom);
  const rc = world.getEntity(rockyCrawlId);
  if (er) er.get(RoomTrait)!.exits[Direction.SOUTHEAST] = { destination: rockyCrawlId };
  if (rc) rc.get(RoomTrait)!.exits[Direction.NORTHWEST] = { destination: ids.egyptianRoom };
}

// ============================================================================
// OBJECTS - Created near their default room locations
// ============================================================================

// BalloonState types and helpers are now in balloon-state-trait.ts
// See re-exports at top of file for backward compatibility

export interface VolcanoObjectIds {
  balloonId: string;
  receptacleId: string;
  hook1Id: string;
  hook2Id: string;
}

/**
 * Create all objects in the Volcano region
 */
export function createVolcanoObjects(world: WorldModel, roomIds: VolcanoRoomIds): VolcanoObjectIds {
  // Egyptian Room objects (gold coffin treasure)
  createEgyptianRoomObjects(world, roomIds.egyptianRoom);

  // Glacier Room objects (glacier blocks north passage)
  createGlacierRoomObjects(world, roomIds.glacierRoom);

  // Dusty Room treasure (emerald)
  createDustyRoomObjects(world, roomIds.dustyRoom);

  // Ruby Room treasure
  createRubyRoomObjects(world, roomIds.rubyRoom);

  // Library objects (purple book with stamp)
  createLibraryObjects(world, roomIds.library);

  // Balloon and components at volcano bottom
  return createBalloonObjects(world, roomIds);
}

// ============= Egyptian Room Objects =============

function createEgyptianRoomObjects(world: WorldModel, roomId: string): void {
  // Gold coffin - treasure (not a container in mainframe Zork)
  const coffin = world.createEntity('gold coffin', EntityType.ITEM);
  coffin.add(new IdentityTrait({
    name: 'gold coffin',
    aliases: ['coffin', 'golden coffin', 'sarcophagus', 'casket'],
    description: 'The solid gold coffin used for the burial of Ramses II is here.',
    properName: false,
    article: 'a',
    weight: 10
  }));
  coffin.add(new TreasureTrait({
    treasureId: 'gold-coffin',
    treasureValue: 3,      // OFVAL from mdlzork_810722
    trophyCaseValue: 7,    // OTVAL from mdlzork_810722
  }));
  world.moveEntity(coffin.id, roomId);
}

// ============= Glacier Room Objects =============

function createGlacierRoomObjects(world: WorldModel, roomId: string): void {
  // Glacier - blocks north passage, melted by throwing lit torch
  const glacier = world.createEntity('glacier', EntityType.SCENERY);
  glacier.add(new IdentityTrait({
    name: 'glacier',
    aliases: ['ice', 'massive glacier', 'ice wall', 'wall of ice'],
    description: 'A massive wall of ice fills the northern part of the room, blocking any passage in that direction. It glistens with an inner cold light.',
    properName: false,
    article: 'a'
  }));
  glacier.add(new SceneryTrait());
  (glacier as any).isMelted = false;
  world.moveEntity(glacier.id, roomId);
}

// ============= Dusty Room Objects =============

function createDustyRoomObjects(world: WorldModel, roomId: string): void {
  // Large emerald - treasure (5 pts)
  const emerald = world.createEntity('large emerald', EntityType.ITEM);
  emerald.add(new IdentityTrait({
    name: 'large emerald',
    aliases: ['emerald', 'green gem', 'gem'],
    description: 'A large emerald of exceptional clarity. It glows with an inner green fire.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  emerald.add(new TreasureTrait({
    treasureId: 'large-emerald',
    treasureValue: 5,      // OFVAL from mdlzork_810722
    trophyCaseValue: 10,   // OTVAL from mdlzork_810722
  }));
  world.moveEntity(emerald.id, roomId);
}

// ============= Ruby Room Objects =============

function createRubyRoomObjects(world: WorldModel, roomId: string): void {
  // Ruby - treasure (15 take + 8 case = 23 total)
  const ruby = world.createEntity('ruby', EntityType.ITEM);
  ruby.add(new IdentityTrait({
    name: 'ruby',
    aliases: ['large ruby', 'red gem', 'gem', 'jewel'],
    description: 'This is an enormous ruby, the size of a robin\'s egg. It sparkles brilliantly in the light.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  ruby.add(new TreasureTrait({
    treasureId: 'ruby',
    treasureValue: 15,     // OFVAL from mdlzork_810722
    trophyCaseValue: 8,    // OTVAL from mdlzork_810722
  }));
  world.moveEntity(ruby.id, roomId);
}

// ============= Library Objects =============

function createLibraryObjects(world: WorldModel, roomId: string): void {
  // Purple book - contains Flathead stamp
  const book = world.createEntity('purple book', EntityType.ITEM);
  book.add(new IdentityTrait({
    name: 'purple book',
    aliases: ['book', 'purple volume', 'volume'],
    description: 'This is an old book bound in purple leather. The title reads "The History of the Great Underground Empire".',
    properName: false,
    article: 'a',
    weight: 5
  }));
  book.add(new ReadableTrait({
    text: `THE HISTORY OF THE GREAT UNDERGROUND EMPIRE

This volume chronicles the rise and fall of the Flathead dynasty. Lord Dimwit Flathead the Excessive was the most extravagant of the Flatheads, known for his grandiose projects including Flood Control Dam #3.

A stamp falls out of the book as you read it.`
  }));
  book.add(new ContainerTrait({ capacity: { maxItems: 5, maxWeight: 10 } }));
  world.moveEntity(book.id, roomId);

  // Stamp inside the book - treasure (4 take + 10 case = 14 total)
  const stamp = world.createEntity('stamp', EntityType.ITEM);
  stamp.add(new IdentityTrait({
    name: 'stamp',
    aliases: ['flathead stamp', 'postage stamp', 'lord dimwit flathead stamp'],
    description: 'This is a rare stamp depicting Lord Dimwit Flathead. It is quite valuable to collectors.',
    properName: false,
    article: 'a',
    weight: 2
  }));
  stamp.add(new TreasureTrait({
    treasureId: 'flathead-stamp',
    treasureValue: 4,      // OFVAL from mdlzork_810722
    trophyCaseValue: 10,   // OTVAL from mdlzork_810722
  }));
  world.moveEntity(stamp.id, book.id);
}

// ============= Balloon Objects =============

function createBalloonObjects(world: WorldModel, roomIds: VolcanoRoomIds): VolcanoObjectIds {
  // Balloon basket - main vehicle
  const balloon = world.createEntity('balloon', EntityType.ITEM);
  balloon.add(new IdentityTrait({
    name: 'balloon',
    aliases: ['wicker basket', 'basket', 'hot air balloon', 'balloon basket'],
    description: 'This is a large and extremely heavy wicker basket. An enormous cloth bag is draped over the side and is firmly attached to the basket. A metal receptacle is fastened to the center of the basket. Dangling from the basket is a piece of braided wire.',
    properName: false,
    article: 'a'
  }));
  balloon.add(new ContainerTrait({ capacity: { maxItems: 10, maxWeight: 100 } }));
  balloon.add(new EnterableTrait());
  balloon.add(new VehicleTrait({
    vehicleType: 'aircraft',
    transparent: true,
    blocksWalkingMovement: true,
    requiresExitBeforeLeaving: true,
    currentPosition: 'vlbot',
    isOperational: false,
    notOperationalReason: 'The balloon is not inflated.',
    positionRooms: {
      'vlbot': roomIds.volcanoBottom,
      'ledg2': roomIds.narrowLedge,
      'ledg3': roomIds.narrowLedge,
      'ledg4': roomIds.wideLedge,
    }
  }));
  balloon.add(new BalloonStateTrait({
    position: 'vlbot',
    tetheredTo: null,
    burningObject: null,
    daemonEnabled: true,
  }));
  world.moveEntity(balloon.id, roomIds.volcanoBottom);

  // Receptacle - brazier for burning objects
  const receptacle = world.createEntity('receptacle', EntityType.ITEM);
  receptacle.add(new IdentityTrait({
    name: 'receptacle',
    aliases: ['brazier', 'burner', 'fire holder'],
    description: 'This is a metal receptacle designed to hold burning objects. It has an opening that can be covered to control the heat.',
    properName: false,
    article: 'a'
  }));
  receptacle.add(new ContainerTrait({ capacity: { maxItems: 1, maxWeight: 10 }, enterable: false }));
  receptacle.add(new OpenableTrait({ isOpen: false }));
  receptacle.add(new SceneryTrait());
  world.moveEntity(receptacle.id, balloon.id);

  // Cloth bag - visual component
  const clothBag = world.createEntity('cloth bag', EntityType.SCENERY);
  clothBag.add(new IdentityTrait({
    name: 'cloth bag',
    aliases: ['silk bag', 'balloon bag', 'silk balloon', 'bag'],
    description: 'The cloth bag is draped over the basket.',
    properName: false,
    article: 'a'
  }));
  clothBag.add(new SceneryTrait());
  clothBag.add(new InflatableTrait({ isInflated: false }));
  world.moveEntity(clothBag.id, balloon.id);

  // Hook 1 - for tying rope at ledge positions
  const hook1 = world.createEntity('hook1', EntityType.SCENERY);
  hook1.add(new IdentityTrait({
    name: 'hook',
    aliases: ['metal hook', 'balloon hook'],
    description: 'A sturdy metal hook attached to the side of the basket.',
    properName: false,
    article: 'a'
  }));
  hook1.add(new SceneryTrait());
  (hook1 as any).hookId = 'hook1';
  world.moveEntity(hook1.id, balloon.id);

  // Hook 2
  const hook2 = world.createEntity('hook2', EntityType.SCENERY);
  hook2.add(new IdentityTrait({
    name: 'hook',
    aliases: ['metal hook', 'balloon hook'],
    description: 'A sturdy metal hook attached to the side of the basket.',
    properName: false,
    article: 'a'
  }));
  hook2.add(new SceneryTrait());
  (hook2 as any).hookId = 'hook2';
  world.moveEntity(hook2.id, balloon.id);

  // Braided wire - for tethering balloon
  const wire = world.createEntity('braided wire', EntityType.SCENERY);
  wire.add(new IdentityTrait({
    name: 'braided wire',
    aliases: ['wire', 'braided rope', 'rope', 'cord', 'line', 'tether'],
    description: 'A piece of braided wire dangles from the basket.',
    properName: false,
    article: 'a'
  }));
  wire.add(new SceneryTrait());
  (wire as any).tiedTo = null;
  world.moveEntity(wire.id, balloon.id);

  // Dead balloon template - spawned on crash
  const deadBalloon = world.createEntity('dead balloon', EntityType.SCENERY);
  deadBalloon.add(new IdentityTrait({
    name: 'dead balloon',
    aliases: ['crashed balloon', 'destroyed balloon', 'wreckage'],
    description: 'The remains of the balloon lie scattered about. The basket is smashed and the silk is torn beyond repair.',
    properName: false,
    article: 'a'
  }));
  deadBalloon.add(new SceneryTrait());

  return {
    balloonId: balloon.id,
    receptacleId: receptacle.id,
    hook1Id: hook1.id,
    hook2Id: hook2.id,
  };
}
