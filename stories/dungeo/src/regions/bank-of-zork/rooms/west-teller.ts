/**
 * West Teller - Western teller area
 *
 * Behind the western teller window.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createWestTeller(world: WorldModel): IFEntity {
  const room = world.createEntity('West Teller', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'West Teller',
    aliases: ['west teller', 'western teller', 'teller west'],
    description: 'You are behind the western teller window. A dusty counter separates this area from the lobby. Scattered papers and old ledgers lie about. A passage leads east to the eastern teller area.',
    properName: true,
    article: 'the'
  }));
  return room;
}
