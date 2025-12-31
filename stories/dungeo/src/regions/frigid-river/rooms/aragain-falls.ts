/**
 * Aragain Falls - The mighty waterfall
 *
 * A spectacular but deadly waterfall.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createAragainFalls(world: WorldModel): IFEntity {
  const room = world.createEntity('Aragain Falls', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  room.add(new IdentityTrait({
    name: 'Aragain Falls',
    aliases: ['aragain falls', 'falls', 'waterfall'],
    description: 'You are at the top of Aragain Falls, a magnificent waterfall that plunges hundreds of feet into a misty gorge below. A beautiful rainbow arcs through the spray. Going over the falls would be certain death.',
    properName: true,
    article: ''
  }));
  return room;
}
