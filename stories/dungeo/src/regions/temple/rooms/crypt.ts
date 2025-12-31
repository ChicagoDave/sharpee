/**
 * Crypt of the Implementers
 *
 * Inside the marble crypt. This is where the endgame is triggered:
 * - Close the crypt door
 * - Turn off lamp (darkness)
 * - Wait 15 turns
 * - A cloaked figure appears and teleports you to the endgame
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createCrypt(world: WorldModel): IFEntity {
  const room = world.createEntity('Crypt', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Crypt',
    aliases: ['crypt', 'crypt of the implementers', 'marble crypt', 'inside crypt'],
    description: 'Though large and esthetically pleasing, the marble crypt is empty; the sarcophagi, bodies, and rich treasures to be expected in a tomb of this magnificence are missing. Inscribed on the wall is the motto of the implementers, "Feel Free". There is a door leading out of the crypt to the south.',
    properName: true,
    article: 'the'
  }));

  return room;
}
