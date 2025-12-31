/**
 * Coal Mine Dead End
 *
 * S: Ladder Bottom
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createCoalMineDeadEnd(world: WorldModel): IFEntity {
  const room = world.createEntity('Coal Mine Dead End', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Dead End',
    aliases: ['dead end'],
    description: 'You have reached a dead end in the coal mine. The passage ends abruptly here.',
    properName: false,
    article: 'a'
  }));
  return room;
}
