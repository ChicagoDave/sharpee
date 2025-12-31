/**
 * Parapet - Contains the dial puzzle overlooking the fiery pit
 *
 * Dungeon message #712: Stone retaining wall around a parapet
 * overlooking a fiery pit. Contains a sundial-like device.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createParapet(world: WorldModel): IFEntity {
  const room = world.createEntity('Parapet', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Parapet',
    aliases: ['parapet', 'overlook'],
    // Dungeon message #712
    description: 'You are standing behind a stone retaining wall which rims a large parapet overlooking a fiery pit. It is difficult to see through the smoke and flame which fills the pit, but it seems to be more or less bottomless. It also extends upwards out of sight. The pit itself is of roughly dressed stone and is circular in shape. It is about two hundred feet in diameter. The flames generate considerable heat, so it is rather uncomfortable standing here.\n\nThere is an object here which looks like a sundial. On it are an indicator arrow and (in the center) a large button. On the face of the dial are numbers "one" through "eight".',
    properName: false,
    article: 'the'
  }));

  // Initialize dial state
  world.setStateValue('parapet.dialSetting', 1);

  return room;
}
