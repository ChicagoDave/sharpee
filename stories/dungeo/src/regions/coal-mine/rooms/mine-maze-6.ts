/**
 * Mine Maze-6
 *
 * W: Mine Maze-5
 * S: Mine Maze-7
 * D: Ladder Top
 * E: Mine Maze-1
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createMineMaze6(world: WorldModel): IFEntity {
  const room = world.createEntity('Mine Maze-6', EntityType.ROOM);
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
