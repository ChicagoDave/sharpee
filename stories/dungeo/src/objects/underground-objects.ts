/**
 * Underground Objects - Items in the underground region (Phase 1)
 *
 * Troll Room:
 * - Troll (NPC - guards passage)
 * - Bloody axe (weapon, if troll defeated)
 *
 * Cellar:
 * - Metal ramp (scenery)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ActorTrait,
  NpcTrait,
  SceneryTrait,
  EntityType
} from '@sharpee/world-model';

import { UndergroundRoomIds } from '../regions/underground';

/**
 * Create all objects in the Underground region
 */
export function createUndergroundObjects(world: WorldModel, roomIds: UndergroundRoomIds): void {
  // Cellar objects
  createCellarObjects(world, roomIds.cellar);

  // Troll Room objects
  createTrollRoomObjects(world, roomIds.trollRoom);
}

// ============= Cellar Objects =============

function createCellarObjects(world: WorldModel, roomId: string): void {
  // Metal ramp (scenery - unclimbable)
  const ramp = world.createEntity('metal ramp', EntityType.SCENERY);
  ramp.add(new IdentityTrait({
    name: 'steep metal ramp',
    aliases: ['ramp', 'metal ramp', 'steep ramp'],
    description: 'A steep metal ramp leading up. It\'s too slippery to climb.',
    properName: false,
    article: 'a'
  }));
  ramp.add(new SceneryTrait());
  world.moveEntity(ramp.id, roomId);
}

// ============= Troll Room Objects =============

function createTrollRoomObjects(world: WorldModel, roomId: string): void {
  // Troll (NPC - blocks east passage using guard behavior)
  const troll = world.createEntity('troll', EntityType.ACTOR);
  troll.add(new IdentityTrait({
    name: 'nasty-looking troll',
    aliases: ['troll', 'nasty troll', 'ugly troll'],
    description: 'A nasty-looking troll stands here, wielding a bloody axe. He blocks the way east.',
    properName: false,
    article: 'a'
  }));
  troll.add(new ActorTrait({
    isPlayer: false
  }));
  troll.add(new NpcTrait({
    behaviorId: 'guard',
    isHostile: true,
    canMove: false  // Troll stays in his room
  }));
  world.moveEntity(troll.id, roomId);

  // Bloody axe (weapon - initially carried by troll or in room after defeating)
  // For now, place it in the room as loot
  const axe = world.createEntity('bloody axe', EntityType.ITEM);
  axe.add(new IdentityTrait({
    name: 'bloody axe',
    aliases: ['axe', 'troll axe', 'bloody weapon'],
    description: 'A large, bloody axe. It looks like it has seen plenty of use.',
    properName: false,
    article: 'a'
  }));
  // Keep axe with troll initially (would need proper NPC inventory)
  // For now, just place in room
  world.moveEntity(axe.id, roomId);
}
