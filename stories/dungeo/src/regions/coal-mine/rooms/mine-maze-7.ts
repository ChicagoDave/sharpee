/**
 * Mine Maze-7
 *
 * U: Mine Maze-5
 * SE: Mine Maze-4
 * NW: Mine Maze-6
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createMineMaze7(world: WorldModel): IFEntity {
  const room = world.createEntity('Mine Maze-7', EntityType.ROOM);
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
