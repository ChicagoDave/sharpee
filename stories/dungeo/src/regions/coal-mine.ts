/**
 * Coal Mine Region - Deep underground mining area
 *
 * 26 rooms: Cold Passage, Steep Crawlway, Slide Room, Slide-1, Slide-2, Slide-3,
 * Slide Ledge, Sooty Room, Mine Entrance, Squeaky Room, Small Room, Shaft Room,
 * Wooden Tunnel, Smelly Room, Gas Room, Mine Maze 1-7, Ladder Top, Ladder Bottom,
 * Coal Mine Dead End, Timber Room, Bottom of Shaft, Machine Room
 *
 * Accessed from Mirror Room (Coal Mine state) via Cold Passage.
 * Features the slide to Cellar, mine maze, and machine room.
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
  SceneryTrait,
  ActorTrait,
  NpcTrait,
  EnterableTrait,
  OpenableTrait
} from '@sharpee/world-model';

import { BasketElevatorTrait, TreasureTrait } from '../traits';

export interface CoalMineRoomIds {
  // Mirror Room entrance area
  coldPassage: string;
  steepCrawlway: string;

  // Slide area
  slideRoom: string;
  slide1: string;
  slide2: string;
  slide3: string;
  slideLedge: string;
  sootyRoom: string;

  // Mine entrance area
  mineEntrance: string;
  squeakyRoom: string;
  smallRoom: string;
  shaftRoom: string;
  woodenTunnel: string;
  smellyRoom: string;
  gasRoom: string;

  // Mine maze
  mineMaze1: string;
  mineMaze2: string;
  mineMaze3: string;
  mineMaze4: string;
  mineMaze5: string;
  mineMaze6: string;
  mineMaze7: string;

  // Deep mine
  ladderTop: string;
  ladderBottom: string;
  coalMineDeadEnd: string;
  timberRoom: string;
  bottomOfShaft: string;
  machineRoom: string;
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

export function createCoalMineRegion(world: WorldModel): CoalMineRoomIds {
  // === Mirror Room entrance area ===

  const coldPassage = createRoom(world, 'Cold Passage',
    'You are in a cold, damp passage. The air here is noticeably colder than elsewhere in the underground. Passages lead in several directions.');

  const steepCrawlway = createRoom(world, 'Steep Crawlway',
    'You are in a steep, narrow crawlway. The passage slopes steeply here, making movement difficult.');

  // === Slide area ===

  const slideRoom = createRoom(world, 'Slide Room',
    'You are in a room with a steep slide leading down into darkness. The slide appears to be one-way - once you go down, there may be no coming back up. Passages lead north and east.');

  const slide1 = world.createEntity('Slide-1', EntityType.ROOM);
  slide1.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  slide1.add(new IdentityTrait({
    name: 'Slide',
    aliases: ['slide', 'chute'],
    description: 'You are on a steep slide, sliding downward. The walls are too smooth to grab onto. You continue to slide down...',
    properName: true,
    article: 'the'
  }));

  const slide2 = world.createEntity('Slide-2', EntityType.ROOM);
  slide2.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  slide2.add(new IdentityTrait({
    name: 'Slide',
    aliases: ['slide', 'chute'],
    description: 'You continue sliding down the steep chute. There is no way to stop or go back up.',
    properName: true,
    article: 'the'
  }));

  const slide3 = world.createEntity('Slide-3', EntityType.ROOM);
  slide3.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  slide3.add(new IdentityTrait({
    name: 'Slide',
    aliases: ['slide', 'chute'],
    description: 'You are at the bottom of a long slide. There is a small ledge to the east where you might be able to stop. Otherwise, you will continue sliding down into the depths below.',
    properName: true,
    article: 'the'
  }));

  const slideLedge = createRoom(world, 'Slide Ledge',
    'You are on a small ledge beside a steep slide. The ledge is barely wide enough to stand on. A passage leads south.');

  const sootyRoom = createRoom(world, 'Sooty Room',
    'You are in a room covered with a thick layer of coal dust and soot. Everything here is coated in black grime. A passage leads north.');

  // === Mine entrance area ===

  const mineEntrance = createRoom(world, 'Mine Entrance',
    'You are at the entrance to an old coal mine. Wooden support beams frame the entrance, and you can see passages leading in several directions. The air smells of dust and old coal.');

  const squeakyRoom = createRoom(world, 'Squeaky Room',
    'You are in a room with a wooden floor that squeaks loudly with every step you take. The floorboards are old and warped.');

  const smallRoom = createRoom(world, 'Small Room',
    'This is a small, cramped room carved out of the rock. A passage leads east.');

  const shaftRoom = createRoom(world, 'Shaft Room',
    'This is a small room near the top of a deep shaft. A rusty iron basket hangs from a chain here, suspended over the darkness below. An opening leads west.');

  const woodenTunnel = createRoom(world, 'Wooden Tunnel',
    'You are in a tunnel reinforced with wooden beams and supports. The timbers creak ominously as you pass through.');

  const smellyRoom = createRoom(world, 'Smelly Room',
    'You are in a room with a strong, unpleasant odor. The smell of natural gas is unmistakable. A hole in the floor leads down.');

  const gasRoom = createRoom(world, 'Gas Room',
    'This room has a strong, unpleasant smell. The air feels heavy and slightly nauseating. It would be very dangerous to bring an open flame here. Passages lead north and east.');
  (gasRoom as any).hasGas = true;

  // === Mine maze ===

  const mazeDesc = 'You are in a maze of twisty little passages, all alike.';

  const mineMaze1 = world.createEntity('Mine Maze-1', EntityType.ROOM);
  mineMaze1.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  mineMaze1.add(new IdentityTrait({ name: 'Maze', aliases: ['maze', 'mine maze'], description: mazeDesc, properName: false, article: 'a' }));

  const mineMaze2 = world.createEntity('Mine Maze-2', EntityType.ROOM);
  mineMaze2.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  mineMaze2.add(new IdentityTrait({ name: 'Maze', aliases: ['maze', 'mine maze'], description: mazeDesc, properName: false, article: 'a' }));

  const mineMaze3 = world.createEntity('Mine Maze-3', EntityType.ROOM);
  mineMaze3.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  mineMaze3.add(new IdentityTrait({ name: 'Maze', aliases: ['maze', 'mine maze'], description: mazeDesc, properName: false, article: 'a' }));

  const mineMaze4 = world.createEntity('Mine Maze-4', EntityType.ROOM);
  mineMaze4.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  mineMaze4.add(new IdentityTrait({ name: 'Maze', aliases: ['maze', 'mine maze'], description: mazeDesc, properName: false, article: 'a' }));

  const mineMaze5 = world.createEntity('Mine Maze-5', EntityType.ROOM);
  mineMaze5.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  mineMaze5.add(new IdentityTrait({ name: 'Maze', aliases: ['maze', 'mine maze'], description: mazeDesc, properName: false, article: 'a' }));

  const mineMaze6 = world.createEntity('Mine Maze-6', EntityType.ROOM);
  mineMaze6.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  mineMaze6.add(new IdentityTrait({ name: 'Maze', aliases: ['maze', 'mine maze'], description: mazeDesc, properName: false, article: 'a' }));

  const mineMaze7 = world.createEntity('Mine Maze-7', EntityType.ROOM);
  mineMaze7.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  mineMaze7.add(new IdentityTrait({ name: 'Maze', aliases: ['maze', 'mine maze'], description: mazeDesc, properName: false, article: 'a' }));

  // === Deep mine ===

  const ladderTop = createRoom(world, 'Ladder Top',
    'You are at the top of a rickety wooden ladder that descends into darkness. A passage leads north.');

  const ladderBottom = createRoom(world, 'Ladder Bottom',
    'You are at the bottom of a rickety wooden ladder. A passage leads south into an area with a strange smell. You can climb up the ladder.');

  const coalMineDeadEnd = world.createEntity('Coal Mine Dead End', EntityType.ROOM);
  coalMineDeadEnd.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  coalMineDeadEnd.add(new IdentityTrait({
    name: 'Dead End',
    aliases: ['dead end'],
    description: 'You have reached a dead end in the coal mine. The passage ends abruptly here.',
    properName: false,
    article: 'a'
  }));

  const timberRoom = createRoom(world, 'Timber Room',
    'This room is supported by massive wooden beams that creak ominously. The timber looks old but sturdy. Passages lead north, west, and south.');

  const bottomOfShaft = createRoom(world, 'Bottom of Shaft',
    'You are at the bottom of a deep shaft. The walls rise up into darkness above you. Passages lead east and northeast.');

  const machineRoom = createRoom(world, 'Machine Room',
    'This is a large room full of old mining equipment. In the center stands a massive coal-powered machine with a prominent slot. The walls are blackened with soot. A passage leads west.');

  // === Set up connections ===

  setExits(coldPassage, {
    [Direction.WEST]: slideRoom.id,
    [Direction.NORTH]: steepCrawlway.id,
    // E → Mirror Room connected externally
  });

  setExits(steepCrawlway, {
    [Direction.SOUTHWEST]: coldPassage.id,
    // S → Mirror Room connected externally
  });

  setExits(slideRoom, {
    [Direction.DOWN]: slide1.id,
    [Direction.EAST]: coldPassage.id,
    [Direction.NORTH]: mineEntrance.id,
  });

  setExits(slide1, { [Direction.DOWN]: slide2.id });
  setExits(slide2, { [Direction.DOWN]: slide3.id });
  setExits(slide3, { [Direction.EAST]: slideLedge.id });
  // D → Cellar connected externally

  setExits(slideLedge, {
    [Direction.UP]: slide2.id,
    [Direction.SOUTH]: sootyRoom.id,
  });

  setExits(sootyRoom, { [Direction.NORTH]: slideLedge.id });

  setExits(mineEntrance, {
    [Direction.SOUTH]: slideRoom.id,
    [Direction.NORTHWEST]: squeakyRoom.id,
    [Direction.NORTHEAST]: shaftRoom.id,
  });

  setExits(squeakyRoom, {
    [Direction.SOUTH]: mineEntrance.id,
    [Direction.WEST]: smallRoom.id,
  });

  setExits(smallRoom, { [Direction.EAST]: squeakyRoom.id });

  setExits(shaftRoom, {
    [Direction.WEST]: mineEntrance.id,
    [Direction.NORTH]: woodenTunnel.id,
  });

  setExits(woodenTunnel, {
    [Direction.SOUTH]: shaftRoom.id,
    [Direction.WEST]: smellyRoom.id,
    [Direction.NORTHEAST]: mineMaze1.id,
  });

  setExits(smellyRoom, {
    [Direction.EAST]: woodenTunnel.id,
    [Direction.DOWN]: gasRoom.id,
  });

  setExits(gasRoom, { [Direction.UP]: smellyRoom.id });

  // Mine maze connections - per 1981 MDL source: docs/dungeon-81/mdlzork_810722/original_source/dung.355
  // MINE1: N→MINE4, SW→MINE2, E→TUNNE
  setExits(mineMaze1, {
    [Direction.NORTH]: mineMaze4.id,
    [Direction.SOUTHWEST]: mineMaze2.id,
    [Direction.EAST]: woodenTunnel.id,
  });

  // MINE2: S→MINE1, W→MINE5, UP→MINE3, NE→MINE4
  setExits(mineMaze2, {
    [Direction.SOUTH]: mineMaze1.id,
    [Direction.WEST]: mineMaze5.id,
    [Direction.UP]: mineMaze3.id,
    [Direction.NORTHEAST]: mineMaze4.id,
  });

  // MINE3: W→MINE2, NE→MINE5, E→MINE5
  setExits(mineMaze3, {
    [Direction.WEST]: mineMaze2.id,
    [Direction.NORTHEAST]: mineMaze5.id,
    [Direction.EAST]: mineMaze5.id,
  });

  // MINE4: UP→MINE5, NE→MINE6, S→MINE1, W→MINE2
  setExits(mineMaze4, {
    [Direction.UP]: mineMaze5.id,
    [Direction.NORTHEAST]: mineMaze6.id,
    [Direction.SOUTH]: mineMaze1.id,
    [Direction.WEST]: mineMaze2.id,
  });

  // MINE5: DOWN→MINE6, N→MINE7, W→MINE2, S→MINE3, UP→MINE3, E→MINE4
  setExits(mineMaze5, {
    [Direction.DOWN]: mineMaze6.id,
    [Direction.NORTH]: mineMaze7.id,
    [Direction.WEST]: mineMaze2.id,
    [Direction.SOUTH]: mineMaze3.id,
    [Direction.UP]: mineMaze3.id,
    [Direction.EAST]: mineMaze4.id,
  });

  // MINE6: SE→MINE4, UP→MINE5, NW→MINE7
  setExits(mineMaze6, {
    [Direction.SOUTHEAST]: mineMaze4.id,
    [Direction.UP]: mineMaze5.id,
    [Direction.NORTHWEST]: mineMaze7.id,
  });

  // MINE7: E→MINE1, W→MINE5, DOWN→TLADD, S→MINE6
  setExits(mineMaze7, {
    [Direction.EAST]: mineMaze1.id,
    [Direction.WEST]: mineMaze5.id,
    [Direction.DOWN]: ladderTop.id,
    [Direction.SOUTH]: mineMaze6.id,
  });

  // Deep mine connections
  // TLADD (Ladder Top) connects UP to MINE7 (since MINE7 has DOWN→TLADD)
  setExits(ladderTop, {
    [Direction.UP]: mineMaze7.id,
    [Direction.DOWN]: ladderBottom.id,
  });

  setExits(ladderBottom, {
    [Direction.UP]: ladderTop.id,
    [Direction.SOUTH]: timberRoom.id,
    [Direction.NORTHEAST]: coalMineDeadEnd.id,
  });

  setExits(coalMineDeadEnd, { [Direction.SOUTH]: ladderBottom.id });

  setExits(timberRoom, {
    [Direction.NORTH]: ladderBottom.id,
    [Direction.SOUTHWEST]: bottomOfShaft.id,
  });

  setExits(bottomOfShaft, {
    [Direction.EAST]: machineRoom.id,
    [Direction.NORTHEAST]: timberRoom.id,
  });

  setExits(machineRoom, { [Direction.NORTHWEST]: bottomOfShaft.id });

  return {
    coldPassage: coldPassage.id,
    steepCrawlway: steepCrawlway.id,
    slideRoom: slideRoom.id,
    slide1: slide1.id,
    slide2: slide2.id,
    slide3: slide3.id,
    slideLedge: slideLedge.id,
    sootyRoom: sootyRoom.id,
    mineEntrance: mineEntrance.id,
    squeakyRoom: squeakyRoom.id,
    smallRoom: smallRoom.id,
    shaftRoom: shaftRoom.id,
    woodenTunnel: woodenTunnel.id,
    smellyRoom: smellyRoom.id,
    gasRoom: gasRoom.id,
    mineMaze1: mineMaze1.id,
    mineMaze2: mineMaze2.id,
    mineMaze3: mineMaze3.id,
    mineMaze4: mineMaze4.id,
    mineMaze5: mineMaze5.id,
    mineMaze6: mineMaze6.id,
    mineMaze7: mineMaze7.id,
    ladderTop: ladderTop.id,
    ladderBottom: ladderBottom.id,
    coalMineDeadEnd: coalMineDeadEnd.id,
    timberRoom: timberRoom.id,
    bottomOfShaft: bottomOfShaft.id,
    machineRoom: machineRoom.id,
  };
}

// === External connectors ===

/**
 * Connect Coal Mine to Mirror Room (Coal Mine state)
 */
