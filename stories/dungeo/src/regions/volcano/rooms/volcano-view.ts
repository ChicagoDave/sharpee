/**
 * Volcano View - Top of the volcano with the Moby Ruby
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createVolcanoView(world: WorldModel): IFEntity {
  const room = world.createEntity('Volcano View', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  room.add(new IdentityTrait({
    name: 'Volcano View',
    aliases: ['volcano view', 'volcano top'],
    description: 'You are at the rim of the volcano. The view is breathtaking - you can see the entire Great Underground Empire stretching out below. Hot gases rise from the crater.',
    properName: true,
    article: 'the'
  }));
  return room;
}
