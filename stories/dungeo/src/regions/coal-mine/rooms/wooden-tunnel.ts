/**
 * Wooden Tunnel - Tunnel supported by wooden beams
 *
 * S: Shaft Room
 * W: Smelly Room
 * NE: Mine Maze-1
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createWoodenTunnel(world: WorldModel): IFEntity {
  const room = world.createEntity('Wooden Tunnel', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Wooden Tunnel',
    aliases: ['wooden tunnel', 'tunnel'],
    description: 'You are in a tunnel reinforced with wooden beams and supports. The timbers creak ominously as you pass through.',
    properName: true,
    article: 'the'
  }));
  return room;
}
