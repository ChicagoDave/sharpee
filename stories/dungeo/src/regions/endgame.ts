/**
 * Endgame Region - The final challenge of Zork
 *
 * 14 rooms: Top of Stairs, Stone Room, Small Room, Hallway, Inside Mirror,
 * Dungeon Entrance, Narrow Corridor, East-West Corridor, Parapet, Prison Cell,
 * Treasury of Zork, Entry to Hades, Land of the Dead, Tomb
 *
 * Triggered from the Crypt after meeting specific conditions,
 * or accessed via INCANT cheat.
 *
 * Features:
 * - Laser puzzle (Small Room / Stone Room)
 * - Inside Mirror rotating box puzzle
 * - Dungeon Master trivia challenge
 * - Parapet dial puzzle
 * - Treasury of Zork victory room
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
  OpenableTrait
} from '@sharpee/world-model';
import { HadesEntryTrait } from '../traits';

export interface EndgameRoomIds {
  topOfStairs: string;
  stoneRoom: string;
  smallRoom: string;
  hallway: string;
  insideMirror: string;
  dungeonEntrance: string;
  narrowCorridor: string;
  eastWestCorridor: string;
  parapet: string;
  prisonCell: string;
  treasury: string;
  entryToHades: string;
  landOfDead: string;
  tomb: string;
}

// Message ID for spirits blocking passage
export const SPIRITS_BLOCK_MESSAGE = 'dungeo.exorcism.spirits_block';

function createRoom(world: WorldModel, name: string, description: string, isDark = false): IFEntity {
  const room = world.createEntity(name, EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark, isOutdoors: false }));
  room.add(new IdentityTrait({ name, description, properName: false, article: 'the' }));
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

export function createEndgameRegion(world: WorldModel): EndgameRoomIds {
  // === Create all rooms ===

  const topOfStairs = createRoom(world, 'Top of Stairs',
    'This is a room with an exit on the west side, and a staircase leading up.');

  const stoneRoom = createRoom(world, 'Stone Room',
    'This is a small stone room with passages leading north and south. Set into one wall is a stone button.');

  const smallRoom = createRoom(world, 'Small Room',
    'This is a small room, with narrow passages exiting to the north and south. A narrow red beam of light crosses the room at the north end, inches above the floor.');
  world.setStateValue('endgame.laserBeamActive', true);

  const hallway = createRoom(world, 'Hallway',
    'This is part of the long hallway. The east and west walls are dressed stone. In the center of the hall is a shallow stone channel. In the center of the room the channel widens into a large hole around which is engraved a compass rose. Sitting in the center of the room is a strange wooden structure.\n\nIdentical stone statues face each other from pedestals on opposite sides of the corridor. The statues represent Guardians of Zork, a military order of ancient lineage. They are portrayed as heavily armored warriors standing at ease, hands clasped around formidable bludgeons.');

  const insideMirror = createRoom(world, 'Inside Mirror',
    'You are inside a rectangular box of wood whose structure is rather complicated. Four sides and the roof are filled in, and the floor is open.\n\nAs you face the side opposite the entrance, two short sides of carved and polished wood are to your left and right. The left panel is mahogany, the right pine. The wall you face is red on its left half and black on its right. On the entrance side, the wall is white opposite the red part of the wall it faces, and yellow opposite the black section. The painted walls are at least twice the length of the unpainted ones. The ceiling is painted blue.\n\nIn the floor is a stone channel about six inches wide and a foot deep. The channel is oriented in a north-south direction. In the exact center of the room the channel widens into a circular depression perhaps two feet wide. Incised in the stone around this area is a compass rose.\n\nRunning from one short wall to the other at about waist height is a wooden bar, carefully carved and drilled. This bar is pierced in two places. Through each hole runs a wooden pole.');
  world.setStateValue('insideMirror.direction', 0);
  world.setStateValue('insideMirror.position', 0);
  world.setStateValue('insideMirror.poleState', 1);

  const dungeonEntrance = createRoom(world, 'Dungeon Entrance',
    'This is a north-south hallway which ends in a large wooden door. The wooden door has a barred panel in it at about head height.');
  world.setStateValue('trivia.questionsAnswered', 0);
  world.setStateValue('trivia.wrongAttempts', 0);
  world.setStateValue('trivia.currentQuestion', -1);

  const narrowCorridor = createRoom(world, 'Narrow Corridor',
    'This is a narrow north-south corridor. At the south end is a door and at the north end is an east-west corridor.');
  (narrowCorridor as any).awardsPointsOnEntry = 20;

  const eastWestCorridor = createRoom(world, 'East-West Corridor',
    'This is a large east-west corridor which opens out to a northern parapet at its center. You can see flames and smoke as you peer towards the parapet. The corridor turns south at its east and west ends, and due south is a massive wooden door. In the door is a small window barred with iron.');

  const parapet = createRoom(world, 'Parapet',
    'You are standing behind a stone retaining wall which rims a large parapet overlooking a fiery pit. It is difficult to see through the smoke and flame which fills the pit, but it seems to be more or less bottomless. It also extends upwards out of sight. The pit itself is of roughly dressed stone and is circular in shape. It is about two hundred feet in diameter. The flames generate considerable heat, so it is rather uncomfortable standing here.\n\nThere is an object here which looks like a sundial. On it are an indicator arrow and (in the center) a large button. On the face of the dial are numbers "one" through "eight".');
  world.setStateValue('parapet.dialSetting', 1);

  const prisonCell = createRoom(world, 'Prison Cell',
    'This is a featureless prison cell. You can see only the flames and smoke of the pit out of the small window in a closed wooden door in front of you.');
  world.setStateValue('prisonCell.currentCell', null);
  world.setStateValue('prisonCell.bronzeDoorVisible', false);

  const treasury = world.createEntity('Treasury of Zork', EntityType.ROOM);
  treasury.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  treasury.add(new IdentityTrait({
    name: 'Treasury of Zork',
    aliases: ['treasury', 'treasury of zork'],
    description: 'This is the Treasury of Zork. You have reached the end of your journey! Untold riches surround you - gold, gems, and artifacts beyond measure.',
    properName: true,
    article: 'the'
  }));
  (treasury as any).isVictoryRoom = true;
  (treasury as any).awardsPointsOnEntry = 35;

  const entryToHades = world.createEntity('Entrance to Hades', EntityType.ROOM);
  entryToHades.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false,
    blockedExits: { [Direction.EAST]: SPIRITS_BLOCK_MESSAGE }
  }));
  entryToHades.add(new IdentityTrait({
    name: 'Entrance to Hades',
    aliases: ['entrance to hades', 'hades entrance', 'gates of hades'],
    description: 'You are at the entrance to Hades, the land of the dead. An eerie mist swirls around you. Ghostly figures seem to hover in the air, blocking passage to the east. A corridor leads north.',
    properName: true,
    article: 'the'
  }));
  entryToHades.add(new HadesEntryTrait({ spiritsBlocking: true }));

  const landOfDead = world.createEntity('Land of the Dead', EntityType.ROOM);
  landOfDead.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  landOfDead.add(new IdentityTrait({
    name: 'Land of the Dead',
    aliases: ['land of dead', 'land of the dead', 'hades'],
    description: 'You have entered the Land of the Dead. The air is cold and still. Ghostly shapes drift silently in the darkness. This is not a place for the living. A faint glow emanates from the north.',
    properName: true,
    article: 'the'
  }));

  const tomb = world.createEntity('Tomb of the Unknown Implementer', EntityType.ROOM);
  tomb.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  tomb.add(new IdentityTrait({
    name: 'Tomb of the Unknown Implementer',
    aliases: ['tomb', 'tomb of unknown implementer', 'tomb of the unknown implementer'],
    description: 'This is the Tomb of the Unknown Implementer. A hollow voice says, "That\'s not a bug, it\'s a feature!" In the north wall of the room is the Crypt of the Implementers. It is made of the finest marble and is apparently large enough for four headless corpses. Above the entrance is the cryptic inscription: "Feel Free". To the south is a small opening, apparently of recent origin.',
    properName: true,
    article: 'the'
  }));

  // === Set up connections ===

  setExits(topOfStairs, { [Direction.WEST]: stoneRoom.id });

  setExits(stoneRoom, {
    [Direction.EAST]: topOfStairs.id,
    [Direction.SOUTH]: smallRoom.id,
  });

  setExits(smallRoom, {
    [Direction.NORTH]: stoneRoom.id,
    [Direction.SOUTH]: hallway.id,
  });

  setExits(hallway, {
    [Direction.NORTH]: smallRoom.id,
    [Direction.SOUTH]: dungeonEntrance.id,
    [Direction.IN]: insideMirror.id,
  });

  // insideMirror - exits handled dynamically by puzzle handler

  // dungeonEntrance - N exit added when trivia is solved

  setExits(narrowCorridor, {
    [Direction.SOUTH]: dungeonEntrance.id,
    [Direction.NORTH]: eastWestCorridor.id,
  });

  setExits(eastWestCorridor, {
    [Direction.SOUTH]: narrowCorridor.id,
    [Direction.NORTH]: parapet.id,
  });

  setExits(parapet, { [Direction.SOUTH]: eastWestCorridor.id });

  // Entry to Hades area connections (per map-connections.md)
  setExits(entryToHades, { [Direction.EAST]: landOfDead.id });
  setExits(landOfDead, {
    [Direction.WEST]: entryToHades.id,
    [Direction.EAST]: tomb.id,
  });
  setExits(tomb, { [Direction.WEST]: landOfDead.id });
  // Note: Crypt is described within Tomb but not a separate room in mainframe Zork

  // prisonCell - exits handled dynamically by dial puzzle
  // treasury - no exits, game ends on entry

  // Store room IDs for INCANT teleport
  world.setStateValue('endgame.topOfStairsId', topOfStairs.id);
  world.setStateValue('endgame.insideMirrorId', insideMirror.id);

  return {
    topOfStairs: topOfStairs.id,
    stoneRoom: stoneRoom.id,
    smallRoom: smallRoom.id,
    hallway: hallway.id,
    insideMirror: insideMirror.id,
    dungeonEntrance: dungeonEntrance.id,
    narrowCorridor: narrowCorridor.id,
    eastWestCorridor: eastWestCorridor.id,
    parapet: parapet.id,
    prisonCell: prisonCell.id,
    treasury: treasury.id,
    entryToHades: entryToHades.id,
    landOfDead: landOfDead.id,
    tomb: tomb.id,
  };
}

// ============================================================================
// OBJECTS - Created near their default room locations
// ============================================================================

/**
 * Create all endgame objects
 */
