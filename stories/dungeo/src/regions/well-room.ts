/**
 * Well Room Region - The well puzzle area
 *
 * 12 rooms: Engravings Cave, Riddle Room, Pearl Room, Well Bottom, Top of Well,
 * Low Room, Machine Room, Dingy Closet, Tea Room, Posts Room, Pool Room, Cave
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
  VehicleTrait,
  EnterableTrait,
  ActorTrait,
  NpcTrait,
  EdibleTrait
} from '@sharpee/world-model';
import { TreasureTrait, RiddleRoomTrait, BucketTrait, SphereTrait } from '../traits';

export interface WellRoomIds {
  engravingsCave: string;
  riddleRoom: string;
  pearlRoom: string;
  wellBottom: string;
  topOfWell: string;
  lowRoom: string;
  machineRoom: string;
  dingyCloset: string;
  teaRoom: string;
  postsRoom: string;
  poolRoom: string;
  cave: string;
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

export function createWellRoomRegion(world: WorldModel): WellRoomIds {
  // === Create all rooms ===

  const engravingsCave = createRoom(world, 'Engravings Cave',
    'You are in a cave with strange engravings on the walls. A passage leads north, and stairs lead down.');

  const riddleRoom = createRoom(world, 'Riddle Room',
    `This is a room which is bare on all sides. There is an exit down. To the east is a great door made of stone. Above the stone, the following words are written: 'No man shall enter this room without solving this riddle:

What is tall as a house,
round as a cup,
and all the king's horses can't draw it up?'

(Reply via 'ANSWER "answer"')`);
  riddleRoom.add(new RiddleRoomTrait({ riddleSolved: false }));

  const pearlRoom = createRoom(world, 'Broom Closet',
    'This is a former broom closet. The exits are to the east and west.');

  const wellBottom = createRoom(world, 'Well Bottom',
    'You are at the bottom of a well. The walls are too smooth to climb.');

  const topOfWell = createRoom(world, 'Top of Well',
    'You are at the top of a well. A bucket hangs from a rope here.');

  const lowRoom = createRoom(world, 'Low Room',
    'This is a low room with passages leading in several directions.');

  const machineRoom = createRoom(world, 'Machine Room',
    'This is a large room filled with strange machinery. A small triangular button is set into the wall. A passage leads west.');
  // Add alias to distinguish from coal mine Machine Room (for GDT and disambiguation)
  const machineRoomIdentity = machineRoom.get(IdentityTrait);
  if (machineRoomIdentity) {
    machineRoomIdentity.aliases = ['button machine room', 'carousel machine room'];
  }

  const dingyCloset = createRoom(world, 'Dingy Closet',
    'This is a small, dingy closet. A door leads north.');

  const teaRoom = createRoom(world, 'Tea Room',
    'This is a small room with a table. On the table are cakes of various sorts. Passages lead to the west, northwest, and east.');

  const postsRoom = createRoom(world, 'Posts Room',
    'This is a room with very large and very tall wooden posts in each corner. The room is otherwise featureless.');

  const poolRoom = createRoom(world, 'Pool Room',
    'This is a large room, one half of which is depressed. There is a large leak in the ceiling through which brown colored goop is falling. The only exit is to the west.');

  const cave = createRoom(world, 'Cave',
    'This is a tiny cave with entrances west and north, and a dark, forbidding staircase leading down.');

  // === Set up connections (canonical from map-connections.md + MDL source) ===

  setExits(engravingsCave, {
    [Direction.SOUTHEAST]: riddleRoom.id,
    [Direction.DOWN]: riddleRoom.id,
    // N → Round Room connected externally
  });

  setExits(riddleRoom, {
    [Direction.UP]: engravingsCave.id,
    // E → Pearl Room (when riddle solved)
  });

  setExits(pearlRoom, {
    [Direction.WEST]: riddleRoom.id,
    [Direction.EAST]: wellBottom.id,
  });

  setExits(wellBottom, { [Direction.UP]: topOfWell.id });

  setExits(topOfWell, {
    [Direction.DOWN]: wellBottom.id,
    [Direction.EAST]: teaRoom.id,
  });

  setExits(lowRoom, {
    [Direction.SOUTHEAST]: teaRoom.id,
    [Direction.EAST]: machineRoom.id,
  });

  setExits(machineRoom, {
    [Direction.WEST]: lowRoom.id,
    [Direction.SOUTH]: dingyCloset.id,
  });

  setExits(teaRoom, {
    [Direction.WEST]: topOfWell.id,
    [Direction.NORTHWEST]: lowRoom.id,
    [Direction.EAST]: postsRoom.id,
  });

  setExits(dingyCloset, { [Direction.NORTH]: machineRoom.id });

  setExits(postsRoom, {
    [Direction.WEST]: teaRoom.id,
    [Direction.EAST]: poolRoom.id,
  });

  setExits(poolRoom, { [Direction.WEST]: postsRoom.id });

  setExits(cave, {
    // W → Mirror Room connected externally
    // D → Hades or Atlantis (depends on mirror state)
  });

  return {
    engravingsCave: engravingsCave.id,
    riddleRoom: riddleRoom.id,
    pearlRoom: pearlRoom.id,
    wellBottom: wellBottom.id,
    topOfWell: topOfWell.id,
    lowRoom: lowRoom.id,
    machineRoom: machineRoom.id,
    dingyCloset: dingyCloset.id,
    teaRoom: teaRoom.id,
    postsRoom: postsRoom.id,
    poolRoom: poolRoom.id,
    cave: cave.id,
  };
}

// === External connectors ===

export function connectWellRoomToRoundRoom(world: WorldModel, ids: WellRoomIds, roundRoomId: string): void {
  const ec = world.getEntity(ids.engravingsCave);
  const rr = world.getEntity(roundRoomId);
  if (ec) ec.get(RoomTrait)!.exits[Direction.NORTH] = { destination: roundRoomId };
  if (rr) {
    const trait = rr.get(RoomTrait)!;
    trait.exits[Direction.SOUTH] = { destination: ids.engravingsCave };
    trait.exits[Direction.NORTH] = { destination: ids.engravingsCave };
  }
}

export function connectCaveToHades(world: WorldModel, ids: WellRoomIds, hadesId: string): void {
  const cave = world.getEntity(ids.cave);
  if (cave) cave.get(RoomTrait)!.exits[Direction.DOWN] = { destination: hadesId };
}

// ============================================================================
// OBJECTS - Created near their default room locations
// ============================================================================

/**
 * Create all objects in the Well Room region
 */
