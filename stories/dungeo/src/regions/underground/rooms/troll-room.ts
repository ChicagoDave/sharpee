/**
 * Troll Room
 * "This is a small room with passages to the east and south and a
 * forbidding hole leading west. Bloodstains and deep scratches
 * (perhaps made by an axe) mar the walls."
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createTrollRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Troll Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Troll Room',
    aliases: ['troll room', 'bloody room'],
    description: 'This is a small room with passages to the east and south and a forbidding hole leading west. Bloodstains and deep scratches (perhaps made by an axe) mar the walls.',
    properName: true,
    article: 'the'
  }));

  return room;
}