export function connectCoalMineToMirrorRoom(
  world: WorldModel,
  coalMineIds: CoalMineRoomIds,
  mirrorRoomId: string
): void {
  const coldPassage = world.getEntity(coalMineIds.coldPassage);
  if (coldPassage) {
    coldPassage.get(RoomTrait)!.exits[Direction.EAST] = { destination: mirrorRoomId };
  }

  const steepCrawlway = world.getEntity(coalMineIds.steepCrawlway);
  if (steepCrawlway) {
    steepCrawlway.get(RoomTrait)!.exits[Direction.SOUTH] = { destination: mirrorRoomId };
  }
}

/**
 * Connect Slide-3 to Cellar (one-way exit)
 */
export function connectSlideToCellar(
  world: WorldModel,
  coalMineIds: CoalMineRoomIds,
  cellarId: string
): void {
  const slide3 = world.getEntity(coalMineIds.slide3);
  if (slide3) {
    slide3.get(RoomTrait)!.exits[Direction.DOWN] = { destination: cellarId };
  }
}

// ============================================================================
// OBJECTS - Created near their default room locations
// ============================================================================

/**
 * Create all objects in the Coal Mine region
 */
export function createCoalMineObjects(world: WorldModel, roomIds: CoalMineRoomIds): void {
  // Shaft Room objects
  createBasket(world, roomIds.shaftRoom, roomIds.bottomOfShaft);

  // Coal Mine Dead End objects
  createCoal(world, roomIds.coalMineDeadEnd);

  // Machine Room objects
  createMachine(world, roomIds.machineRoom);

  // Squeaky Room objects (bat room)
  createVampireBat(world, roomIds.squeakyRoom);
  createJadeFigurine(world, roomIds.squeakyRoom);

  // Gas Room objects
  createSapphireBracelet(world, roomIds.gasRoom);

  // Sooty Room objects
  createRedCrystalSphere(world, roomIds.sootyRoom);

  // Timber Room objects
  createTimber(world, roomIds.timberRoom);
}

