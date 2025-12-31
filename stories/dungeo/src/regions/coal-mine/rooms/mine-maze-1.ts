/**
 * Mine Maze-1
 *
 * E: Wooden Tunnel
 * N: Mine Maze-4
 * SW: Mine Maze-2
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createMineMaze1(world: WorldModel): IFEntity {
  const room = world.createEntity('Mine Maze-1', EntityType.ROOM);
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