export function createWellRoomObjects(world: WorldModel, roomIds: WellRoomIds): void {
  // Well scenery (in both top and bottom)
  createWellScenery(world, roomIds.topOfWell);
  createWellScenery(world, roomIds.wellBottom);

  // Bucket - starts at well bottom
  createBucket(world, roomIds.wellBottom, roomIds.topOfWell, roomIds.wellBottom);

  // Broom Closet treasure (pearl necklace)
  createPearlNecklace(world, roomIds.pearlRoom);

  // Riddle Room scenery
  createRiddleInscription(world, roomIds.riddleRoom);

  // Tea Room scenery and items
  createTeaRoomObjects(world, roomIds.teaRoom);

  // Store room IDs for cake handler to reference
  world.setStateValue('dungeo.tea_room.id', roomIds.teaRoom);
  world.setStateValue('dungeo.posts_room.id', roomIds.postsRoom);

  // Pool Room objects
  createPoolRoomObjects(world, roomIds.poolRoom);

  // Low Room - Robot NPC
  createRobot(world, roomIds.lowRoom);

  // Machine Room - Triangular button
  createTriangularButton(world, roomIds.machineRoom);

  // Dingy Closet - Cage and white crystal sphere
  createDingyClosetObjects(world, roomIds.dingyCloset);

  // Store dingy closet ID for cage puzzle handlers
  world.setStateValue('dungeo.cage.dingy_closet_id', roomIds.dingyCloset);

  // Low Room carousel starts INACTIVE — exits are deterministic before button push
  // (Canonical: MDL CAROUSEL-FLIP-FLAG starts FALSE; Low Room only randomizes when TRUE)
  world.setStateValue('dungeo.carousel.active', false);
}

