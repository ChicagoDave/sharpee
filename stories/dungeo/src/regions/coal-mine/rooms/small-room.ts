/**
 * Small Room - Dead end west of Squeaky Room
 *
 * E: Squeaky Room
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createSmallRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Small Room', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Small Room',
    aliases: ['small room'],
    description: 'This is a small, cramped room carved out of the rock. A passage leads east.',
    properName: true,
    article: 'the'
  }));
  return room;
}
