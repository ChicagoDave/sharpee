/**
 * Object definitions for The Alderman — weapons, evidence, and scenery.
 *
 * Weapons are placed in their "normal" locations. The randomization system
 * removes the murder weapon and places evidence at the murder location.
 *
 * Public interface: createObjects(), WeaponIds, SceneryIds
 * Owner: thealderman story
 */

import {
  WorldModel,
  EntityType,
  IFEntity,
  IdentityTrait,
  SceneryTrait,
  ReadableTrait,
  ContainerTrait,
  OpenableTrait,
} from '@sharpee/world-model';
import { RoomIds } from '../rooms';

/** Weapon entity IDs, set during creation. */
export const WeaponIds = {
  revolver: '',
  knife: '',
  champagneBottle: '',
  fireplacePoker: '',
  sadIron: '',
  curtainCord: '',
};

/** Key scenery entity IDs. */
export const SceneryIds = {
  fireplace: '',
  knifeBlock: '',
  pressingStation: '',
  stageCurtain: '',
  nightstandDrawer: '',
  barCounter: '',
  vanityTable: '',
  writingDesk: '',
};

/**
 * Creates all objects and places them in the world.
 *
 * @param world - The world model to populate
 */
export function createObjects(world: WorldModel): void {
  createWeapons(world);
  createScenery(world);
  createClues(world);
}

function createWeapons(world: WorldModel): void {
  // Revolver — Jack's room nightstand drawer
  const revolver = createItem(world, 'revolver', 'A Colt single-action revolver. Well-oiled and recently cleaned.', ['revolver', 'gun', 'pistol', 'colt']);
  WeaponIds.revolver = revolver.id;
  world.moveEntity(revolver.id, RoomIds.room308);

  // Knife — Kitchen knife block
  const knife = createItem(world, 'kitchen knife', 'A heavy chef\'s knife with a rosewood handle.', ['knife', 'kitchen knife', 'chef knife', 'blade']);
  WeaponIds.knife = knife.id;
  world.moveEntity(knife.id, RoomIds.kitchen);

  // Champagne bottle — Bar
  const bottle = createItem(world, 'champagne bottle', 'A bottle of Veuve Clicquot. Full and heavy.', ['champagne bottle', 'bottle', 'champagne']);
  WeaponIds.champagneBottle = bottle.id;
  world.moveEntity(bottle.id, RoomIds.bar);

  // Fireplace poker — Foyer
  const poker = createItem(world, 'fireplace poker', 'A wrought-iron fireplace poker. Surprisingly heavy.', ['poker', 'fireplace poker', 'iron poker']);
  WeaponIds.fireplacePoker = poker.id;
  world.moveEntity(poker.id, RoomIds.foyer);

  // Sad iron — Laundry pressing station
  const iron = createItem(world, 'sad iron', 'A flat iron used for pressing linens. Cast iron, blunt and weighty.', ['sad iron', 'iron', 'flat iron', 'pressing iron']);
  WeaponIds.sadIron = iron.id;
  world.moveEntity(iron.id, RoomIds.laundry);

  // Curtain cord — Ballroom stage
  const cord = createItem(world, 'curtain cord', 'A braided silk cord used to tie back the stage curtains.', ['curtain cord', 'cord', 'silk cord', 'rope']);
  WeaponIds.curtainCord = cord.id;
  world.moveEntity(cord.id, RoomIds.ballroom);
}

