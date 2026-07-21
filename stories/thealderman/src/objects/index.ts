/**
 * Object definitions for The Alderman — weapons, evidence, and scenery.
 *
 * Weapons are placed in their "normal" locations. The randomization system
 * removes the murder weapon and places evidence at the murder location.
 *
 * Public interface: createObjects(), WeaponIds (type), SceneryIds (type),
 * ObjectIds (type)
 * Owner: thealderman story
 *
 * ADR-248: createObjects returns fresh id maps per call — no module-level
 * mutable registries — so each story instance owns its ids.
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

/** Weapon entity IDs, returned by createObjects(). */
export interface WeaponIds {
  revolver: string;
  knife: string;
  champagneBottle: string;
  fireplacePoker: string;
  sadIron: string;
  curtainCord: string;
}

/** Key scenery entity IDs, returned by createObjects(). */
export interface SceneryIds {
  fireplace: string;
  knifeBlock: string;
  pressingStation: string;
  stageCurtain: string;
  nightstandDrawer: string;
  barCounter: string;
  vanityTable: string;
  writingDesk: string;
}

/** All object id maps produced by createObjects(). */
export interface ObjectIds {
  weapons: WeaponIds;
  scenery: SceneryIds;
}

/**
 * Creates all objects and places them in the world.
 *
 * @param world - The world model to populate
 * @param rooms - The room id map for this world (from createRooms)
 * @returns Fresh weapon/scenery id maps for this world
 */
export function createObjects(world: WorldModel, rooms: RoomIds): ObjectIds {
  const weapons = createWeapons(world, rooms);
  const scenery = createScenery(world, rooms);
  createClues(world, rooms);
  return { weapons, scenery };
}

function createWeapons(world: WorldModel, rooms: RoomIds): WeaponIds {
  // Revolver — Jack's room nightstand drawer
  const revolver = createItem(world, 'revolver', 'A Colt single-action revolver. Well-oiled and recently cleaned.', ['revolver', 'gun', 'pistol', 'colt']);
  world.moveEntity(revolver.id, rooms.room308);

  // Knife — Kitchen knife block
  const knife = createItem(world, 'kitchen knife', 'A heavy chef\'s knife with a rosewood handle.', ['knife', 'kitchen knife', 'chef knife', 'blade']);
  world.moveEntity(knife.id, rooms.kitchen);

  // Champagne bottle — Bar
  const bottle = createItem(world, 'champagne bottle', 'A bottle of Veuve Clicquot. Full and heavy.', ['champagne bottle', 'bottle', 'champagne']);
  world.moveEntity(bottle.id, rooms.bar);

  // Fireplace poker — Foyer
  const poker = createItem(world, 'fireplace poker', 'A wrought-iron fireplace poker. Surprisingly heavy.', ['poker', 'fireplace poker', 'iron poker']);
  world.moveEntity(poker.id, rooms.foyer);

  // Sad iron — Laundry pressing station
  const iron = createItem(world, 'sad iron', 'A flat iron used for pressing linens. Cast iron, blunt and weighty.', ['sad iron', 'iron', 'flat iron', 'pressing iron']);
  world.moveEntity(iron.id, rooms.laundry);

  // Curtain cord — Ballroom stage
  const cord = createItem(world, 'curtain cord', 'A braided silk cord used to tie back the stage curtains.', ['curtain cord', 'cord', 'silk cord', 'rope']);
  world.moveEntity(cord.id, rooms.ballroom);

  return {
    revolver: revolver.id,
    knife: knife.id,
    champagneBottle: bottle.id,
    fireplacePoker: poker.id,
    sadIron: iron.id,
    curtainCord: cord.id,
  };
}