// ============= Shaft Room Objects =============

function createBasket(
  world: WorldModel,
  topRoomId: string,
  bottomRoomId: string
): IFEntity {
  const basket = world.createEntity('basket', EntityType.CONTAINER);

  basket.add(new IdentityTrait({
    name: 'rusty iron basket',
    aliases: ['basket', 'iron basket', 'rusty basket'],
    description: 'A rusty iron basket hangs from a sturdy chain. It looks large enough to hold a person and some items. There is a wheel mechanism nearby to lower and raise it.',
    properName: false,
    article: 'a'
  }));

  basket.add(new ContainerTrait({
    capacity: { maxItems: 10, maxWeight: 100 }
  }));

  basket.add(new EnterableTrait());
  basket.add(new SceneryTrait());

  basket.add(new BasketElevatorTrait({
    topRoomId,
    bottomRoomId,
    initialPosition: 'top'
  }));

  world.moveEntity(basket.id, topRoomId);
  return basket;
}

// ============= Coal Mine Dead End Objects =============

function createCoal(world: WorldModel, roomId: string): IFEntity {
  const coal = world.createEntity('coal', EntityType.ITEM);

  coal.add(new IdentityTrait({
    name: 'pile of coal',
    aliases: ['coal', 'black coal', 'lump of coal'],
    description: 'A pile of black coal. It would make excellent fuel for a machine.',
    properName: false,
    article: 'a',
    weight: 10
  }));

  world.moveEntity(coal.id, roomId);
  return coal;
}