// ============= Well Scenery =============

function createWellScenery(world: WorldModel, roomId: string): IFEntity {
  const well = world.createEntity('well', EntityType.ITEM);
  well.add(new IdentityTrait({
    name: 'well',
    aliases: ['deep well', 'stone well'],
    description: 'The well is constructed of ancient fitted stones. It descends into darkness, and you cannot see the bottom. A rope is attached to a windlass above the well.',
    properName: false,
    article: 'a'
  }));
  well.add(new SceneryTrait());
  world.moveEntity(well.id, roomId);
  return well;
}

// ============= Bucket =============

function createBucket(
  world: WorldModel,
  startRoomId: string,
  topOfWellId: string,
  wellBottomId: string
): IFEntity {
  const bucket = world.createEntity('bucket', EntityType.ITEM);
  bucket.add(new IdentityTrait({
    name: 'bucket',
    aliases: ['wooden bucket', 'pail'],
    description: 'A wooden bucket attached to a rope wound around a windlass.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  bucket.add(new ContainerTrait({
    capacity: { maxItems: 5, maxWeight: 20 }
  }));
  bucket.add(new EnterableTrait());
  bucket.add(new OpenableTrait({ isOpen: true }));
  bucket.add(new VehicleTrait({
    vehicleType: 'counterweight',
    blocksWalkingMovement: true,
    requiresExitBeforeLeaving: true,
    currentPosition: 'bottom',
    positionRooms: {
      'top': topOfWellId,
      'bottom': wellBottomId
    },
    isOperational: true
  }));
  bucket.add(new BucketTrait({ hasWater: false }));
  world.moveEntity(bucket.id, startRoomId);
  return bucket;
}

// ============= Pearl Room Objects =============

function createPearlNecklace(world: WorldModel, roomId: string): IFEntity {
  const necklace = world.createEntity('pearl necklace', EntityType.ITEM);
  necklace.add(new IdentityTrait({
    name: 'pearl necklace',
    aliases: ['necklace', 'pearls', 'string of pearls'],
    description: 'A pearl necklace with hundreds of large pearls. It must be worth a fortune.',
    properName: false,
    article: 'a',
    weight: 5,
    points: 9              // OFVAL from mdlzork_810722
  }));
  necklace.add(new TreasureTrait({
    trophyCaseValue: 5,    // OTVAL from mdlzork_810722
  }));
  world.moveEntity(necklace.id, roomId);
  return necklace;
}

// ============= Riddle Room Objects =============

function createRiddleInscription(world: WorldModel, roomId: string): IFEntity {
  const inscription = world.createEntity('riddle inscription', EntityType.ITEM);
  inscription.add(new IdentityTrait({
    name: 'riddle inscription',
    aliases: ['inscription', 'riddle', 'writing', 'carved writing', 'symbols'],
    description: 'The inscription reads: "What has roots as nobody sees, is taller than trees, up, up it goes, and yet never grows?"',
    properName: false,
    article: 'a'
  }));
  inscription.add(new SceneryTrait());
  world.moveEntity(inscription.id, roomId);
  return inscription;
}

// ============= Tea Room Objects =============