function createScenery(world: WorldModel, rooms: RoomIds): SceneryIds {
  // === FOYER ===
  const fireplace = createSceneryItem(world, 'fireplace', 'A grand stone fireplace. Embers still glow from last night\'s fire. An iron hook on the side held a poker.', ['fireplace', 'fire', 'hearth']);
  world.moveEntity(fireplace.id, rooms.foyer);

  const chandeliers = createSceneryItem(world, 'chandeliers', 'Gas-lit chandeliers cast warm light across the marble floor.', ['chandeliers', 'chandelier', 'lights']);
  world.moveEntity(chandeliers.id, rooms.foyer);

  // === RESTAURANT ===
  const diningTables = createSceneryItem(world, 'dining tables', 'Round tables draped in white linen, set with silver and crystal.', ['tables', 'dining tables', 'table']);
  world.moveEntity(diningTables.id, rooms.restaurant);

  // === KITCHEN ===
  const knifeBlock = createSceneryItem(world, 'knife block', 'A wooden block holding an assortment of kitchen knives. One slot is conspicuously empty.', ['knife block', 'block']);
  world.moveEntity(knifeBlock.id, rooms.kitchen);

  const preparationTable = createSceneryItem(world, 'preparation table', 'A long oak table scarred by years of chopping and slicing.', ['preparation table', 'prep table', 'table']);
  world.moveEntity(preparationTable.id, rooms.kitchen);

  // === BAR ===
  const barCounter = createSceneryItem(world, 'bar counter', 'A long mahogany bar, polished to a mirror shine. Bottles and glasses behind it.', ['bar counter', 'counter', 'bar']);
  world.moveEntity(barCounter.id, rooms.bar);

  // === BALLROOM ===
  const curtain = createSceneryItem(world, 'stage curtain', 'Heavy velvet curtains frame the small stage. The tiebacks are braided silk cords.', ['stage curtain', 'curtain', 'curtains', 'velvet curtain']);
  world.moveEntity(curtain.id, rooms.ballroom);

  // === ROOM 302 (Stephanie's room) ===
  const vanity = createSceneryItem(world, 'vanity table', 'An ornate vanity covered in perfume bottles, powder boxes, and a silver hand mirror.', ['vanity', 'vanity table', 'mirror', 'perfume']);
  world.moveEntity(vanity.id, rooms.room302);

  const desk = createSceneryItem(world, 'writing desk', 'A small rosewood desk by the window. Papers and envelopes are neatly stacked.', ['writing desk', 'desk', 'papers']);
  world.moveEntity(desk.id, rooms.room302);

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
  world.moveEntity(nightstand.id, rooms.room308);

  // === LAUNDRY ===
  const pressing = createSceneryItem(world, 'pressing station', 'A heavy wooden pressing board with space for a flat iron.', ['pressing station', 'pressing board', 'press']);
  world.moveEntity(pressing.id, rooms.laundry);

  return {
    fireplace: fireplace.id,
    knifeBlock: knifeBlock.id,
    pressingStation: pressing.id,
    stageCurtain: curtain.id,
    nightstandDrawer: nightstand.id,
    barCounter: barCounter.id,
    vanityTable: vanity.id,
    writingDesk: desk.id,
  };
}

function createClues(world: WorldModel, rooms: RoomIds): void {
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
    text: 'Dear Mr. Hewitt,[p]I write to inform you of my decision regarding the estate. The property deeds currently held by Mr. Margolin must be called in no later than—',
  }));
  world.moveEntity(letter.id, rooms.room302);

  // Locket — Chelsea's key evidence
  const locket = createItem(world, 'silver locket', 'A tarnished silver locket on a thin chain. It opens to reveal a faded photograph of a young red-haired woman.', ['locket', 'silver locket', 'necklace']);
  world.moveEntity(locket.id, rooms.room302);

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
    text: 'McVicker\'s Theatre presents "The Heiress"[br]Starring Viola Wainright[p]Evening Performance: 7:00 PM[br]Rehearsal Schedule: 2:00 PM — 5:00 PM[p](The rehearsal ended at 5:00 PM — not at 8:00 PM as Viola claims.)',
  }));
  world.moveEntity(program.id, rooms.foyer);
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
