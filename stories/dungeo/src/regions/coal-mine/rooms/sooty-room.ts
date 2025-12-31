/**
 * Sooty Room - Contains the red crystal sphere treasure
 *
 * N: Slide Ledge
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createSootyRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Sooty Room', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Sooty Room',
    aliases: ['sooty room', 'room'],
    description: 'You are in a room covered with a thick layer of coal dust and soot. Everything here is coated in black grime. A passage leads north.',
    properName: true,
    article: 'the'
  }));
  return room;
}
