/**
 * White Cliffs Beach - Beach at the base of the white cliffs
 *
 * Eastern shore of the river.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createWhiteCliffsBeach(world: WorldModel): IFEntity {
  const room = world.createEntity('White Cliffs Beach', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  room.add(new IdentityTrait({
    name: 'White Cliffs Beach',
    aliases: ['white cliffs beach', 'cliffs beach', 'beach'],
    description: 'You are on a narrow beach at the base of towering white cliffs. The cliffs rise dramatically to the east, while the Frigid River flows past to the west. A path leads up the cliff face.',
    properName: true,
    article: 'the'
  }));
  return room;
}
