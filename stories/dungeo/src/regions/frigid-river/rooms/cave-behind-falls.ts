/**
 * Cave Behind Falls - A cave behind Aragain Falls
 *
 * Hidden passage connecting areas.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createCaveBehindFalls(world: WorldModel): IFEntity {
  const room = world.createEntity('Cave Behind Falls', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Cave Behind Falls',
    aliases: ['cave behind falls', 'cave', 'behind falls'],
    description: 'You are in a damp cave behind Aragain Falls. The roar of the water is muffled but ever-present. Passages lead in several directions.',
    properName: true,
    article: 'the'
  }));
  return room;
}
