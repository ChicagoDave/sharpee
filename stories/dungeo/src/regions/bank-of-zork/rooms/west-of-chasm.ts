/**
 * West of Chasm - Western side of the great chasm
 *
 * The Bank of Zork lies to the south from here.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createWestOfChasm(world: WorldModel): IFEntity {
  const room = world.createEntity('West of Chasm', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'West of Chasm',
    aliases: ['west of chasm', 'chasm west'],
    description: 'You are on the west edge of a great chasm. The remains of a collapsed bridge dangle into the darkness below. A narrow ledge runs along the north wall of the chasm, providing precarious passage to the east. To the south, an ornate doorway leads into what appears to be a building.',
    properName: true,
    article: 'the'
  }));
  return room;
}
