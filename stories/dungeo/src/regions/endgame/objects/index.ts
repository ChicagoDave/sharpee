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
    stoneRoom: string;
    parapet: string;
    insideMirror: string;
    prisonCell: string;
  }
): void {
  // Stone Room objects
  createStoneButton(world, roomIds.stoneRoom);

  // Parapet objects
  createSundial(world, roomIds.parapet);
  createDialButton(world, roomIds.parapet);

  // Inside Mirror objects
  createShortPole(world, roomIds.insideMirror);
  createLongPole(world, roomIds.insideMirror);

  // Prison Cell objects (bronze door only visible in cell 4)
  createBronzeDoor(world, roomIds.prisonCell);
}