export function createEndgameObjects(
  world: WorldModel,
  roomIds: {
    smallRoom: string;
    stoneRoom: string;
    parapet: string;
    insideMirror: string;
    prisonCell: string;
  }
): void {
  // Small Room objects (laser puzzle)
  createLaserBeam(world, roomIds.smallRoom);

  // Stone Room objects
  createStoneButton(world, roomIds.stoneRoom);

  // Parapet objects
  createSundial(world, roomIds.parapet);
  createDialButton(world, roomIds.parapet);

  // Inside Mirror objects
  createShortPole(world, roomIds.insideMirror);
  createLongPole(world, roomIds.insideMirror);
  createMahoganyPanel(world, roomIds.insideMirror);
  createPinePanel(world, roomIds.insideMirror);
  createRedPanel(world, roomIds.insideMirror);
  createYellowPanel(world, roomIds.insideMirror);

  // Prison Cell objects
  createBronzeDoor(world, roomIds.prisonCell);
}

// ============= Small Room Objects =============

function createLaserBeam(world: WorldModel, roomId: string): IFEntity {
  const beam = world.createEntity('laser beam', EntityType.SCENERY);

  beam.add(new IdentityTrait({
    name: 'laser beam',
    aliases: ['beam', 'red beam', 'light beam', 'narrow beam', 'beam of light'],
    description: 'A narrow red beam of light crosses the room at the north end, inches above the floor.',
    article: 'a'
  }));

  beam.add(new SceneryTrait());

  world.moveEntity(beam.id, roomId);

  (beam as any).isLaserBeam = true;

  return beam;
}

