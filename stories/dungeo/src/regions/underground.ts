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
  WeaponTrait
} from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { TrollAxeTrait, TrollTrait, TreasureTrait, TinyRoomDoorTrait, TinyRoomKeyTrait, RopeStateTrait } from '../traits';
import { TrollMessages } from '../npcs/troll';

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
    'This is a dark and damp cellar with a narrow passageway leading east, and a crawlway to the south. To the west is the bottom of a steep metal ramp which is unclimbable.');

  const westOfChasm = createRoom(world, 'West of Chasm',
    'You are on the west edge of a chasm, the walls of which are too steep to climb. A passage leads north.');

  const gallery = createRoom(world, 'Gallery',
    'This is an art gallery. Most of the paintings have been stolen by vandals with exceptional taste. The vandals left through either the north or west exits.');

  const northSouthCrawlway = createRoom(world, 'North/South Crawlway',
    'This is a north-south crawlway; a passage also goes to the east. There is a hole above, but it provides no opportunities for climbing.');

  const trollRoom = createRoom(world, 'Troll Room',
    'This is a small room with passages off in all directions. Bloodstains and deep scratches (perhaps made by an axe) mar the walls.');

  const eastWestPassage = createRoom(world, 'East/West Passage',
    'This is a narrow east-west passageway. There is a narrow stairway leading down at the north end of the room.');

  const deepRavine = createRoom(world, 'Deep Ravine',
    'You are in a deep ravine at a point where a crack opens to the east. A passage leads south, and a steep trail leads down.');

  const rockyCrawl = createRoom(world, 'Rocky Crawl',
    'This is a crawlway with a low ceiling. A passage goes to the east, and a narrow opening leads west.');

  const domeRoom = createRoom(world, 'Dome Room',
    'This is the periphery of a large dome, which forms the ceiling of another room below. Protecting you from a precipitous drop is a wooden railing which circles the dome.');

  const tinyRoom = createRoom(world, 'Tiny Room',
    'This is a tiny room with passages leading east and west.');

  const drearyRoom = createRoom(world, 'Dreary Room',
    'This is a dreary room with passages leading north and east.');

  const chasm = createRoom(world, 'Chasm',
    'A chasm runs southwest to northeast. You are on the east edge.');

  const studio = createRoom(world, 'Studio',
    'This is what appears to have been an artist\'s studio. The walls and floors are splattered with paints of 69 different colors. Strangely enough, nothing of value is hanging here. At the north and northwest of the room are open doors (also covered with paint). An extremely dark and narrow chimney leads up from a fireplace; although you might be able to get up it, it seems unlikely you could get back down.');

  const torchRoom = createRoom(world, 'Torch Room',
    'This is a large room with a prominent doorway leading to a down staircase. To the west is a narrow twisting tunnel, covered with a thin layer of dust. Above you is a large dome painted with scenes depicting elfin hacking rites. Up around the edge of the dome (20 feet up) is a wooden railing. In the center of the room there is a white marble pedestal.');

  // Add rope state trait to Dome Room for rope puzzle
  domeRoom.add(new RopeStateTrait({
    ropeAttached: false,
    hasRailing: true,
    torchRoomId: torchRoom.id
  }));

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
    // WEST → Volcano Egyptian Room connected externally
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
  // Note: The UP exit from Cellar to Living Room is set dynamically when the rug is pushed
  // and the trap door is revealed. See house-interior.ts rug.on['if.event.pushed'] handler.
  // This function now only stores the living room ID for reference if needed.
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

// Troll descriptions from MDL source (dung.355)
const TROLLDESC = 'A nasty-looking troll stands here, wielding a bloody axe. He blocks the northern passage.';
const TROLLOUT = 'An unconscious troll is sprawled on the floor. All passages out of the room are open.';

// Recovery time: 4 turns (MDL original was ~5; 4 accounts for GDT command turns consuming daemon ticks)
const TROLL_RECOVERY_TURNS = 4;

