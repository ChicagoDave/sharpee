/**
 * Kitchen
 * "You are in the kitchen of the white house. A table seems to have been
 * used recently for the preparation of food. A passage leads to the west,
 * and a dark staircase can be seen leading upward. To the east is a small
 * window which is open."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createKitchen(world: WorldModel): IFEntity {
  const room = world.createEntity('Kitchen', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Kitchen',
    aliases: ['kitchen', 'white house kitchen'],
    description: 'You are in the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west, and a dark staircase can be seen leading upward. To the east is a small window which is open.',
    properName: true,
    article: 'the'
  }));

  return room;
}
