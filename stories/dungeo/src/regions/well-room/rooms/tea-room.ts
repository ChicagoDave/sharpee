/**
 * Tea Room - A curious underground room
 *
 * Named for its peculiar furnishings.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createTeaRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Tea Room', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Tea Room',
    aliases: ['tea room'],
    description: 'You are in a small room that was apparently once used for serving tea. A dusty table stands in the center, and faded paintings of pastoral scenes adorn the walls. The air smells musty.',
    properName: true,
    article: 'the'
  }));
  return room;
}
