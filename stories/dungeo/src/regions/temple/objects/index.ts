/**
 * Temple Region Objects
 *
 * Altar: Bell, book, candles (exorcism items)
 * Egyptian Room: Gold coffin (treasure), sceptre inside
 * Torch Room: Ivory torch (treasure, light source)
 * Land of Dead: Crystal skull (treasure), chalice (treasure)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ContainerTrait,
  OpenableTrait,
  ReadableTrait,
  SceneryTrait,
  LightSourceTrait,
  SwitchableTrait,
  EntityType
} from '@sharpee/world-model';

import { TempleRoomIds } from '../index';

/**
 * Create all objects in the Temple region
 */
export function createTempleObjects(world: WorldModel, roomIds: TempleRoomIds): void {
  // Altar objects - exorcism items
  createBell(world, roomIds.altar);
  createBlackBook(world, roomIds.altar);
  createCandles(world, roomIds.altar);
  createStoneAltar(world, roomIds.altar);

  // Egyptian Room objects
  createGoldCoffin(world, roomIds.egyptianRoom);

  // Torch Room objects
  createIvoryTorch(world, roomIds.torchRoom);

  // Land of Dead objects
  createCrystalSkull(world, roomIds.landOfDead);
  createChalice(world, roomIds.landOfDead);

  // Dreary Room objects
  createBlueCrystalSphere(world, roomIds.drearyRoom);

  // Tiny Room objects - key puzzle
  createTinyRoomDoor(world, roomIds.tinyRoom, roomIds.drearyRoom);
  createSmallKey(world, roomIds.tinyRoom);

  // Tomb objects - crypt door
  createCryptDoor(world, roomIds.tomb, roomIds.crypt);
}

/**
 * Stone Altar - Scenery, items can be placed on it
 */
function createStoneAltar(world: WorldModel, roomId: string): IFEntity {
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
  return altar;
}

/**
 * Bell - Exorcism item
 */
function createBell(world: WorldModel, roomId: string): IFEntity {
  const bell = world.createEntity('brass bell', EntityType.ITEM);

  bell.add(new IdentityTrait({
    name: 'brass bell',
    aliases: ['bell', 'brass', 'small bell'],
    description: 'A brass bell with strange symbols engraved around its rim.',
    properName: false,
    article: 'a'
  }));

  // Used in exorcism ritual
  (bell as any).isExorcismItem = true;
  (bell as any).exorcismRole = 'bell';

  world.moveEntity(bell.id, roomId);
  return bell;
}

/**
 * Black Book - Exorcism item, readable
 */
function createBlackBook(world: WorldModel, roomId: string): IFEntity {
  const book = world.createEntity('black book', EntityType.ITEM);

  book.add(new IdentityTrait({
    name: 'black book',
    aliases: ['book', 'ancient book', 'leather book'],
    description: 'An ancient book bound in black leather. Strange symbols cover the cover.',
    properName: false,
    article: 'a'
  }));

  book.add(new ReadableTrait({
    text: `The book is written in a strange language, but one passage stands out:

"To banish the spirits of the dead, one must perform the Ritual of Exorcism:
Ring the bell, read the book aloud, light the candles with a flame.
Only then shall the gates of Hades be opened to the living."`
  }));

  // Used in exorcism ritual
  (book as any).isExorcismItem = true;
  (book as any).exorcismRole = 'book';

  world.moveEntity(book.id, roomId);
  return book;
}

/**
 * Candles - Exorcism item, light source when lit
 * Also a treasure (5 points) when burned and placed in trophy case
 */
function createCandles(world: WorldModel, roomId: string): IFEntity {
  const candles = world.createEntity('pair of candles', EntityType.ITEM);

  candles.add(new IdentityTrait({
    name: 'pair of candles',
    aliases: ['candles', 'candle', 'white candles'],
    description: 'A pair of white wax candles.',
    properName: false,
    article: 'a'
  }));

  candles.add(new LightSourceTrait({
    isLit: false,
    brightness: 2,
    fuelRemaining: 50,  // Limited burn time
    maxFuel: 50,
    fuelConsumptionRate: 1
  }));

  candles.add(new SwitchableTrait({
    isOn: false
  }));

  // Used in exorcism ritual
  (candles as any).isExorcismItem = true;
  (candles as any).exorcismRole = 'candles';

  // Treasure when burned (status changes after use)
  (candles as any).isTreasure = true;
  (candles as any).treasureId = 'candles';
  (candles as any).treasureValue = 5;

  world.moveEntity(candles.id, roomId);
  return candles;
}

/**
 * Gold Coffin - Treasure, contains sceptre
 */
