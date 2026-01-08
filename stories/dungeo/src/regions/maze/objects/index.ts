/**
 * Maze Objects - Items in the maze region
 *
 * Grating Room:
 * - Metal grating (scenery, openable - leads up to Clearing)
 *
 * Dead End:
 * - Skeleton (scenery - remains of previous adventurer)
 * - Bag of coins (treasure - 10 take + 5 case = 15 total)
 * - Skeleton key (tool - unlocks the grating)
 *
 * Treasure Room:
 * - Chalice (treasure - 10 take + 10 case = 20 total) - Thief's lair
 */

import {
  WorldModel,
  IdentityTrait,
  SceneryTrait,
  OpenableTrait,
  LockableTrait,
  ContainerTrait,
  EntityType
} from '@sharpee/world-model';

import { MazeRoomIds } from '../index';
import { createIncense } from '../../../objects/thiefs-canvas-objects';

/**
 * Create all objects in the Maze region
 */
export function createMazeObjects(world: WorldModel, roomIds: MazeRoomIds): void {
  // Grating Room objects
  createGratingRoomObjects(world, roomIds.gratingRoom);

  // Dead End objects (skeleton, coins, key are in Dead End 1)
  createDeadEndObjects(world, roomIds.deadEnd1);

  // Treasure Room objects (Thief's lair)
  createTreasureRoomObjects(world, roomIds.treasureRoom);
}

// ============= Grating Room Objects =============

function createGratingRoomObjects(world: WorldModel, roomId: string): void {
  // Metal grating (scenery, openable, lockable)
  const grating = world.createEntity('metal grating', EntityType.SCENERY);
  grating.add(new IdentityTrait({
    name: 'metal grating',
    aliases: ['grating', 'grate', 'metal grate', 'iron grating'],
    description: 'A metal grating is set into the ceiling, leading up to the surface. It appears to be locked.',
    properName: false,
    article: 'a'
  }));
  grating.add(new SceneryTrait());
  grating.add(new OpenableTrait({
    isOpen: false
  }));
  grating.add(new LockableTrait({
    startsLocked: true,
    isLocked: true
  }));
  world.moveEntity(grating.id, roomId);
}

// ============= Dead End Objects =============

function createDeadEndObjects(world: WorldModel, roomId: string): void {
  // Skeleton (scenery - dead adventurer)
  const skeleton = world.createEntity('skeleton', EntityType.SCENERY);
  skeleton.add(new IdentityTrait({
    name: 'skeleton',
    aliases: ['skeleton', 'bones', 'remains', 'adventurer skeleton', 'dead adventurer'],
    description: 'A skeleton lies here, the remains of some unfortunate adventurer who lost their way in this maze long ago.',
    properName: false,
    article: 'a'
  }));
  skeleton.add(new SceneryTrait());
  world.moveEntity(skeleton.id, roomId);

  // Bag of coins (treasure)
  const bag = world.createEntity('bag of coins', EntityType.CONTAINER);
  bag.add(new IdentityTrait({
    name: 'leather bag of coins',
    aliases: ['bag', 'leather bag', 'bag of coins', 'coins', 'coin bag'],
    description: 'A leather bag containing a quantity of coins of various denominations.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  bag.add(new ContainerTrait({
    capacity: { maxItems: 10 }
  }));
  // Mark as treasure
  (bag as any).isTreasure = true;
  (bag as any).treasureId = 'bag-of-coins';
  (bag as any).treasureValue = 10;        // Take value
  (bag as any).trophyCaseValue = 5;       // Additional case value
  world.moveEntity(bag.id, roomId);

  // Skeleton key (tool for unlocking grating)
  const key = world.createEntity('skeleton key', EntityType.ITEM);
  key.add(new IdentityTrait({
    name: 'skeleton key',
    aliases: ['key', 'skeleton key', 'rusty key', 'old key'],
    description: 'An old skeleton key, probably dropped by the unfortunate adventurer whose remains lie nearby.',
    properName: false,
    article: 'a',
    weight: 25
  }));
  // Mark the key as being able to unlock the grating
  (key as any).unlocksId = 'metal grating';
  world.moveEntity(key.id, roomId);

  // Incense - ADR-078 ghost ritual puzzle
  // The skeleton was a devotee who died with this incense
  const incense = createIncense(world);
  world.moveEntity(incense.id, roomId);
}

// ============= Treasure Room Objects =============

function createTreasureRoomObjects(world: WorldModel, roomId: string): void {
  // Chalice (treasure - 10 take + 10 case = 20 total)
  // This is the thief's lair, where he stashes his stolen treasures
  const chalice = world.createEntity('chalice', EntityType.ITEM);
  chalice.add(new IdentityTrait({
    name: 'chalice',
    aliases: ['chalice', 'golden chalice', 'cup', 'goblet', 'ornate chalice'],
    description: 'An ornate golden chalice encrusted with precious gems. It gleams magnificently even in the dim light.',
    properName: false,
    article: 'a',
    weight: 40
  }));
  // Treasure scoring
  (chalice as any).isTreasure = true;
  (chalice as any).treasureId = 'chalice';
  (chalice as any).treasureValue = 10;  // Take value
  (chalice as any).trophyCaseValue = 10;  // Additional case value
  world.moveEntity(chalice.id, roomId);
}
