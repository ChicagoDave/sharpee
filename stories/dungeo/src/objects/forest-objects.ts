/**
 * Forest Objects - Items in the forest region
 *
 * Forest Path 1:
 * - Large tree (scenery, climbable)
 *
 * Clearing:
 * - Pile of leaves (scenery)
 * - Grating (leads to underground)
 *
 * Up a Tree:
 * - Bird's nest (contains egg)
 * - Jewel-encrusted egg (treasure, contains golden clockwork canary)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ContainerTrait,
  OpenableTrait,
  SceneryTrait,
  EntityType
} from '@sharpee/world-model';

import { ForestRoomIds } from '../regions/forest';

/**
 * Create all objects in the Forest region
 */
export function createForestObjects(world: WorldModel, roomIds: ForestRoomIds): void {
  // Forest Path 1 objects
  createForestPath1Objects(world, roomIds.forestPath1);

  // Clearing objects
  createClearingObjects(world, roomIds.clearing);

  // Up a Tree objects
  createTreeObjects(world, roomIds.upATree);
}

// ============= Forest Path 1 Objects =============

function createForestPath1Objects(world: WorldModel, roomId: string): void {
  // Large tree (scenery, can climb)
  const tree = world.createEntity('large tree', EntityType.SCENERY);
  tree.add(new IdentityTrait({
    name: 'large tree',
    aliases: ['tree', 'big tree', 'tall tree'],
    description: 'A particularly large tree with some low branches. It looks climbable.',
    properName: false,
    article: 'a'
  }));
  tree.add(new SceneryTrait());
  world.moveEntity(tree.id, roomId);
}

// ============= Clearing Objects =============

function createClearingObjects(world: WorldModel, roomId: string): void {
  // Pile of leaves (scenery)
  const leaves = world.createEntity('pile of leaves', EntityType.SCENERY);
  leaves.add(new IdentityTrait({
    name: 'pile of leaves',
    aliases: ['leaves', 'pile', 'leaf pile'],
    description: 'A large pile of dead leaves. They rustle in the wind.',
    properName: false,
    article: 'a'
  }));
  leaves.add(new SceneryTrait());
  world.moveEntity(leaves.id, roomId);

  // Grating (leads to underground - locked initially)
  const grating = world.createEntity('grating', EntityType.SCENERY);
  grating.add(new IdentityTrait({
    name: 'grating',
    aliases: ['grate', 'iron grating', 'metal grating'],
    description: 'A grating firmly fixed into the ground. It appears to lead underground.',
    properName: false,
    article: 'a'
  }));
  grating.add(new OpenableTrait({ isOpen: false }));
  grating.add(new SceneryTrait());
  world.moveEntity(grating.id, roomId);
}

// ============= Up a Tree Objects =============

function createTreeObjects(world: WorldModel, roomId: string): void {
  // Bird's nest (container)
  const nest = world.createEntity('nest', EntityType.CONTAINER);
  nest.add(new IdentityTrait({
    name: 'small bird\'s nest',
    aliases: ['nest', 'bird nest', 'birds nest'],
    description: 'A small bird\'s nest tucked among the branches.',
    properName: false,
    article: 'a'
  }));
  nest.add(new ContainerTrait({
    capacity: { maxItems: 3 }
  }));
  nest.add(new SceneryTrait());
  world.moveEntity(nest.id, roomId);

  // Jewel-encrusted egg (treasure - contains canary)
  const egg = world.createEntity('jewel-encrusted egg', EntityType.CONTAINER);
  egg.add(new IdentityTrait({
    name: 'jewel-encrusted egg',
    aliases: ['egg', 'jeweled egg', 'beautiful egg', 'faberge egg'],
    description: 'A beautiful jewel-encrusted egg. It appears to open somehow.',
    properName: false,
    article: 'a'
  }));
  egg.add(new ContainerTrait({
    capacity: { maxItems: 1 }
  }));
  egg.add(new OpenableTrait({ isOpen: false }));
  // Place egg in nest
  world.moveEntity(egg.id, nest.id);

  // Golden clockwork canary (inside egg - very fragile)
  const canary = world.createEntity('golden canary', EntityType.ITEM);
  canary.add(new IdentityTrait({
    name: 'golden clockwork canary',
    aliases: ['canary', 'bird', 'clockwork canary', 'golden bird'],
    description: 'A beautiful golden clockwork canary. It sings when wound.',
    properName: false,
    article: 'a'
  }));
  // Place canary in egg (temporarily open egg)
  const eggOpenable = egg.get(OpenableTrait);
  if (eggOpenable) {
    eggOpenable.isOpen = true;
    world.moveEntity(canary.id, egg.id);
    eggOpenable.isOpen = false;
  }
}
