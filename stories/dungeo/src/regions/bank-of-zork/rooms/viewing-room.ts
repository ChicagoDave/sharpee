/**
 * Viewing Room - Where customers view their safety deposit contents
 *
 * Reached by walking through the curtain (after completing the wall-walk cycle).
 * Contains the warning sign about the protective device.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createViewingRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Viewing Room', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Viewing Room',
    aliases: ['viewing room', 'viewing'],
    description: 'This is a room used by holders of safety deposit boxes to view their contents. On the north side of the room is a sign which says\n\nREMAIN HERE WHILE THE BANK OFFICER RETRIEVES YOUR DEPOSIT BOX\nWHEN YOU ARE FINISHED, LEAVE THE BOX, AND EXIT TO THE SOUTH\nAN ADVANCED PROTECTIVE DEVICE PREVENTS ALL CUSTOMERS FROM\nREMOVING ANY SAFETY DEPOSIT BOX FROM THIS VIEWING AREA!\nThank you for banking at the Zork!',
    properName: true,
    article: 'the'
  }));
  return room;
}
