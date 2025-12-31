/**
 * Riddle Room - A room with a mysterious riddle
 *
 * The riddle must be solved to proceed.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createRiddleRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Riddle Room', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Riddle Room',
    aliases: ['riddle room'],
    description: 'You are in a small room with writing carved into every surface. The walls, floor, and ceiling are covered with strange symbols and what appears to be a riddle in an ancient tongue.',
    properName: true,
    article: 'the'
  }));
  return room;
}
