/**
 * Coal Mine Objects
 *
 * Shaft Room: Basket (elevator mechanism)
 * Coal Mine Dead End: Coal (fuel for machine)
 * Machine Room: Machine (sharpens items when powered)
 * Squeaky Room: Vampire bat (NPC), Jade figurine (treasure)
 * Gas Room: Sapphire bracelet (treasure)
 * Sooty Room: Red crystal sphere (treasure)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ContainerTrait,
  SceneryTrait,
  ActorTrait,
  NpcTrait,
  EntityType
} from '@sharpee/world-model';

import { CoalMineRoomIds } from '../index';
import { BasketElevatorTrait } from '../../../traits';

/**
 * Create all objects in the Coal Mine region
 */
export function createCoalMineObjects(world: WorldModel, roomIds: CoalMineRoomIds): void {
  // Shaft Room objects
  createBasket(world, roomIds.shaftRoom, roomIds.bottomOfShaft);

  // Coal Mine Dead End objects
  createCoal(world, roomIds.coalMineDeadEnd);

  // Machine Room objects
  createMachine(world, roomIds.machineRoom);

  // Squeaky Room objects (bat room)
  createVampireBat(world, roomIds.squeakyRoom);
  createJadeFigurine(world, roomIds.squeakyRoom);

  // Gas Room objects
  createSapphireBracelet(world, roomIds.gasRoom);

  // Sooty Room objects
  createRedCrystalSphere(world, roomIds.sootyRoom);

  // Timber Room objects
  createTimber(world, roomIds.timberRoom);
}

/**
 * Basket - Elevator mechanism for the shaft
 *
 * Uses BasketElevatorTrait for capability dispatch (ADR-090).
 * Responds to "lower basket" and "raise basket" commands.
 */
function createBasket(
  world: WorldModel,
  topRoomId: string,
  bottomRoomId: string
): IFEntity {
  const basket = world.createEntity('basket', EntityType.CONTAINER);

  basket.add(new IdentityTrait({
    name: 'rusty iron basket',
    aliases: ['basket', 'iron basket', 'rusty basket'],
    description: 'A rusty iron basket hangs from a sturdy chain. It looks large enough to hold a person and some items. There is a wheel mechanism nearby to lower and raise it.',
    properName: false,
    article: 'a'
  }));

  basket.add(new ContainerTrait({
    capacity: { maxItems: 10, maxWeight: 100 }
  }));

  basket.add(new SceneryTrait());

  // Basket elevator trait - handles lowering/raising via capability dispatch
  basket.add(new BasketElevatorTrait({
    topRoomId,
    bottomRoomId,
    initialPosition: 'top'
  }));

  world.moveEntity(basket.id, topRoomId);
  return basket;
}

/**
 * Coal - Fuel for the machine
 */
function createCoal(world: WorldModel, roomId: string): IFEntity {
  const coal = world.createEntity('coal', EntityType.ITEM);

  coal.add(new IdentityTrait({
    name: 'pile of coal',
    aliases: ['coal', 'black coal', 'lump of coal'],
    description: 'A pile of black coal. It would make excellent fuel for a machine.',
    properName: false,
    article: 'a'
  }));

  world.moveEntity(coal.id, roomId);
  return coal;
}

/**
 * Machine - Coal-powered machine that sharpens things
 */
function createMachine(world: WorldModel, roomId: string): IFEntity {
  const machine = world.createEntity('machine', EntityType.SCENERY);

  machine.add(new IdentityTrait({
    name: 'coal-powered machine',
    aliases: ['machine', 'coal machine', 'big machine'],
    description: 'This is a massive coal-powered machine with a prominent slot on one side and what appears to be a grinding wheel inside. There is a hopper for fuel on top.',
    properName: false,
    article: 'a'
  }));

  machine.add(new SceneryTrait());

  // Machine state
  (machine as any).isPowered = false;
  (machine as any).hasCoal = false;

  world.moveEntity(machine.id, roomId);
  return machine;
}