function createGoldCoffin(world: WorldModel, roomId: string): IFEntity {
  const coffin = world.createEntity('gold coffin', EntityType.CONTAINER);

  coffin.add(new IdentityTrait({
    name: 'gold coffin',
    aliases: ['coffin', 'golden coffin', 'sarcophagus'],
    description: 'An ornate gold coffin covered with Egyptian hieroglyphics. It appears to be a royal sarcophagus.',
    properName: false,
    article: 'a'
  }));

  coffin.add(new ContainerTrait({
    capacity: { maxItems: 5 }
  }));

  coffin.add(new OpenableTrait({
    isOpen: false
  }));

  // Treasure
  (coffin as any).isTreasure = true;
  (coffin as any).treasureId = 'gold-coffin';
  (coffin as any).treasureValue = 10;

  world.moveEntity(coffin.id, roomId);

  // Create and place sceptre inside coffin
  const sceptre = createSceptre(world);
  const coffinOpenable = coffin.get(OpenableTrait);
  if (coffinOpenable) {
    coffinOpenable.isOpen = true;
    world.moveEntity(sceptre.id, coffin.id);
    coffinOpenable.isOpen = false;
  }

  return coffin;
}

/**
 * Sceptre - Treasure inside coffin, used for rainbow puzzle
 */
function createSceptre(world: WorldModel): IFEntity {
  const sceptre = world.createEntity('sceptre', EntityType.ITEM);

  sceptre.add(new IdentityTrait({
    name: 'sceptre',
    aliases: ['scepter', 'royal sceptre', 'jeweled sceptre'],
    description: 'A beautiful sceptre, encrusted with sapphires and rubies. It seems to shimmer with magical energy.',
    properName: false,
    article: 'a'
  }));

  // Treasure
  (sceptre as any).isTreasure = true;
  (sceptre as any).treasureId = 'sceptre';
  (sceptre as any).treasureValue = 4;

  // Used for rainbow puzzle (wave at rainbow to solidify)
  (sceptre as any).isMagical = true;

  return sceptre;
}

/**
 * Ivory Torch - Treasure, permanent light source once lit
 */
function createIvoryTorch(world: WorldModel, roomId: string): IFEntity {
  const torch = world.createEntity('ivory torch', EntityType.ITEM);

  torch.add(new IdentityTrait({
    name: 'ivory torch',
    aliases: ['torch', 'ivory', 'white torch'],
    description: 'A beautiful torch made of polished ivory. It is not currently lit.',
    properName: false,
    article: 'an'
  }));

  torch.add(new LightSourceTrait({
    isLit: false,
    brightness: 3,
    fuelRemaining: 1000,  // Very long lasting once lit
    maxFuel: 1000,
    fuelConsumptionRate: 0  // Never burns out
  }));

  torch.add(new SwitchableTrait({
    isOn: false
  }));

  // Treasure
  (torch as any).isTreasure = true;
  (torch as any).treasureId = 'ivory-torch';
  (torch as any).treasureValue = 6;

  world.moveEntity(torch.id, roomId);
  return torch;
}

/**
 * Crystal Skull - Treasure in Land of Dead
 */
function createCrystalSkull(world: WorldModel, roomId: string): IFEntity {
  const skull = world.createEntity('crystal skull', EntityType.ITEM);

  skull.add(new IdentityTrait({
    name: 'crystal skull',
    aliases: ['skull', 'crystal', 'glass skull'],
    description: 'A skull carved from flawless crystal. Its empty eye sockets seem to stare at you.',
    properName: false,
    article: 'a'
  }));

  // Treasure
  (skull as any).isTreasure = true;
  (skull as any).treasureId = 'crystal-skull';
  (skull as any).treasureValue = 10;

  world.moveEntity(skull.id, roomId);
  return skull;
}

/**
 * Chalice - Treasure in Land of Dead
 */
function createChalice(world: WorldModel, roomId: string): IFEntity {
  const chalice = world.createEntity('chalice', EntityType.ITEM);

  chalice.add(new IdentityTrait({
    name: 'chalice',
    aliases: ['cup', 'goblet', 'golden chalice'],
    description: 'A golden chalice encrusted with precious gems. It radiates an aura of holiness.',
    properName: false,
    article: 'a'
  }));

  // Treasure
  (chalice as any).isTreasure = true;
  (chalice as any).treasureId = 'chalice';
  (chalice as any).treasureValue = 10;

  world.moveEntity(chalice.id, roomId);
  return chalice;
}

/**
 * Blue Crystal Sphere - Treasure in Dreary Room
 *
 * One of three crystal spheres in the game (blue, white, red).
 * Worth 10 points for taking, 5 additional points in trophy case.
 */
