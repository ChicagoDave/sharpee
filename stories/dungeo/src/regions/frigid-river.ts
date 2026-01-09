/**
 * Frigid River Region - The river and Aragain Falls
 *
 * 13 rooms: Frigid River 1-3, Shore, Sandy Beach, Aragain Falls,
 * On the Rainbow, End of Rainbow, White Cliffs Beach, White Cliffs,
 * Rocky Shore, Atlantis, Cave Behind Falls
 *
 * Features the Frigid River flowing from the dam to Aragain Falls,
 * the rainbow puzzle, and the underwater city of Atlantis.
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
  SceneryTrait
} from '@sharpee/world-model';

export interface FrigidRiverRoomIds {
  frigidRiver1: string;
  frigidRiver2: string;
  frigidRiver3: string;
  shore: string;
  sandyBeach: string;
  aragainFalls: string;
  onTheRainbow: string;
  endOfRainbow: string;
  whiteCliffsBeach: string;
  whiteCliffs: string;
  rockyShore: string;
  atlantis: string;
  caveBehindFalls: string;
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
  // === Create all rooms ===

  const frigidRiver1 = createRoom(world, 'Frigid River',
    'You are on the Frigid River in the vicinity of the dam. The river flows generally south here, its icy waters moving swiftly. The shore is accessible to the west.');
  (frigidRiver1 as any).isWaterRoom = true;

  const frigidRiver2 = world.createEntity('Frigid River-2', EntityType.ROOM);
  frigidRiver2.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  frigidRiver2.add(new IdentityTrait({
    name: 'Frigid River',
    aliases: ['frigid river', 'river'],
    description: 'You are on the Frigid River. The current is growing stronger, and you can hear the roar of Aragain Falls somewhere to the south. A sandy beach is visible to the west.',
    properName: true,
    article: 'the'
  }));
  (frigidRiver2 as any).isWaterRoom = true;

  const frigidRiver3 = world.createEntity('Frigid River-3', EntityType.ROOM);
  frigidRiver3.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  frigidRiver3.add(new IdentityTrait({
    name: 'Frigid River',
    aliases: ['frigid river', 'river'],
    description: 'You are on the Frigid River, perilously close to the top of Aragain Falls! The thundering of the waterfall is deafening. The current here is extremely strong. White cliffs rise to the east.',
    properName: true,
    article: 'the'
  }));
  (frigidRiver3 as any).isWaterRoom = true;

  const shore = createRoom(world, 'Shore',
    'You are on the western shore of the Frigid River. The river flows swiftly past to the east. A path leads into the forest to the west.');

  const sandyBeach = createRoom(world, 'Sandy Beach',
    'You are on a small sandy beach along the western shore of the Frigid River. The sand is coarse and grey. The river flows past to the east, and you can hear the distant thunder of the falls.');

  const aragainFalls = world.createEntity('Aragain Falls', EntityType.ROOM);
  aragainFalls.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true,
    blockedExits: {
      [Direction.WEST]: 'The rainbow is beautiful, but it looks far too insubstantial to walk on.'
    }
  }));
  aragainFalls.add(new IdentityTrait({
    name: 'Aragain Falls',
    aliases: ['aragain falls', 'falls', 'waterfall'],
    description: 'You are at the top of Aragain Falls, a magnificent waterfall that plunges hundreds of feet into a misty gorge below. A beautiful rainbow arcs through the spray. Going over the falls would be certain death.',
    properName: true,
    article: ''
  }));
  (aragainFalls as any).isWaterRoom = true;
  (aragainFalls as any).isDeadlyFalls = true;

  const onTheRainbow = world.createEntity('On the Rainbow', EntityType.ROOM);
  onTheRainbow.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  onTheRainbow.add(new IdentityTrait({
    name: 'On the Rainbow',
    aliases: ['on the rainbow', 'rainbow'],
    description: 'You are standing on a solid rainbow that arcs over Aragain Falls. The view is breathtaking - you can see for miles in every direction. The rainbow leads to a small ledge at the end.',
    properName: true,
    article: ''
  }));
  (onTheRainbow as any).isRainbowRoom = true;

  const endOfRainbow = createRoom(world, 'End of Rainbow',
    'You are on a small ledge at the end of the rainbow. The ledge overlooks the misty gorge below Aragain Falls. There is barely room to stand here.');
  (endOfRainbow as any).isRainbowRoom = true;

  const whiteCliffsBeach = createRoom(world, 'White Cliffs Beach',
    'You are on a narrow beach at the base of towering white cliffs. The cliffs rise dramatically to the east, while the Frigid River flows past to the west. A path leads up the cliff face.');

  const whiteCliffs = createRoom(world, 'White Cliffs',
    'You are atop the white cliffs overlooking the Frigid River. The view is spectacular - you can see Aragain Falls to the south and the river winding northward. A steep path leads down to the beach.');

  const rockyShore = createRoom(world, 'Rocky Shore',
    'You are on a rocky shore at the base of Aragain Falls. The spray from the falls keeps everything perpetually wet. The thundering water makes it hard to think. A cave entrance is visible in the cliff face.');

  const atlantis = world.createEntity('Atlantis', EntityType.ROOM);
  atlantis.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  atlantis.add(new IdentityTrait({
    name: 'Atlantis',
    aliases: ['atlantis', 'underwater city'],
    description: 'You are in a magnificent underwater chamber, somehow dry and breathable. Ornate columns support a domed ceiling decorated with mosaics of sea creatures. This must be a remnant of the legendary lost city of Atlantis!',
    properName: true,
    article: ''
  }));

  const caveBehindFalls = createRoom(world, 'Cave Behind Falls',
    'You are in a damp cave behind Aragain Falls. The roar of the water is muffled but ever-present. Passages lead in several directions.',
    true, false);

  // === Set up connections ===

  setExits(frigidRiver1, {
    [Direction.SOUTH]: frigidRiver2.id,
    [Direction.WEST]: shore.id,
    // North connects to Dam Base - set externally
  });

  setExits(frigidRiver2, {
    [Direction.NORTH]: frigidRiver1.id,
    [Direction.SOUTH]: frigidRiver3.id,
    [Direction.WEST]: sandyBeach.id,
  });

  setExits(frigidRiver3, {
    [Direction.NORTH]: frigidRiver2.id,
    [Direction.SOUTH]: aragainFalls.id,
    [Direction.EAST]: whiteCliffsBeach.id,
  });

  setExits(shore, {
    [Direction.EAST]: frigidRiver1.id,
    [Direction.SOUTH]: sandyBeach.id,
  });

  setExits(sandyBeach, {
    [Direction.NORTH]: shore.id,
    [Direction.EAST]: frigidRiver2.id,
  });

  // Aragain Falls - west to rainbow is blocked initially
  aragainFalls.get(RoomTrait)!.exits[Direction.NORTH] = { destination: frigidRiver3.id };

  setExits(onTheRainbow, {
    [Direction.EAST]: aragainFalls.id,
    [Direction.WEST]: endOfRainbow.id,
  });

  setExits(endOfRainbow, { [Direction.EAST]: onTheRainbow.id });

  setExits(whiteCliffsBeach, {
    [Direction.WEST]: frigidRiver3.id,
    [Direction.UP]: whiteCliffs.id,
  });

  setExits(whiteCliffs, { [Direction.DOWN]: whiteCliffsBeach.id });

  setExits(rockyShore, {
    [Direction.WEST]: caveBehindFalls.id,
    [Direction.DOWN]: atlantis.id,
  });

  setExits(caveBehindFalls, { [Direction.EAST]: rockyShore.id });

  setExits(atlantis, { [Direction.UP]: rockyShore.id });

  return {
    frigidRiver1: frigidRiver1.id,
    frigidRiver2: frigidRiver2.id,
    frigidRiver3: frigidRiver3.id,
    shore: shore.id,
    sandyBeach: sandyBeach.id,
    aragainFalls: aragainFalls.id,
    onTheRainbow: onTheRainbow.id,
    endOfRainbow: endOfRainbow.id,
    whiteCliffsBeach: whiteCliffsBeach.id,
    whiteCliffs: whiteCliffs.id,
    rockyShore: rockyShore.id,
    atlantis: atlantis.id,
    caveBehindFalls: caveBehindFalls.id,
  };
}

// === External connectors ===

/**
 * Connect Frigid River to Dam region (via Dam Base)
 */
