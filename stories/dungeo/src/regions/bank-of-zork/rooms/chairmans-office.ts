/**
 * Chairman's Office - The bank chairman's private office
 *
 * Once the seat of power in the Bank of Zork.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createChairmansOffice(world: WorldModel): IFEntity {
  const room = world.createEntity("Chairman's Office", EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: "Chairman's Office",
    aliases: ['chairmans office', 'chairman office', 'office'],
    description: "You are in the opulent office of the Bank's former chairman. A massive mahogany desk dominates the room, and the walls are lined with bookshelves containing leather-bound volumes. A painting hangs on the north wall. Doors lead north and east.",
    properName: true,
    article: 'the'
  }));
  return room;
}
