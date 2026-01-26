/**
 * Well Room Region - The well puzzle area
 *
 * 11 rooms: Engravings Cave, Riddle Room, Pearl Room, Well Bottom, Top of Well,
 * Low Room, Machine Room, Dingy Closet, Tea Room, Pool Room, Cave
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
  NpcTrait
} from '@sharpee/world-model';
import { TreasureTrait } from '../traits';

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
  (riddleRoom as any).riddleSolved = false;

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

  const dingyCloset = createRoom(world, 'Dingy Closet',
    'This is a small, dingy closet. A door leads south.');

  const teaRoom = createRoom(world, 'Tea Room',
    'This appears to be a tea room. A passage leads north.');

  const poolRoom = createRoom(world, 'Pool Room',
    'This is a large room with a pool of water in the center.');

  const cave = createRoom(world, 'Cave',
    'This is a tiny cave with entrances west and north, and a dark, forbidding staircase leading down.');
  (cave as any).mirrorRubCount = 0; // Even = Hades, Odd = Atlantis

  // === Set up connections ===

  setExits(engravingsCave, {
    [Direction.SOUTHEAST]: riddleRoom.id,
    [Direction.DOWN]: riddleRoom.id,
    // N → Round Room connected externally
  });

  setExits(riddleRoom, {
    [Direction.UP]: engravingsCave.id,
    // E → Pearl Room (when riddle solved)
  });

  setExits(pearlRoom, { [Direction.WEST]: riddleRoom.id });

  setExits(wellBottom, { [Direction.UP]: topOfWell.id });

  setExits(topOfWell, {
    [Direction.DOWN]: wellBottom.id,
    [Direction.NORTH]: lowRoom.id,
  });

  setExits(lowRoom, {
    [Direction.SOUTH]: topOfWell.id,
    [Direction.EAST]: machineRoom.id,
    [Direction.WEST]: teaRoom.id,
  });

  setExits(machineRoom, { [Direction.WEST]: lowRoom.id });

  setExits(teaRoom, {
    [Direction.EAST]: lowRoom.id,
    [Direction.NORTH]: dingyCloset.id,
  });

  setExits(dingyCloset, { [Direction.SOUTH]: teaRoom.id });

  setExits(poolRoom, {
    // Connections TBD based on map
  });

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

  // Pool Room treasure
  createSilverChalice(world, roomIds.poolRoom);

  // Broom Closet treasure (pearl necklace)
  createPearlNecklace(world, roomIds.pearlRoom);

  // Riddle Room scenery
  createRiddleInscription(world, roomIds.riddleRoom);

  // Tea Room scenery and items
  createTeaRoomObjects(world, roomIds.teaRoom);

  // Low Room - Robot NPC
  createRobot(world, roomIds.lowRoom);

  // Machine Room - Triangular button
  createTriangularButton(world, roomIds.machineRoom);

  // Dingy Closet - Cage and white crystal sphere
  createDingyClosetObjects(world, roomIds.dingyCloset);
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
  (bucket as any).hasWater = false;
  world.moveEntity(bucket.id, startRoomId);
  return bucket;
}

// ============= Pool Room Objects =============

function createSilverChalice(world: WorldModel, roomId: string): IFEntity {
  const chalice = world.createEntity('silver chalice', EntityType.ITEM);
  chalice.add(new IdentityTrait({
    name: 'silver chalice',
    aliases: ['chalice', 'silver cup', 'cup', 'goblet'],
    description: 'A beautiful silver chalice, tarnished with age but still valuable. It bears an inscription in an ancient language.',
    properName: false,
    article: 'a',
    weight: 40
  }));
  chalice.add(new TreasureTrait({
    treasureId: 'silver-chalice',
    treasureValue: 10,     // OFVAL from mdlzork_810722
    trophyCaseValue: 10,   // OTVAL from mdlzork_810722
  }));
  world.moveEntity(chalice.id, roomId);
  return chalice;
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
    weight: 5
  }));
  necklace.add(new TreasureTrait({
    treasureId: 'pearl-necklace',
    treasureValue: 9,      // OFVAL from mdlzork_810722
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

  // "Eat Me" cake - Alice in Wonderland reference
  const eatMeCake = world.createEntity('eat-me cake', EntityType.ITEM);
  eatMeCake.add(new IdentityTrait({
    name: '"Eat Me" cake',
    aliases: ['eat me', 'eat-me', 'eat me cake', 'white cake'],
    description: 'A small cake with "Eat Me" written on it in frosting.',
    properName: false,
    article: 'an',
    weight: 5
  }));
  (eatMeCake as any).isEdible = true;
  (eatMeCake as any).onEatEffect = 'grow';
  world.moveEntity(eatMeCake.id, roomId);

  // "Drink Me" cake
  const drinkMeCake = world.createEntity('drink-me cake', EntityType.ITEM);
  drinkMeCake.add(new IdentityTrait({
    name: '"Drink Me" cake',
    aliases: ['drink me', 'drink-me', 'drink me cake', 'blue cake'],
    description: 'A small blue cake with "Drink Me" written on it.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  (drinkMeCake as any).isEdible = true;
  (drinkMeCake as any).onEatEffect = 'shrink';
  world.moveEntity(drinkMeCake.id, roomId);

  // Orange cake - just food
  const orangeCake = world.createEntity('orange cake', EntityType.ITEM);
  orangeCake.add(new IdentityTrait({
    name: 'orange cake',
    aliases: ['orange', 'orange colored cake', 'cake'],
    description: 'A small orange-colored cake. It looks delicious.',
    properName: false,
    article: 'an',
    weight: 5
  }));
  (orangeCake as any).isEdible = true;
  world.moveEntity(orangeCake.id, roomId);
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
  (button as any).isPushed = false;
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
  (cage as any).isLifted = false;
  world.moveEntity(cage.id, roomId);

  // White crystal sphere - treasure (6 take + 6 case = 12 total)
  const sphere = world.createEntity('white crystal sphere', EntityType.ITEM);
  sphere.add(new IdentityTrait({
    name: 'white crystal sphere',
    aliases: ['sphere', 'crystal sphere', 'white sphere', 'crystal ball', 'crystal'],
    description: 'A perfectly smooth sphere of white crystal. It glows with an inner light.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  sphere.add(new TreasureTrait({
    treasureId: 'white-crystal-sphere',
    treasureValue: 6,      // OFVAL from mdlzork_810722
    trophyCaseValue: 6,    // OTVAL from mdlzork_810722
  }));
  world.moveEntity(sphere.id, roomId);
}
