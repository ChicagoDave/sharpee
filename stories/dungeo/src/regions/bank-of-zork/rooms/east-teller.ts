/**
 * East Teller - Eastern teller area
 *
 * Behind the eastern teller window.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createEastTeller(world: WorldModel): IFEntity {
  const room = world.createEntity('East Teller', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'East Teller',
    aliases: ['east teller', 'eastern teller', 'teller east'],
    description: 'You are behind the eastern teller window. This area is much like the western side, with a dusty counter and abandoned paperwork. A passage leads west, and a door to the south leads to the back offices.',
    properName: true,
    article: 'the'
  }));
  return room;
}
