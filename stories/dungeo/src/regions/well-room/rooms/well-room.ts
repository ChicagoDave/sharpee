/**
 * Well Room - Central room of the Well Room region
 *
 * Features a deep well that leads to lower areas.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createWellRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Well Room', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Well Room',
    aliases: ['well room'],
    description: 'You are in a room with a deep well in the center. The well is lined with ancient stonework and descends into darkness. Passages lead in several directions.',
    properName: true,
    article: 'the'
  }));
  return room;
}
