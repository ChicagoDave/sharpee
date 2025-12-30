/**
 * Small Chamber - Contains the ruby treasure
 *
 * Accessible through Glacier Room after melting the ice with torch.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createSmallChamber(world: WorldModel): IFEntity {
  const room = world.createEntity('Small Chamber', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Small Chamber',
    aliases: ['small chamber', 'chamber'],
    description: 'You are in a small chamber. The walls are covered with red crystite formations that sparkle in the light. Passages lead south and west.',
    properName: true,
    article: 'the'
  }));

  return room;
}
