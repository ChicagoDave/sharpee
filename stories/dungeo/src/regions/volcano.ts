/**
 * Volcano Region - The volcanic area with balloon puzzle
 *
 * 14 rooms: Egyptian Room, Glacier Room, Volcano View, Ruby Room, Lava Room,
 * Volcano Bottom, Wide Ledge, Narrow Ledge, Dusty Room, Library, Volcano Core,
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
  EnterableTrait,
  AuthorModel
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
  ledgeToMidair,
  BalloonReceptacleTrait,
  SafeTrait
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
  wideLedge: string;
  narrowLedge: string;
  dustyRoom: string;
  library: string;
  volcanoCore: string;
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
    'This is a room which looks like an Egyptian tomb. There is an ascending staircase in the room as well as doors, east and south.');

  const glacierRoom = createRoom(world, 'Glacier Room',
    'You are in a large room, with a passage to the north and a dark, forbidding staircase leading down to the east. On the west is a small passageway which opens up quickly to the south.');

  const volcanoView = createRoom(world, 'Volcano View',
    'You are on a ledge in the middle of a large volcano. Below you the volcano bottom can be seen and above is the rim of the volcano. A couple of ledges can be seen on the other side of the volcano; it appears that this ledge is intermediate in elevation between those on the other side. The exit from this room is to the east.');

  const rubyRoom = createRoom(world, 'Ruby Room',
    'This is a small chamber behind the remains of the Great Glacier. To the south and west are small passageways.');

  const lavaRoom = createRoom(world, 'Lava Room',
    'This is a small room, whose walls are formed by an old lava flow. There are exits here to the west and the south.');

  const volcanoBottom = createRoom(world, 'Volcano Bottom',
    'You are at the bottom of a large dormant volcano. High above you light may be seen entering from the cone of the volcano. The only exit here is to the north.');

  const wideLedge = createRoom(world, 'Wide Ledge',
    'You are on a wide ledge overlooking the volcano interior.');

  const narrowLedge = createRoom(world, 'Narrow Ledge',
    'You are on a narrow ledge overlooking the inside of an old dormant volcano. This ledge appears to be about in the middle between the floor below and the rim above. There is an exit here to the south.');

  const dustyRoom = createRoom(world, 'Dusty Room',
    'This is a dusty room that appears to have been abandoned long ago.');

  const library = createRoom(world, 'Library',
    'This is a room which must have been a large library, probably for the royal family. All of the shelves appear to have been gnawed to pieces by unfriendly gnomes. To the north is an exit.');

  // Balloon rooms (accessible when balloon rises)
  const volcanoNearWideLedge = createRoom(world, 'Volcano Near Wide Ledge',
    'You are in the middle of the volcano, near a wide ledge.', false);

  const volcanoNearViewingLedge = createRoom(world, 'Volcano Near Viewing Ledge',
    'You are in the middle of the volcano, near a viewing ledge.', false);

  const volcanoNearSmallLedge = createRoom(world, 'Volcano Near Small Ledge',
    'You are in the middle of the volcano, near a small ledge.', false);

  // VAIR1 - Volcano Core (MDL: ~100 feet above bottom, top visible)
  const volcanoCore = createRoom(world, 'Volcano Core',
    'You are about one hundred feet above the bottom of the volcano. The top of the volcano is clearly visible here.', false);

  // === Set up connections (verified against MDL dung.mud) ===

  // EGYPT: UP→ICY, S→LEDG3, E→CRAW1 (conditional, connected externally)
  setExits(egyptianRoom, {
    [Direction.UP]: glacierRoom.id,
    [Direction.SOUTH]: volcanoView.id,
    // EAST → Underground Rocky Crawl connected externally (conditional on coffin)
  });

  // ICY: N→STREA (connected externally), E→EGYPT, W→RUBYR (conditional on glacier melted)
  // WEST exit to Ruby Room is added when glacier is melted (glacier-throwing-interceptor.ts)
  setExits(glacierRoom, {
    // NORTH → Stream View connected externally via dam.ts connector
    [Direction.EAST]: egyptianRoom.id,
  });

  // LEDG3: E→EGYPT only (dead-end lookout, no balloon dock)
  setExits(volcanoView, {
    [Direction.EAST]: egyptianRoom.id,
  });
  // Blocked exits: DOWN and CROSS
  {
    const trait = volcanoView.get(RoomTrait);
    if (trait) {
      trait.blockedExits = {
        [Direction.DOWN]: "I wouldn't try that.",
      };
    }
  }

  // RUBYR: W→LAVA, S→ICY
  setExits(rubyRoom, {
    [Direction.WEST]: lavaRoom.id,
    [Direction.SOUTH]: glacierRoom.id,
  });

  // LAVA: S→VLBOT, W→RUBYR
  setExits(lavaRoom, {
    [Direction.SOUTH]: volcanoBottom.id,
    [Direction.WEST]: rubyRoom.id,
  });

  // VLBOT: N→LAVA only
  setExits(volcanoBottom, {
    [Direction.NORTH]: lavaRoom.id,
  });

  // LEDG4: S→SAFE only (+ balloon LAUNCH handled by balloon daemon)
  setExits(wideLedge, {
    [Direction.SOUTH]: dustyRoom.id,
  });
  // Blocked exits: DOWN
  {
    const trait = wideLedge.get(RoomTrait);
    if (trait) {
      trait.blockedExits = {
        [Direction.DOWN]: "It's a long way down.",
      };
    }
  }

  // LEDG2: S→LIBRA only (+ balloon LAUNCH handled by balloon daemon)
  setExits(narrowLedge, {
    [Direction.SOUTH]: library.id,
  });
  // Blocked exits: DOWN
  {
    const trait = narrowLedge.get(RoomTrait);
    if (trait) {
      trait.blockedExits = {
        [Direction.DOWN]: "I wouldn't jump from here.",
      };
    }
  }

  // SAFE (Dusty Room): N→LEDG4
  setExits(dustyRoom, {
    [Direction.NORTH]: wideLedge.id,
  });

  // LIBRA: N→LEDG2
  setExits(library, {
    [Direction.NORTH]: narrowLedge.id,
  });

  // Balloon shaft rooms (VAIR1-4) - connections depend on balloon position
  // These are "virtual" locations in the volcano shaft

  return {
    egyptianRoom: egyptianRoom.id,
    glacierRoom: glacierRoom.id,
    volcanoView: volcanoView.id,
    rubyRoom: rubyRoom.id,
    lavaRoom: lavaRoom.id,
    volcanoBottom: volcanoBottom.id,
    wideLedge: wideLedge.id,
    narrowLedge: narrowLedge.id,
    dustyRoom: dustyRoom.id,
    library: library.id,
    volcanoCore: volcanoCore.id,
    volcanoNearWideLedge: volcanoNearWideLedge.id,
    volcanoNearViewingLedge: volcanoNearViewingLedge.id,
    volcanoNearSmallLedge: volcanoNearSmallLedge.id,
  };
}

// === External connectors ===

export function connectVolcanoToUnderground(world: WorldModel, ids: VolcanoRoomIds, rockyCrawlId: string): void {
  // MDL: EGYPT EAST→CRAW1 (conditional on not carrying coffin - TODO: implement coffin check)
  const er = world.getEntity(ids.egyptianRoom);
  const rc = world.getEntity(rockyCrawlId);
  if (er) er.get(RoomTrait)!.exits[Direction.EAST] = { destination: rockyCrawlId };
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
    weight: 10,
    points: 3              // OFVAL from mdlzork_810722
  }));
  coffin.add(new TreasureTrait({
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
    aliases: ['ice', 'massive glacier', 'ice wall', 'wall of ice', 'mass of ice'],
    description: 'A mass of ice fills the western half of the room.',
    properName: false,
    article: 'a'
  }));
  glacier.add(new SceneryTrait());
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
    weight: 5,
    points: 5              // OFVAL from mdlzork_810722
  }));
  emerald.add(new TreasureTrait({
    trophyCaseValue: 10,   // OTVAL from mdlzork_810722
  }));
  world.moveEntity(emerald.id, roomId);

  // Safe - rusty box imbedded in wall (MDL: SAFE in SAFE room)
  // Not lockable — it's "rusted shut". Opened by brick explosion (Step 7).
  const safe = world.createEntity('safe', EntityType.ITEM);
  safe.add(new IdentityTrait({
    name: 'safe',
    aliases: ['safe', 'box', 'rusty box', 'old box'],
    description: 'Imbedded in the far wall is a rusty box. An oblong hole has been chipped out of the front of it.',
    properName: false,
    article: 'a'
  }));
  safe.add(new ContainerTrait({ capacity: { maxItems: 5 } }));
  safe.add(new OpenableTrait({ isOpen: false }));
  safe.add(new SceneryTrait());  // Imbedded in wall, can't take
  safe.add(new SafeTrait());    // Marker for opening/closing interceptors
  safe.attributes.rustedShut = true;   // Blocks OPEN — resolved by explosion
  safe.attributes.safeBlownOpen = false;
  world.moveEntity(safe.id, roomId);

  // Slot - oblong hole chipped out of the safe front (MDL: SSLOT)
  const slot = world.createEntity('slot', EntityType.SCENERY);
  slot.add(new IdentityTrait({
    name: 'hole',
    aliases: ['slot', 'hole', 'oblong hole'],
    description: 'An oblong hole has been chipped out of the front of the box.',
    properName: false,
    article: 'an'
  }));
  slot.add(new ContainerTrait({ capacity: { maxItems: 1 } }));
  slot.add(new OpenableTrait({ isOpen: true }));
  slot.add(new SceneryTrait());
  world.moveEntity(slot.id, roomId);

  // Lord Dimwit Flathead's Crown - treasure inside the safe (MDL: CROWN)
  const crown = world.createEntity('crown', EntityType.ITEM);
  crown.add(new IdentityTrait({
    name: 'crown',
    aliases: ['crown', 'gaudy crown', "lord dimwit's crown", 'flathead crown'],
    description: "The excessively gaudy crown of Lord Dimwit Flathead. It is encrusted with diamonds, rubies, and other precious gems, all in questionable taste.",
    properName: false,
    article: 'a',
    weight: 10,
    points: 15             // OFVAL from mdlzork_810722
  }));
  crown.add(new TreasureTrait({
    trophyCaseValue: 10      // OTVAL from mdlzork_810722
  }));
  const author = new AuthorModel(world.getDataStore(), world);
  author.moveEntity(crown.id, safe.id);

  // Warning card inside the safe (MDL: CARD)
  const card = world.createEntity('card', EntityType.ITEM);
  card.add(new IdentityTrait({
    name: 'card',
    aliases: ['card', 'warning', 'note', 'warning card'],
    description: 'A small card with printing on it.',
    properName: false,
    article: 'a',
    weight: 1
  }));
  card.add(new ReadableTrait({
    text: 'WARNING:\n  This room was constructed over very weak rock strata. Detonation of explosives in this room is strictly prohibited!\n    -- Frobozz Magic Cave Company\n       per M. Agrippa, foreman'
  }));
  author.moveEntity(card.id, safe.id);
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
    weight: 5,
    points: 15             // OFVAL from mdlzork_810722
  }));
  ruby.add(new TreasureTrait({
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
    weight: 2,
    points: 4              // OFVAL from mdlzork_810722
  }));
  stamp.add(new TreasureTrait({
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
      'vair1': roomIds.volcanoCore,
      'vair2': roomIds.volcanoNearSmallLedge,
      'vair3': roomIds.volcanoNearViewingLedge,
      'vair4': roomIds.volcanoNearWideLedge,
      'ledg2': roomIds.narrowLedge,
      'ledg3': roomIds.volcanoView,
      'ledg4': roomIds.wideLedge,
    }
  }));
  balloon.add(new BalloonStateTrait({
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
  receptacle.add(new BalloonReceptacleTrait({ balloonId: balloon.id }));
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

  // Hook 1 - on Narrow Ledge rock face (MDL: HOOK1 in LEDG2)
  const hook1 = world.createEntity('hook1', EntityType.SCENERY);
  hook1.add(new IdentityTrait({
    name: 'hook',
    aliases: ['metal hook', 'small hook'],
    description: 'A small hook is embedded in the rock face.',
    properName: false,
    article: 'a'
  }));
  hook1.add(new SceneryTrait());
  hook1.attributes.hookId = 'hook1';
  hook1.setMinimumScope(3, [roomIds.volcanoNearSmallLedge]);
  world.moveEntity(hook1.id, roomIds.narrowLedge);

  // Zorkmid coin - on Narrow Ledge floor (MDL: COIN in LEDG2)
  const coin = world.createEntity('zorkmid coin', EntityType.ITEM);
  coin.add(new IdentityTrait({
    name: 'zorkmid coin',
    aliases: ['coin', 'zorkmid', 'gold coin'],
    description: 'A large gold zorkmid coin. One side shows a portrait of Lord Dimwit Flathead; the other depicts the great underground dam.',
    properName: false,
    article: 'a',
    weight: 5,
    points: 10             // OFVAL from mdlzork_810722
  }));
  coin.add(new TreasureTrait({
    trophyCaseValue: 12       // OTVAL from mdlzork_810722
  }));
  coin.add(new ReadableTrait({
    text: 'GOLD ZORKMID -- In Frobs We Trust'
  }));
  world.moveEntity(coin.id, roomIds.narrowLedge);

  // Hook 2 - on Wide Ledge rock face (MDL: HOOK2 in LEDG4)
  const hook2 = world.createEntity('hook2', EntityType.SCENERY);
  hook2.add(new IdentityTrait({
    name: 'hook',
    aliases: ['metal hook', 'small hook'],
    description: 'A small hook is embedded in the rock face.',
    properName: false,
    article: 'a'
  }));
  hook2.add(new SceneryTrait());
  hook2.attributes.hookId = 'hook2';
  hook2.setMinimumScope(3, [roomIds.volcanoNearWideLedge]);
  world.moveEntity(hook2.id, roomIds.wideLedge);

  // Braided wire - for tethering balloon
  const wire = world.createEntity('braided wire', EntityType.SCENERY);
  wire.add(new IdentityTrait({
    name: 'braided wire',
    aliases: ['wire', 'braided rope', 'rope', 'cord', 'line', 'tether'],
    adjectives: ['braided'],
    description: 'A piece of braided wire dangles from the basket.',
    properName: false,
    article: 'a'
  }));
  wire.add(new SceneryTrait());
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
