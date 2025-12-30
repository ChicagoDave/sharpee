/**
 * Mine Entrance - Main entrance to the coal mine
 *
 * S: Slide Room
 * NW: Squeaky Room
 * NE: Shaft Room
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createMineEntrance(world: WorldModel): IFEntity {
  const room = world.createEntity('Mine Entrance', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Mine Entrance',
    aliases: ['mine entrance', 'entrance'],
    description: 'You are at the entrance to an old coal mine. Wooden support beams frame the entrance, and you can see passages leading in several directions. The air smells of dust and old coal.',
    properName: true,
    article: 'the'
  }));
  return room;
}