function createTrollRoomObjects(world: WorldModel, roomId: string): void {
  // Bloody axe - create first so we have the ID for troll trait
  // Uses TrollAxeTrait to block taking while troll is alive (ADR-090 universal dispatch)
  const axe = world.createEntity('bloody axe', EntityType.ITEM);
  axe.add(new IdentityTrait({
    name: 'bloody axe',
    aliases: ['axe', 'troll axe', 'bloody weapon'],
    description: 'A large, bloody axe. It looks like it has seen plenty of use.',
    properName: false,
    article: 'a',
    weight: 25
  }));
  // Mark axe as a weapon so troll recognizes it
  axe.add(new WeaponTrait({
    damage: 5,
    weaponType: 'blade',
    attackMessage: 'The troll swings the bloody axe viciously!'
  }));

  // Troll NPC - blocks north passage, can be killed with sword
  const troll = world.createEntity('troll', EntityType.ACTOR);
  troll.add(new IdentityTrait({
    name: 'nasty-looking troll',
    aliases: ['troll', 'nasty troll', 'ugly troll'],
    description: TROLLDESC,
    properName: false,
    article: 'a'
  }));
  troll.add(new ActorTrait({ isPlayer: false }));
  troll.add(new NpcTrait({
    behaviorId: 'troll',  // Custom troll behavior (weapon recovery, cowering)
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
  // TrollTrait for capability dispatch (TAKE TROLL, unarmed ATTACK, TALK when incapacitated)
  troll.add(new TrollTrait({ roomId, axeId: axe.id }));
  world.moveEntity(troll.id, roomId);

  // Now complete axe setup with guardian reference
  axe.add(new TrollAxeTrait({ guardianId: troll.id }));
  world.moveEntity(axe.id, troll.id);

  // Get troll room reference for event handlers
  const trollRoom = world.getEntity(roomId);

  // Helper: Check if item is a knife
  function isKnife(entity: IFEntity | undefined): boolean {
    if (!entity) return false;
    const identity = entity.get?.(IdentityTrait);
    if (!identity) return false;
    const name = identity.name?.toLowerCase() || '';
    const aliases = (identity.aliases || []).map((a: string) => a.toLowerCase());
    return [name, ...aliases].some(n => n.includes('knife') || n.includes('stiletto'));
  }

  // Event handlers for troll state changes and interactions
  (troll as any).on = {
    // Knocked out handler (OUT!) - MDL act1.254
    // Fires when troll is knocked unconscious via combat
    'if.event.knocked_out': (_event: ISemanticEvent, w: WorldModel): ISemanticEvent[] => {
      const events: ISemanticEvent[] = [];

      // Update description to TROLLOUT
      const identity = troll.get(IdentityTrait);
      if (identity) {
        identity.description = TROLLOUT;
      }

      // Unblock north exit
      if (trollRoom) {
        RoomBehavior.unblockExit(trollRoom, Direction.NORTH);
      }

      // Set recovery turns
      const combatant = troll.get(CombatantTrait);
      if (combatant) {
        combatant.recoveryTurns = TROLL_RECOVERY_TURNS;
      }

      // Sync NpcTrait consciousness (NPC service checks NpcTrait.canAct separately)
      const npcTrait = troll.get(NpcTrait);
      if (npcTrait) {
        npcTrait.isConscious = false;
      }

      // Note: Axe visibility is handled by TrollAxeVisibilityBehavior
      // which checks combatant.isAlive && !combatant.isConscious

      return events;
    },

    // Death handler - troll disappears in smoke (Zork I commercial behavior)
    'if.event.death': (_event: ISemanticEvent, w: WorldModel): ISemanticEvent[] => {
      const events: ISemanticEvent[] = [];

      // Only handle troll's death, not other entities
      if ((_event.data as Record<string, unknown>)?.target !== troll.id) return events;

      // Unblock passage
      if (trollRoom) {
        RoomBehavior.unblockExit(trollRoom, Direction.NORTH);
      }

      // Add score (NOTE: .on handlers are dead code — scoring handled by melee interceptor)
      w.awardScore('troll-killed', 10, 'Defeated the troll');

      // Show smoke disappear message
      events.push({
        id: generateEventId(),
        type: 'game.message',
        entities: {},
        data: { messageId: TrollMessages.SMOKE_DISAPPEAR },
        timestamp: Date.now(),
        narrate: true
      });

      // Remove troll and axe from the game
      // (Zork I commercial: "the carcass has disappeared")
      world.removeEntity(axe.id);
      world.removeEntity(troll.id);

      return events;
    },

    // GIVE item TO TROLL - MDL act1.254
    // Troll catches items: eats non-knife, throws knife back
    'if.event.given': (event: ISemanticEvent, w: WorldModel): ISemanticEvent[] => {
      const events: ISemanticEvent[] = [];
      const data = event.data as { item: string; recipient: string };

      // Only handle items given to this troll
      if (data.recipient !== troll.id) return events;

      const item = w.getEntity(data.item);
      if (!item) return events;

      if (isKnife(item)) {
        // Knife: troll throws it back to the floor
        world.moveEntity(item.id, roomId);
        events.push({
          id: generateEventId(),
          type: 'game.message',
          entities: { target: troll.id, instrument: item.id },
          data: {
            messageId: TrollMessages.THROWS_KNIFE_BACK,
            itemName: item.name
          },
          timestamp: Date.now(),
          narrate: true
        });
      } else {
        // Non-knife: troll eats it (destroy the item)
        world.removeEntity(item.id);
        events.push({
          id: generateEventId(),
          type: 'game.message',
          entities: { target: troll.id, instrument: item.id },
          data: {
            messageId: TrollMessages.EATS_ITEM,
            itemName: item.name
          },
          timestamp: Date.now(),
          narrate: true
        });
      }

      return events;
    },

    // THROW item AT TROLL - MDL act1.254
    // Same behavior as giving - troll catches items
    'if.event.thrown': (event: ISemanticEvent, w: WorldModel): ISemanticEvent[] => {
      const events: ISemanticEvent[] = [];
      const data = event.data as { item: string; target?: string; throwType: string };

      // Only handle items thrown at this troll
      if (data.target !== troll.id || data.throwType !== 'at_target') return events;

      const item = w.getEntity(data.item);
      if (!item) return events;

      // Troll catches it first
      events.push({
        id: generateEventId(),
        type: 'game.message',
        entities: { target: troll.id, instrument: item.id },
        data: {
          messageId: TrollMessages.CATCHES_ITEM,
          itemName: item.name
        },
        timestamp: Date.now(),
        narrate: true
      });

      if (isKnife(item)) {
        // Knife: troll throws it back to the floor
        world.moveEntity(item.id, roomId);
        events.push({
          id: generateEventId(),
          type: 'game.message',
          entities: { target: troll.id, instrument: item.id },
          data: {
            messageId: TrollMessages.THROWS_KNIFE_BACK,
            itemName: item.name
          },
          timestamp: Date.now(),
          narrate: true
        });
      } else {
        // Non-knife: troll eats it
        world.removeEntity(item.id);
        events.push({
          id: generateEventId(),
          type: 'game.message',
          entities: { target: troll.id, instrument: item.id },
          data: {
            messageId: TrollMessages.EATS_ITEM,
            itemName: item.name
          },
          timestamp: Date.now(),
          narrate: true
        });
      }

      return events;
    }
  };
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
    weight: 20,
    points: 4              // OFVAL from mdlzork_810722
  }));
  painting.add(new TreasureTrait({
    trophyCaseValue: 7,    // OTVAL from mdlzork_810722
  }));
  world.moveEntity(painting.id, roomId);
}