function createBlueCrystalSphere(world: WorldModel, roomId: string): IFEntity {
  const sphere = world.createEntity('blue crystal sphere', EntityType.ITEM);

  sphere.add(new IdentityTrait({
    name: 'blue crystal sphere',
    aliases: ['sphere', 'crystal sphere', 'blue sphere', 'crystal', 'blue crystal', 'ball'],
    description: 'A beautiful sphere of blue crystal. It seems to glow with an inner light.',
    properName: false,
    article: 'a'
  }));

  // Treasure - 10 take + 5 case = 15 total
  (sphere as any).isTreasure = true;
  (sphere as any).treasureId = 'blue-crystal-sphere';
  (sphere as any).treasureValue = 10;
  (sphere as any).trophyCaseValue = 5;

  world.moveEntity(sphere.id, roomId);
  return sphere;
}

/**
 * Tiny Room Door - Small locked door between Tiny Room and Dreary Room
 *
 * Classic IF puzzle: key is in the lock on the other side.
 * Player must slide mat under door, push key with screwdriver,
 * key falls on mat, pull mat to get key.
 *
 * States tracked on door:
 * - isLocked: true until player uses key
 * - keyInLock: true initially, false after screwdriver pushes it out
 * - matUnderDoor: true when mat is placed
 * - keyOnMat: true when key falls after being pushed
 */
function createTinyRoomDoor(world: WorldModel, tinyRoomId: string, drearyRoomId: string): IFEntity {
  const door = world.createEntity('small door', EntityType.DOOR);

  door.add(new IdentityTrait({
    name: 'small door',
    aliases: ['door', 'north door', 'wooden door', 'tiny door'],
    description: 'A small wooden door leads north. There is a keyhole at eye level.',
    properName: false,
    article: 'a'
  }));

  door.add(new OpenableTrait({
    isOpen: false
  }));

  door.add(new SceneryTrait());

  // Door state for puzzle
  (door as any).isLocked = true;
  (door as any).keyInLock = true;       // Key starts in lock on Dreary Room side
  (door as any).matUnderDoor = false;
  (door as any).keyOnMat = false;

  // Track connected rooms
  (door as any).connectsRooms = [tinyRoomId, drearyRoomId];
  (door as any).blocksDirection = {
    [tinyRoomId]: 'NORTH',
    [drearyRoomId]: 'SOUTH'
  };

  // ID for handler lookup
  (door as any).isTinyRoomDoor = true;

  world.moveEntity(door.id, tinyRoomId);
  return door;
}

/**
 * Small Key - Key for the Tiny Room door
 *
 * Initially "in the lock" on the Dreary Room side (tracked on door).
 * After screwdriver puzzle, falls onto mat and becomes takeable.
 * Then spawns in Tiny Room for player to pick up.
 */
function createSmallKey(world: WorldModel, roomId: string): IFEntity {
  const key = world.createEntity('small key', EntityType.ITEM);

  key.add(new IdentityTrait({
    name: 'small key',
    aliases: ['key', 'brass key', 'tiny key'],
    description: 'A small brass key.',
    properName: false,
    article: 'a'
  }));

  // Key starts hidden (in lock on other side) - not in room yet
  (key as any).isHidden = true;
  (key as any).isTinyRoomKey = true;

  // Don't place in room yet - it "appears" after the screwdriver puzzle
  // We'll track it on the world and move it when the puzzle is solved
  world.moveEntity(key.id, roomId);

  return key;
}

/**
 * Crypt Door - Heavy marble door in Tomb leading to Crypt
 *
 * This door can be opened/closed. When closed, it blocks movement
 * between Tomb and Crypt. The endgame trigger requires the player
 * to be in the Crypt with the door closed and lamp off for 15 turns.
 */
function createCryptDoor(world: WorldModel, tombId: string, cryptId: string): IFEntity {
  const door = world.createEntity('crypt door', EntityType.DOOR);

  door.add(new IdentityTrait({
    name: 'crypt door',
    aliases: ['door', 'crypt', 'marble door', 'heavy door', 'crypt entrance'],
    description: 'The door of the crypt is extremely heavy marble, but it opens and closes easily.',
    properName: false,
    article: 'the'
  }));

  door.add(new OpenableTrait({
    isOpen: false  // Initially closed
  }));

  door.add(new SceneryTrait());

  // Store which rooms this door connects
  (door as any).connectsRooms = [tombId, cryptId];
  (door as any).blocksDirection = {
    [tombId]: 'NORTH',
    [cryptId]: 'SOUTH'
  };

  // Place in Tomb (visible from both rooms conceptually)
  world.moveEntity(door.id, tombId);
  return door;
}