export function connectFrigidRiverToDam(
  world: WorldModel,
  frigidRiverIds: FrigidRiverRoomIds,
  damBaseId: string
): void {
  const frigidRiver1 = world.getEntity(frigidRiverIds.frigidRiver1);
  if (frigidRiver1) {
    frigidRiver1.get(RoomTrait)!.exits[Direction.NORTH] = { destination: damBaseId };
  }

  const damBase = world.getEntity(damBaseId);
  if (damBase) {
    damBase.get(RoomTrait)!.exits[Direction.SOUTH] = { destination: frigidRiverIds.frigidRiver1 };
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

// ============================================================================
// OBJECTS - Created near their default room locations
// ============================================================================

/**
 * Create all objects in the Frigid River region
 */
export function createFrigidRiverObjects(world: WorldModel, roomIds: FrigidRiverRoomIds): void {
  // Treasures
  createPotOfGold(world, roomIds.endOfRainbow);
  createTrident(world, roomIds.atlantis);
  createBuoy(world, roomIds.sandyBeach);
  createStatue(world, roomIds.sandyBeach);

  // Tools
  createShovel(world, roomIds.sandyBeach);

  // Scenery
  createRainbow(world, roomIds.aragainFalls);
  createWaterfall(world, roomIds.aragainFalls);

  // Vehicle
  createInflatableBoat(world, roomIds.shore);
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
  world.moveEntity(pot.id, roomId);
  return pot;
}

// ============= Atlantis Objects =============

function createTrident(world: WorldModel, roomId: string): IFEntity {
  const trident = world.createEntity('trident', EntityType.ITEM);
  trident.add(new IdentityTrait({
    name: 'trident',
    aliases: ['crystal trident', 'poseidon trident', 'three-pronged spear'],
    description: 'A magnificent crystal trident, clearly of Atlantean origin. Its three prongs gleam with an otherworldly light.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  (trident as any).isTreasure = true;
  (trident as any).treasureId = 'trident';
  (trident as any).treasureValue = 4;
  world.moveEntity(trident.id, roomId);
  return trident;
}

// ============= Sandy Beach Objects =============

function createBuoy(world: WorldModel, roomId: string): IFEntity {
  const buoy = world.createEntity('buoy', EntityType.ITEM);
  buoy.add(new IdentityTrait({
    name: 'buoy',
    aliases: ['red buoy', 'floating buoy'],
    description: 'A red buoy that has washed up on the beach. It rattles when shaken - there appears to be something inside!',
    properName: false,
    article: 'a',
    weight: 10
  }));
  buoy.add(new ContainerTrait({ capacity: { maxItems: 1, maxWeight: 5 } }));
  world.moveEntity(buoy.id, roomId);

  const emerald = world.createEntity('emerald', EntityType.ITEM);
  emerald.add(new IdentityTrait({
    name: 'emerald',
    aliases: ['green gem', 'green emerald', 'gem'],
    description: 'A beautiful green emerald of exceptional clarity.',
    properName: false,
    article: 'an',
    weight: 5
  }));
  (emerald as any).isTreasure = true;
  (emerald as any).treasureId = 'buoy-emerald';
  (emerald as any).treasureValue = 5;
  world.moveEntity(emerald.id, buoy.id);

  return buoy;
}

function createStatue(world: WorldModel, roomId: string): IFEntity {
  const statue = world.createEntity('statue', EntityType.ITEM);
  statue.add(new IdentityTrait({
    name: 'beautiful statue',
    aliases: ['statue', 'sculpture', 'figure', 'figurine'],
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

function createShovel(world: WorldModel, roomId: string): IFEntity {
  const shovel = world.createEntity('shovel', EntityType.ITEM);
  shovel.add(new IdentityTrait({
    name: 'shovel',
    aliases: ['spade', 'digging tool'],
    description: 'A sturdy shovel, suitable for digging in sand or soft earth.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  world.moveEntity(shovel.id, roomId);
  return shovel;
}

// ============= Aragain Falls Objects =============

function createRainbow(world: WorldModel, roomId: string): IFEntity {
  const rainbow = world.createEntity('rainbow', EntityType.ITEM);
  rainbow.add(new IdentityTrait({
    name: 'rainbow',
    aliases: ['beautiful rainbow', 'arc'],
    description: 'A beautiful rainbow arcs through the mist of Aragain Falls. It looks almost solid enough to walk on...',
    properName: false,
    article: 'a'
  }));
  rainbow.add(new SceneryTrait());
  (rainbow as any).isSolid = false;
  world.moveEntity(rainbow.id, roomId);
  return rainbow;
}

function createWaterfall(world: WorldModel, roomId: string): IFEntity {
  const waterfall = world.createEntity('waterfall', EntityType.ITEM);
  waterfall.add(new IdentityTrait({
    name: 'waterfall',
    aliases: ['falls', 'aragain falls', 'water'],
    description: 'Aragain Falls is a magnificent waterfall, hundreds of feet tall. The water thunders down into a misty gorge below.',
    properName: false,
    article: 'a'
  }));
  waterfall.add(new SceneryTrait());
  world.moveEntity(waterfall.id, roomId);
  return waterfall;
}

// ============= Shore Objects =============

function createInflatableBoat(world: WorldModel, roomId: string): IFEntity {
  const boat = world.createEntity('pile of plastic', EntityType.ITEM);
  boat.add(new IdentityTrait({
    name: 'pile of plastic',
    aliases: ['boat', 'rubber boat', 'raft', 'inflatable boat', 'inflatable raft', 'plastic', 'pile'],
    description: 'There is a folded pile of plastic here which has a small valve attached.',
    properName: false,
    article: 'a',
    weight: 2
  }));
  boat.add(new ContainerTrait({ capacity: { maxItems: 10, maxWeight: 100 } }));
  (boat as any).isInflated = false;
  world.moveEntity(boat.id, roomId);
  return boat;
}
