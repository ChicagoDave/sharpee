/**
 * Underground Region - The Great Underground Empire
 *
 * 14 rooms: Cellar, West of Chasm, Gallery, North/South Crawlway, Troll Room,
 * East/West Passage, Deep Ravine, Rocky Crawl, Dome Room, Tiny Room,
 * Dreary Room, Chasm, Studio, Torch Room
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  RoomBehavior,
  EntityType,
  Direction,
  DirectionType,
  ActorTrait,
  NpcTrait,
  CombatantTrait,
  SceneryTrait,
  ContainerTrait,
  OpenableTrait,
  LightSourceTrait,
  SwitchableTrait,
  LockableTrait,
  StandardCapabilities
} from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';

export interface UndergroundRoomIds {
  cellar: string;
  westOfChasm: string;
  gallery: string;
  northSouthCrawlway: string;
  trollRoom: string;
  eastWestPassage: string;
  deepRavine: string;
  rockyCrawl: string;
  domeRoom: string;
  tinyRoom: string;
  drearyRoom: string;
  chasm: string;
  studio: string;
  torchRoom: string;
}

function createRoom(world: WorldModel, name: string, description: string, isDark = true): IFEntity {
  const room = world.createEntity(name, EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark, isOutdoors: false }));
  room.add(new IdentityTrait({ name, description, properName: true, article: 'the' }));
  return room;
}

function setExits(room: IFEntity, exits: Partial<Record<DirectionType, string>>): void {
  const roomTrait = room.get(RoomTrait);
  if (roomTrait) {
    for (const [dir, dest] of Object.entries(exits)) {
      roomTrait.exits[dir as DirectionType] = { destination: dest! };
    }
  }
}

export function createUndergroundRegion(world: WorldModel): UndergroundRoomIds {
  // === Create all rooms ===

  const cellar = createRoom(world, 'Cellar',
    'You are in a dark and damp cellar with a narrow passageway leading east, and a crawlway to the south. On the west is the bottom of a steep metal ramp which is unclimbable.');

  const westOfChasm = createRoom(world, 'West of Chasm',
    'You are on the west edge of a chasm, the walls of which are too steep to climb. A passage leads north.');

  const gallery = createRoom(world, 'Gallery',
    'This is an art gallery. Most of the paintings have been stolen by vandals with exceptional taste. The vandals left through either the north or west exits.');

  const northSouthCrawlway = createRoom(world, 'North/South Crawlway',
    'This is a north-south crawlway; a passage also goes to the east. There is a hole above, but it provides no opportunities for climbing.');

  const trollRoom = createRoom(world, 'Troll Room',
    'This is a small room with passages off in all directions. Bloodstains and deep scratches (perhaps made by straying adventurers) mar the walls.');

  const eastWestPassage = createRoom(world, 'East/West Passage',
    'This is a narrow east-west passageway. There is a narrow stairway leading down at the north end of the room.');

  const deepRavine = createRoom(world, 'Deep Ravine',
    'You are in a deep ravine at a point where a crack opens to the east. A passage leads south, and a steep trail leads down.');

  const rockyCrawl = createRoom(world, 'Rocky Crawl',
    'This is a crawlway with a low ceiling. A passage goes to the east, and a narrow opening leads west.');

  const domeRoom = createRoom(world, 'Dome Room',
    'You are at the base of a large dome. A passage leads south. High above you is a narrow ledge.');
  (domeRoom as any).ropeAttached = false;
  (domeRoom as any).hasRailing = true;

  const tinyRoom = createRoom(world, 'Tiny Room',
    'This is a tiny room with passages leading east and west.');

  const drearyRoom = createRoom(world, 'Dreary Room',
    'This is a dreary room with passages leading north and east.');

  const chasm = createRoom(world, 'Chasm',
    'A chasm runs southwest to northeast. You are on the east edge.');

  const studio = createRoom(world, 'Studio',
    'This appears to have been an artist\'s studio. The walls are covered with sketches of mountains. A stairway leads down. The only other exit is to the northwest.');

  const torchRoom = createRoom(world, 'Torch Room',
    'This is a large room with a prominent doorway leading to a down staircase. To the west is a narrow passage. Above you is a narrow ledge.');

  // Link Dome Room to Torch Room for rope puzzle
  (domeRoom as any).torchRoomId = torchRoom.id;

  // === Set up connections ===

  setExits(cellar, { [Direction.EAST]: trollRoom.id });
  // UP → Living Room connected externally

  setExits(trollRoom, {
    [Direction.WEST]: cellar.id,
    [Direction.NORTH]: eastWestPassage.id,
    [Direction.EAST]: northSouthCrawlway.id,
    // SOUTH → Maze connected externally
  });
  RoomBehavior.blockExit(trollRoom, Direction.NORTH, 'The troll blocks your way.');

  setExits(eastWestPassage, {
    [Direction.SOUTH]: trollRoom.id,
    [Direction.NORTH]: deepRavine.id,
    [Direction.DOWN]: deepRavine.id,
    // EAST → Round Room connected externally
  });

  setExits(northSouthCrawlway, {
    [Direction.EAST]: trollRoom.id,
    [Direction.SOUTH]: studio.id,
    [Direction.UP]: torchRoom.id,
    // NORTH → West of Chasm connected via Bank
  });

  setExits(studio, {
    [Direction.NORTHWEST]: gallery.id,
    [Direction.NORTH]: northSouthCrawlway.id,
    // UP → Kitchen via chimney connected externally
  });

  setExits(gallery, {
    [Direction.SOUTH]: studio.id,
    // NORTH → West of Chasm, WEST → Bank connected via Bank
  });

  setExits(deepRavine, {
    [Direction.SOUTH]: eastWestPassage.id,
    [Direction.WEST]: rockyCrawl.id,
    [Direction.EAST]: chasm.id,
  });

  setExits(chasm, {
    [Direction.WEST]: deepRavine.id,
    // EAST → Temple N/S Passage connected externally
  });

  setExits(rockyCrawl, {
    [Direction.EAST]: deepRavine.id,
    [Direction.WEST]: domeRoom.id,
    // NW → Volcano Egyptian Room connected externally
  });

  setExits(domeRoom, {
    [Direction.EAST]: rockyCrawl.id,
    // DOWN → Torch Room requires rope
  });

  setExits(torchRoom, {
    [Direction.UP]: domeRoom.id,
    [Direction.DOWN]: northSouthCrawlway.id,
    [Direction.WEST]: tinyRoom.id,
  });

  setExits(tinyRoom, {
    [Direction.EAST]: torchRoom.id,
    [Direction.NORTH]: drearyRoom.id,  // Blocked by locked door
  });
  setExits(drearyRoom, { [Direction.SOUTH]: tinyRoom.id });

  // West of Chasm connections handled by Bank region

  return {
    cellar: cellar.id,
    westOfChasm: westOfChasm.id,
    gallery: gallery.id,
    northSouthCrawlway: northSouthCrawlway.id,
    trollRoom: trollRoom.id,
    eastWestPassage: eastWestPassage.id,
    deepRavine: deepRavine.id,
    rockyCrawl: rockyCrawl.id,
    domeRoom: domeRoom.id,
    tinyRoom: tinyRoom.id,
    drearyRoom: drearyRoom.id,
    chasm: chasm.id,
    studio: studio.id,
    torchRoom: torchRoom.id,
  };
}

// === External connectors ===

export function connectUndergroundToHouse(world: WorldModel, ids: UndergroundRoomIds, livingRoomId: string): void {
  const cellar = world.getEntity(ids.cellar);
  if (cellar) {
    const trait = cellar.get(RoomTrait);
    if (trait) trait.exits[Direction.UP] = { destination: livingRoomId, via: 'trapdoor' };
  }
}

export function connectStudioToKitchen(world: WorldModel, ids: UndergroundRoomIds, kitchenId: string): void {
  const studio = world.getEntity(ids.studio);
  if (studio) {
    const trait = studio.get(RoomTrait);
    if (trait) trait.exits[Direction.UP] = { destination: kitchenId };
  }
}

// ============================================================================
// OBJECTS - Created near their default room locations
// ============================================================================

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

  // Troll Room objects (troll NPC + axe)
  createTrollRoomObjects(world, roomIds.trollRoom);

  // Gallery objects (painting treasure)
  createGalleryObjects(world, roomIds.gallery);

  // Studio objects (chimney, drawings)
  createStudioObjects(world, roomIds.studio);

  // Dome Room objects (railing for rope puzzle)
  createDomeRoomObjects(world, roomIds.domeRoom);

  // Torch Room objects (ivory torch treasure)
  createTorchRoomObjects(world, roomIds.torchRoom);

  // Tiny Room objects (locked door puzzle)
  createTinyRoomObjects(world, roomIds.tinyRoom, roomIds.drearyRoom);

  // Dreary Room objects (blue crystal sphere treasure)
  createDrearyRoomObjects(world, roomIds.drearyRoom);
}

// ============= Cellar Objects =============

function createCellarObjects(world: WorldModel, roomId: string): void {
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
  // Troll NPC - blocks north passage, can be killed with sword
  const troll = world.createEntity('troll', EntityType.ACTOR);
  troll.add(new IdentityTrait({
    name: 'nasty-looking troll',
    aliases: ['troll', 'nasty troll', 'ugly troll'],
    description: 'A nasty-looking troll stands here, wielding a bloody axe. He blocks the northern passage.',
    properName: false,
    article: 'a'
  }));
  troll.add(new ActorTrait({ isPlayer: false }));
  troll.add(new NpcTrait({
    behaviorId: 'guard',
    isHostile: true,
    canMove: false
  }));
  troll.add(new CombatantTrait({
    health: 10,
    maxHealth: 10,
    skill: 40,
    baseDamage: 5,
    armor: 0,
    hostile: true,
    canRetaliate: true,
    dropsInventory: true,
    deathMessage: 'The troll lets out a final grunt and collapses!'
  }));
  world.moveEntity(troll.id, roomId);

  // Death handler - unblock passage and add score
  const trollRoom = world.getEntity(roomId);
  (troll as any).on = {
    'if.event.death': (_event: ISemanticEvent, w: WorldModel): ISemanticEvent[] => {
      const events: ISemanticEvent[] = [];
      if (trollRoom) {
        RoomBehavior.unblockExit(trollRoom, Direction.NORTH);
      }
      const scoring = w.getCapability(StandardCapabilities.SCORING);
      if (scoring) {
        scoring.scoreValue = (scoring.scoreValue || 0) + 10;
        if (!scoring.achievements) scoring.achievements = [];
        scoring.achievements.push('Defeated the troll');
      }
      events.push({
        id: generateEventId(),
        type: 'game.message',
        entities: {},
        data: { messageId: 'dungeo.troll.death.passage_clear' },
        timestamp: Date.now(),
        narrate: true
      });
      return events;
    }
  };

  // Bloody axe - in troll's inventory, drops when killed
  const axe = world.createEntity('bloody axe', EntityType.ITEM);
  axe.add(new IdentityTrait({
    name: 'bloody axe',
    aliases: ['axe', 'troll axe', 'bloody weapon'],
    description: 'A large, bloody axe. It looks like it has seen plenty of use.',
    properName: false,
    article: 'a',
    weight: 25
  }));
  world.moveEntity(axe.id, troll.id);
}

// ============= Gallery Objects =============

function createGalleryObjects(world: WorldModel, roomId: string): void {
  // Painting treasure (4 take + 7 case = 11 total)
  const painting = world.createEntity('painting', EntityType.ITEM);
  painting.add(new IdentityTrait({
    name: 'painting',
    aliases: ['painting', 'picture', 'art', 'artwork', 'canvas'],
    description: 'A painting of remarkable beauty, depicting a woodland scene. It is the only painting remaining in the gallery.',
    properName: false,
    article: 'a',
    weight: 20
  }));
  (painting as any).isTreasure = true;
  (painting as any).treasureId = 'painting';
  (painting as any).treasureValue = 7;    // OTVAL from 1981 MDL
  (painting as any).trophyCaseValue = 4;  // OFVAL from 1981 MDL
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

// ============= Dome Room Objects =============

function createDomeRoomObjects(world: WorldModel, roomId: string): void {
  // Railing - scenery for rope puzzle
  const railing = world.createEntity('railing', EntityType.SCENERY);
  railing.add(new IdentityTrait({
    name: 'railing',
    aliases: ['rail', 'iron railing', 'sturdy railing'],
    description: 'A sturdy iron railing surrounds a deep shaft in the center of the room. Looking down, you can see only darkness.',
    properName: false,
    article: 'a'
  }));
  railing.add(new SceneryTrait());
  world.moveEntity(railing.id, roomId);
}

// ============= Torch Room Objects =============

function createTorchRoomObjects(world: WorldModel, roomId: string): void {
  // Ivory torch - treasure (6 pts), permanent light source once lit
  const torch = world.createEntity('ivory torch', EntityType.ITEM);
  torch.add(new IdentityTrait({
    name: 'ivory torch',
    aliases: ['torch', 'ivory', 'white torch'],
    description: 'A beautiful torch made of polished ivory. It is not currently lit.',
    properName: false,
    article: 'an',
    weight: 5
  }));
  torch.add(new LightSourceTrait({
    isLit: false,
    brightness: 3,
    fuelRemaining: 1000,
    maxFuel: 1000,
    fuelConsumptionRate: 0  // Never burns out
  }));
  torch.add(new SwitchableTrait({ isOn: false }));
  (torch as any).isTreasure = true;
  (torch as any).treasureId = 'ivory-torch';
  (torch as any).treasureValue = 6;       // OTVAL from 1981 MDL
  (torch as any).trophyCaseValue = 14;    // OFVAL from 1981 MDL
  world.moveEntity(torch.id, roomId);
}

// ============= Tiny Room Objects =============

function createTinyRoomObjects(world: WorldModel, tinyRoomId: string, drearyRoomId: string): void {
  // Small door - locked, key puzzle
  const door = world.createEntity('small door', EntityType.DOOR);
  door.add(new IdentityTrait({
    name: 'small door',
    aliases: ['door', 'north door', 'wooden door', 'tiny door'],
    description: 'A small wooden door leads north. There is a keyhole at eye level.',
    properName: false,
    article: 'a'
  }));
  door.add(new OpenableTrait({ isOpen: false }));
  door.add(new SceneryTrait());
  door.add(new LockableTrait({ isLocked: true }));
  (door as any).keyInLock = true;
  (door as any).matUnderDoor = false;
  (door as any).keyOnMat = false;
  (door as any).connectsRooms = [tinyRoomId, drearyRoomId];
  (door as any).blocksDirection = {
    [tinyRoomId]: 'NORTH',
    [drearyRoomId]: 'SOUTH'
  };
  (door as any).isTinyRoomDoor = true;
  world.moveEntity(door.id, tinyRoomId);

  // Small key - initially "in the lock" on Dreary Room side
  const key = world.createEntity('small key', EntityType.ITEM);
  key.add(new IdentityTrait({
    name: 'small key',
    aliases: ['key', 'brass key', 'tiny key'],
    description: 'A small brass key.',
    properName: false,
    article: 'a',
    weight: 25
  }));
  (key as any).isHidden = true;
  (key as any).isTinyRoomKey = true;
  world.moveEntity(key.id, tinyRoomId);
}

// ============= Dreary Room Objects =============

function createDrearyRoomObjects(world: WorldModel, roomId: string): void {
  // Blue crystal sphere - treasure (10 take + 5 case = 15 total)
  const sphere = world.createEntity('blue crystal sphere', EntityType.ITEM);
  sphere.add(new IdentityTrait({
    name: 'blue crystal sphere',
    aliases: ['sphere', 'crystal sphere', 'blue sphere', 'crystal', 'blue crystal', 'ball'],
    description: 'A beautiful sphere of blue crystal. It seems to glow with an inner light.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  (sphere as any).isTreasure = true;
  (sphere as any).treasureId = 'blue-crystal-sphere';
  (sphere as any).treasureValue = 5;      // OTVAL from 1981 MDL
  (sphere as any).trophyCaseValue = 10;   // OFVAL from 1981 MDL
  world.moveEntity(sphere.id, roomId);
}