// ============= Stone Room Objects =============

function createStoneButton(world: WorldModel, roomId: string): IFEntity {
  const button = world.createEntity('stone button', EntityType.OBJECT);

  button.add(new IdentityTrait({
    name: 'stone button',
    aliases: ['button', 'stone button'],
    description: 'A stone button is set into the wall. It looks like it can be pushed.',
    article: 'a'
  }));

  button.add(new SceneryTrait());

  world.moveEntity(button.id, roomId);

  (button as any).isPushable = true;
  (button as any).buttonType = 'stone';

  return button;
}

// ============= Parapet Objects =============

function createSundial(world: WorldModel, roomId: string): IFEntity {
  const sundial = world.createEntity('sundial', EntityType.OBJECT);

  sundial.add(new IdentityTrait({
    name: 'sundial',
    aliases: ['sundial', 'dial', 'sun dial'],
    description: 'An object that looks like a sundial. On it are an indicator arrow and (in the center) a large button. On the face of the dial are numbers "one" through "eight".',
    article: 'a'
  }));

  sundial.add(new SceneryTrait());

  world.moveEntity(sundial.id, roomId);

  (sundial as any).isDial = true;

  return sundial;
}

function createDialButton(world: WorldModel, roomId: string): IFEntity {
  const button = world.createEntity('dial button', EntityType.OBJECT);

  button.add(new IdentityTrait({
    name: 'button',
    aliases: ['button', 'dial button', 'large button'],
    description: 'A large button in the center of the dial.',
    article: 'a'
  }));

  button.add(new SceneryTrait());

  world.moveEntity(button.id, roomId);

  (button as any).isPushable = true;
  (button as any).buttonType = 'dial';

  return button;
}

