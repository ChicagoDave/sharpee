/**
 * Engravings Cave
 * "You have entered a cave with passages leading north and southeast.
 * There are old engravings on the walls here."
 *
 * Both S and N from Round Room lead here (compass confusion).
 * SE (or DOWN) leads to Riddle Room.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createEngravingsCave(world: WorldModel): IFEntity {
  const room = world.createEntity('Engravings Cave', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Engravings Cave',
    aliases: ['engravings cave', 'cave with engravings', 'engravings'],
    description: 'You have entered a cave with passages leading north and southeast. There are old engravings on the walls here.',
    properName: true,
    article: 'the'
  }));

  return room;
}