/**
 * Vampire Bat - NPC that can carry the player
 */
function createVampireBat(world: WorldModel, roomId: string): IFEntity {
  const bat = world.createEntity('vampire bat', EntityType.ACTOR);

  bat.add(new IdentityTrait({
    name: 'vampire bat',
    aliases: ['bat', 'giant bat', 'large bat'],
    description: 'A giant vampire bat hangs from the ceiling, watching you with beady eyes. It looks strong enough to carry a person.',
    properName: false,
    article: 'a'
  }));

  bat.add(new ActorTrait({
    isPlayer: false
  }));

  bat.add(new NpcTrait({
    behaviorId: 'bat',
    isHostile: false,  // Not hostile, but will carry you away
    canMove: true
  }));

  // Bat is repelled by garlic
  (bat as any).repelledBy = 'garlic';

  world.moveEntity(bat.id, roomId);
  return bat;
}

/**
 * Jade Figurine - Treasure in Bat Room
 */
function createJadeFigurine(world: WorldModel, roomId: string): IFEntity {
  const figurine = world.createEntity('jade figurine', EntityType.ITEM);

  figurine.add(new IdentityTrait({
    name: 'jade figurine',
    aliases: ['figurine', 'jade', 'statue', 'jade statue'],
    description: 'A beautiful jade figurine of an oriental dragon. It is exquisitely carved.',
    properName: false,
    article: 'a'
  }));

  // Treasure scoring
  (figurine as any).isTreasure = true;
  (figurine as any).treasureId = 'jade-figurine';
  (figurine as any).treasureValue = 5;

  world.moveEntity(figurine.id, roomId);
  return figurine;
}

/**
 * Sapphire Bracelet - Treasure in Gas Room
 */
function createSapphireBracelet(world: WorldModel, roomId: string): IFEntity {
  const bracelet = world.createEntity('sapphire bracelet', EntityType.ITEM);

  bracelet.add(new IdentityTrait({
    name: 'sapphire bracelet',
    aliases: ['bracelet', 'sapphire', 'blue bracelet'],
    description: 'A delicate bracelet set with brilliant blue sapphires.',
    properName: false,
    article: 'a'
  }));

  // Treasure scoring
  (bracelet as any).isTreasure = true;
  (bracelet as any).treasureId = 'sapphire-bracelet';
  (bracelet as any).treasureValue = 5;

  world.moveEntity(bracelet.id, roomId);
  return bracelet;
}

/**
 * Red Crystal Sphere - Treasure in Sooty Room (15 pts total)
 */
function createRedCrystalSphere(world: WorldModel, roomId: string): IFEntity {
  const sphere = world.createEntity('red crystal sphere', EntityType.ITEM);

  sphere.add(new IdentityTrait({
    name: 'red crystal sphere',
    aliases: ['sphere', 'crystal sphere', 'red sphere', 'crystal', 'red crystal', 'ball'],
    description: 'A beautiful sphere of red crystal. It seems to glow with an inner light.',
    properName: false,
    article: 'a'
  }));

  // Treasure scoring
  (sphere as any).isTreasure = true;
  (sphere as any).treasureId = 'red-crystal-sphere';
  (sphere as any).treasureValue = 10;
  (sphere as any).trophyCaseValue = 5;

  world.moveEntity(sphere.id, roomId);
  return sphere;
}

/**
 * Timber - Large wooden beam, can be used for various purposes
 *
 * Found in Timber Room. Can be used to prop things up or as fuel.
 */
function createTimber(world: WorldModel, roomId: string): IFEntity {
  const timber = world.createEntity('timber', EntityType.ITEM);

  timber.add(new IdentityTrait({
    name: 'wooden timber',
    aliases: ['timber', 'beam', 'wooden beam', 'lumber', 'wood'],
    description: 'A large, sturdy piece of timber. It could be useful for propping things up.',
    properName: false,
    article: 'a'
  }));

  world.moveEntity(timber.id, roomId);
  return timber;
}
