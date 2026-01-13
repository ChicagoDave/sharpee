/**
 * Dam Region - Flood Control Dam #3 and surrounding areas
 *
 * 11 rooms: Deep Canyon, Dam Lobby, Dam, Dam Base, Maintenance Room,
 * Reservoir South, Reservoir, Reservoir North, Stream View, Small Cave, Atlantis Room
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType,
  Direction,
  DirectionType,
  SceneryTrait,
  ContainerTrait,
  OpenableTrait,
  ReadableTrait
} from '@sharpee/world-model';

export interface DamRoomIds {
  deepCanyon: string;
  damLobby: string;
  dam: string;
  damBase: string;
  maintenanceRoom: string;
  reservoirSouth: string;
  reservoir: string;
  reservoirNorth: string;
  streamView: string;
  smallCave: string;
  atlantisRoom: string;
}

function createRoom(world: WorldModel, name: string, description: string, isDark = true): IFEntity {
  const room = world.createEntity(name, EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark, isOutdoors: false }));
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

export function createDamRegion(world: WorldModel): DamRoomIds {
  // === Create all rooms ===

  const deepCanyon = createRoom(world, 'Deep Canyon',
    'You are in a deep canyon with sheer walls rising on all sides. A narrow path leads north.');

  const damLobby = createRoom(world, 'Dam Lobby',
    'This is a large, echoing hall. A passage leads south, and doors lead north and east.');

  const dam = createRoom(world, 'Flood Control Dam #3',
    'You are standing on the top of the Flood Control Dam #3, which was quite a tourist attraction in times far distant. From here, a wide passage leads north and south.');

  const damBase = createRoom(world, 'Dam Base',
    'You are at the base of the dam. A stairway leads up.');

  const maintenanceRoom = createRoom(world, 'Maintenance Room',
    'This is a small maintenance room. Various tools line the walls.');

  const reservoirSouth = createRoom(world, 'Reservoir South',
    'You are at the south end of a huge reservoir. The water is murky and cold.');

  const reservoir = createRoom(world, 'Reservoir',
    'You are in the middle of a large reservoir. The water level is quite low.');

  const reservoirNorth = createRoom(world, 'Reservoir North',
    'You are at the north end of a large reservoir.');

  const streamView = createRoom(world, 'Stream View',
    'You are standing at a point where a stream emerges from underground.');

  const smallCave = createRoom(world, 'Small Cave',
    'This is a small cave above the Atlantis Room. A stairway leads down.');

  const atlantisRoom = createRoom(world, 'Atlantis Room',
    'This is a large room with a vaulted ceiling. Ancient murals depicting undersea life cover the walls.');

  // === Set up connections ===
  // Per canonical map-connections.md

  // Deep Canyon: NW→Reservoir South, E→Dam, SE→Round Room (external)
  setExits(deepCanyon, {
    [Direction.NORTHWEST]: reservoirSouth.id,
    [Direction.EAST]: dam.id,
    // SE → Round Room connected externally
  });

  // Dam Lobby: S→Dam, N→Maintenance Room, E→Maintenance Room
  setExits(damLobby, {
    [Direction.SOUTH]: dam.id,
    [Direction.NORTH]: maintenanceRoom.id,
    [Direction.EAST]: maintenanceRoom.id,
  });

  // Dam (Flood Control Dam #3): S→Deep Canyon, N→Dam Lobby, D→Dam Base
  setExits(dam, {
    [Direction.SOUTH]: deepCanyon.id,
    [Direction.NORTH]: damLobby.id,
    [Direction.DOWN]: damBase.id,
  });

  // Dam Base: U→Dam, N→Frigid River (external)
  setExits(damBase, { [Direction.UP]: dam.id });
  // N → Frigid River connected externally

  // Maintenance Room: S→Dam Lobby, W→Dam Lobby
  setExits(maintenanceRoom, {
    [Direction.SOUTH]: damLobby.id,
    [Direction.WEST]: damLobby.id,
  });

  // Reservoir South: UP→Deep Canyon, N→Reservoir, W→Stream View
  setExits(reservoirSouth, {
    [Direction.UP]: deepCanyon.id,
    [Direction.NORTH]: reservoir.id,
    [Direction.WEST]: streamView.id,
  });

  // Reservoir: S→Reservoir South, N→Reservoir North
  setExits(reservoir, {
    [Direction.SOUTH]: reservoirSouth.id,
    [Direction.NORTH]: reservoirNorth.id,
  });

  // Reservoir North: S→Reservoir, N→Atlantis Room
  setExits(reservoirNorth, {
    [Direction.SOUTH]: reservoir.id,
    [Direction.NORTH]: atlantisRoom.id,
  });

  // Atlantis Room: SE→Reservoir North, U→Small Cave
  setExits(atlantisRoom, {
    [Direction.SOUTHEAST]: reservoirNorth.id,
    [Direction.UP]: smallCave.id,
  });

  // Small Cave: D→Atlantis Room, E→Mirror Room (coal mine state, external)
  setExits(smallCave, { [Direction.DOWN]: atlantisRoom.id });
  // E → Mirror Room (coal mine state) connected externally

  // Stream View: E→Reservoir South, S→Glacier Room (external)
  setExits(streamView, { [Direction.EAST]: reservoirSouth.id });
  // S → Glacier Room connected externally

  return {
    deepCanyon: deepCanyon.id,
    damLobby: damLobby.id,
    dam: dam.id,
    damBase: damBase.id,
    maintenanceRoom: maintenanceRoom.id,
    reservoirSouth: reservoirSouth.id,
    reservoir: reservoir.id,
    reservoirNorth: reservoirNorth.id,
    streamView: streamView.id,
    smallCave: smallCave.id,
    atlantisRoom: atlantisRoom.id,
  };
}

// === External connectors ===

export function connectDamToRoundRoom(world: WorldModel, ids: DamRoomIds, roundRoomId: string): void {
  const dc = world.getEntity(ids.deepCanyon);
  const rr = world.getEntity(roundRoomId);
  if (dc) dc.get(RoomTrait)!.exits[Direction.SOUTHEAST] = { destination: roundRoomId };
  if (rr) rr.get(RoomTrait)!.exits[Direction.NORTHWEST] = { destination: ids.deepCanyon };
}

export function connectDamToFrigidRiver(world: WorldModel, ids: DamRoomIds, frigidRiverId: string): void {
  const db = world.getEntity(ids.damBase);
  if (db) db.get(RoomTrait)!.exits[Direction.NORTH] = { destination: frigidRiverId };
}

/**
 * Connect Stream View to Glacier Room (volcano region)
 * Stream View: S→Glacier Room, Glacier Room: N→Stream View
 */
