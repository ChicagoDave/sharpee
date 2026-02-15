/**
 * Temple Region - Ancient temple area with mirror puzzle
 *
 * 14 rooms: Temple, Altar, North/South Passage, Grail Room, Winding Passage,
 * Mirror Room, Narrow Crawlway, Loud Room, Damp Cave, Ancient Chasm,
 * Basin Room, Dead End 1, Dead End 2, Small Cave
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
  LightSourceTrait,
  SwitchableTrait
} from '@sharpee/world-model';
import { TreasureTrait, BurnableTrait, BasinRoomTrait } from '../traits';

export interface TempleRoomIds {
  temple: string;
  altar: string;
  northSouthPassage: string;
  grailRoom: string;
  windingPassage: string;
  mirrorRoom: string;
  narrowCrawlway: string;
  loudRoom: string;
  dampCave: string;
  ancientChasm: string;
  basinRoom: string;
  deadEnd1: string;
  deadEnd2: string;
  smallCave: string;
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

export function createTempleRegion(world: WorldModel): TempleRoomIds {
  // === Create all rooms ===

  const temple = createRoom(world, 'Temple',
    'This is the interior of a large temple of ancient construction. Flickering torches cast shadows on the walls. A stairway leads down.');

  const altar = createRoom(world, 'Altar',
    'This is the altar room of the temple. A large stone altar dominates the room.');

  const northSouthPassage = createRoom(world, 'North/South Passage',
    'This is a wide passage running north and south. The walls are damp and cold.');

  const grailRoom = createRoom(world, 'Grail Room',
    'You are in a small chamber with walls of granite. A narrow passage exits to the west.');

  const windingPassage = createRoom(world, 'Winding Passage',
    'This is a winding passage through the rock. It leads northwest and east.');

  const mirrorRoom = createRoom(world, 'Mirror Room',
    'You are in a large room with a great mirror on the wall. Passages lead northeast and west.');

  const narrowCrawlway = createRoom(world, 'Narrow Crawlway',
    'This is a narrow crawlway. Passages lead north, south, and southwest.');

  const loudRoom = createRoom(world, 'Loud Room',
    'This is a large room with a ceiling which cannot be detected from the ground. A narrow passage leads east; a stairway leads up. The room is extremely noisy.');

  const dampCave = createRoom(world, 'Damp Cave',
    'This cave is extremely damp. A stairway leads down.');

  const ancientChasm = createRoom(world, 'Ancient Chasm',
    'You are at the edge of an ancient chasm. Passages lead in several directions.');

  const basinRoom = createRoom(world, 'Basin Room',
    'You are in a small room with a stone basin in the center.');
  basinRoom.add(new BasinRoomTrait({ basinState: 'normal' }));

  const deadEnd1 = createRoom(world, 'Dead End',
    'You are at a dead end in the passage.');

  const deadEnd2 = createRoom(world, 'Dead End',
    'You are at a dead end in the passage.');

  const smallCave = createRoom(world, 'Small Cave',
    'This is a small cave. A passage leads west.');

  // === Set up connections ===

  setExits(temple, {
    [Direction.EAST]: altar.id,
    [Direction.DOWN]: grailRoom.id,
  });

  setExits(altar, { [Direction.WEST]: temple.id });

  setExits(grailRoom, {
    [Direction.UP]: temple.id,
    [Direction.EAST]: narrowCrawlway.id,
    // WEST → Round Room connected externally
  });

  setExits(northSouthPassage, {
    [Direction.NORTHEAST]: loudRoom.id,
    // NORTH → Underground Chasm, SW → Round Room connected externally
  });

  setExits(loudRoom, {
    [Direction.WEST]: northSouthPassage.id,
    [Direction.UP]: dampCave.id,
    [Direction.EAST]: ancientChasm.id,
  });

  setExits(dampCave, {
    [Direction.DOWN]: loudRoom.id,
    [Direction.SOUTH]: loudRoom.id,
    // EAST → Dam connected externally
  });

  setExits(ancientChasm, {
    [Direction.WEST]: loudRoom.id,
    [Direction.NORTH]: deadEnd2.id,
    [Direction.EAST]: smallCave.id,
    [Direction.SOUTH]: basinRoom.id,
  });

  setExits(basinRoom, { [Direction.NORTH]: ancientChasm.id });
  setExits(deadEnd1, { [Direction.EAST]: ancientChasm.id });
  setExits(deadEnd2, { [Direction.SOUTH]: ancientChasm.id });
  setExits(smallCave, { [Direction.WEST]: ancientChasm.id });

  setExits(narrowCrawlway, {
    [Direction.WEST]: grailRoom.id,
    [Direction.SOUTHWEST]: mirrorRoom.id,
    [Direction.SOUTH]: windingPassage.id,
  });

  setExits(mirrorRoom, {
    [Direction.NORTHEAST]: narrowCrawlway.id,
    [Direction.WEST]: windingPassage.id,
    // EAST → Well Room Cave connected externally
  });

  setExits(windingPassage, {
    [Direction.EAST]: mirrorRoom.id,
    [Direction.NORTH]: narrowCrawlway.id,
    // NW → Round Room connected externally
  });

  return {
    temple: temple.id,
    altar: altar.id,
    northSouthPassage: northSouthPassage.id,
    grailRoom: grailRoom.id,
    windingPassage: windingPassage.id,
    mirrorRoom: mirrorRoom.id,
    narrowCrawlway: narrowCrawlway.id,
    loudRoom: loudRoom.id,
    dampCave: dampCave.id,
    ancientChasm: ancientChasm.id,
    basinRoom: basinRoom.id,
    deadEnd1: deadEnd1.id,
    deadEnd2: deadEnd2.id,
    smallCave: smallCave.id,
  };
}

// === External connectors ===

export function connectTempleToUnderground(world: WorldModel, ids: TempleRoomIds, chasmId: string): void {
  const nsp = world.getEntity(ids.northSouthPassage);
  const chasm = world.getEntity(chasmId);
  if (nsp) nsp.get(RoomTrait)!.exits[Direction.NORTH] = { destination: chasmId };
  if (chasm) chasm.get(RoomTrait)!.exits[Direction.EAST] = { destination: ids.northSouthPassage };
}

export function connectTempleToWellRoom(world: WorldModel, ids: TempleRoomIds, caveId: string): void {
  const mr = world.getEntity(ids.mirrorRoom);
  const cave = world.getEntity(caveId);
  if (mr) mr.get(RoomTrait)!.exits[Direction.EAST] = { destination: caveId };
  if (cave) cave.get(RoomTrait)!.exits[Direction.WEST] = { destination: ids.mirrorRoom };
}

export function connectTempleToDam(world: WorldModel, ids: TempleRoomIds, damId: string): void {
  const dc = world.getEntity(ids.dampCave);
  const dam = world.getEntity(damId);
  if (dc) dc.get(RoomTrait)!.exits[Direction.EAST] = { destination: damId };
  if (dam) dam.get(RoomTrait)!.exits[Direction.EAST] = { destination: ids.dampCave };
}

export function connectTempleToFrigidRiver(world: WorldModel, ids: TempleRoomIds, rockyShoreId: string): void {
  const sc = world.getEntity(ids.smallCave);
  const rs = world.getEntity(rockyShoreId);
  if (sc) sc.get(RoomTrait)!.exits[Direction.NORTHWEST] = { destination: rockyShoreId };
  if (rs) rs.get(RoomTrait)!.exits[Direction.SOUTHEAST] = { destination: ids.smallCave };
}

// ============================================================================
// OBJECTS - Created near their default room locations
// ============================================================================

export const MIRROR_ID = 'dungeo-mirror';

/**
 * Create all objects in the Temple region
 */
