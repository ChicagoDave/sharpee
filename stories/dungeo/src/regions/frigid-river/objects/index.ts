/**
 * Frigid River Region Objects
 *
 * Treasures:
 * - Pot of gold (10 pts) - End of Rainbow
 * - Trident (4 pts) - Atlantis
 * - Buoy with emerald (5 pts) - Sandy Beach
 */
import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  EntityType,
  SceneryTrait,
  ContainerTrait
} from '@sharpee/world-model';
import { FrigidRiverRoomIds } from '../index';

export function createFrigidRiverObjects(world: WorldModel, roomIds: FrigidRiverRoomIds): void {
  // Treasures
  createPotOfGold(world, roomIds.endOfRainbow);
  createTrident(world, roomIds.atlantis);
  createBuoy(world, roomIds.sandyBeach);
  createStatue(world, roomIds.sandyBeach); // Buried - revealed by digging

  // Tools
  createShovel(world, roomIds.sandyBeach);

  // Scenery
  createRainbow(world, roomIds.aragainFalls);
  createWaterfall(world, roomIds.aragainFalls);

  // Vehicle (simplified - no mechanics yet)
  createInflatableBoat(world, roomIds.shore);
}

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
  buoy.add(new ContainerTrait({
    capacity: { maxItems: 1, maxWeight: 5 }
  }));
  world.moveEntity(buoy.id, roomId);

  // Create emerald inside buoy
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
  // Rainbow state - solid or not (requires sceptre wave)
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

function createInflatableBoat(world: WorldModel, roomId: string): IFEntity {
  const boat = world.createEntity('inflatable boat', EntityType.ITEM);
  boat.add(new IdentityTrait({
    name: 'inflatable boat',
    aliases: ['boat', 'rubber boat', 'raft', 'inflatable raft'],
    description: 'A serviceable inflatable boat, suitable for navigating the Frigid River. A pair of oars is attached.',
    properName: false,
    article: 'an',
    weight: 2
  }));
  boat.add(new ContainerTrait({
    capacity: { maxItems: 10, maxWeight: 100 }
  }));
  // Boat state
  (boat as any).isInflated = true;
  world.moveEntity(boat.id, roomId);
  return boat;
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
  // Statue is buried - only visible after digging
  (statue as any).isBuried = true;
  (statue as any).isVisible = false;
  // Don't place in room initially - will be revealed by digging
  // world.moveEntity(statue.id, roomId);
  world.setStateValue('dungeo.statue.locationId', roomId);
  return statue;
}
