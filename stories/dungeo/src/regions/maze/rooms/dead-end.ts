/**
 * Dead End Rooms (5 total)
 * "You have come to a dead end in the maze."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

function createDeadEndRoom(world: WorldModel, num: number): IFEntity {
  const room = world.createEntity(`Dead End ${num}`, EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Dead End',
    aliases: ['dead end'],
    description: 'You have come to a dead end in the maze.',
    properName: true,
    article: 'the'
  }));

  return room;
}

export function createDeadEnd1(world: WorldModel): IFEntity {
  return createDeadEndRoom(world, 1);
}

export function createDeadEnd2(world: WorldModel): IFEntity {
  return createDeadEndRoom(world, 2);
}

export function createDeadEnd3(world: WorldModel): IFEntity {
  return createDeadEndRoom(world, 3);
}

export function createDeadEnd4(world: WorldModel): IFEntity {
  return createDeadEndRoom(world, 4);
}

export function createDeadEnd5(world: WorldModel): IFEntity {
  return createDeadEndRoom(world, 5);
}
