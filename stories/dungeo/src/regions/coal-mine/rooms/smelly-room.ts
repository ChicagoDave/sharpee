/**
 * Smelly Room - Room with gas smell
 *
 * E: Wooden Tunnel
 * D: Gas Room
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createSmellyRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Smelly Room', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Smelly Room',
    aliases: ['smelly room', 'room'],
    description: 'You are in a room with a strong, unpleasant odor. The smell of natural gas is unmistakable. A hole in the floor leads down.',
    properName: true,
    article: 'the'
  }));
  return room;
}