export function connectStreamViewToGlacier(world: WorldModel, ids: DamRoomIds, glacierRoomId: string): void {
  const sv = world.getEntity(ids.streamView);
  const gr = world.getEntity(glacierRoomId);
  if (sv) sv.get(RoomTrait)!.exits[Direction.SOUTH] = { destination: glacierRoomId };
  if (gr) gr.get(RoomTrait)!.exits[Direction.NORTH] = { destination: ids.streamView };
}

export function connectSmallCaveToMirrorRoom(world: WorldModel, ids: DamRoomIds, mirrorRoomId: string): void {
  const sc = world.getEntity(ids.smallCave);
  if (sc) sc.get(RoomTrait)!.exits[Direction.EAST] = { destination: mirrorRoomId };
}

// ============================================================================
// OBJECTS - Created near their default room locations
// ============================================================================

/**
 * Create all objects in the Dam region
 */
export function createDamObjects(world: WorldModel, roomIds: DamRoomIds): void {
  // Dam Lobby objects (guidebook, matchbook)
  createDamLobbyObjects(world, roomIds.damLobby);

  // Maintenance Room objects (control panel, buttons, tools)
  createMaintenanceRoomObjects(world, roomIds.maintenanceRoom);

  // Dam objects (bolt for sluice gates)
  createDamBolt(world, roomIds.dam);

  // Reservoir objects (trunk of jewels - when drained)
  createReservoirObjects(world, roomIds.reservoir);

  // Reservoir North objects (hand pump)
  createReservoirNorthObjects(world, roomIds.reservoirNorth);

  // Dam Base objects (inflatable boat)
  createDamBaseObjects(world, roomIds.damBase);

  // Atlantis Room objects (crystal trident)
  createAtlantisRoomObjects(world, roomIds.atlantisRoom);
}

