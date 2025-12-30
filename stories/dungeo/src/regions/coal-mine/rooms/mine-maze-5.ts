/**
 * Mine Maze-5
 *
 * W: Mine Maze-2
 * NE: Mine Maze-3
 * S: Mine Maze-3
 * D: Mine Maze-7
 * N: Mine Maze-6
 * E: Mine Maze-4
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createMineMaze5(world: WorldModel): IFEntity {
  const room = world.createEntity('Mine Maze-5', EntityType.ROOM);
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
