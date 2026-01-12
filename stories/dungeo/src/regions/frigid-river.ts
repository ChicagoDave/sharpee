/**
 * Frigid River Region - The river and Aragain Falls
 *
 * 5 river rooms (FR1-FR5) navigated by boat:
 * - FR1: Near Dam Base, no landings (landing west visible but river moves you)
 * - FR2: No landings (cliffs east, rocks west)
 * - FR3: Landings E/W (Rocky Shore west, White Cliffs Beach 1 east)
 * - FR4: Landings E/W (Sandy Beach west, White Cliffs Beach 2 east)
 * - FR5: Landing W only (Shore), then death over falls
 *
 * Shore areas: Rocky Shore, White Cliffs Beach 1-2, Sandy Beach, Shore
 * Special: Aragain Falls, Rainbow rooms, Small Cave
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
  SceneryTrait,
  OpenableTrait,
  AuthorModel
} from '@sharpee/world-model';

export interface FrigidRiverRoomIds {
  frigidRiver1: string;
  frigidRiver2: string;
  frigidRiver3: string;
  frigidRiver4: string;
  frigidRiver5: string;
  rockyShore: string;
  whiteCliffsBeach1: string;
  whiteCliffsBeach2: string;
  sandyBeach: string;
  shore: string;
  aragainFalls: string;
  onTheRainbow: string;
  endOfRainbow: string;
  smallCave: string;
}

function createRoom(world: WorldModel, name: string, description: string, isDark = false, isOutdoors = true): IFEntity {
  const room = world.createEntity(name, EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark, isOutdoors }));
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

export function createFrigidRiverRegion(world: WorldModel): FrigidRiverRoomIds {
  // === Create River Rooms (on the water - require boat) ===

  // FR1: Near dam, no shore landings
  const frigidRiver1 = world.createEntity('Frigid River-1', EntityType.ROOM);
  frigidRiver1.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  frigidRiver1.add(new IdentityTrait({
    name: 'Frigid River',
    aliases: ['frigid river', 'river'],
    description: 'You are on the Frigid River in the vicinity of the dam. The river flows quietly here. There is a landing on the west shore.',
    properName: true,
    article: 'the'
  }));
  (frigidRiver1 as any).isWaterRoom = true;
  (frigidRiver1 as any).riverPosition = 1;

  // FR2: No landings - rocks and cliffs
  const frigidRiver2 = world.createEntity('Frigid River-2', EntityType.ROOM);
  frigidRiver2.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  frigidRiver2.add(new IdentityTrait({
    name: 'Frigid River',
    aliases: ['frigid river', 'river'],
    description: 'The river turns a corner here making it impossible to see the dam. The White Cliffs loom on the east bank, and large rocks prevent landing on the west.',
    properName: true,
    article: 'the'
  }));
  (frigidRiver2 as any).isWaterRoom = true;
  (frigidRiver2 as any).riverPosition = 2;

  // FR3: Landings E (White Cliffs Beach 1) and W (Rocky Shore)
  const frigidRiver3 = world.createEntity('Frigid River-3', EntityType.ROOM);
  frigidRiver3.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  frigidRiver3.add(new IdentityTrait({
    name: 'Frigid River',
    aliases: ['frigid river', 'river'],
    description: 'The river descends here into a valley. There is a narrow beach on the east below the cliffs, and there is some shore on the west which may be suitable. In the distance a faint rumbling can be heard.',
    properName: true,
    article: 'the'
  }));
  (frigidRiver3 as any).isWaterRoom = true;
  (frigidRiver3 as any).riverPosition = 3;

  // FR4: Landings E (White Cliffs Beach 2) and W (Sandy Beach) - buoy here
  const frigidRiver4 = world.createEntity('Frigid River-4', EntityType.ROOM);
  frigidRiver4.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  frigidRiver4.add(new IdentityTrait({
    name: 'Frigid River',
    aliases: ['frigid river', 'river'],
    description: 'The river is running faster here, and the sound ahead appears to be that of rushing water. On the west shore is a sandy beach. A small area of beach can also be seen below the cliffs.',
    properName: true,
    article: 'the'
  }));
  (frigidRiver4 as any).isWaterRoom = true;
  (frigidRiver4 as any).riverPosition = 4;

  // FR5: Landing W only (Shore) - death if continue downstream
  const frigidRiver5 = world.createEntity('Frigid River-5', EntityType.ROOM);
  frigidRiver5.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  frigidRiver5.add(new IdentityTrait({
    name: 'Frigid River',
    aliases: ['frigid river', 'river'],
    description: 'The sound of rushing water is nearly unbearable here. On the west shore is a large landing area.',
    properName: true,
    article: 'the'
  }));
  (frigidRiver5 as any).isWaterRoom = true;
  (frigidRiver5 as any).riverPosition = 5;
  (frigidRiver5 as any).isLastBeforeFalls = true;

  // === Create Shore/Beach Rooms ===

  // Rocky Shore - west of FR3, has Small Cave NW
  const rockyShore = createRoom(world, 'Rocky Shore',
    'This is the west shore of the river. An entrance to a cave is to the northwest. The shore is very rocky here.');
  (rockyShore as any).canLaunchBoat = true;

  // Small Cave - NW of Rocky Shore, has shovel and guano
  const smallCave = createRoom(world, 'Small Cave',
    'This is a small cave whose exits are on the south and northwest.',
    true, false);

  // White Cliffs Beach 1 - east of FR3, narrow beach below cliffs
  const whiteCliffsBeach1 = createRoom(world, 'White Cliffs Beach',
    'This is a rocky, narrow strip of beach beside the cliffs. A narrow path leads north along the shore.');
  (whiteCliffsBeach1 as any).canLaunchBoat = true;

  // White Cliffs Beach 2 - east of FR4, north of WCB1
  const whiteCliffsBeach2 = world.createEntity('White Cliffs Beach-2', EntityType.ROOM);
  whiteCliffsBeach2.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  whiteCliffsBeach2.add(new IdentityTrait({
    name: 'White Cliffs Beach',
    aliases: ['white cliffs beach', 'beach', 'cliffs beach'],
    description: 'This is a narrow strip of beach which runs along the base of the White Cliffs. The only path here is a narrow one, heading south along the cliffs.',
    properName: true,
    article: ''
  }));
  (whiteCliffsBeach2 as any).canLaunchBoat = true;

  // Sandy Beach - west of FR4
  const sandyBeach = createRoom(world, 'Sandy Beach',
    'This is a large sandy beach at the shore of the river, which is flowing quickly by. A path runs beside the river to the south here.');
  (sandyBeach as any).canLaunchBoat = true;

  // Shore - west of FR5, between Sandy Beach and Aragain Falls
  const shore = createRoom(world, 'Shore',
    'This is the shore of the river. The river here seems somewhat treacherous. A path travels from north to south here, the south end quickly turning around a sharp corner.');
  (shore as any).canLaunchBoat = true;

  // Aragain Falls - south of Shore, rainbow puzzle
  const aragainFalls = world.createEntity('Aragain Falls', EntityType.ROOM);
  aragainFalls.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true,
    blockedExits: {
      [Direction.EAST]: 'The rainbow is beautiful, but it looks far too insubstantial to walk on.'
    }
  }));
  aragainFalls.add(new IdentityTrait({
    name: 'Aragain Falls',
    aliases: ['aragain falls', 'falls', 'waterfall'],
    description: 'You are at the top of Aragain Falls, an enormous waterfall with a drop of about 450 feet. The only path here is on the north end.',
    properName: true,
    article: ''
  }));

  // Rainbow rooms
  const onTheRainbow = world.createEntity('On the Rainbow', EntityType.ROOM);
  onTheRainbow.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  onTheRainbow.add(new IdentityTrait({
    name: 'On the Rainbow',
    aliases: ['on the rainbow', 'rainbow'],
    description: 'You are on top of a rainbow (I bet you never thought you would walk on a rainbow), with a magnificent view of the falls. The rainbow travels east-west here.',
    properName: true,
    article: ''
  }));
  (onTheRainbow as any).isRainbowRoom = true;

  const endOfRainbow = createRoom(world, 'End of Rainbow',
    'You are on a small, rocky beach on the continuation of the Frigid River past the falls. The beach is narrow due to the presence of the White Cliffs. The river canyon opens here, and sunlight shines in from above. A rainbow crosses over the falls to the west, and a narrow path continues to the southeast.');
  (endOfRainbow as any).isRainbowRoom = true;

  // === Set up connections ===

  // River rooms - downstream only (D)
  setExits(frigidRiver1, { [Direction.DOWN]: frigidRiver2.id });
  setExits(frigidRiver2, { [Direction.DOWN]: frigidRiver3.id });
  setExits(frigidRiver3, {
    [Direction.DOWN]: frigidRiver4.id,
    [Direction.WEST]: rockyShore.id,
    [Direction.EAST]: whiteCliffsBeach1.id
  });
  setExits(frigidRiver4, {
    [Direction.DOWN]: frigidRiver5.id,
    [Direction.WEST]: sandyBeach.id,
    [Direction.EAST]: whiteCliffsBeach2.id
  });
  setExits(frigidRiver5, {
    [Direction.WEST]: shore.id
    // DOWN leads to death - handled by falls-death-handler
  });

  // Shore/Beach rooms
  setExits(rockyShore, {
    [Direction.NORTHWEST]: smallCave.id,
    [Direction.EAST]: frigidRiver3.id
  });

  setExits(smallCave, { [Direction.SOUTH]: rockyShore.id });

  setExits(whiteCliffsBeach1, {
    [Direction.WEST]: frigidRiver3.id,
    [Direction.SOUTH]: whiteCliffsBeach2.id
  });

  setExits(whiteCliffsBeach2, {
    [Direction.WEST]: frigidRiver4.id,
    [Direction.NORTH]: whiteCliffsBeach1.id
  });

  setExits(sandyBeach, {
    [Direction.EAST]: frigidRiver4.id,
    [Direction.SOUTH]: shore.id
  });

  setExits(shore, {
    [Direction.NORTH]: sandyBeach.id,
    [Direction.SOUTH]: aragainFalls.id,
    [Direction.EAST]: frigidRiver5.id
  });

  // Aragain Falls - rainbow blocked initially
  setExits(aragainFalls, { [Direction.NORTH]: shore.id });

  // Rainbow rooms
  setExits(onTheRainbow, {
    [Direction.WEST]: aragainFalls.id,
    [Direction.EAST]: endOfRainbow.id
  });

  setExits(endOfRainbow, {
    [Direction.WEST]: onTheRainbow.id
    // SE → Canyon Bottom connected externally
  });

  return {
    frigidRiver1: frigidRiver1.id,
    frigidRiver2: frigidRiver2.id,
    frigidRiver3: frigidRiver3.id,
    frigidRiver4: frigidRiver4.id,
    frigidRiver5: frigidRiver5.id,
    rockyShore: rockyShore.id,
    whiteCliffsBeach1: whiteCliffsBeach1.id,
    whiteCliffsBeach2: whiteCliffsBeach2.id,
    sandyBeach: sandyBeach.id,
    shore: shore.id,
    aragainFalls: aragainFalls.id,
    onTheRainbow: onTheRainbow.id,
    endOfRainbow: endOfRainbow.id,
    smallCave: smallCave.id,
  };
}

// === External connectors ===

/**
 * Connect Dam Base to Frigid River 1 (requires boat + launch)
 * Note: This just sets up the exit; launch action handles the transition
 */
