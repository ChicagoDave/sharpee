/**
 * Entry to Hades - Spirits block until exorcism
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createEntryToHades(world: WorldModel): IFEntity {
  const room = world.createEntity('Entrance to Hades', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Entrance to Hades',
    aliases: ['entrance to hades', 'hades entrance', 'gates of hades'],
    description: 'You are at the entrance to Hades, the land of the dead. An eerie mist swirls around you. Ghostly figures seem to hover in the air, blocking passage to the south. A corridor leads north.',
    properName: true,
    article: 'the'
  }));

  // Spirits block until exorcism performed
  (room as any).spiritsBlocking = true;

  return room;
}
