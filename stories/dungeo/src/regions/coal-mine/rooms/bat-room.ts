/**
 * Bat Room - Home of the vampire bat
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createBatRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Bat Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Bat Room',
    aliases: ['bat room'],
    description: 'This is a large cave with a high ceiling. The walls are covered with guano, and you can hear squeaking from somewhere above. A passage leads west.',
    properName: true,
    article: 'the'
  }));

  return room;
}
