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

/**
 * Create all objects in the Dam region
 */
export function createDamObjects(world: WorldModel, roomIds: DamRoomIds): void {
  // Dam Lobby
  createGuidebook(world, roomIds.damLobby);

  // Maintenance Room
  createControlPanel(world, roomIds.maintenanceRoom);
  createWrench(world, roomIds.maintenanceRoom);
  createScrewdriver(world, roomIds.maintenanceRoom);

  // Reservoir (when drained)
  createTrunkOfJewels(world, roomIds.reservoir);
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
  (trunk as any).treasureValue = 15;

  world.moveEntity(trunk.id, roomId);
  return trunk;
}