// ============= Studio Objects =============

function createStudioObjects(world: WorldModel, roomId: string): void {
  // Chimney (scenery - leads UP to Kitchen)
  const chimney = world.createEntity('chimney', EntityType.SCENERY);
  chimney.add(new IdentityTrait({
    name: 'chimney',
    aliases: ['chimney', 'dark chimney', 'fireplace chimney', 'narrow chimney', 'fireplace'],
    description: 'The chimney is very dark and narrow. You might be able to climb up it, but it seems unlikely you could get back down.',
    properName: false,
    article: 'a'
  }));
  chimney.add(new SceneryTrait());
  world.moveEntity(chimney.id, roomId);

  // Paint splatters (scenery)
  const paint = world.createEntity('paint', EntityType.SCENERY);
  paint.add(new IdentityTrait({
    name: 'paint',
    aliases: ['paint', 'paints', 'splatter', 'splatters', 'paint splatters', 'colors'],
    description: 'The walls and floors are splattered with paints of 69 different colors. It looks like the work of a very messy artist.',
    properName: false,
    article: 'some'
  }));
  paint.add(new SceneryTrait());
  world.moveEntity(paint.id, roomId);
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
  // Ivory torch - treasure, permanent light source (always lit, cannot be switched)
  // Only extinguished when thrown at glacier
  const torch = world.createEntity('ivory torch', EntityType.ITEM);
  torch.add(new IdentityTrait({
    name: 'ivory torch',
    aliases: ['torch', 'ivory', 'white torch'],
    description: 'A beautiful torch of polished ivory, its flame burning brightly.',
    properName: false,
    article: 'an',
    weight: 5,
    points: 14             // OFVAL from mdlzork_810722
  }));
  torch.add(new LightSourceTrait({
    isLit: true,  // Always lit - permanent light source
    brightness: 3,
    fuelRemaining: 1000,
    maxFuel: 1000,
    fuelConsumptionRate: 0  // Never burns out
  }));
  // No SwitchableTrait - player cannot turn it on/off
  torch.attributes.isFlame = true;  // Open flame - dangerous in Gas Room
  torch.add(new TreasureTrait({
    trophyCaseValue: 6,    // OTVAL from mdlzork_810722
  }));
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
  door.add(new TinyRoomDoorTrait({
    keyInLock: true,
    matUnderDoor: false,
    keyOnMat: false,
    connectsRooms: [tinyRoomId, drearyRoomId],
    blocksDirection: {
      [tinyRoomId]: 'NORTH',
      [drearyRoomId]: 'SOUTH'
    }
  }));
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
  key.add(new TinyRoomKeyTrait({ isHidden: true }));
  world.moveEntity(key.id, tinyRoomId);
}

// ============= Dreary Room Objects =============

function createDrearyRoomObjects(world: WorldModel, roomId: string): void {
  // Blue crystal sphere - treasure (10 take + 5 case = 15 total)
  const sphere = world.createEntity('blue crystal sphere', EntityType.ITEM);
  sphere.add(new IdentityTrait({
    name: 'blue crystal sphere',
    aliases: ['sphere', 'crystal sphere', 'blue sphere', 'crystal', 'blue crystal', 'ball'],
    adjectives: ['blue'],
    description: 'A beautiful sphere of blue crystal. It seems to glow with an inner light.',
    properName: false,
    article: 'a',
    weight: 5,
    points: 10             // OFVAL from mdlzork_810722
  }));
  sphere.add(new TreasureTrait({
    trophyCaseValue: 5,    // OTVAL from mdlzork_810722
  }));
  world.moveEntity(sphere.id, roomId);
}
