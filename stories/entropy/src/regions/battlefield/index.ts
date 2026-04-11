/**
 * Battlefield Region — Earthangelos surface, post-holocaust
 *
 * Rooms: Lost Battlefield, Edge of City, Smoking Forest, Scorched Fields
 * Starting region. Devastated landscape after Tra 'Jan Gore invasion.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  SceneryTrait,
  EntityType,
  Direction,
} from '@sharpee/world-model';

// Room IDs
export const BattlefieldRoomIds = {
  LOST_BATTLEFIELD: 'lost-battlefield',
  EDGE_OF_CITY: 'edge-of-city',
  SMOKING_FOREST: 'smoking-forest',
  SCORCHED_FIELDS: 'scorched-fields',
} as const;

/**
 * Create all battlefield rooms and their scenery objects.
 */
export function createBattlefieldRegion(world: WorldModel): void {
  // --- Lost Battlefield (starting room) ---
  const lb = world.createEntity(BattlefieldRoomIds.LOST_BATTLEFIELD, EntityType.ROOM);
  lb.add(new IdentityTrait({
    name: 'Lost Battlefield',
    description:
      'In all directions the land is a waste. Craters, bones, flesh, smoke '
      + 'litter the entire landscape while ashen clouds form '
      + 'dark and foreboding shapes in an angry red sky. The earth trembles from '
      + 'dislocated tectonic plates and the atmosphere is quickly becoming unbreathable '
      + 'and unlivable. A smoking forest can be seen to the west, a large steel-gray city '
      + 'is burning to the north, and the edge of an enormous smoldering crater lies to '
      + 'the east.',
  }));

  // Lost Battlefield scenery
  const clouds = world.createEntity('ashen-clouds', EntityType.OBJECT);
  clouds.add(new IdentityTrait({
    name: 'ashen clouds',
    aliases: ['clouds', 'sky', 'orbiting', 'spacecraft'],
    description:
      'Like evil specters, ashen clouds cast foreboding shapes, hovering above the '
      + 'land. High above in the darkened sky you see the tiny flickering of spacecraft in '
      + 'orbit around the planet.',
  }));
  clouds.add(new SceneryTrait());
  world.moveEntity(clouds.id, lb.id);

  const lbCity = world.createEntity('lb-city', EntityType.OBJECT);
  lbCity.add(new IdentityTrait({
    name: 'city',
    description: 'Vaporous clouds weave through a city skyline devastated by holocaust.',
  }));
  lbCity.add(new SceneryTrait());
  world.moveEntity(lbCity.id, lb.id);

  const lbForest = world.createEntity('lb-forest', EntityType.OBJECT);
  lbForest.add(new IdentityTrait({
    name: 'forest',
    aliases: ['brush', 'burning', 'stumps'],
    description: 'Through ashes and flames the remains of a forest blisters the western horizon.',
  }));
  lbForest.add(new SceneryTrait());
  world.moveEntity(lbForest.id, lb.id);

  const crater = world.createEntity('lb-crater', EntityType.OBJECT);
  crater.add(new IdentityTrait({
    name: 'crater',
    aliases: ['crevice'],
    description:
      'Through wisps of unnatural fog you glimpse a deep and wide crevice. Memory '
      + 'lapses prevent you from remembering how this crater was formed, but a quick '
      + 'reading of gases and radiation tell you that a small thermonuclear device was '
      + 'detonated recently.',
  }));
  crater.add(new SceneryTrait());
  world.moveEntity(crater.id, lb.id);

  const landscape = world.createEntity('lb-landscape', EntityType.OBJECT);
  landscape.add(new IdentityTrait({
    name: 'landscape',
    aliases: ['craters', 'bones', 'debris'],
    description:
      'Outside of the large crater to the east, there are many smaller craters marking '
      + 'the landscape in every direction.',
  }));
  landscape.add(new SceneryTrait());
  world.moveEntity(landscape.id, lb.id);

  // --- Edge of City ---
  const eoc = world.createEntity(BattlefieldRoomIds.EDGE_OF_CITY, EntityType.ROOM);
  eoc.add(new IdentityTrait({
    name: 'Edge of City',
    description:
      'The evidence of thermonuclear war grows as you near what was a large city. '
      + 'Dense fog and gases create a wall of unnatural vapor while the remains of '
      + 'buildings jut up like broken teeth against the angry sky.',
  }));

  // --- Smoking Forest ---
  const sf = world.createEntity(BattlefieldRoomIds.SMOKING_FOREST, EntityType.ROOM);
  sf.add(new IdentityTrait({
    name: 'Smoking Forest',
    description:
      'What was a towering forest is now a field of charred stumps and burning brush. '
      + 'Ashes fall like snow and the air is thick with acrid smoke. '
      + 'The land opens to scorched fields to the west.',
  }));

  const foliage = world.createEntity('sf-foliage', EntityType.OBJECT);
  foliage.add(new IdentityTrait({
    name: 'foliage',
    aliases: ['stumps', 'brush', 'ashes'],
    description: 'Charred remnants of what were once living things.',
  }));
  foliage.add(new SceneryTrait());
  world.moveEntity(foliage.id, sf.id);

  // --- Scorched Fields ---
  const scf = world.createEntity(BattlefieldRoomIds.SCORCHED_FIELDS, EntityType.ROOM);
  scf.add(new IdentityTrait({
    name: 'Scorched Fields',
    description:
      'Scorched and barren farmland stretches in every direction. The ground is '
      + 'blackened by plasma burns and radiation. A spaceport lies to the northwest.',
  }));

  const remains = world.createEntity('sf-remains', EntityType.OBJECT);
  remains.add(new IdentityTrait({
    name: 'remains',
    aliases: ['farmland', 'ground'],
    description: 'The earth itself has been burned. Nothing will grow here for a long time.',
  }));
  remains.add(new SceneryTrait());
  world.moveEntity(remains.id, scf.id);
}

/**
 * Connect battlefield rooms to each other and to adjacent regions.
 */
export function connectBattlefieldRooms(world: WorldModel): void {
  // Lost Battlefield connections
  world.connectRooms(BattlefieldRoomIds.LOST_BATTLEFIELD, BattlefieldRoomIds.EDGE_OF_CITY, Direction.NORTH);
  world.connectRooms(BattlefieldRoomIds.LOST_BATTLEFIELD, BattlefieldRoomIds.SMOKING_FOREST, Direction.WEST);

  // Lost Battlefield → Deep Crater (underground region)
  world.connectRooms(BattlefieldRoomIds.LOST_BATTLEFIELD, 'deep-crater', Direction.EAST);

  // Smoking Forest → Scorched Fields
  world.connectRooms(BattlefieldRoomIds.SMOKING_FOREST, BattlefieldRoomIds.SCORCHED_FIELDS, Direction.WEST);

  // Scorched Fields → Spaceport (spaceport region)
  world.connectRooms(BattlefieldRoomIds.SCORCHED_FIELDS, 'spaceport', Direction.NORTHWEST);
}
