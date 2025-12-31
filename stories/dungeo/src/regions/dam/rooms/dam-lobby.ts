/**
 * Dam Lobby - Waiting room for dam tours, contains guidebook
 * @see ./dam-lobby.md for full documentation
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createDamLobby(world: WorldModel): IFEntity {
  const room = world.createEntity('Dam Lobby', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false, // Has some lighting
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Dam Lobby',
    aliases: ['lobby', 'dam lobby', 'waiting room'],
    description: 'This room appears to have been the waiting room for groups touring the dam. There are benches and a door leading north to the dam. Some brochures on a wall rack describe the history of Flood Control Dam #3.',
    properName: true,
    article: 'the'
  }));

  return room;
}
