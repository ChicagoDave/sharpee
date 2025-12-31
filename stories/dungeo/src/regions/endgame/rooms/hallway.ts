/**
 * Hallway - Contains the mirror entrance
 *
 * Dungeon message #681: Long hallway with stone channel and compass rose.
 * Messages #682-683: Guardian statues to north and south.
 * The Inside Mirror box can be entered by "GO IN" when visible.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createHallway(world: WorldModel): IFEntity {
  const room = world.createEntity('Hallway', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Hallway',
    aliases: ['hallway', 'long hallway', 'hall'],
    // Dungeon message #681 + #682/683 guardian descriptions
    description: 'This is part of the long hallway. The east and west walls are dressed stone. In the center of the hall is a shallow stone channel. In the center of the room the channel widens into a large hole around which is engraved a compass rose.\n\nIdentical stone statues face each other from pedestals on opposite sides of the corridor. The statues represent Guardians of Zork, a military order of ancient lineage. They are portrayed as heavily armored warriors standing at ease, hands clasped around formidable bludgeons.',
    properName: false,
    article: 'the'
  }));

  return room;
}
