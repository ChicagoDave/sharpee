/**
 * Frigid River 2 - Middle section of the river
 *
 * The current grows stronger as the falls approach.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createFrigidRiver2(world: WorldModel): IFEntity {
  const room = world.createEntity('Frigid River', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  room.add(new IdentityTrait({
    name: 'Frigid River',
    aliases: ['frigid river', 'river'],
    description: 'You are on the Frigid River. The current is growing stronger, and you can hear the roar of Aragain Falls somewhere to the south. A sandy beach is visible to the west.',
    properName: true,
    article: 'the'
  }));
  return room;
}