export function connectFrigidRiverToDam(
  world: WorldModel,
  frigidRiverIds: FrigidRiverRoomIds,
  damBaseId: string
): void {
  const damBase = world.getEntity(damBaseId);
  if (damBase) {
    // Mark Dam Base as a launch point
    (damBase as any).canLaunchBoat = true;
    (damBase as any).launchDestination = frigidRiverIds.frigidRiver1;
  }
}

/**
 * Connect End of Rainbow to Canyon Bottom (Forest region)
 */
export function connectRainbowToCanyon(
  world: WorldModel,
  frigidRiverIds: FrigidRiverRoomIds,
  canyonBottomId: string
): void {
  const endOfRainbow = world.getEntity(frigidRiverIds.endOfRainbow);
  if (endOfRainbow) {
    endOfRainbow.get(RoomTrait)!.exits[Direction.SOUTHEAST] = { destination: canyonBottomId };
  }

  const canyonBottom = world.getEntity(canyonBottomId);
  if (canyonBottom) {
    canyonBottom.get(RoomTrait)!.exits[Direction.NORTH] = { destination: frigidRiverIds.endOfRainbow };
  }
}

/**
 * Connect Small Cave to existing areas if needed
 */
export function connectSmallCaveToMirrorArea(
  world: WorldModel,
  frigidRiverIds: FrigidRiverRoomIds,
  mirrorAreaId: string
): void {
  // Small Cave connects NW to another area in some versions
  // Currently only connects SE to Rocky Shore
}

