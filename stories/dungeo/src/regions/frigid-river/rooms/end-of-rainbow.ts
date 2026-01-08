/**
 * End of Rainbow - Where the rainbow ends
 *
 * The legendary pot of gold is here.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createEndOfRainbow(world: WorldModel): IFEntity {
  const room = world.createEntity('End of Rainbow', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  room.add(new IdentityTrait({
    name: 'End of Rainbow',
    aliases: ['end of rainbow', 'rainbow end'],
    description: 'You are on a small ledge at the end of the rainbow. The ledge overlooks the misty gorge below Aragain Falls. There is barely room to stand here.',
    properName: true,
    article: 'the'
  }));

  // Mark as rainbow room - can walk to/from water rooms
  (room as any).isRainbowRoom = true;

  return room;
}