export function createTempleObjects(world: WorldModel, roomIds: TempleRoomIds): void {
  // Altar objects - exorcism items
  createAltarObjects(world, roomIds.altar);

  // Grail Room objects (pedestal, grail treasure)
  createGrailRoomObjects(world, roomIds.grailRoom);

  // Mirror Room objects (mirror for puzzle)
  createMirrorRoomObjects(world, roomIds.mirrorRoom);

  // Small Cave objects (shovel)
  createSmallCaveObjects(world, roomIds.smallCave);

  // Basin Room objects (stone basin for ghost ritual)
  createBasinRoomObjects(world, roomIds.basinRoom);

  // Loud Room objects (platinum bar treasure)
  createLoudRoomObjects(world, roomIds.loudRoom);
}

// ============= Altar Objects =============

function createAltarObjects(world: WorldModel, roomId: string): void {
  // Stone altar - scenery
  const altar = world.createEntity('stone altar', EntityType.SCENERY);
  altar.add(new IdentityTrait({
    name: 'stone altar',
    aliases: ['altar', 'massive altar'],
    description: 'A massive stone altar covered in ancient runes. It radiates an aura of ancient power.',
    properName: false,
    article: 'a'
  }));
  altar.add(new SceneryTrait());
  world.moveEntity(altar.id, roomId);

  // Brass bell - exorcism item
  const bell = world.createEntity('brass bell', EntityType.ITEM);
  bell.add(new IdentityTrait({
    name: 'brass bell',
    aliases: ['bell', 'brass', 'small bell'],
    description: 'A brass bell with strange symbols engraved around its rim.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  bell.attributes.isExorcismItem = true;
  bell.attributes.exorcismRole = 'bell';
  world.moveEntity(bell.id, roomId);

  // Black book - exorcism item, readable
  const book = world.createEntity('black book', EntityType.ITEM);
  book.add(new IdentityTrait({
    name: 'black book',
    aliases: ['book', 'ancient book', 'leather book'],
    description: 'An ancient book bound in black leather. Strange symbols cover the cover.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  book.add(new ReadableTrait({
    text: `The book is written in a strange language, but one passage stands out:

"To banish the spirits of the dead, one must perform the Ritual of Exorcism:
Ring the bell, read the book aloud, light the candles with a flame.
Only then shall the gates of Hades be opened to the living."`
  }));
  book.attributes.isExorcismItem = true;
  book.attributes.exorcismRole = 'book';
  world.moveEntity(book.id, roomId);

  // Candles - exorcism item, light source when lit
  // NOT a treasure in 1981 MDL - just a tool
  const candles = world.createEntity('pair of candles', EntityType.ITEM);
  candles.add(new IdentityTrait({
    name: 'pair of candles',
    aliases: ['candles', 'candle', 'white candles'],
    description: 'A pair of white wax candles.',
    properName: false,
    article: 'a',
    weight: 20
  }));
  candles.add(new LightSourceTrait({
    isLit: false,
    brightness: 2,
    fuelRemaining: 50,
    maxFuel: 50,
    fuelConsumptionRate: 1
  }));
  candles.add(new SwitchableTrait({ isOn: false }));
  candles.attributes.isFlame = true;  // Open flame - dangerous in Gas Room
  // Burnable trait for candles - burns via fuse (50 turns total)
  candles.add(new BurnableTrait({
    burnableType: 'candle',
    isBurning: false,
    burnedOut: false
  }));
  candles.attributes.isExorcismItem = true;
  candles.attributes.exorcismRole = 'candles';
  world.moveEntity(candles.id, roomId);
}

// ============= Grail Room Objects =============

function createGrailRoomObjects(world: WorldModel, roomId: string): void {
  // Pedestal - scenery
  const pedestal = world.createEntity('pedestal', EntityType.SCENERY);
  pedestal.add(new IdentityTrait({
    name: 'stone pedestal',
    aliases: ['pedestal', 'stone pedestal', 'altar'],
    description: 'A stone pedestal stands in the center of the room, carved with ancient symbols.',
    properName: false,
    article: 'a'
  }));
  pedestal.add(new SceneryTrait());
  world.moveEntity(pedestal.id, roomId);

  // Grail - treasure (2 take + 5 case = 7 total)
  const grail = world.createEntity('grail', EntityType.ITEM);
  grail.add(new IdentityTrait({
    name: 'grail',
    aliases: ['grail', 'holy grail', 'cup', 'goblet', 'sacred grail'],
    description: 'A plain wooden grail, yet it radiates an aura of ancient holiness. Its simple appearance belies its true value.',
    properName: false,
    article: 'a',
    weight: 5,
    points: 2              // OFVAL from mdlzork_810722
  }));
  grail.add(new TreasureTrait({
    trophyCaseValue: 5,    // OTVAL from mdlzork_810722
  }));
  world.moveEntity(grail.id, roomId);
}

// ============= Mirror Room Objects =============

function createMirrorRoomObjects(world: WorldModel, roomId: string): void {
  // Enormous mirror - touching/rubbing toggles room's exit state
  const mirror = world.createEntity('mirror', EntityType.SCENERY);
  mirror.attributes.customId = MIRROR_ID;
  mirror.add(new IdentityTrait({
    name: 'enormous mirror',
    aliases: ['mirror', 'enormous mirror', 'south mirror', 'wall mirror', 'large mirror'],
    description: 'An enormous mirror fills the entire south wall of the room. Its surface is flawless and seems to shimmer with an otherworldly quality.',
    properName: false,
    article: 'an'
  }));
  mirror.add(new SceneryTrait());
  world.moveEntity(mirror.id, roomId);
}

// ============= Small Cave Objects =============

function createSmallCaveObjects(world: WorldModel, roomId: string): void {
  // Shovel - tool for digging in sandy areas
  const shovel = world.createEntity('shovel', EntityType.ITEM);
  shovel.add(new IdentityTrait({
    name: 'shovel',
    aliases: ['shovel', 'spade'],
    description: 'A sturdy shovel with a wooden handle and metal blade.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  world.moveEntity(shovel.id, roomId);
}

// ============= Basin Room Objects =============

function createBasinRoomObjects(world: WorldModel, roomId: string): void {
  // Stone basin - scenery for ghost ritual (ADR-078)
  const basin = world.createEntity('stone basin', EntityType.ITEM);
  basin.add(new IdentityTrait({
    name: 'stone basin',
    aliases: ['basin', 'carved basin', 'gargoyle basin'],
    description: 'The basin is carved from a single block of dark stone, surrounded by gargoyles and serpent figures. It is filled with what can only be described as a mystical fog.',
    properName: false,
    article: 'a'
  }));
  basin.add(new SceneryTrait());
  basin.attributes.isRitualBasin = true;
  world.moveEntity(basin.id, roomId);
}

// ============= Loud Room Objects =============

function createLoudRoomObjects(world: WorldModel, roomId: string): void {
  // Platinum bar - treasure (10 pts)
  const bar = world.createEntity('platinum bar', EntityType.ITEM);
  bar.add(new IdentityTrait({
    name: 'platinum bar',
    aliases: ['bar', 'platinum', 'ingot', 'metal bar'],
    description: 'This is a large bar of platinum, stamped "FROBOZZ MAGIC COMPANY".',
    properName: false,
    article: 'a',
    weight: 20,
    points: 12             // OFVAL from mdlzork_810722
  }));
  bar.add(new TreasureTrait({
    trophyCaseValue: 10,   // OTVAL from mdlzork_810722
  }));
  world.moveEntity(bar.id, roomId);
}
