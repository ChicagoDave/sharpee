/**
 * Tomb of the Unknown Implementer
 *
 * Contains the Crypt entrance (door to the north).
 * Connected south to Land of the Dead.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createTomb(world: WorldModel): IFEntity {
  const room = world.createEntity('Tomb of the Unknown Implementer', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  // Base description - crypt door state is handled dynamically
  room.add(new IdentityTrait({
    name: 'Tomb of the Unknown Implementer',
    aliases: ['tomb', 'tomb of unknown implementer', 'tomb of the unknown implementer'],
    description: 'This is the Tomb of the Unknown Implementer. A hollow voice says, "That\'s not a bug, it\'s a feature!" In the north wall of the room is the Crypt of the Implementers. It is made of the finest marble and is apparently large enough for four headless corpses. Above the entrance is the cryptic inscription: "Feel Free". To the south is a small opening, apparently of recent origin.',
    properName: true,
    article: 'the'
  }));

  return room;
}
