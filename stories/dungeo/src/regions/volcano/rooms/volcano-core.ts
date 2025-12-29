/**
 * Volcano Core - Center of the volcanic area
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createVolcanoCore(world: WorldModel): IFEntity {
  const room = world.createEntity('Volcano Core', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Volcano Core',
    aliases: ['volcano core', 'core'],
    description: 'You are in a large chamber at the heart of the volcano. Streams of lava flow through channels in the floor. The air shimmers with heat. Passages lead north, east, and up.',
    properName: true,
    article: 'the'
  }));
  return room;
}
