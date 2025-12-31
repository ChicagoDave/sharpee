/**
 * Dome Room - High ceiling, rope puzzle
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createDomeRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Dome Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Dome Room',
    aliases: ['dome room', 'domed room'],
    description: 'You are at the base of a tall domed chamber. The ceiling is lost in darkness far above. There is a railing around a deep shaft in the center of the room. A passage leads north.',
    properName: true,
    article: 'the'
  }));

  // Rope can be tied here to descend
  (room as any).hasRailing = true;
  (room as any).ropeAttached = false;

  return room;
}
