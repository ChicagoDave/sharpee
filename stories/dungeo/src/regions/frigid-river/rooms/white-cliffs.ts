/**
 * White Cliffs - Top of the white cliffs
 *
 * Overlooks the river and falls.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createWhiteCliffs(world: WorldModel): IFEntity {
  const room = world.createEntity('White Cliffs', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  room.add(new IdentityTrait({
    name: 'White Cliffs',
    aliases: ['white cliffs', 'cliffs', 'cliff top'],
    description: 'You are atop the white cliffs overlooking the Frigid River. The view is spectacular - you can see Aragain Falls to the south and the river winding northward. A steep path leads down to the beach.',
    properName: true,
    article: 'the'
  }));
  return room;
}
