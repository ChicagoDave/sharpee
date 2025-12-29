/**
 * Sandy Beach - A beach along the Frigid River
 *
 * Contains the buoy with emerald.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createSandyBeach(world: WorldModel): IFEntity {
  const room = world.createEntity('Sandy Beach', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  room.add(new IdentityTrait({
    name: 'Sandy Beach',
    aliases: ['sandy beach', 'beach'],
    description: 'You are on a small sandy beach along the western shore of the Frigid River. The sand is coarse and grey. The river flows past to the east, and you can hear the distant thunder of the falls.',
    properName: true,
    article: 'the'
  }));
  return room;
}
