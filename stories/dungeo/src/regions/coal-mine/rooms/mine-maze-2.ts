/**
 * Mine Maze-2
 *
 * S: Mine Maze-1
 * W: Mine Maze-5
 * U: Mine Maze-3
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createMineMaze2(world: WorldModel): IFEntity {
  const room = world.createEntity('Mine Maze-2', EntityType.ROOM);
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
