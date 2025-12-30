/**
 * Squeaky Room - Room with squeaky floor
 *
 * S: Mine Entrance
 * W: Small Room
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createSqueakyRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Squeaky Room', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Squeaky Room',
    aliases: ['squeaky room', 'room'],
    description: 'You are in a room with a wooden floor that squeaks loudly with every step you take. The floorboards are old and warped.',
    properName: true,
    article: 'the'
  }));
  return room;
}