// ============= Dam Lobby Objects =============

function createDamLobbyObjects(world: WorldModel, roomId: string): void {
  // Guidebook - Dam history and controls explanation
  const guidebook = world.createEntity('guidebook', EntityType.ITEM);
  guidebook.add(new IdentityTrait({
    name: 'guidebook',
    aliases: ['guide book', 'guide', 'book', 'brochure', 'pamphlet'],
    description: 'This is a guidebook entitled "Flood Control Dam #3" with a picture of the dam on the cover.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  guidebook.add(new ReadableTrait({
    text: `FLOOD CONTROL DAM #3

Constructed in Year 783 of the Great Underground Empire, Flood Control Dam #3 was a major engineering achievement. The dam is 400 feet tall and holds back the mighty Frigid River.

The dam is controlled from the Maintenance Room. In case of emergency, the control panel can be used to open or close the sluice gates.

NOTICE: Opening the sluice gates will drain the reservoir. This is not reversible without significant effort.`
  }));
  world.moveEntity(guidebook.id, roomId);

  // Matchbook - hints at mail order puzzle
  const matchbook = world.createEntity('matchbook', EntityType.ITEM);
  matchbook.add(new IdentityTrait({
    name: 'matchbook',
    aliases: ['matches', 'book of matches', 'match book'],
    description: 'A matchbook advertising MIT Tech. The cover says "STRADDLING THE CUTTING EDGE OF NOTHING".',
    properName: false,
    article: 'a',
    weight: 5
  }));
  matchbook.add(new ReadableTrait({
    text: `   *** MIT TECH CORRESPONDENCE SCHOOL ***

"My income soared after I received my degree!" - Mr. TAA of Muddle, Mass.

"I got a great job in paper shuffling!" - Mr. MARC of Boston

Straddling the cutting edge of nothing! Earn your MDL degree at home!

       *** SEND FOR OUR FREE BROCHURE TODAY! ***`
  }));
  world.moveEntity(matchbook.id, roomId);
}

// ============= Maintenance Room Objects =============

