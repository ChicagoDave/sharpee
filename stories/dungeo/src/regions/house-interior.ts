/**
 * House Interior Region - Rooms inside the white house
 *
 * 3 rooms: Kitchen, Living Room, Attic
 * These form the initial indoor area before descending into the GUE.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType,
  Direction,
  DirectionType,
  ContainerTrait,
  OpenableTrait,
  SceneryTrait,
  LightSourceTrait,
  SwitchableTrait,
  PushableTrait,
  RoomBehavior,
  WeaponTrait,
  IGameEvent
} from '@sharpee/world-model';

export interface HouseInteriorRoomIds {
  kitchen: string;
  livingRoom: string;
  attic: string;
}

// Simple ID generator for events
let eventCounter = 0;
function generateEventId(): string {
  return `evt-${Date.now()}-${++eventCounter}`;
}

function createRoom(world: WorldModel, name: string, description: string): IFEntity {
  const room = world.createEntity(name, EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  room.add(new IdentityTrait({ name, description, properName: true, article: 'the' }));
  return room;
}

function setExits(room: IFEntity, exits: Partial<Record<DirectionType, string>>): void {
  const trait = room.get(RoomTrait);
  if (trait) {
    for (const [dir, dest] of Object.entries(exits)) {
      trait.exits[dir as DirectionType] = { destination: dest! };
    }
  }
}

export function createHouseInteriorRegion(world: WorldModel): HouseInteriorRoomIds {
  // === Create all rooms ===

  const kitchen = createRoom(world, 'Kitchen',
    'You are in the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west, and a dark staircase can be seen leading upward. To the east is a small window which is open.');

  const livingRoom = createRoom(world, 'Living Room',
    'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a large oriental rug in the center of the room.');

  const attic = createRoom(world, 'Attic',
    'This is the attic. The only exit is a stairway leading down. A large coil of rope is lying in the corner. On a table is a nasty-looking knife.');

  // === Set up connections ===

  setExits(kitchen, {
    [Direction.WEST]: livingRoom.id,
    [Direction.UP]: attic.id,
    // East leads to Behind House - connected externally
    // Down leads to Cellar - connected via trapdoor
  });

  setExits(livingRoom, {
    [Direction.EAST]: kitchen.id,
    // Down through trapdoor - connected via rug reveal
  });

  setExits(attic, { [Direction.DOWN]: kitchen.id });

  return {
    kitchen: kitchen.id,
    livingRoom: livingRoom.id,
    attic: attic.id,
  };
}

// === External connectors ===

/**
 * Connect House Interior to White House exterior
 */
export function connectHouseInteriorToExterior(
  world: WorldModel,
  interiorIds: HouseInteriorRoomIds,
  behindHouseId: string
): void {
  const kitchen = world.getEntity(interiorIds.kitchen);
  if (kitchen) {
    kitchen.get(RoomTrait)!.exits[Direction.EAST] = { destination: behindHouseId };
  }

  const behindHouse = world.getEntity(behindHouseId);
  if (behindHouse) {
    behindHouse.get(RoomTrait)!.exits[Direction.WEST] = { destination: interiorIds.kitchen };
  }
}

// ============================================================================
// OBJECTS - Created near their default room locations
// ============================================================================

/**
 * Create all objects in the House Interior
 */
export function createHouseInteriorObjects(
  world: WorldModel,
  roomIds: HouseInteriorRoomIds,
  cellarId?: string
): void {
  createKitchenObjects(world, roomIds.kitchen);
  createLivingRoomObjects(world, roomIds.livingRoom, cellarId);
  createAtticObjects(world, roomIds.attic);
}

// ============= Kitchen Objects =============

