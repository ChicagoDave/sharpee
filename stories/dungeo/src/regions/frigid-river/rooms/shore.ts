/**
 * Shore - Western bank of the Frigid River
 *
 * A place to land a boat.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createShore(world: WorldModel): IFEntity {
  const room = world.createEntity('Shore', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  room.add(new IdentityTrait({
    name: 'Shore',
    aliases: ['shore', 'river shore', 'bank'],
    description: 'You are on the western shore of the Frigid River. The river flows swiftly past to the east. A path leads into the forest to the west.',
    properName: true,
    article: 'the'
  }));
  return room;
}
