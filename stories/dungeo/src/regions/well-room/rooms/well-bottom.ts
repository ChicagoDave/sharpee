/**
 * Well Bottom - Bottom of a well with bucket mechanism
 *
 * The bucket starts here and can rise to Top of Well when water is poured in.
 * East of Pearl Room.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createWellBottom(world: WorldModel): IFEntity {
  const room = world.createEntity('Well Bottom', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Well Bottom',
    aliases: ['well bottom', 'bottom of well'],
    description: 'You are at the bottom of a well. The walls are slick with moisture and rise up into darkness. A wooden bucket hangs from a rope attached to a windlass far above.',
    properName: true,
    article: 'the'
  }));
  return room;
}