function createScenery(world: WorldModel): void {
  // === FOYER ===
  const fireplace = createSceneryItem(world, 'fireplace', 'A grand stone fireplace. Embers still glow from last night\'s fire. An iron hook on the side held a poker.', ['fireplace', 'fire', 'hearth']);
  SceneryIds.fireplace = fireplace.id;
  world.moveEntity(fireplace.id, RoomIds.foyer);

  createSceneryItem(world, 'chandeliers', 'Gas-lit chandeliers cast warm light across the marble floor.', ['chandeliers', 'chandelier', 'lights']);
  world.moveEntity(world.getEntity(world.getLastCreatedEntityId()!)!.id, RoomIds.foyer);

  // === RESTAURANT ===
  createSceneryItem(world, 'dining tables', 'Round tables draped in white linen, set with silver and crystal.', ['tables', 'dining tables', 'table']);
  world.moveEntity(world.getEntity(world.getLastCreatedEntityId()!)!.id, RoomIds.restaurant);

  // === KITCHEN ===
  const knifeBlock = createSceneryItem(world, 'knife block', 'A wooden block holding an assortment of kitchen knives. One slot is conspicuously empty.', ['knife block', 'block']);
  SceneryIds.knifeBlock = knifeBlock.id;
  world.moveEntity(knifeBlock.id, RoomIds.kitchen);

  createSceneryItem(world, 'preparation table', 'A long oak table scarred by years of chopping and slicing.', ['preparation table', 'prep table', 'table']);
  world.moveEntity(world.getEntity(world.getLastCreatedEntityId()!)!.id, RoomIds.kitchen);

  // === BAR ===
  const barCounter = createSceneryItem(world, 'bar counter', 'A long mahogany bar, polished to a mirror shine. Bottles and glasses behind it.', ['bar counter', 'counter', 'bar']);
  SceneryIds.barCounter = barCounter.id;
  world.moveEntity(barCounter.id, RoomIds.bar);

  // === BALLROOM ===
  const curtain = createSceneryItem(world, 'stage curtain', 'Heavy velvet curtains frame the small stage. The tiebacks are braided silk cords.', ['stage curtain', 'curtain', 'curtains', 'velvet curtain']);
  SceneryIds.stageCurtain = curtain.id;
  world.moveEntity(curtain.id, RoomIds.ballroom);

  // === ROOM 302 (Stephanie's room) ===
  const vanity = createSceneryItem(world, 'vanity table', 'An ornate vanity covered in perfume bottles, powder boxes, and a silver hand mirror.', ['vanity', 'vanity table', 'mirror', 'perfume']);
  SceneryIds.vanityTable = vanity.id;
  world.moveEntity(vanity.id, RoomIds.room302);

  const desk = createSceneryItem(world, 'writing desk', 'A small rosewood desk by the window. Papers and envelopes are neatly stacked.', ['writing desk', 'desk', 'papers']);
  SceneryIds.writingDesk = desk.id;
  world.moveEntity(desk.id, RoomIds.room302);

  // === ROOM 308 (Jack's room) ===
  const nightstand = world.createEntity('nightstand', EntityType.ITEM);
  nightstand.add(new IdentityTrait({
    name: 'nightstand',
    description: 'A bedside table with a single drawer.',
    aliases: ['nightstand', 'nightstand drawer', 'drawer', 'bedside table'],
    properName: false,
    article: 'a',
  }));
  nightstand.add(new SceneryTrait());
  nightstand.add(new ContainerTrait({ capacity: { maxItems: 3 } }));
  nightstand.add(new OpenableTrait({ isOpen: false }));
  SceneryIds.nightstandDrawer = nightstand.id;
  world.moveEntity(nightstand.id, RoomIds.room308);

  // === LAUNDRY ===
  const pressing = createSceneryItem(world, 'pressing station', 'A heavy wooden pressing board with space for a flat iron.', ['pressing station', 'pressing board', 'press']);
  SceneryIds.pressingStation = pressing.id;
  world.moveEntity(pressing.id, RoomIds.laundry);
}

function createClues(world: WorldModel): void {
  // Stephanie's personal effects — always present, provide backstory
  const letter = world.createEntity('unfinished letter', EntityType.ITEM);
  letter.add(new IdentityTrait({
    name: 'unfinished letter',
    description: 'A letter in Stephanie\'s hand, addressed to a solicitor. The ink trails off mid-sentence.',
    aliases: ['letter', 'unfinished letter', 'stephanie letter'],
    properName: false,
    article: 'an',
  }));
  letter.add(new ReadableTrait({
    text: [
      'Dear Mr. Hewitt,',
      '',
      'I write to inform you of my decision regarding the estate. The property',
      'deeds currently held by Mr. Margolin must be called in no later than—',
    ].join('\n'),
  }));
  world.moveEntity(letter.id, RoomIds.room302);

  // Locket — Chelsea's key evidence
  const locket = createItem(world, 'silver locket', 'A tarnished silver locket on a thin chain. It opens to reveal a faded photograph of a young red-haired woman.', ['locket', 'silver locket', 'necklace']);
  world.moveEntity(locket.id, RoomIds.room302);

  // Theatre program — evidence against Viola
  const program = world.createEntity('theatre program', EntityType.ITEM);
  program.add(new IdentityTrait({
    name: 'theatre program',
    description: 'A printed program for McVicker\'s Theatre. Tonight\'s performance of "The Heiress."',
    aliases: ['program', 'theatre program', 'playbill'],
    properName: false,
    article: 'a',
  }));
  program.add(new ReadableTrait({
    text: [
      'McVicker\'s Theatre presents "The Heiress"',
      'Starring Viola Wainright',
      '',
      'Evening Performance: 7:00 PM',
      'Rehearsal Schedule: 2:00 PM — 5:00 PM',
      '',
      '(The rehearsal ended at 5:00 PM — not at 8:00 PM as Viola claims.)',
    ].join('\n'),
  }));
  world.moveEntity(program.id, RoomIds.foyer);
}

function createItem(world: WorldModel, name: string, description: string, aliases: string[]): IFEntity {
  const item = world.createEntity(name, EntityType.ITEM);
  item.add(new IdentityTrait({
    name,
    description,
    aliases,
    properName: false,
    article: name.match(/^[aeiou]/i) ? 'an' : 'a',
  }));
  return item;
}

function createSceneryItem(world: WorldModel, name: string, description: string, aliases: string[]): IFEntity {
  const item = createItem(world, name, description, aliases);
  item.add(new SceneryTrait());
  return item;
}
