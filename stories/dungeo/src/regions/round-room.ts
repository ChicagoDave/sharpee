/**
 * Round Room Region - The Carousel Room (single room hub)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType,
  Direction,
  ContainerTrait,
  OpenableTrait,
  AuthorModel
} from '@sharpee/world-model';

export interface RoundRoomIds {
  roundRoom: string;
}

export function createRoundRoomRegion(world: WorldModel): RoundRoomIds {
  const room = world.createEntity('Round Room', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Round Room',
    aliases: ['round room', 'circular room'],
    description: 'You are in a circular room with passages off in eight directions.',
    properName: true,
    article: 'the'
  }));
  (room as any).isFixed = false; // Spinning state - false = randomized exits (until robot fixes it)
  // Compass message "Your compass needle spins wildly, and you can't get your bearings."
  // is added dynamically by the room handler when isFixed is false

  return { roundRoom: room.id };
}

// === Objects ===

/**
 * Create objects in the Round Room
 * In 1981 MDL: IRBOX (dented steel box) containing STRAD (Stradivarius violin)
 */
export function createRoundRoomObjects(world: WorldModel, roomIds: RoundRoomIds): void {
  // Dented steel box - container that holds the Stradivarius
  const box = world.createEntity('steel box', EntityType.ITEM);
  box.add(new IdentityTrait({
    name: 'steel box',
    aliases: ['box', 'steel box', 'dented box', 'dented steel box'],
    description: 'A dented steel box. It appears to have survived quite a fall.',
    properName: false,
    article: 'a',
    weight: 40
  }));
  box.add(new ContainerTrait({ capacity: { maxItems: 5 } }));
  box.add(new OpenableTrait({ isOpen: false }));
  world.moveEntity(box.id, roomIds.roundRoom);

  // Stradivarius violin - treasure inside the steel box
  const violin = world.createEntity('violin', EntityType.ITEM);
  violin.add(new IdentityTrait({
    name: 'violin',
    aliases: ['violin', 'stradivarius', 'strad', 'fancy violin'],
    description: 'A Stradivarius! This exquisite instrument is in perfect condition despite its surroundings. It must be worth a fortune.',
    properName: false,
    article: 'a',
    weight: 10
  }));
  (violin as any).isTreasure = true;
  (violin as any).treasureId = 'stradivarius';
  (violin as any).treasureValue = 10;     // OTVAL from 1981 MDL
  (violin as any).trophyCaseValue = 10;   // OFVAL from 1981 MDL

  // Use AuthorModel to place violin in closed box (bypasses validation)
  const author = new AuthorModel(world.getDataStore(), world);
  author.moveEntity(violin.id, box.id);
}

// === External connectors ===

export function connectRoundRoomToUnderground(world: WorldModel, ids: RoundRoomIds, eastWestPassageId: string): void {
  const room = world.getEntity(ids.roundRoom);
  const ewp = world.getEntity(eastWestPassageId);
  if (room && ewp) {
    room.get(RoomTrait)!.exits[Direction.WEST] = { destination: eastWestPassageId };
    ewp.get(RoomTrait)!.exits[Direction.EAST] = { destination: ids.roundRoom };
  }
}

export function connectRoundRoomToTemple(world: WorldModel, ids: RoundRoomIds, templeIds: { northSouthPassage: string; grailRoom: string; windingPassage: string }): void {
  const room = world.getEntity(ids.roundRoom);
  if (room) {
    const trait = room.get(RoomTrait)!;
    trait.exits[Direction.NORTHEAST] = { destination: templeIds.northSouthPassage };
    trait.exits[Direction.EAST] = { destination: templeIds.grailRoom };
    trait.exits[Direction.SOUTHEAST] = { destination: templeIds.windingPassage };
  }
  // Reverse connections
  const nsp = world.getEntity(templeIds.northSouthPassage);
  if (nsp) nsp.get(RoomTrait)!.exits[Direction.SOUTHWEST] = { destination: ids.roundRoom };
  const gr = world.getEntity(templeIds.grailRoom);
  if (gr) gr.get(RoomTrait)!.exits[Direction.WEST] = { destination: ids.roundRoom };
  const wp = world.getEntity(templeIds.windingPassage);
  if (wp) wp.get(RoomTrait)!.exits[Direction.NORTHWEST] = { destination: ids.roundRoom };
}

export function connectRoundRoomToWellRoom(world: WorldModel, ids: RoundRoomIds, engravingsCaveId: string): void {
  const room = world.getEntity(ids.roundRoom);
  const ec = world.getEntity(engravingsCaveId);
  if (room) {
    const trait = room.get(RoomTrait)!;
    trait.exits[Direction.SOUTH] = { destination: engravingsCaveId };
    trait.exits[Direction.NORTH] = { destination: engravingsCaveId };
  }
  if (ec) ec.get(RoomTrait)!.exits[Direction.NORTH] = { destination: ids.roundRoom };
}

export function connectRoundRoomToDam(world: WorldModel, ids: RoundRoomIds, deepCanyonId: string): void {
  const room = world.getEntity(ids.roundRoom);
  const dc = world.getEntity(deepCanyonId);
  if (room) room.get(RoomTrait)!.exits[Direction.NORTHWEST] = { destination: deepCanyonId };
  if (dc) dc.get(RoomTrait)!.exits[Direction.SOUTHEAST] = { destination: ids.roundRoom };
}

export function connectRoundRoomToMaze(world: WorldModel, ids: RoundRoomIds, maze1Id: string): void {
  const room = world.getEntity(ids.roundRoom);
  const m1 = world.getEntity(maze1Id);
  if (room) room.get(RoomTrait)!.exits[Direction.SOUTHWEST] = { destination: maze1Id };
  if (m1) m1.get(RoomTrait)!.exits[Direction.NORTHEAST] = { destination: ids.roundRoom };
}
