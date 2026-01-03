/**
 * Dam Region Objects
 * See ../README.md for object overview
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ContainerTrait,
  OpenableTrait,
  ReadableTrait,
  SceneryTrait,
  EntityType
} from '@sharpee/world-model';

import { DamRoomIds } from '../index';
import { createStoneBasin } from './basin-objects';

/**
 * Create all objects in the Dam region
 */
export function createDamObjects(world: WorldModel, roomIds: DamRoomIds): void {
  // Loud Room
  createPlatinumBar(world, roomIds.loudRoom);

  // Dam Lobby
  createGuidebook(world, roomIds.damLobby);
  createMatchbook(world, roomIds.damLobby);

  // Maintenance Room
  createControlPanel(world, roomIds.maintenanceRoom);
  createWrench(world, roomIds.maintenanceRoom);
  createScrewdriver(world, roomIds.maintenanceRoom);

  // Reservoir (when drained)
  createTrunkOfJewels(world, roomIds.reservoir);

  // Basin Room - ADR-078 ghost ritual
  createStoneBasin(world, roomIds.basinRoom);

  // Glacier Room - glacier blocks north passage
  createGlacier(world, roomIds.glacierRoom);
}

/**
 * Glacier - Blocks north passage, melted by throwing lit torch
 *
 * When the ivory torch (lit) is thrown at the glacier, it melts
 * and reveals the north passage to Volcano View.
 */
function createGlacier(world: WorldModel, roomId: string): IFEntity {
  const glacier = world.createEntity('glacier', EntityType.SCENERY);

  glacier.add(new IdentityTrait({
    name: 'glacier',
    aliases: ['ice', 'massive glacier', 'ice wall', 'wall of ice'],
    description: 'A massive wall of ice fills the northern part of the room, blocking any passage in that direction. It glistens with an inner cold light.',
    properName: false,
    article: 'a'
  }));

  glacier.add(new SceneryTrait());

  // Track melted state
  (glacier as any).isMelted = false;

  world.moveEntity(glacier.id, roomId);
  return glacier;
}

/**
 * Matchbook - Contains the "Send for brochure" advertisement
 * Reading this hints at the mail order puzzle
 */
function createMatchbook(world: WorldModel, roomId: string): IFEntity {
  const matchbook = world.createEntity('matchbook', EntityType.ITEM);

  matchbook.add(new IdentityTrait({
    name: 'matchbook',
    aliases: ['matches', 'book of matches', 'match book'],
    description: 'A matchbook advertising MIT Tech. The cover says "STRADDLING THE CUTTING EDGE OF NOTHING".',
    properName: false,
    article: 'a'
  }));

  matchbook.add(new ReadableTrait({
    text: `   *** MIT TECH CORRESPONDENCE SCHOOL ***

"My income soared after I received my degree!" - Mr. TAA of Muddle, Mass.

"I got a great job in paper shuffling!" - Mr. MARC of Boston

Straddling the cutting edge of nothing! Earn your MDL degree at home!

       *** SEND FOR OUR FREE BROCHURE TODAY! ***`
  }));

  world.moveEntity(matchbook.id, roomId);
  return matchbook;
}

/**
 * Guidebook - Dam history and controls explanation
 */
function createGuidebook(world: WorldModel, roomId: string): IFEntity {
  const guidebook = world.createEntity('guidebook', EntityType.ITEM);

  guidebook.add(new IdentityTrait({
    name: 'guidebook',
    aliases: ['guide book', 'guide', 'book', 'brochure', 'pamphlet'],
    description: 'This is a guidebook entitled "Flood Control Dam #3" with a picture of the dam on the cover.',
    properName: false,
    article: 'a'
  }));

  guidebook.add(new ReadableTrait({
    text: `FLOOD CONTROL DAM #3

Constructed in Year 783 of the Great Underground Empire, Flood Control Dam #3 was a major engineering achievement. The dam is 400 feet tall and holds back the mighty Frigid River.

The dam is controlled from the Maintenance Room. In case of emergency, the control panel can be used to open or close the sluice gates.

NOTICE: Opening the sluice gates will drain the reservoir. This is not reversible without significant effort.`
  }));

  world.moveEntity(guidebook.id, roomId);
  return guidebook;
}

