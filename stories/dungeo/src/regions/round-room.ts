/**
 * Round Room Region - The Carousel Room (single room hub)
 */

import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType, Direction } from '@sharpee/world-model';

export interface RoundRoomIds {
  roundRoom: string;
}

export function createRoundRoomRegion(world: WorldModel): RoundRoomIds {
  const room = world.createEntity('Round Room', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Round Room',
    aliases: ['round room', 'circular room'],
    description: 'This is a circular stone room with passages in all directions. Several of them have unfortunately been blocked by cave-ins.',
    properName: true,
    article: 'the'
  }));
  (room as any).isFixed = true; // Spinning state - false = randomized exits

  return { roundRoom: room.id };
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
