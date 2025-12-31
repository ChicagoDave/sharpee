/**
 * Basin Room Objects - ADR-078 Thief's Canvas Puzzle
 *
 * The stone basin is the focal point of the ghost ritual.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  SceneryTrait,
  EntityType
} from '@sharpee/world-model';

/**
 * Create the stone basin (scenery) in the Basin Room
 */
export function createStoneBasin(world: WorldModel, roomId: string): IFEntity {
  const basin = world.createEntity('stone basin', EntityType.ITEM);

  basin.add(new IdentityTrait({
    name: 'stone basin',
    aliases: ['basin', 'carved basin', 'gargoyle basin'],
    description: 'The basin is carved from a single block of dark stone, surrounded by gargoyles and serpent figures. It is filled with what can only be described as a mystical fog.',
    properName: false,
    article: 'a'
  }));

  basin.add(new SceneryTrait({}));

  // Mark as the ritual basin for PRAY action
  (basin as any).isRitualBasin = true;

  world.moveEntity(basin.id, roomId);
  return basin;
}
