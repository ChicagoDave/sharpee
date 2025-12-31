/**
 * Treasury of Zork - Victory Room!
 *
 * Dungeon message #726: Victory message when entering.
 * This is the final destination - entering awards 35 points and wins the game.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createTreasury(world: WorldModel): IFEntity {
  const room = world.createEntity('Treasury of Zork', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Treasury of Zork',
    aliases: ['treasury', 'treasury of zork'],
    description: 'This is the Treasury of Zork. You have reached the end of your journey! Untold riches surround you - gold, gems, and artifacts beyond measure.',
    properName: true,
    article: 'the'
  }));

  // Mark this as the victory room
  (room as any).isVictoryRoom = true;
  (room as any).awardsPointsOnEntry = 35;

  return room;
}