/**
 * Control Panel - Opens/closes sluice gates
 */
function createControlPanel(world: WorldModel, roomId: string): IFEntity {
  const panel = world.createEntity('control panel', EntityType.ITEM);

  panel.add(new IdentityTrait({
    name: 'control panel',
    aliases: ['panel', 'controls', 'buttons', 'switches', 'levers'],
    description: 'The control panel has a row of buttons in various colors. There is also a large bolt holding a cover in place, and a yellow button labeled "DANGER".',
    properName: false,
    article: 'a'
  }));

  panel.add(new SceneryTrait({}));

  // Panel state - bolt must be loosened before button works
  (panel as any).boltLoose = false;

  world.moveEntity(panel.id, roomId);
  return panel;
}

/**
 * Wrench - Loosens bolt on control panel
 */
function createWrench(world: WorldModel, roomId: string): IFEntity {
  const wrench = world.createEntity('wrench', EntityType.ITEM);

  wrench.add(new IdentityTrait({
    name: 'wrench',
    aliases: ['spanner', 'tool'],
    description: 'This is a heavy wrench, suitable for loosening large bolts.',
    properName: false,
    article: 'a'
  }));

  world.moveEntity(wrench.id, roomId);
  return wrench;
}

/**
 * Screwdriver - General tool
 */
function createScrewdriver(world: WorldModel, roomId: string): IFEntity {
  const screwdriver = world.createEntity('screwdriver', EntityType.ITEM);

  screwdriver.add(new IdentityTrait({
    name: 'screwdriver',
    aliases: ['screwdriver', 'tool'],
    description: 'This is a large flathead screwdriver.',
    properName: false,
    article: 'a'
  }));

  world.moveEntity(screwdriver.id, roomId);
  return screwdriver;
}

/**
 * Trunk of Jewels - Treasure in drained reservoir
 */
function createTrunkOfJewels(world: WorldModel, roomId: string): IFEntity {
  const trunk = world.createEntity('trunk', EntityType.ITEM);

  trunk.add(new IdentityTrait({
    name: 'trunk',
    aliases: ['trunk of jewels', 'treasure trunk', 'chest'],
    description: 'This is an old trunk, covered in mud. It appears to contain a fortune in jewels!',
    properName: false,
    article: 'a'
  }));

  trunk.add(new ContainerTrait({
    capacity: { maxItems: 10, maxWeight: 50 }
  }));

  trunk.add(new OpenableTrait({
    isOpen: true
  }));

  // Treasure scoring
  (trunk as any).isTreasure = true;
  (trunk as any).treasureId = 'trunk-of-jewels';
  (trunk as any).treasureValue = 15;

  world.moveEntity(trunk.id, roomId);
  return trunk;
}

/**
 * Platinum Bar - Treasure in Loud Room
 * Heavy bar that requires careful handling
 */
function createPlatinumBar(world: WorldModel, roomId: string): IFEntity {
  const bar = world.createEntity('platinum bar', EntityType.ITEM);

  bar.add(new IdentityTrait({
    name: 'platinum bar',
    aliases: ['bar', 'platinum', 'ingot', 'metal bar'],
    description: 'This is a large bar of platinum, stamped "FROBOZZ MAGIC COMPANY".',
    properName: false,
    article: 'a'
  }));

  // Treasure scoring
  (bar as any).isTreasure = true;
  (bar as any).treasureId = 'platinum-bar';
  (bar as any).treasureValue = 10;

  // Note: Weight is now computed from traits, not set directly

  world.moveEntity(bar.id, roomId);
  return bar;
}

