/**
 * Mine Maze-4
 *
 * S: Mine Maze-1
 * NE: Mine Maze-7
 * U: Mine Maze-5
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createMineMaze4(world: WorldModel): IFEntity {
  const room = world.createEntity('Mine Maze-4', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Maze',
    aliases: ['maze', 'mine maze'],
    description: 'You are in a maze of twisty little passages, all alike.',
    properName: false,
    article: 'a'
  }));
  return room;
}
