/**
 * Frigid River 3 - Near the falls
 *
 * Dangerously close to Aragain Falls!
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createFrigidRiver3(world: WorldModel): IFEntity {
  const room = world.createEntity('Frigid River', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  room.add(new IdentityTrait({
    name: 'Frigid River',
    aliases: ['frigid river', 'river'],
    description: 'You are on the Frigid River, perilously close to the top of Aragain Falls! The thundering of the waterfall is deafening. The current here is extremely strong. White cliffs rise to the east.',
    properName: true,
    article: 'the'
  }));

  // Mark as water room - requires boat to enter
  (room as any).isWaterRoom = true;

  return room;
}
