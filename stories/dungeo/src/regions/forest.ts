/**
 * Forest Region - Forest paths around the white house
 *
 * 9 rooms: Forest Path 1-4, Clearing, Up a Tree, Canyon View, Rocky Ledge, Canyon Bottom
 *
 * The forest surrounds the white house and provides access to the Clearing
 * where the underground grating is located.
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
  SceneryTrait
} from '@sharpee/world-model';

export interface ForestRoomIds {
  forestPath1: string;  // North of North of House
  forestPath2: string;  // East of clearing
  forestPath3: string;  // West of forest path 2
  forestPath4: string;  // South of forest path 3 (maze edge)
  clearing: string;     // Has grating
  upATree: string;      // Up the tree in forest
  canyonView: string;   // Top of Great Canyon
  rockyLedge: string;   // Halfway down canyon
  canyonBottom: string; // Bottom of canyon
}

function createRoom(world: WorldModel, name: string, description: string): IFEntity {
  const room = world.createEntity(name, EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  room.add(new IdentityTrait({ name, description, properName: true, article: '' }));
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

export function createForestRegion(world: WorldModel): ForestRoomIds {
  // === Create all rooms ===

  // Forest Path 1 - destination for Altar prayer teleportation
  const forestPath1 = world.createEntity('Forest-Path-1', EntityType.ROOM);
  forestPath1.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  forestPath1.add(new IdentityTrait({
    name: 'Forest Path',
    aliases: ['forest path', 'path', 'forest path 1'],  // 'forest path 1' needed for pray teleport
    description: 'This is a path winding through a dimly lit forest. The path heads north-south here. One particularly large tree with some low branches stands at the side of the path.',
    properName: true,
    article: ''
  }));

  const forestPath2 = world.createEntity('Forest-2', EntityType.ROOM);
  forestPath2.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  forestPath2.add(new IdentityTrait({
    name: 'Forest',
    aliases: ['forest', 'woods', 'trees'],
    description: 'This is a dimly lit forest, with large trees all around.',
    properName: true,
    article: 'the'
  }));

  const forestPath3 = world.createEntity('Forest Path-3', EntityType.ROOM);
  forestPath3.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  forestPath3.add(new IdentityTrait({
    name: 'Forest Path',
    aliases: ['forest path', 'path'],
    description: 'The forest thins out, and the path becomes clearer.',
    properName: true,
    article: ''
  }));

  const forestPath4 = world.createEntity('Twisting Path', EntityType.ROOM);
  forestPath4.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  forestPath4.add(new IdentityTrait({
    name: 'Twisting Path',
    aliases: ['twisting path', 'path', 'forest path'],
    description: 'You are on a twisting path through a dense forest. The path splits here.',
    properName: true,
    article: ''
  }));

  const clearing = world.createEntity('Clearing', EntityType.ROOM);
  clearing.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  clearing.add(new IdentityTrait({
    name: 'Clearing',
    aliases: ['clearing', 'forest clearing'],
    description: 'You are in a clearing, with a forest surrounding you on all sides. A path leads south. On the ground is a pile of leaves.',
    properName: true,
    article: 'the'
  }));

  const upATree = createRoom(world, 'Up a Tree',
    'You are about 10 feet above the ground nestled among some large branches. The nearest branch above you is above your reach. Beside you on the branch is a small bird\'s nest.');

  const canyonView = createRoom(world, 'Canyon View',
    'You are at the top of the Great Canyon, on its west wall. From here there is a marvelous view of the canyon and parts of the Frigid River upstream. Across the canyon, the walls of the White Cliffs join the mighty ramparts of the Flathead Mountains to the east. Following the Canyon, you can see a small path at the bottom of the canyon. There is a path here which goes west into the forest.');

  const rockyLedge = createRoom(world, 'Rocky Ledge',
    'You are on a ledge about halfway up the wall of the river canyon. You can see from here that the path continues from the bottom of the canyon up to the cliff above. There is a small path going down.');

  const canyonBottom = createRoom(world, 'Canyon Bottom',
    'You are beneath the walls of the river canyon which may be climbed here. The canyon runs north-south along the river. You can see the massive walls of the White Cliffs rising to the east.');

  // === Set up connections ===

  setExits(forestPath1, {
    [Direction.NORTH]: clearing.id,
    [Direction.UP]: upATree.id,
    // South connects to North of House - set externally
  });

  setExits(forestPath2, {
    [Direction.WEST]: clearing.id,
    [Direction.EAST]: forestPath3.id,
  });

  setExits(forestPath3, {
    [Direction.WEST]: forestPath2.id,
    [Direction.SOUTH]: forestPath4.id,
    [Direction.EAST]: canyonView.id,
  });

  setExits(forestPath4, {
    [Direction.NORTH]: forestPath3.id,
    // South/West could connect to maze
  });

  setExits(clearing, {
    [Direction.SOUTH]: forestPath1.id,
    [Direction.EAST]: forestPath2.id,
    // Down through grating - connected later
  });

  setExits(upATree, { [Direction.DOWN]: forestPath1.id });

  setExits(canyonView, {
    [Direction.WEST]: forestPath3.id,
    [Direction.DOWN]: rockyLedge.id,
  });

  setExits(rockyLedge, {
    [Direction.UP]: canyonView.id,
    [Direction.DOWN]: canyonBottom.id,
  });

  setExits(canyonBottom, {
    [Direction.UP]: rockyLedge.id,
    // North/South could connect to river areas
  });

  return {
    forestPath1: forestPath1.id,
    forestPath2: forestPath2.id,
    forestPath3: forestPath3.id,
    forestPath4: forestPath4.id,
    clearing: clearing.id,
    upATree: upATree.id,
    canyonView: canyonView.id,
    rockyLedge: rockyLedge.id,
    canyonBottom: canyonBottom.id,
  };
}

// === External connectors ===

/**
 * Connect Forest to White House exterior
 */
