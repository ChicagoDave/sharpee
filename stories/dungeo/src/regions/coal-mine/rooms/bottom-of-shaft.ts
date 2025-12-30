/**
 * Bottom of Shaft
 *
 * E: Machine Room
 * NE: Timber Room
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createBottomOfShaft(world: WorldModel): IFEntity {
  const room = world.createEntity('Bottom of Shaft', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Bottom of Shaft',
    aliases: ['bottom of shaft', 'shaft bottom'],
    description: 'You are at the bottom of a deep shaft. The walls rise up into darkness above you. Passages lead east and northeast.',
    properName: true,
    article: 'the'
  }));
  return room;
}