// ============= Machine Room Objects =============

function createMachine(world: WorldModel, roomId: string): IFEntity {
  const machine = world.createEntity('machine', EntityType.CONTAINER);

  machine.add(new IdentityTrait({
    name: 'machine',
    aliases: ['machine', 'coal machine', 'big machine', 'coal-powered machine'],
    description: 'This is a massive machine with a lid on top and a switch on the side. The lid is open, revealing a small compartment inside. It looks like it could exert enormous pressure.',
    properName: false,
    article: 'a'
  }));

  machine.add(new ContainerTrait({
    capacity: { maxItems: 1, maxWeight: 10 }
  }));

  machine.add(new OpenableTrait({ isOpen: true }));
  machine.add(new SceneryTrait());

  (machine as any).machineActivated = false;

  world.moveEntity(machine.id, roomId);
  return machine;
}

// ============= Squeaky Room Objects =============

function createVampireBat(world: WorldModel, roomId: string): IFEntity {
  const bat = world.createEntity('vampire bat', EntityType.ACTOR);

  bat.add(new IdentityTrait({
    name: 'vampire bat',
    aliases: ['bat', 'giant bat', 'large bat'],
    description: 'A giant vampire bat hangs from the ceiling, watching you with beady eyes. It looks strong enough to carry a person.',
    properName: false,
    article: 'a'
  }));

  bat.add(new ActorTrait({ isPlayer: false }));

  bat.add(new NpcTrait({
    behaviorId: 'bat',
    isHostile: false,
    canMove: true
  }));

  (bat as any).repelledBy = 'garlic';

  world.moveEntity(bat.id, roomId);
  return bat;
}