// ============= Inside Mirror Objects =============

function createShortPole(world: WorldModel, roomId: string): IFEntity {
  const pole = world.createEntity('short pole', EntityType.OBJECT);

  pole.add(new IdentityTrait({
    name: 'short pole',
    aliases: ['short pole', 'pole', 'left pole'],
    description: 'The pole at the left end of the bar is short, extending about a foot above the bar, and ends in a hand grip.',
    article: 'a'
  }));

  pole.add(new SceneryTrait());

  world.moveEntity(pole.id, roomId);

  (pole as any).isPole = true;
  (pole as any).poleType = 'short';

  return pole;
}

function createLongPole(world: WorldModel, roomId: string): IFEntity {
  const pole = world.createEntity('long pole', EntityType.OBJECT);

  pole.add(new IdentityTrait({
    name: 'long pole',
    aliases: ['long pole', 'pole', 'center pole', 't-bar'],
    description: 'The long pole at the center of the bar extends from the ceiling through the bar to the circular area in the stone channel. The bottom end of this pole has a T-bar a bit less than two feet long attached to it. On the T-bar is carved an arrow.',
    article: 'a'
  }));

  pole.add(new SceneryTrait());

  world.moveEntity(pole.id, roomId);

  (pole as any).isPole = true;
  (pole as any).poleType = 'long';

  return pole;
}

function createMahoganyPanel(world: WorldModel, roomId: string): IFEntity {
  const panel = world.createEntity('mahogany panel', EntityType.OBJECT);

  panel.add(new IdentityTrait({
    name: 'mahogany panel',
    aliases: ['mahogany panel', 'mahogany wall', 'mahogany', 'left panel', 'left wall'],
    description: 'The mahogany panel is smooth and well-polished. It forms one of the short walls of the structure.',
    article: 'a'
  }));

  panel.add(new SceneryTrait());

  world.moveEntity(panel.id, roomId);

  (panel as any).isPanel = true;
  (panel as any).panelType = 'mahogany';

  return panel;
}

function createPinePanel(world: WorldModel, roomId: string): IFEntity {
  const panel = world.createEntity('pine panel', EntityType.OBJECT);

  panel.add(new IdentityTrait({
    name: 'pine panel',
    aliases: ['pine panel', 'pine wall', 'pine', 'right panel', 'right wall', 'pine door'],
    description: 'The pine panel is sturdy but plain. It forms one of the short walls of the structure.',
    article: 'a'
  }));

  panel.add(new SceneryTrait());

  world.moveEntity(panel.id, roomId);

  (panel as any).isPanel = true;
  (panel as any).panelType = 'pine';

  return panel;
}

function createRedPanel(world: WorldModel, roomId: string): IFEntity {
  const panel = world.createEntity('red panel', EntityType.OBJECT);

  panel.add(new IdentityTrait({
    name: 'red panel',
    aliases: ['red panel', 'red wall', 'red', 'red section'],
    description: 'The red panel is painted a deep crimson. It forms part of the long wall opposite the entrance.',
    article: 'a'
  }));

  panel.add(new SceneryTrait());

  world.moveEntity(panel.id, roomId);

  (panel as any).isPanel = true;
  (panel as any).panelType = 'red';

  return panel;
}

function createYellowPanel(world: WorldModel, roomId: string): IFEntity {
  const panel = world.createEntity('yellow panel', EntityType.OBJECT);

  panel.add(new IdentityTrait({
    name: 'yellow panel',
    aliases: ['yellow panel', 'yellow wall', 'yellow', 'yellow section'],
    description: 'The yellow panel is painted a bright gold color. It forms part of the wall on the entrance side.',
    article: 'a'
  }));

  panel.add(new SceneryTrait());

  world.moveEntity(panel.id, roomId);

  (panel as any).isPanel = true;
  (panel as any).panelType = 'yellow';

  return panel;
}

// ============= Prison Cell Objects =============

function createBronzeDoor(world: WorldModel, roomId: string): IFEntity {
  const door = world.createEntity('bronze door', EntityType.OBJECT);

  door.add(new IdentityTrait({
    name: 'bronze door',
    aliases: ['bronze door', 'door'],
    description: 'A heavy bronze door.',
    article: 'a'
  }));

  door.add(new SceneryTrait());
  door.add(new OpenableTrait({ isOpen: false }));

  world.moveEntity(door.id, roomId);

  (door as any).isTreasuryDoor = true;

  return door;
}