function createKitchenObjects(world: WorldModel, kitchenId: string): void {
  const table = world.createEntity('kitchen table', EntityType.SCENERY);
  table.add(new IdentityTrait({
    name: 'kitchen table',
    aliases: ['table', 'wooden table'],
    description: 'A sturdy wooden table used for food preparation.',
    properName: false,
    article: 'a'
  }));
  table.add(new SceneryTrait());
  world.moveEntity(table.id, kitchenId);

  const sack = world.createEntity('brown sack', EntityType.CONTAINER);
  sack.add(new IdentityTrait({
    name: 'elongated brown sack',
    aliases: ['sack', 'brown sack', 'bag', 'brown bag'],
    description: 'A brown sack smelling of hot peppers.',
    properName: false,
    article: 'an',
    weight: 5
  }));
  sack.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
  sack.add(new OpenableTrait({ isOpen: true }));
  world.moveEntity(sack.id, kitchenId);

  const lunch = world.createEntity('lunch', EntityType.ITEM);
  lunch.add(new IdentityTrait({
    name: 'lunch',
    aliases: ['food', 'meal', 'provisions'],
    description: 'A hearty lunch.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  world.moveEntity(lunch.id, sack.id);

  const garlic = world.createEntity('garlic', EntityType.ITEM);
  garlic.add(new IdentityTrait({
    name: 'clove of garlic',
    aliases: ['garlic', 'clove'],
    description: 'A clove of garlic. Its strong smell might ward off something...',
    properName: false,
    article: 'a',
    weight: 3
  }));
  world.moveEntity(garlic.id, sack.id);

  const bottle = world.createEntity('glass bottle', EntityType.CONTAINER);
  bottle.add(new IdentityTrait({
    name: 'glass bottle',
    aliases: ['bottle', 'clear bottle', 'water bottle'],
    description: 'A clear glass bottle containing water.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  bottle.add(new ContainerTrait({ capacity: { maxItems: 1 } }));
  bottle.add(new OpenableTrait({ isOpen: false }));
  world.moveEntity(bottle.id, kitchenId);

  const water = world.createEntity('water', EntityType.ITEM);
  water.add(new IdentityTrait({
    name: 'quantity of water',
    aliases: ['water'],
    description: 'Clear, fresh water.',
    properName: false,
    article: 'a'
  }));
  const bottleOpenable = bottle.get(OpenableTrait);
  if (bottleOpenable) {
    bottleOpenable.isOpen = true;
    world.moveEntity(water.id, bottle.id);
    bottleOpenable.isOpen = false;
  }
}

// ============= Living Room Objects =============

function createLivingRoomObjects(world: WorldModel, livingRoomId: string, cellarId?: string): void {
  const trophyCase = world.createEntity('trophy case', EntityType.CONTAINER);
  trophyCase.add(new IdentityTrait({
    name: 'trophy case',
    aliases: ['case', 'glass case', 'display case'],
    description: 'A handsome trophy case with a glass front.',
    properName: false,
    article: 'a'
  }));
  trophyCase.add(new ContainerTrait({ capacity: { maxItems: 20 } }));
  trophyCase.add(new OpenableTrait({ isOpen: false }));
  trophyCase.add(new SceneryTrait());
  world.moveEntity(trophyCase.id, livingRoomId);

  const sword = world.createEntity('elvish sword', EntityType.ITEM);
  sword.add(new IdentityTrait({
    name: 'elvish sword',
    aliases: ['sword', 'elvish blade', 'blade', 'antique sword'],
    description: 'An elvish sword of great antiquity. Its blade glows faintly blue.',
    properName: false,
    article: 'an',
    weight: 10
  }));
  sword.add(new WeaponTrait({ damage: 3, skillBonus: 10, weaponType: 'blade' }));
  world.moveEntity(sword.id, livingRoomId);

  const lantern = world.createEntity('brass lantern', EntityType.ITEM);
  lantern.add(new IdentityTrait({
    name: 'brass lantern',
    aliases: ['lantern', 'lamp', 'light', 'brass lamp'],
    description: 'A battery-powered brass lantern.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  lantern.add(new LightSourceTrait({
    isLit: false,
    brightness: 3,
    fuelRemaining: 330,
    maxFuel: 330,
    fuelConsumptionRate: 1
  }));
  lantern.add(new SwitchableTrait({ isOn: false }));
  world.moveEntity(lantern.id, livingRoomId);

  const trapdoor = world.createEntity('trap door', EntityType.SCENERY);
  trapdoor.add(new IdentityTrait({
    name: 'trap door',
    aliases: ['trapdoor', 'door'],
    adjectives: ['trap'],
    description: 'The dusty cover of a closed trap door.',
    properName: false,
    article: 'a'
  }));
  trapdoor.add(new OpenableTrait({ isOpen: false }));
  trapdoor.add(new SceneryTrait());

  // Handle trap door opening - update description and provide custom message
  trapdoor.on = {
    'if.event.opened': (event: IGameEvent) => {
      // Update description to reflect open state
      const identity = trapdoor.get(IdentityTrait);
      if (identity) {
        identity.description = 'The trap door is open, revealing a rickety staircase descending into darkness.';
      }
      // Return custom message for opening
      return [{
        id: generateEventId(),
        type: 'game.message',
        entities: { actor: event.entities.actor, target: trapdoor.id },
        data: { messageId: 'dungeo.trapdoor.opened' },
        timestamp: Date.now(),
        narrate: true
      }];
    },
    'if.event.closed': (event: IGameEvent) => {
      // Update description back to closed state
      const identity = trapdoor.get(IdentityTrait);
      if (identity) {
        identity.description = 'The dusty cover of a closed trap door.';
      }
      return [];
    }
  };

  const rug = world.createEntity('oriental rug', EntityType.SCENERY);
  rug.add(new IdentityTrait({
    name: 'large oriental rug',
    aliases: ['rug', 'oriental rug', 'carpet', 'large rug'],
    description: 'A large oriental rug in the center of the room.',
    properName: false,
    article: 'a'
  }));
  rug.add(new SceneryTrait());
  rug.add(new PushableTrait({ pushType: 'moveable', repeatable: false, state: 'default' }));

  rug.on = {
    'if.event.pushed': (event: IGameEvent) => {
      const pushable = rug.get(PushableTrait);
      if (pushable && pushable.state === 'pushed') {
        return [];
      }
      world.moveEntity(trapdoor.id, livingRoomId);
      if (cellarId) {
        const livingRoom = world.getEntity(livingRoomId);
        if (livingRoom) {
          RoomBehavior.setExit(livingRoom, Direction.DOWN, cellarId, trapdoor.id);
        }
        // Also set the UP exit from Cellar to Living Room via trapdoor
        const cellar = world.getEntity(cellarId);
        if (cellar) {
          RoomBehavior.setExit(cellar, Direction.UP, livingRoomId, trapdoor.id);
        }
      }
      if (pushable) {
        pushable.state = 'pushed';
      }
      return [{
        id: generateEventId(),
        type: 'game.message',
        entities: { actor: event.entities.actor, target: trapdoor.id, location: livingRoomId },
        data: { messageId: 'dungeo.rug.moved.reveal_trapdoor' },
        timestamp: Date.now(),
        narrate: true
      }];
    }
  };

  world.moveEntity(rug.id, livingRoomId);

  const woodenDoor = world.createEntity('wooden door', EntityType.SCENERY);
  woodenDoor.add(new IdentityTrait({
    name: 'wooden door',
    aliases: ['door', 'west door', 'gothic door'],
    description: 'A wooden door with strange gothic lettering. It appears to be nailed shut.',
    properName: false,
    article: 'a'
  }));
  woodenDoor.add(new SceneryTrait());
  world.moveEntity(woodenDoor.id, livingRoomId);
}

// ============= Attic Objects =============

function createAtticObjects(world: WorldModel, atticId: string): void {
  const table = world.createEntity('attic table', EntityType.SCENERY);
  table.add(new IdentityTrait({
    name: 'table',
    aliases: ['table', 'small table'],
    description: 'A small table in the corner of the attic.',
    properName: false,
    article: 'a'
  }));
  table.add(new SceneryTrait());
  world.moveEntity(table.id, atticId);

  const rope = world.createEntity('rope', EntityType.ITEM);
  rope.add(new IdentityTrait({
    name: 'large coil of rope',
    aliases: ['rope', 'coil', 'coil of rope'],
    description: 'A large coil of sturdy rope.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  world.moveEntity(rope.id, atticId);

  const knife = world.createEntity('nasty knife', EntityType.ITEM);
  knife.add(new IdentityTrait({
    name: 'nasty knife',
    aliases: ['knife', 'nasty-looking knife', 'blade'],
    description: 'A nasty-looking knife. It appears quite sharp.',
    properName: false,
    article: 'a',
    weight: 4
  }));
  knife.add(new WeaponTrait({ damage: 2, skillBonus: 5, weaponType: 'blade' }));
  world.moveEntity(knife.id, atticId);

  const brick = world.createEntity('brick', EntityType.ITEM);
  brick.add(new IdentityTrait({
    name: 'brick',
    aliases: ['red brick', 'clay brick', 'explosive'],
    description: 'A square brick of calciumite with some fuse wire wrapped around it.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  (brick as any).isExplosive = true;
  (brick as any).hasFuse = true;
  world.moveEntity(brick.id, atticId);

  const wire = world.createEntity('shiny wire', EntityType.ITEM);
  wire.add(new IdentityTrait({
    name: 'shiny wire',
    aliases: ['wire', 'thin wire', 'metal wire', 'fuse wire'],
    description: 'A thin piece of shiny wire, suitable as a fuse or for various mechanical uses.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  world.moveEntity(wire.id, atticId);
}