function createJadeFigurine(world: WorldModel, roomId: string): IFEntity {
  const figurine = world.createEntity('jade figurine', EntityType.ITEM);

  figurine.add(new IdentityTrait({
    name: 'jade figurine',
    aliases: ['figurine', 'jade', 'statue', 'jade statue'],
    description: 'A beautiful jade figurine of an oriental dragon. It is exquisitely carved.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  figurine.add(new TreasureTrait({
    treasureId: 'jade-figurine',
    treasureValue: 5,
    trophyCaseValue: 5
  }));

  world.moveEntity(figurine.id, roomId);
  return figurine;
}

// ============= Gas Room Objects =============

function createSapphireBracelet(world: WorldModel, roomId: string): IFEntity {
  const bracelet = world.createEntity('sapphire bracelet', EntityType.ITEM);

  bracelet.add(new IdentityTrait({
    name: 'sapphire bracelet',
    aliases: ['bracelet', 'sapphire', 'blue bracelet'],
    description: 'A delicate bracelet set with brilliant blue sapphires.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  bracelet.add(new TreasureTrait({
    treasureId: 'sapphire-bracelet',
    treasureValue: 5,     // OFVAL from mdlzork_810722
    trophyCaseValue: 3    // OTVAL from mdlzork_810722
  }));

  world.moveEntity(bracelet.id, roomId);
  return bracelet;
}

