/**
 * Maintenance Room - Control room for dam, contains panel and tools
 * @see ./maintenance-room.md for full documentation
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createMaintenanceRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Maintenance Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Maintenance Room',
    aliases: ['maintenance room', 'control room', 'maintenance'],
    description: 'This is what appears to be a maintenance room for the dam. Switches, buttons and levers adorn one wall and a poster reads, "NOTICE: CONTROL ROOM ACCESS RESTRICTED TO AUTHORIZED PERSONNEL ONLY".',
    properName: true,
    article: 'the'
  }));

  return room;
}