// ============================================================================
// OBJECTS - Created near their default room locations
// ============================================================================

/**
 * Create all objects in the Frigid River region
 */
export function createFrigidRiverObjects(world: WorldModel, roomIds: FrigidRiverRoomIds): void {
  // Treasures
  createPotOfGold(world, roomIds.endOfRainbow);

  // Buoy with emerald - on the river at FR2 (not on shore)
  createBuoy(world, roomIds.frigidRiver2);

  // Statue (buried at Sandy Beach)
  createStatue(world, roomIds.sandyBeach);

  // Tools in Small Cave
  createSmallCaveObjects(world, roomIds.smallCave);

  // Scenery
  createRainbow(world, roomIds.aragainFalls);
  createBarrel(world, roomIds.aragainFalls);

  // River scenery in shore areas
  createRiverScenery(world, roomIds.rockyShore);
  createRiverScenery(world, roomIds.sandyBeach);
  createRiverScenery(world, roomIds.shore);
}

// ============= End of Rainbow Objects =============

function createPotOfGold(world: WorldModel, roomId: string): IFEntity {
  const pot = world.createEntity('pot of gold', EntityType.ITEM);
  pot.add(new IdentityTrait({
    name: 'pot of gold',
    aliases: ['pot', 'gold', 'gold coins', 'treasure pot'],
    description: 'A small iron pot filled to the brim with gold coins. It is surprisingly heavy for its size.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  (pot as any).isTreasure = true;
  (pot as any).treasureId = 'pot-of-gold';
  (pot as any).treasureValue = 10;
  (pot as any).trophyCaseValue = 10;
  world.moveEntity(pot.id, roomId);
  return pot;
}

// ============= Frigid River 4 Objects =============

function createBuoy(world: WorldModel, roomId: string): IFEntity {
  const buoy = world.createEntity('buoy', EntityType.ITEM);
  buoy.add(new IdentityTrait({
    name: 'red buoy',
    aliases: ['buoy', 'red buoy', 'floating buoy', 'warning buoy'],
    description: 'There is a red buoy here (probably a warning).',
    properName: false,
    article: 'a',
    weight: 10
  }));
  buoy.add(new ContainerTrait({ capacity: { maxItems: 1, maxWeight: 5 } }));
  buoy.add(new OpenableTrait({ isOpen: false }));
  world.moveEntity(buoy.id, roomId);

  const emerald = world.createEntity('emerald', EntityType.ITEM);
  emerald.add(new IdentityTrait({
    name: 'large emerald',
    aliases: ['emerald', 'green gem', 'large emerald', 'gem'],
    description: 'A large emerald of exceptional clarity and color.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  (emerald as any).isTreasure = true;
  (emerald as any).treasureId = 'buoy-emerald';
  (emerald as any).treasureValue = 5;
  (emerald as any).trophyCaseValue = 10;

  // Use AuthorModel to place emerald in closed buoy (bypasses validation)
  const author = new AuthorModel(world.getDataStore(), world);
  author.moveEntity(emerald.id, buoy.id);

  return buoy;
}

// ============= Sandy Beach Objects =============

function createStatue(world: WorldModel, roomId: string): IFEntity {
  const statue = world.createEntity('statue', EntityType.ITEM);
  statue.add(new IdentityTrait({
    name: 'beautiful statue',
    aliases: ['statue', 'sculpture', 'figure', 'figurine', 'small statue'],
    description: 'A beautiful statue of an ancient adventurer, carved from a single piece of white marble. The craftsmanship is exquisite.',
    properName: false,
    article: 'a',
    weight: 2
  }));
  (statue as any).isTreasure = true;
  (statue as any).treasureId = 'statue';
  (statue as any).treasureValue = 10;
  (statue as any).trophyCaseValue = 13;
  (statue as any).isBuried = true;
  (statue as any).isVisible = false;
  world.setStateValue('dungeo.statue.locationId', roomId);
  return statue;
}

// ============= Small Cave Objects =============

function createSmallCaveObjects(world: WorldModel, roomId: string): void {
  // Shovel for digging
  const shovel = world.createEntity('shovel', EntityType.ITEM);
  shovel.add(new IdentityTrait({
    name: 'shovel',
    aliases: ['shovel', 'spade', 'large shovel'],
    description: 'This is a large shovel, suitable for digging in sand or soft earth.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  world.moveEntity(shovel.id, roomId);

  // Bat guano (for balloon fuel)
  const guano = world.createEntity('guano', EntityType.ITEM);
  guano.add(new IdentityTrait({
    name: 'guano',
    aliases: ['guano', 'bat guano', 'hunk of guano', 'bat droppings'],
    description: 'There is a hunk of bat guano here.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  world.moveEntity(guano.id, roomId);
}

// ============= Aragain Falls Objects =============

function createRainbow(world: WorldModel, roomId: string): IFEntity {
  const rainbow = world.createEntity('rainbow', EntityType.ITEM);
  rainbow.add(new IdentityTrait({
    name: 'rainbow',
    aliases: ['beautiful rainbow', 'arc'],
    description: 'A beautiful rainbow can be seen over the falls and to the east.',
    properName: false,
    article: 'a'
  }));
  rainbow.add(new SceneryTrait());
  (rainbow as any).isSolid = false;
  world.moveEntity(rainbow.id, roomId);
  return rainbow;
}

function createBarrel(world: WorldModel, roomId: string): IFEntity {
  const barrel = world.createEntity('barrel', EntityType.ITEM);
  barrel.add(new IdentityTrait({
    name: 'barrel',
    aliases: ['barrel', 'wooden barrel', 'man-sized barrel'],
    description: 'There is a man-sized barrel here, which you might be able to enter.',
    properName: false,
    article: 'a'
  }));
  // Barrel can be entered for a deadly ride over the falls
  barrel.add(new ContainerTrait({ capacity: { maxItems: 1, maxWeight: 200 } }));
  world.moveEntity(barrel.id, roomId);
  return barrel;
}

// ============= River Scenery =============

function createRiverScenery(world: WorldModel, roomId: string): IFEntity {
  // Use unique ID but set displayName to proper name
  const river = world.createEntity('river-' + roomId, EntityType.ITEM);
  river.add(new IdentityTrait({
    name: 'Frigid River',
    aliases: ['river', 'water', 'frigid river', 'stream'],
    description: 'The Frigid River flows swiftly past, its icy waters dark and cold.',
    properName: true,
    article: 'the'
  }));
  river.add(new SceneryTrait());
  (river as any).isWaterBody = true;
  (river as any).attributes.displayName = 'Frigid River';
  world.moveEntity(river.id, roomId);
  return river;
}