// ============= Sooty Room Objects =============

function createRedCrystalSphere(world: WorldModel, roomId: string): IFEntity {
  const sphere = world.createEntity('red crystal sphere', EntityType.ITEM);

  sphere.add(new IdentityTrait({
    name: 'red crystal sphere',
    aliases: ['sphere', 'crystal sphere', 'red sphere', 'crystal', 'red crystal', 'ball'],
    description: 'A beautiful sphere of red crystal. It seems to glow with an inner light.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  sphere.add(new TreasureTrait({
    treasureId: 'red-crystal-sphere',
    treasureValue: 10,      // OFVAL from mdlzork_810722
    trophyCaseValue: 5      // OTVAL from mdlzork_810722
  }));

  world.moveEntity(sphere.id, roomId);
  return sphere;
}

// ============= Timber Room Objects =============

function createTimber(world: WorldModel, roomId: string): IFEntity {
  const timber = world.createEntity('timber', EntityType.ITEM);

  timber.add(new IdentityTrait({
    name: 'wooden timber',
    aliases: ['timber', 'beam', 'wooden beam', 'lumber', 'wood'],
    description: 'A large, sturdy piece of timber. It could be useful for propping things up.',
    properName: false,
    article: 'a',
    weight: 20
  }));

  world.moveEntity(timber.id, roomId);
  return timber;
}
