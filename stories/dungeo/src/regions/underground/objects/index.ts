/**
 * Underground Objects - Items in the underground region (Phase 1)
 *
 * Troll Room:
 * - Troll (NPC - guards passage, can be killed)
 * - Bloody axe (weapon, dropped when troll defeated)
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
  CombatantTrait,
  RoomBehavior,
  EntityType,
  Direction,
  StandardCapabilities
} from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';

import { UndergroundRoomIds } from '../index';

// Simple ID generator for events
let eventCounter = 0;
function generateEventId(): string {
  return `evt-${Date.now()}-${++eventCounter}`;
}

/**
 * Create all objects in the Underground region
 */
export function createUndergroundObjects(world: WorldModel, roomIds: UndergroundRoomIds): void {
  // Cellar objects
  createCellarObjects(world, roomIds.cellar);

  // Troll Room objects
  createTrollRoomObjects(world, roomIds.trollRoom);

  // Gallery objects
  createGalleryObjects(world, roomIds.gallery);

  // Studio objects
  createStudioObjects(world, roomIds.studio);
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
  // Troll (NPC - blocks east passage, can be killed with sword)
  const troll = world.createEntity('troll', EntityType.ACTOR);
  troll.add(new IdentityTrait({
    name: 'nasty-looking troll',
    aliases: ['troll', 'nasty troll', 'ugly troll'],
    description: 'A nasty-looking troll stands here, wielding a bloody axe. He blocks the northern passage.',
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
  // Make troll a combatant so it can be attacked and killed
  // 10 HP means 2 good sword hits (5+1 each) will kill it
  troll.add(new CombatantTrait({
    health: 10,
    maxHealth: 10,
    skill: 40,           // Moderate combat skill
    baseDamage: 5,       // Hits hard with that axe
    armor: 0,
    hostile: true,
    canRetaliate: true,
    dropsInventory: true,
    deathMessage: 'The troll lets out a final grunt and collapses!'
  }));
  world.moveEntity(troll.id, roomId);

  // Add death handler - when troll dies, unblock the north passage and add score
  const trollRoom = world.getEntity(roomId);
  (troll as any).on = {
    'if.event.death': (_event: ISemanticEvent, w: WorldModel): ISemanticEvent[] => {
      const events: ISemanticEvent[] = [];

      // Unblock the north passage (leads to E/W Passage and deeper dungeon)
      if (trollRoom) {
        RoomBehavior.unblockExit(trollRoom, Direction.NORTH);
      }

      // Add score for defeating the troll
      const scoring = w.getCapability(StandardCapabilities.SCORING);
      if (scoring) {
        scoring.scoreValue = (scoring.scoreValue || 0) + 10;
        if (!scoring.achievements) {
          scoring.achievements = [];
        }
        scoring.achievements.push('Defeated the troll');
      }

      // Emit message about passage being clear
      events.push({
        id: generateEventId(),
        type: 'game.message',
        entities: {},
        data: {
          messageId: 'dungeo.troll.death.passage_clear'
        },
        timestamp: Date.now(),
        narrate: true
      });

      return events;
    }
  };

  // Bloody axe (weapon - initially with troll, drops when killed)
  const axe = world.createEntity('bloody axe', EntityType.ITEM);
  axe.add(new IdentityTrait({
    name: 'bloody axe',
    aliases: ['axe', 'troll axe', 'bloody weapon'],
    description: 'A large, bloody axe. It looks like it has seen plenty of use.',
    properName: false,
    article: 'a'
  }));
  // Place axe in troll's inventory (will drop when killed via dropsInventory)
  world.moveEntity(axe.id, troll.id);
}

// ============= Gallery Objects =============

function createGalleryObjects(world: WorldModel, roomId: string): void {
  // Painting (treasure - 4 take + 7 case = 11 total)
  const painting = world.createEntity('painting', EntityType.ITEM);
  painting.add(new IdentityTrait({
    name: 'painting',
    aliases: ['painting', 'picture', 'art', 'artwork', 'canvas'],
    description: 'A painting of remarkable beauty, depicting a woodland scene. It is the only painting remaining in the gallery.',
    properName: false,
    article: 'a'
  }));
  // Treasure scoring
  (painting as any).isTreasure = true;
  (painting as any).treasureId = 'painting';
  (painting as any).treasureValue = 4;  // Take value
  (painting as any).trophyCaseValue = 7;  // Additional case value
  world.moveEntity(painting.id, roomId);
}

// ============= Studio Objects =============

function createStudioObjects(world: WorldModel, roomId: string): void {
  // Chimney (scenery - leads down to Kitchen)
  const chimney = world.createEntity('chimney', EntityType.SCENERY);
  chimney.add(new IdentityTrait({
    name: 'chimney',
    aliases: ['chimney', 'dark chimney', 'fireplace chimney'],
    description: 'A dark chimney leads down. You could probably climb down it.',
    properName: false,
    article: 'a'
  }));
  chimney.add(new SceneryTrait());
  world.moveEntity(chimney.id, roomId);

  // Grotesque drawings (scenery)
  const drawings = world.createEntity('drawings', EntityType.SCENERY);
  drawings.add(new IdentityTrait({
    name: 'crude drawings',
    aliases: ['drawings', 'crude drawings', 'grotesque creatures', 'pictures'],
    description: 'The walls are covered with crude drawings of what appear to be grotesque creatures, perhaps the work of a disturbed artist.',
    properName: false,
    article: 'some'
  }));
  drawings.add(new SceneryTrait());
  world.moveEntity(drawings.id, roomId);
}
