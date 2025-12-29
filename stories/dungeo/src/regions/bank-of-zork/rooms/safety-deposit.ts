/**
 * Safety Depository - Large rectangular room with stone cube
 *
 * Central room of the bank's security area with the shimmering curtain puzzle.
 * The stone cube contains a clue about the vault.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createSafetyDeposit(world: WorldModel): IFEntity {
  const room = world.createEntity('Safety Depository', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Safety Depository',
    aliases: ['safety depository', 'depository', 'safety deposit'],
    description: 'This is a large rectangular room. The east and west walls here were used for storing safety deposit boxes. As might be expected, all have been carefully removed by evil persons. To the east, west, and south of the room are large doorways. The northern "wall" of the room is a shimmering curtain of light. In the center of the room is a large stone cube, about 10 feet on a side. Engraved on the side of the cube is some lettering.',
    properName: true,
    article: 'the'
  }));
  return room;
}
