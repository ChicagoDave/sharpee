/**
 * House Interior Objects - Items inside the white house
 *
 * Kitchen:
 * - Brown sack (container with food and garlic inside)
 * - Glass bottle (contains water)
 * - Table (supporter scenery)
 *
 * Living Room:
 * - Trophy case (container for treasures)
 * - Elvish sword (weapon)
 * - Brass lantern (light source)
 * - Oriental rug (hides trapdoor)
 * - Trapdoor (leads to Cellar)
 *
 * Attic:
 * - Rope (for climbing)
 * - Nasty knife (weapon)
 * - Table (scenery)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ContainerTrait,
  OpenableTrait,
  SceneryTrait,
  LightSourceTrait,
  SwitchableTrait,
  PushableTrait,
  RoomBehavior,
  RoomTrait,
  WeaponTrait,
  EntityType,
  Direction,
  IGameEvent,
  IFEvents
} from '@sharpee/world-model';

import { HouseInteriorRoomIds } from '../index';

// Simple ID generator for events
let eventCounter = 0;
function generateEventId(): string {
  return `evt-${Date.now()}-${++eventCounter}`;
}

/**
 * Create all objects in the House Interior
 * @param cellarId - ID of the cellar room (for trapdoor connection)
 */
export function createHouseInteriorObjects(
  world: WorldModel,
  roomIds: HouseInteriorRoomIds,
  cellarId?: string
): void {
  // Kitchen objects
  createKitchenObjects(world, roomIds.kitchen);

  // Living Room objects (needs cellarId for rug/trapdoor puzzle)
  createLivingRoomObjects(world, roomIds.livingRoom, cellarId);

  // Attic objects
  createAtticObjects(world, roomIds.attic);
}

// ============= Kitchen Objects =============

function createKitchenObjects(world: WorldModel, kitchenId: string): void {
  // Kitchen table (scenery)
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

  // Brown sack (container)
  const sack = world.createEntity('brown sack', EntityType.CONTAINER);
  sack.add(new IdentityTrait({
    name: 'elongated brown sack',
    aliases: ['sack', 'brown sack', 'bag', 'brown bag'],
    description: 'A brown sack smelling of hot peppers.',
    properName: false,
    article: 'an'
  }));
  sack.add(new ContainerTrait({
    capacity: { maxItems: 10 }
  }));
  sack.add(new OpenableTrait({ isOpen: true }));
  world.moveEntity(sack.id, kitchenId);

  // Lunch (food inside sack)
  const lunch = world.createEntity('lunch', EntityType.ITEM);
  lunch.add(new IdentityTrait({
    name: 'lunch',
    aliases: ['food', 'meal', 'provisions'],
    description: 'A hearty lunch.',
    properName: false,
    article: 'a'
  }));
  world.moveEntity(lunch.id, sack.id);

  // Garlic (inside sack)
  const garlic = world.createEntity('garlic', EntityType.ITEM);
  garlic.add(new IdentityTrait({
    name: 'clove of garlic',
    aliases: ['garlic', 'clove'],
    description: 'A clove of garlic. Its strong smell might ward off something...',
    properName: false,
    article: 'a'
  }));
  world.moveEntity(garlic.id, sack.id);

  // Glass bottle with water
  const bottle = world.createEntity('glass bottle', EntityType.CONTAINER);
  bottle.add(new IdentityTrait({
    name: 'glass bottle',
    aliases: ['bottle', 'clear bottle', 'water bottle'],
    description: 'A clear glass bottle containing water.',
    properName: false,
    article: 'a'
  }));
  bottle.add(new ContainerTrait({
    capacity: { maxItems: 1 }
  }));
  bottle.add(new OpenableTrait({ isOpen: false }));
  world.moveEntity(bottle.id, kitchenId);

  // Water (inside bottle) - using a simple item representation
  const water = world.createEntity('water', EntityType.ITEM);
  water.add(new IdentityTrait({
    name: 'quantity of water',
    aliases: ['water'],
    description: 'Clear, fresh water.',
    properName: false,
    article: 'a'
  }));
  // Place water in bottle (temporarily open bottle)
  const bottleOpenable = bottle.get(OpenableTrait);
  if (bottleOpenable) {
    bottleOpenable.isOpen = true;
    world.moveEntity(water.id, bottle.id);
    bottleOpenable.isOpen = false;
  }
}

// ============= Living Room Objects =============

