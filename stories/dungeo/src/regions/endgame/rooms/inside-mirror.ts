/**
 * Inside Mirror - The rotating/sliding box puzzle
 *
 * Dungeon message #688-694: Complex description of the wooden box.
 * This is one of the most intricate puzzles in the game.
 *
 * The box can rotate and slide along a groove in the hallway floor.
 * Players must manipulate poles and panels to navigate through the
 * guardian statues to reach the Dungeon Entrance.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createInsideMirror(world: WorldModel): IFEntity {
  const room = world.createEntity('Inside Mirror', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Inside Mirror',
    aliases: ['inside mirror', 'mirror room', 'box', 'structure'],
    // Dungeon message #688 (partial - full description is very long)
    description: 'You are inside a rectangular box of wood whose structure is rather complicated. Four sides and the roof are filled in, and the floor is open.\n\nAs you face the side opposite the entrance, two short sides of carved and polished wood are to your left and right. The left panel is mahogany, the right pine. The wall you face is red on its left half and black on its right. On the entrance side, the wall is white opposite the red part of the wall it faces, and yellow opposite the black section. The painted walls are at least twice the length of the unpainted ones. The ceiling is painted blue.\n\nIn the floor is a stone channel about six inches wide and a foot deep. The channel is oriented in a north-south direction. In the exact center of the room the channel widens into a circular depression perhaps two feet wide. Incised in the stone around this area is a compass rose.\n\nRunning from one short wall to the other at about waist height is a wooden bar, carefully carved and drilled. This bar is pierced in two places. Through each hole runs a wooden pole.',
    properName: false,
    article: 'the'
  }));

  // Initialize Inside Mirror state
  // MDIR: 0=N, 45=NE, 90=E, etc (we'll use degrees)
  // MLOC: position along the groove (0-3)
  // POLEUF: 0=lowered in channel, 1=on floor, 2=raised
  world.setStateValue('insideMirror.direction', 0); // Facing north
  world.setStateValue('insideMirror.position', 0); // Starting position
  world.setStateValue('insideMirror.poleState', 1); // On floor initially

  return room;
}
