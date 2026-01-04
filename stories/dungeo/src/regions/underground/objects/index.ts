/**
 * Underground Objects - Items in the underground region (Phase 1)
 *
 * Troll Room:
 * - Troll (NPC - guards passage, can be killed)
 * - Bloody axe (weapon, dropped when troll defeated)
 *
 * Cellar:
 * - Metal ramp (scenery)
 *
 * Gallery:
 * - Painting (treasure - 4 take + 7 case = 11 total)
 *
 * Grail Room:
 * - Pedestal (scenery)
 * - Grail (treasure - 2 take + 5 case = 7 total)
 *
 * Round Room:
 * - Wooden box (container)
 * - Fancy violin (treasure - 10 take + 10 case = 20 total)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ActorTrait,
  NpcTrait,
  SceneryTrait,
  CombatantTrait,
  ContainerTrait,
  OpenableTrait,
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

  // Grail Room objects
  createGrailRoomObjects(world, roomIds.grailRoom);

  // Round Room objects
  createRoundRoomObjects(world, roomIds.roundRoom);

  // Mirror Room objects
  createMirrorRoomObjects(world, roomIds.mirrorRoom);

  // Small Cave objects
  createSmallCaveObjects(world, roomIds.smallCave);
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

// ============= Grail Room Objects =============

function createGrailRoomObjects(world: WorldModel, roomId: string): void {
  // Pedestal (scenery)
  const pedestal = world.createEntity('pedestal', EntityType.SCENERY);
  pedestal.add(new IdentityTrait({
    name: 'stone pedestal',
    aliases: ['pedestal', 'stone pedestal', 'altar'],
    description: 'A stone pedestal stands in the center of the room, carved with ancient symbols.',
    properName: false,
    article: 'a'
  }));
  pedestal.add(new SceneryTrait());
  world.moveEntity(pedestal.id, roomId);

  // Grail (treasure - 2 take + 5 case = 7 total)
  const grail = world.createEntity('grail', EntityType.ITEM);
  grail.add(new IdentityTrait({
    name: 'grail',
    aliases: ['grail', 'holy grail', 'cup', 'goblet', 'sacred grail'],
    description: 'A plain wooden grail, yet it radiates an aura of ancient holiness. Its simple appearance belies its true value.',
    properName: false,
    article: 'a'
  }));
  // Treasure scoring
  (grail as any).isTreasure = true;
  (grail as any).treasureId = 'grail';
  (grail as any).treasureValue = 2;  // Take value
  (grail as any).trophyCaseValue = 5;  // Additional case value
  world.moveEntity(grail.id, roomId);
}

// ============= Round Room Objects =============

function createRoundRoomObjects(world: WorldModel, roomId: string): void {
  // Wooden box (container - holds the violin)
  const box = world.createEntity('wooden box', EntityType.CONTAINER);
  box.add(new IdentityTrait({
    name: 'wooden box',
    aliases: ['box', 'wooden box', 'small box', 'case'],
    description: 'A small wooden box, carefully crafted and latched shut.',
    properName: false,
    article: 'a'
  }));
  box.add(new ContainerTrait({
    capacity: { maxItems: 3 }
  }));
  box.add(new OpenableTrait({ isOpen: false }));
  world.moveEntity(box.id, roomId);

  // Fancy violin (treasure - 10 take + 10 case = 20 total)
  const violin = world.createEntity('fancy violin', EntityType.ITEM);
  violin.add(new IdentityTrait({
    name: 'fancy violin',
    aliases: ['violin', 'fancy violin', 'fiddle', 'musical instrument', 'stradivarius'],
    description: 'An exquisitely crafted violin of remarkable beauty. The workmanship is extraordinary, with intricate inlays and a lustrous finish.',
    properName: false,
    article: 'a'
  }));
  // Treasure scoring
  (violin as any).isTreasure = true;
  (violin as any).treasureId = 'fancy-violin';
  (violin as any).treasureValue = 10;  // Take value
  (violin as any).trophyCaseValue = 10;  // Additional case value

  // Place violin inside the box (temporarily open it)
  const boxOpenable = box.get(OpenableTrait);
  if (boxOpenable) {
    boxOpenable.isOpen = true;
    world.moveEntity(violin.id, box.id);
    boxOpenable.isOpen = false;
  }
}

// ============= Mirror Room Objects =============

/**
 * Mirror ID for use by the mirror handler
 */
export const MIRROR_ID = 'dungeo-mirror';

function createMirrorRoomObjects(world: WorldModel, roomId: string): void {
  // The enormous mirror on the south wall
  // Touching/rubbing it toggles the room's exit state
  const mirror = world.createEntity('mirror', EntityType.SCENERY);
  (mirror as any).customId = MIRROR_ID;  // Set a known ID for the handler

  mirror.add(new IdentityTrait({
    name: 'enormous mirror',
    aliases: ['mirror', 'enormous mirror', 'south mirror', 'wall mirror', 'large mirror'],
    description: 'An enormous mirror fills the entire south wall of the room. Its surface is flawless and seems to shimmer with an otherworldly quality.',
    properName: false,
    article: 'an'
  }));
  mirror.add(new SceneryTrait());
  world.moveEntity(mirror.id, roomId);
}

// ============= Small Cave Objects =============

function createSmallCaveObjects(world: WorldModel, roomId: string): void {
  // Shovel (tool - used to dig in sandy areas, e.g., Sandy Beach for scarab)
  const shovel = world.createEntity('shovel', EntityType.ITEM);
  shovel.add(new IdentityTrait({
    name: 'shovel',
    aliases: ['shovel', 'spade'],
    description: 'A sturdy shovel with a wooden handle and metal blade.',
    properName: false,
    article: 'a'
  }));
  world.moveEntity(shovel.id, roomId);
}