function createLivingRoomObjects(world: WorldModel, livingRoomId: string, cellarId?: string): void {
  // Trophy case (container for treasures)
  const trophyCase = world.createEntity('trophy case', EntityType.CONTAINER);
  trophyCase.add(new IdentityTrait({
    name: 'trophy case',
    aliases: ['case', 'glass case', 'display case'],
    description: 'A handsome trophy case with a glass front.',
    properName: false,
    article: 'a'
  }));
  trophyCase.add(new ContainerTrait({
    capacity: { maxItems: 20 }
  }));
  trophyCase.add(new OpenableTrait({ isOpen: false }));
  trophyCase.add(new SceneryTrait());
  world.moveEntity(trophyCase.id, livingRoomId);

  // Elvish sword
  const sword = world.createEntity('elvish sword', EntityType.ITEM);
  sword.add(new IdentityTrait({
    name: 'elvish sword',
    aliases: ['sword', 'elvish blade', 'blade', 'antique sword'],
    description: 'An elvish sword of great antiquity. Its blade glows faintly blue.',
    properName: false,
    article: 'an'
  }));
  sword.add(new WeaponTrait({
    damage: 5,              // Good damage
    skillBonus: 10,         // Bonus to hit chance
    weaponType: 'blade',
    glowsNearDanger: true,  // Classic elvish sword behavior
    isBlessed: true         // Extra damage to certain enemies
  }));
  world.moveEntity(sword.id, livingRoomId);

  // Brass lantern
  const lantern = world.createEntity('brass lantern', EntityType.ITEM);
  lantern.add(new IdentityTrait({
    name: 'brass lantern',
    aliases: ['lantern', 'lamp', 'battery-powered lantern'],
    description: 'A battery-powered brass lantern.',
    properName: false,
    article: 'a'
  }));
  lantern.add(new LightSourceTrait({
    isLit: false,
    brightness: 3,
    fuelRemaining: 330,  // About 330 turns of light
    maxFuel: 330,
    fuelConsumptionRate: 1
  }));
  lantern.add(new SwitchableTrait({
    isOn: false
  }));
  world.moveEntity(lantern.id, livingRoomId);

  // Trapdoor (hidden under rug initially - NOT placed in room)
  const trapdoor = world.createEntity('trapdoor', EntityType.SCENERY);
  trapdoor.add(new IdentityTrait({
    name: 'trapdoor',
    aliases: ['trap door', 'door', 'trap'],
    description: 'A closed trapdoor leading down into darkness.',
    properName: false,
    article: 'a'
  }));
  trapdoor.add(new OpenableTrait({ isOpen: false }));
  trapdoor.add(new SceneryTrait());
  // Trapdoor is NOT placed in room - it will be revealed when rug is moved

  // Oriental rug (hides trapdoor - pushing reveals it)
  const rug = world.createEntity('oriental rug', EntityType.SCENERY);
  rug.add(new IdentityTrait({
    name: 'large oriental rug',
    aliases: ['rug', 'oriental rug', 'carpet', 'large rug'],
    description: 'A large oriental rug in the center of the room.',
    properName: false,
    article: 'a'
  }));
  rug.add(new SceneryTrait());
  rug.add(new PushableTrait({
    pushType: 'moveable',
    repeatable: false,  // Can only be moved once
    state: 'default'
  }));

  // Event handler: when rug is pushed, reveal the trapdoor
  rug.on = {
    'if.event.pushed': (event: IGameEvent) => {
      const pushable = rug.get(PushableTrait);

      // Only reveal once
      if (pushable && pushable.state === 'pushed') {
        return [];  // Already moved
      }

      // Move trapdoor into the room
      world.moveEntity(trapdoor.id, livingRoomId);

      // Add DOWN exit to cellar (if cellarId provided)
      if (cellarId) {
        const livingRoom = world.getEntity(livingRoomId);
        if (livingRoom) {
          RoomBehavior.setExit(livingRoom, Direction.DOWN, cellarId, trapdoor.id);
        }
      }

      // Mark rug as moved
      if (pushable) {
        pushable.state = 'pushed';
      }

      // Return a semantic event to report what happened
      return [{
        id: generateEventId(),
        type: 'game.message',
        entities: {
          actor: event.entities.actor,
          target: trapdoor.id,
          location: livingRoomId
        },
        data: {
          messageId: 'dungeo.rug.moved.reveal_trapdoor'
        },
        timestamp: Date.now(),
        narrate: true
      }];
    }
  };

  world.moveEntity(rug.id, livingRoomId);

  // Wooden door (nailed shut - scenery)
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
  // Attic table (scenery)
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

  // Rope
  const rope = world.createEntity('rope', EntityType.ITEM);
  rope.add(new IdentityTrait({
    name: 'large coil of rope',
    aliases: ['rope', 'coil', 'coil of rope'],
    description: 'A large coil of sturdy rope.',
    properName: false,
    article: 'a'
  }));
  world.moveEntity(rope.id, atticId);

  // Nasty knife
  const knife = world.createEntity('nasty knife', EntityType.ITEM);
  knife.add(new IdentityTrait({
    name: 'nasty knife',
    aliases: ['knife', 'nasty-looking knife', 'blade'],
    description: 'A nasty-looking knife. It appears quite sharp.',
    properName: false,
    article: 'a'
  }));
  knife.add(new WeaponTrait({
    damage: 2,              // Less damage than sword
    skillBonus: 5,
    weaponType: 'blade'
  }));
  world.moveEntity(knife.id, atticId);
}
