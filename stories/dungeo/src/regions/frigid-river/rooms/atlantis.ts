/**
 * Atlantis - The legendary underwater city
 *
 * Contains the trident treasure.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createAtlantis(world: WorldModel): IFEntity {
  const room = world.createEntity('Atlantis', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Atlantis',
    aliases: ['atlantis', 'underwater city'],
    description: 'You are in a magnificent underwater chamber, somehow dry and breathable. Ornate columns support a domed ceiling decorated with mosaics of sea creatures. This must be a remnant of the legendary lost city of Atlantis!',
    properName: true,
    article: ''
  }));
  return room;
}
