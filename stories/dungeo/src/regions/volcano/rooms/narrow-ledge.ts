/**
 * Narrow Ledge - Dangerous path along volcano wall
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createNarrowLedge(world: WorldModel): IFEntity {
  const room = world.createEntity('Narrow Ledge', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Narrow Ledge',
    aliases: ['narrow ledge', 'ledge'],
    description: 'You are on a narrow ledge high above the lava. The heat is intense. One wrong step could be fatal. The ledge continues south toward the volcano core.',
    properName: true,
    article: 'the'
  }));
  return room;
}