function createTeaRoomObjects(world: WorldModel, roomId: string): void {
  // Dusty table - scenery
  const table = world.createEntity('dusty table', EntityType.ITEM);
  table.add(new IdentityTrait({
    name: 'dusty table',
    aliases: ['table', 'tea table'],
    description: 'A small wooden table, covered in a thick layer of dust. It appears to have been used for serving tea long ago.',
    properName: false,
    article: 'a'
  }));
  table.add(new SceneryTrait());
  world.moveEntity(table.id, roomId);

  // Green paper - boat instructions
  const paper = world.createEntity('green paper', EntityType.ITEM);
  paper.add(new IdentityTrait({
    name: 'piece of paper',
    aliases: ['paper', 'green paper', 'note', 'piece of green paper'],
    description: 'A small piece of green paper with some writing on it.',
    properName: false,
    article: 'a',
    weight: 2
  }));
  (paper as any).readText = `
     ============================================
              FROBOZZ MAGIC BOAT COMPANY
     ============================================

     Hello, Sailor!

     Instructions for use:

     To Inflate: Apply pump to valve.
     To Deflate: Open valve.
     To Patch: Apply patch to boat.

     WARNING: Boat should be properly deflated before
     leaving water as sharp objects may puncture it.

     ============================================`;
  world.moveEntity(paper.id, roomId);

  // Eat-Me cake (ECAKE) - icing reads "Eat Me"
  // Eat in Tea Room → teleport to Posts Room
  const eatMeCake = world.createEntity('eat-me cake', EntityType.ITEM);
  eatMeCake.add(new IdentityTrait({
    name: 'eat-me cake',
    aliases: ['cake', 'eat me', 'eat-me', 'eat me cake', 'eat-me cake'],
    adjectives: ['eat-me'],
    description: 'A cake with "Eat Me" written on it in icing. You can make out a capital E on the icing.',
    properName: false,
    article: 'an',
    weight: 5
  }));
  eatMeCake.add(new EdibleTrait({ servings: 1, taste: 'tasty' }));
  eatMeCake.attributes.cakeType = 'eat-me';
  world.moveEntity(eatMeCake.id, roomId);

  // Blue-icing cake (BLICE) - icing reads "Enlarge"
  // Eat in Posts Room → teleport to Tea Room; Eat in Tea Room → crush death
  const blueCake = world.createEntity('blue cake', EntityType.ITEM);
  blueCake.add(new IdentityTrait({
    name: 'blue cake',
    aliases: ['cake', 'blue', 'blue-icing', 'blue icing cake', 'blue-icing cake'],
    adjectives: ['blue'],
    description: 'A cake with blue icing. You can make out a capital E on the icing.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  blueCake.add(new EdibleTrait({ servings: 1, taste: 'tasty' }));
  blueCake.attributes.cakeType = 'blue-icing';
  world.moveEntity(blueCake.id, roomId);

  // Red-icing cake (RDICE) - icing reads "Evaporate"
  // Eaten → tastes terrible; Thrown in Pool Room → dissolves pool, reveals spices
  const redCake = world.createEntity('red cake', EntityType.ITEM);
  redCake.add(new IdentityTrait({
    name: 'red cake',
    aliases: ['cake', 'red', 'red-icing', 'red icing cake', 'red-icing cake'],
    adjectives: ['red'],
    description: 'A cake with red icing. You can make out a capital E on the icing.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  redCake.add(new EdibleTrait({ servings: 1, taste: 'awful' }));
  redCake.attributes.cakeType = 'red-icing';
  world.moveEntity(redCake.id, roomId);

  // Orange-icing cake (ORICE) - icing reads "Explode"
  // Eaten or thrown → explosion death
  const orangeCake = world.createEntity('orange cake', EntityType.ITEM);
  orangeCake.add(new IdentityTrait({
    name: 'orange cake',
    aliases: ['cake', 'orange', 'orange-icing', 'orange icing cake', 'orange-icing cake'],
    adjectives: ['orange'],
    description: 'A cake with orange icing. You can make out a capital E on the icing.',
    properName: false,
    article: 'an',
    weight: 5
  }));
  orangeCake.add(new EdibleTrait({ servings: 1, effects: ['explode'] }));
  orangeCake.attributes.cakeType = 'orange-icing';
  world.moveEntity(orangeCake.id, roomId);
}

// ============= Pool Room Objects =============

function createPoolRoomObjects(world: WorldModel, roomId: string): void {
  // Pool of brown goop (scenery) - covers the spices
  // Dissolved when red-icing cake is thrown in Pool Room
  const pool = world.createEntity('pool of goop', EntityType.ITEM);
  pool.add(new IdentityTrait({
    name: 'pool of goop',
    aliases: ['pool', 'goop', 'brown goop', 'brown stuff', 'leak'],
    description: 'A pool of brown goop covers the depressed half of the room. It appears to be dripping from a leak in the ceiling.',
    properName: false,
    article: 'a'
  }));
  pool.add(new SceneryTrait());
  world.moveEntity(pool.id, roomId);

  // Tin of rare spices (SAFFR) - treasure (5 take + 5 case = 10 pts)
  // Canonical location: ALITR (Alice-Trapped) = Pool Room, not Atlantis Room.
  // Concealed under pool goop until red cake dissolves it.
  const saffron = world.createEntity('tin of spices', EntityType.ITEM);
  saffron.add(new IdentityTrait({
    name: 'tin of spices',
    aliases: ['tin', 'spices', 'saffron', 'rare spices', 'tin of rare spices'],
    description: 'A tin of rare spices. The aroma is exotic and enticing.',
    properName: false,
    article: 'a',
    weight: 8,
    concealed: true,  // Hidden until pool dissolved by red cake
    points: 5              // OFVAL from mdlzork_810722
  }));
  saffron.add(new TreasureTrait({
    trophyCaseValue: 5     // OTVAL from mdlzork_810722
  }));
  world.moveEntity(saffron.id, roomId);
  // Store IDs for the cake handler
  world.setStateValue('dungeo.pool_room.pool_id', pool.id);
  world.setStateValue('dungeo.pool_room.spices_id', saffron.id);
  world.setStateValue('dungeo.pool_room.room_id', roomId);
  world.setStateValue('dungeo.pool.dissolved', false);
}

// ============= Low Room Objects =============

function createRobot(world: WorldModel, roomId: string): IFEntity {
  const robot = world.createEntity('robot', EntityType.ACTOR);
  robot.add(new IdentityTrait({
    name: 'robot',
    aliases: ['robot', 'mechanical man', 'machine', 'mechanical device'],
    description: 'A metallic robot with a hinged panel on its chest. It appears to be waiting for instructions.',
    properName: false,
    article: 'a'
  }));
  robot.add(new ActorTrait({ isPlayer: false }));
  robot.add(new NpcTrait({
    behaviorId: 'robot',
    isHostile: false,
    canMove: true,
    customProperties: {
      following: false,
      buttonPushed: false,
      homeRoomId: roomId
    }
  }));
  world.moveEntity(robot.id, roomId);
  return robot;
}

// ============= Machine Room Objects =============

function createTriangularButton(world: WorldModel, roomId: string): IFEntity {
  const button = world.createEntity('triangular button', EntityType.ITEM);
  button.add(new IdentityTrait({
    name: 'triangular button',
    aliases: ['button', 'small button', 'triangle button'],
    description: 'A small triangular button set into the wall. It is too small for your finger to push.',
    properName: false,
    article: 'a'
  }));
  button.add(new SceneryTrait());
  world.moveEntity(button.id, roomId);
  return button;
}

// ============= Dingy Closet Objects =============

function createDingyClosetObjects(world: WorldModel, roomId: string): void {
  // Metal cage - contains white crystal sphere
  const cage = world.createEntity('metal cage', EntityType.ITEM);
  cage.add(new IdentityTrait({
    name: 'metal cage',
    aliases: ['cage', 'iron cage', 'wire cage'],
    description: 'A strange wire cage with bars too close together to reach through. Something glows beneath it.',
    properName: false,
    article: 'a'
  }));
  cage.add(new SceneryTrait());
  world.moveEntity(cage.id, roomId);

  // White crystal sphere - treasure (6 take + 6 case = 12 total)
  const sphere = world.createEntity('white crystal sphere', EntityType.ITEM);
  sphere.add(new IdentityTrait({
    name: 'white crystal sphere',
    aliases: ['sphere', 'crystal sphere', 'white sphere', 'crystal ball', 'crystal'],
    adjectives: ['white'],
    description: 'A perfectly smooth sphere of white crystal. It glows with an inner light.',
    properName: false,
    article: 'a',
    weight: 5,
    points: 6              // OFVAL from mdlzork_810722
  }));
  sphere.add(new TreasureTrait({
    trophyCaseValue: 6,    // OTVAL from mdlzork_810722
  }));
  sphere.add(new SphereTrait({
    dingyClosetId: roomId
  }));
  world.moveEntity(sphere.id, roomId);
}
