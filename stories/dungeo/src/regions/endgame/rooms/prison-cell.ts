/**
 * Prison Cell - One of 8 cells around the fiery pit
 *
 * Dungeon messages #721-725: Various states of the prison cell.
 * Only cell 4 has the bronze door to the Treasury.
 * The cell visible depends on the dial setting.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createPrisonCell(world: WorldModel): IFEntity {
  const room = world.createEntity('Prison Cell', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Prison Cell',
    aliases: ['prison cell', 'cell'],
    // Dungeon message #721 (default state - will be dynamic)
    description: 'This is a featureless prison cell. You can see only the flames and smoke of the pit out of the small window in a closed wooden door in front of you.',
    properName: false,
    article: 'the'
  }));

  // Track which cell is currently rotated into position
  world.setStateValue('prisonCell.currentCell', null);
  world.setStateValue('prisonCell.bronzeDoorVisible', false);

  return room;
}
