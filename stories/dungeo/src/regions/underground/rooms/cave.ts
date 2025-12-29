/**
 * Cave (Mirror Cave)
 * "This is a tiny cave with entrances west and north, and a dark,
 * forbidding staircase leading down."
 *
 * The DOWN exit destination depends on mirror rub count:
 * - Even (0, 2, 4...): Entrance to Hades
 * - Odd (1, 3, 5...): Atlantis Room
 *
 * Connections per map-connections.md:
 * - W: Mirror Room
 * - D: Hades (even) or Atlantis Room (odd)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType
} from '@sharpee/world-model';

export function createCave(world: WorldModel): IFEntity {
  const room = world.createEntity('Cave', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Cave',
    aliases: ['cave', 'tiny cave', 'mirror cave'],
    description: 'This is a tiny cave with entrances west and north, and a dark, forbidding staircase leading down.',
    properName: true,
    article: 'the'
  }));

  // Mirror rub count - even leads to Hades, odd leads to Atlantis
  (room as any).mirrorRubCount = 0;

  return room;
}
