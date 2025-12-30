/**
 * Ruby Room - Contains the ruby treasure
 *
 * Accessible through Glacier Room after melting the ice with torch.
 * Per map-connections.md: S→Glacier Room, W→Lava Room
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createRubyRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Ruby Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Ruby Room',
    aliases: ['ruby room'],
    description: 'You are in a small chamber. The walls are covered with red crystite formations that sparkle in the light. Passages lead south and west.',
    properName: true,
    article: 'the'
  }));

  return room;
}
