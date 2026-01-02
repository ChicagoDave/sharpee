/**
 * Endgame Objects
 *
 * Objects for the endgame puzzles:
 * - Stone button (Stone Room - laser puzzle)
 * - Sundial with button (Parapet - cell selection)
 * - Short pole (Inside Mirror - rotation lock)
 * - Long pole with T-bar (Inside Mirror - compass indicator)
 * - Mahogany panel (Inside Mirror - movement)
 * - Pine panel (Inside Mirror - door/movement)
 * - Bronze door (Prison Cell 4 - to Treasury)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  EntityType,
  SceneryTrait,
  OpenableTrait
} from '@sharpee/world-model';

/**
 * Create the laser beam scenery in Small Room
 * The beam is visible when active, broken when sword is dropped
 */
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

  // Mark for dynamic description based on state
  (beam as any).isLaserBeam = true;

  return beam;
}

/**
 * Create the stone button in Stone Room
 */
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

  // Mark as pushable
  (button as any).isPushable = true;
  (button as any).buttonType = 'stone';

  return button;
}

/**
 * Create the sundial with button at Parapet
 */
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

  // Mark as dial
  (sundial as any).isDial = true;

  return sundial;
}

/**
 * Create the dial button at Parapet
 */
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

  // Mark as pushable
  (button as any).isPushable = true;
  (button as any).buttonType = 'dial';

  return button;
}

/**
 * Create the short pole in Inside Mirror
 */
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

  // Mark as pole for puzzle mechanics
  (pole as any).isPole = true;
  (pole as any).poleType = 'short';

  return pole;
}

/**
 * Create the long pole in Inside Mirror
 */
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

  // Mark as pole for puzzle mechanics
  (pole as any).isPole = true;
  (pole as any).poleType = 'long';

  return pole;
}

/**
 * Create the mahogany panel in Inside Mirror
 * Pushing this moves the box along the groove (when aligned N-S)
 */
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

  // Mark as panel for puzzle mechanics
  (panel as any).isPanel = true;
  (panel as any).panelType = 'mahogany';

  return panel;
}

/**
 * Create the pine panel in Inside Mirror
 * Pushing this moves the box (opposite direction from mahogany)
 */
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

  // Mark as panel for puzzle mechanics
  (panel as any).isPanel = true;
  (panel as any).panelType = 'pine';

  return panel;
}

/**
 * Create the red panel in Inside Mirror
 * Pushing this rotates the box 45 degrees
 */
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

  // Mark as panel for puzzle mechanics
  (panel as any).isPanel = true;
  (panel as any).panelType = 'red';

  return panel;
}

/**
 * Create the yellow panel in Inside Mirror
 * Pushing this rotates the box 45 degrees (opposite direction from red)
 */
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

  // Mark as panel for puzzle mechanics
  (panel as any).isPanel = true;
  (panel as any).panelType = 'yellow';

  return panel;
}

/**
 * Create the bronze door in Prison Cell
 */
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

  // Mark as the treasury door
  (door as any).isTreasuryDoor = true;

  return door;
}

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

  // Prison Cell objects (bronze door only visible in cell 4)
  createBronzeDoor(world, roomIds.prisonCell);
}