function createMaintenanceRoomObjects(world: WorldModel, roomId: string): void {
  // Control Panel - scenery
  const panel = world.createEntity('control panel', EntityType.ITEM);
  panel.add(new IdentityTrait({
    name: 'control panel',
    aliases: ['panel', 'controls', 'buttons', 'switches', 'levers'],
    description: 'The control panel has a row of buttons in various colors. There is also a large bolt holding a cover in place, and a yellow button labeled "DANGER".',
    properName: false,
    article: 'a'
  }));
  panel.add(new SceneryTrait());
  (panel as any).boltLoose = false;
  world.moveEntity(panel.id, roomId);

  // Wrench - loosens bolt on control panel
  const wrench = world.createEntity('wrench', EntityType.ITEM);
  wrench.add(new IdentityTrait({
    name: 'wrench',
    aliases: ['spanner', 'tool'],
    description: 'This is a heavy wrench, suitable for loosening large bolts.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  world.moveEntity(wrench.id, roomId);

  // Screwdriver - general tool
  const screwdriver = world.createEntity('screwdriver', EntityType.ITEM);
  screwdriver.add(new IdentityTrait({
    name: 'screwdriver',
    aliases: ['screwdriver', 'tool'],
    description: 'This is a large flathead screwdriver.',
    properName: false,
    article: 'a',
    weight: 10
  }));
  world.moveEntity(screwdriver.id, roomId);

  // Buttons - yellow (danger), brown, red, blue
  // NOTE: 'button' alias is required for CommandValidator - it searches by head noun ("button")
  // then disambiguates by modifiers ("yellow")
  const yellowButton = world.createEntity('yellow button', EntityType.ITEM);
  yellowButton.add(new IdentityTrait({
    name: 'yellow button',
    aliases: ['danger button', 'danger', 'button'],
    adjectives: ['yellow'],
    description: 'A yellow button labeled "DANGER".',
    properName: false,
    article: 'a'
  }));
  (yellowButton as any).buttonColor = 'yellow';
  world.moveEntity(yellowButton.id, roomId);

  const brownButton = world.createEntity('brown button', EntityType.ITEM);
  brownButton.add(new IdentityTrait({
    name: 'brown button',
    aliases: ['button'],
    adjectives: ['brown'],
    description: 'A brown button.',
    properName: false,
    article: 'a'
  }));
  (brownButton as any).buttonColor = 'brown';
  world.moveEntity(brownButton.id, roomId);

  const redButton = world.createEntity('red button', EntityType.ITEM);
  redButton.add(new IdentityTrait({
    name: 'red button',
    aliases: ['button'],
    adjectives: ['red'],
    description: 'A red button.',
    properName: false,
    article: 'a'
  }));
  (redButton as any).buttonColor = 'red';
  world.moveEntity(redButton.id, roomId);

  const blueButton = world.createEntity('blue button', EntityType.ITEM);
  blueButton.add(new IdentityTrait({
    name: 'blue button',
    aliases: ['button'],
    adjectives: ['blue'],
    description: 'A blue button.',
    properName: false,
    article: 'a'
  }));
  (blueButton as any).buttonColor = 'blue';
  world.moveEntity(blueButton.id, roomId);
}

// ============= Dam Objects =============

function createDamBolt(world: WorldModel, roomId: string): void {
  // Bolt - controls sluice gates (requires wrench, yellow button pressed)
  const bolt = world.createEntity('bolt', EntityType.ITEM);
  bolt.add(new IdentityTrait({
    name: 'bolt',
    aliases: ['large bolt', 'metal bolt'],
    description: 'A large metal bolt on the control panel. Above it is a small green plastic bubble.',
    properName: false,
    article: 'a'
  }));
  (bolt as any).turnable = true;
  world.moveEntity(bolt.id, roomId);
}

// ============= Reservoir Objects =============

function createReservoirObjects(world: WorldModel, roomId: string): void {
  // Trunk of jewels - treasure (15 pts) in drained reservoir
  const trunk = world.createEntity('trunk', EntityType.ITEM);
  trunk.add(new IdentityTrait({
    name: 'trunk',
    aliases: ['trunk of jewels', 'treasure trunk', 'chest'],
    description: 'This is an old trunk, covered in mud. It appears to contain a fortune in jewels!',
    properName: false,
    article: 'a',
    weight: 5
  }));
  trunk.add(new ContainerTrait({
    capacity: { maxItems: 10, maxWeight: 50 }
  }));
  trunk.add(new OpenableTrait({ isOpen: true }));
  (trunk as any).isTreasure = true;
  (trunk as any).treasureId = 'trunk-of-jewels';
  (trunk as any).treasureValue = 15;       // OFVAL from mdlzork_810722
  (trunk as any).trophyCaseValue = 8;      // OTVAL from mdlzork_810722
  world.moveEntity(trunk.id, roomId);
}

// ============= Reservoir North Objects =============

function createReservoirNorthObjects(world: WorldModel, roomId: string): void {
  // Hand pump - used to inflate/deflate the boat
  const pump = world.createEntity('hand pump', EntityType.ITEM);
  pump.add(new IdentityTrait({
    name: 'hand pump',
    aliases: ['pump', 'air pump', 'hand pump', 'rubber pump'],
    description: 'This is a small hand-held air pump.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  world.moveEntity(pump.id, roomId);
}

// ============= Dam Base Objects =============

function createDamBaseObjects(world: WorldModel, roomId: string): void {
  // Inflatable boat (pile of plastic) - inflate with pump to use on river
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

  // Tan label - instructions for the boat (inside boat when inflated)
  const label = world.createEntity('tan label', EntityType.ITEM);
  label.add(new IdentityTrait({
    name: 'tan label',
    aliases: ['label', 'tan label', 'instructions'],
    description: 'A tan label attached to the boat.',
    properName: false,
    article: 'a',
    weight: 0
  }));
  label.add(new ReadableTrait({
    text: `    !!!! FROBOZZ MAGIC BOAT COMPANY !!!!

Hello, sailor!

Instructions for use:

To get into the boat, say "BOARD"
To leave the boat, say "DISEMBARK"
To get into a body of water, say "LAUNCH"
To get to shore, say "LAND"

Warranty:

This boat is guaranteed against all defects in parts and workmanship for a period of 76 milliseconds from date of purchase or until first used, whichever comes first.

Warning: This boat is made of plastic.

Good luck!`
  }));
  world.moveEntity(label.id, boat.id);

  // Sharp stick - punctures boat if carried into it, also creates rainbow when waved at falls
  const stick = world.createEntity('sharp stick', EntityType.ITEM);
  stick.add(new IdentityTrait({
    name: 'sharp stick',
    aliases: ['stick', 'broken stick', 'sharp stick', 'broken sharp stick', 'pointed stick'],
    description: 'A sharp stick, which appears to have been broken at one end, is here.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  (stick as any).isPointy = true;
  (stick as any).puncturesBoat = true;
  (stick as any).isSceptre = true;  // Flag used by wave-action to identify rainbow item
  world.moveEntity(stick.id, roomId);

  // Water/River scenery at Dam Base
  const river = world.createEntity('river-dam-base', EntityType.ITEM);
  river.add(new IdentityTrait({
    name: 'Frigid River',
    aliases: ['river', 'water', 'frigid river', 'stream'],
    description: 'The Frigid River is flowing by here. Across the river are the White Cliffs, which seem to form a giant wall stretching from north to south along the east shore of the river as it winds its way downstream.',
    properName: true,
    article: 'the'
  }));
  river.add(new SceneryTrait());
  (river as any).isWaterBody = true;
  world.moveEntity(river.id, roomId);
}

// ============= Atlantis Room Objects =============

function createAtlantisRoomObjects(world: WorldModel, roomId: string): void {
  // Crystal Trident - treasure (11 take + 4 case = 15 pts)
  const trident = world.createEntity('crystal trident', EntityType.ITEM);
  trident.add(new IdentityTrait({
    name: 'crystal trident',
    aliases: ['trident', 'poseidon trident', 'poseidons trident', 'crystal'],
    description: 'On the shore lies Poseidon\'s own crystal trident.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  (trident as any).isTreasure = true;
  (trident as any).treasureId = 'crystal-trident';
  (trident as any).treasureValue = 4;      // OFVAL from mdlzork_810722
  (trident as any).trophyCaseValue = 11;   // OTVAL from mdlzork_810722
  world.moveEntity(trident.id, roomId);

  // Tin of rare spices (Saffron) - treasure (5 take + 5 case = 10 pts)
  // In 1981 MDL: SAFFR object in ALITR (Atlantis Room)
  const saffron = world.createEntity('tin of spices', EntityType.ITEM);
  saffron.add(new IdentityTrait({
    name: 'tin of spices',
    aliases: ['tin', 'spices', 'saffron', 'rare spices', 'tin of rare spices'],
    description: 'A tin of rare spices. The aroma is exotic and enticing.',
    properName: false,
    article: 'a',
    weight: 8
  }));
  (saffron as any).isTreasure = true;
  (saffron as any).treasureId = 'saffron';
  (saffron as any).treasureValue = 5;      // OFVAL from mdlzork_810722
  (saffron as any).trophyCaseValue = 5;    // OTVAL from mdlzork_810722
  world.moveEntity(saffron.id, roomId);
}