export function connectForestToExterior(
  world: WorldModel,
  forestIds: ForestRoomIds,
  northOfHouseId: string,
  behindHouseId: string
): void {
  const forestPath1 = world.getEntity(forestIds.forestPath1);
  if (forestPath1) {
    forestPath1.get(RoomTrait)!.exits[Direction.SOUTH] = { destination: northOfHouseId };
  }

  const northOfHouse = world.getEntity(northOfHouseId);
  if (northOfHouse) {
    northOfHouse.get(RoomTrait)!.exits[Direction.NORTH] = { destination: forestIds.forestPath1 };
  }

  const behindHouse = world.getEntity(behindHouseId);
  if (behindHouse) {
    behindHouse.get(RoomTrait)!.exits[Direction.EAST] = { destination: forestIds.clearing };
  }
}

// ============================================================================
// OBJECTS - Created near their default room locations
// ============================================================================

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
  const nest = world.createEntity('nest', EntityType.CONTAINER);
  nest.add(new IdentityTrait({
    name: 'small bird\'s nest',
    aliases: ['nest', 'bird nest', 'birds nest'],
    description: 'A small bird\'s nest tucked among the branches.',
    properName: false,
    article: 'a'
  }));
  nest.add(new ContainerTrait({ capacity: { maxItems: 3 } }));
  nest.add(new SceneryTrait());
  world.moveEntity(nest.id, roomId);

  const egg = world.createEntity('jewel-encrusted egg', EntityType.CONTAINER);
  egg.add(new IdentityTrait({
    name: 'jewel-encrusted egg',
    aliases: ['egg', 'jeweled egg', 'beautiful egg', 'faberge egg'],
    description: 'A beautiful jewel-encrusted egg. It appears to open somehow.',
    properName: false,
    article: 'a',
    weight: 2
  }));
  egg.add(new ContainerTrait({ capacity: { maxItems: 1 } }));
  egg.add(new OpenableTrait({ isOpen: false }));
  (egg as any).isTreasure = true;
  (egg as any).treasureId = 'jewel-encrusted-egg';
  (egg as any).treasureValue = 5;
  world.moveEntity(egg.id, nest.id);

  const canary = world.createEntity('golden canary', EntityType.ITEM);
  canary.add(new IdentityTrait({
    name: 'golden clockwork canary',
    aliases: ['canary', 'bird', 'clockwork canary', 'golden bird'],
    description: 'A beautiful golden clockwork canary. It sings when wound.',
    properName: false,
    article: 'a',
    weight: 10
  }));
  (canary as any).isTreasure = true;
  (canary as any).treasureId = 'clockwork-canary';
  (canary as any).treasureValue = 6;

  const eggOpenable = egg.get(OpenableTrait);
  if (eggOpenable) {
    eggOpenable.isOpen = true;
    world.moveEntity(canary.id, egg.id);
    eggOpenable.isOpen = false;
  }
}
