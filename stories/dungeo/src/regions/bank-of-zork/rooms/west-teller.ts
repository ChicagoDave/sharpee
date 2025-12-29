/**
 * West Teller's Room - Small square room for bank officer
 *
 * Per transcript: "small square room, which was used by a bank officer
 * whose job it was to retrieve safety deposit boxes for the customer"
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createWestTeller(world: WorldModel): IFEntity {
  const room = world.createEntity("West Teller's Room", EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: "West Teller's Room",
    aliases: ['west teller', "west teller's room", 'teller room', 'small square room'],
    description: 'This is a small square room, which was used by a bank officer whose job it was to retrieve safety deposit boxes for the customer. On the north side of the room is a sign which reads "Viewing Room". On the west side of the room, above an open door, is a sign reading\n\n            BANK PERSONNEL ONLY',
    properName: true,
    article: 'the'
  }));
  return room;
}
