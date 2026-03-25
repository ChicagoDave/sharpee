/**
 * Family Zoo — Items
 *
 * Everything the player can pick up, use, or interact with as an object:
 * the brochure, map, feed, penny, flashlight, camera, backpack, lunchbox,
 * containers like the feed dispenser and souvenir press.
 *
 * Public interface: createZooItems(world, rooms) → ItemIds
 * Owner: familyzoo tutorial, v17
 */

import {
  WorldModel,
  EntityType,
} from '@sharpee/world-model';
import {
  IdentityTrait,
  ContainerTrait,
  SupporterTrait,
  SceneryTrait,
  OpenableTrait,
  SwitchableTrait,
  LightSourceTrait,
  ReadableTrait,
} from '@sharpee/world-model';
import type { RoomIds } from './zoo-map';


// ============================================================================
// ITEM IDS — returned so other files can reference items
// ============================================================================

export interface ItemIds {
  animalFeed: string;
  penny: string;
  souvenirPress: string;
  brochure: string;
  zooMap: string;
}


// ============================================================================
// ITEM CREATION
// ============================================================================

export function createZooItems(world: WorldModel, rooms: RoomIds): ItemIds {

  // --- Portable items ---

  const brochure = world.createEntity('zoo brochure', EntityType.ITEM);
  brochure.add(new IdentityTrait({ name: 'zoo brochure', description: 'A glossy tri-fold brochure with "WILLOWBROOK FAMILY ZOO" on the cover.', aliases: ['brochure', 'zoo brochure', 'pamphlet', 'leaflet'], properName: false, article: 'a' }));
  brochure.add(new ReadableTrait({ text: 'WILLOWBROOK FAMILY ZOO — Your Guide\n\nEXHIBITS:\n  Petting Zoo — East from Main Path\n  Aviary — West from Main Path\n  Gift Shop — West from Aviary\n  Nocturnal Animals — Staff Area\n\n"Where every visit is a wild adventure!"' }));
  world.moveEntity(brochure.id, rooms.entrance);

  const zooMap = world.createEntity('zoo map', EntityType.ITEM);
  zooMap.add(new IdentityTrait({ name: 'zoo map', description: 'A colorful folding map of the Willowbrook Family Zoo.', aliases: ['map', 'zoo map', 'folding map'], properName: false, article: 'a' }));
  world.moveEntity(zooMap.id, rooms.entrance);

  const animalFeed = world.createEntity('bag of animal feed', EntityType.ITEM);
  animalFeed.add(new IdentityTrait({ name: 'bag of animal feed', description: 'A small brown paper bag filled with dried corn and pellets.', aliases: ['feed', 'animal feed', 'bag of feed', 'corn'], properName: false, article: 'a' }));
  world.moveEntity(animalFeed.id, rooms.pettingZoo);

  const penny = world.createEntity('souvenir penny', EntityType.ITEM);
  penny.add(new IdentityTrait({ name: 'souvenir penny', description: 'A shiny copper penny.', aliases: ['penny', 'souvenir penny', 'coin'], properName: false, article: 'a' }));
  world.moveEntity(penny.id, rooms.mainPath);

  const flashlight = world.createEntity('flashlight', EntityType.ITEM);
  flashlight.add(new IdentityTrait({ name: 'flashlight', description: 'A heavy-duty yellow flashlight.', aliases: ['flashlight', 'torch', 'light', 'lamp'], properName: false, article: 'a' }));
  flashlight.add(new SwitchableTrait({ isOn: false }));
  flashlight.add(new LightSourceTrait({ brightness: 8, isLit: false }));
  world.moveEntity(flashlight.id, rooms.supplyRoom);

  const camera = world.createEntity('disposable camera', EntityType.ITEM);
  camera.add(new IdentityTrait({ name: 'disposable camera', description: 'A cheap yellow disposable camera with "ZOO MEMORIES" printed on the side.', aliases: ['camera', 'disposable camera'], properName: false, article: 'a' }));
  world.moveEntity(camera.id, rooms.giftShop);

  const radio = world.createEntity('radio', EntityType.ITEM);
  radio.add(new IdentityTrait({ name: 'radio', description: 'A battered portable radio held together with duct tape. The antenna is bent at a jaunty angle. A faded sticker on the side reads "ZOO FM — All Animals, All The Time."', aliases: ['radio', 'portable radio'], properName: false, article: 'a' }));
  radio.add(new SwitchableTrait({ isOn: false }));
  radio.add(new SceneryTrait());
  world.moveEntity(radio.id, rooms.supplyRoom);

  // --- Containers and supporters ---

  const backpack = world.createEntity('backpack', EntityType.CONTAINER);
  backpack.add(new IdentityTrait({ name: 'backpack', description: 'A small red canvas backpack.', aliases: ['backpack', 'rucksack', 'pack'], properName: false, article: 'a' }));
  backpack.add(new ContainerTrait({ capacity: { maxItems: 5 } }));
  world.moveEntity(backpack.id, rooms.entrance);

  const parkBench = world.createEntity('park bench', EntityType.SUPPORTER);
  parkBench.add(new IdentityTrait({ name: 'park bench', description: 'A sturdy park bench painted forest green.', aliases: ['bench', 'park bench', 'benches', 'seat'], properName: false, article: 'a' }));
  parkBench.add(new SupporterTrait({ capacity: { maxItems: 3 } }));
  parkBench.add(new SceneryTrait());
  world.moveEntity(parkBench.id, rooms.mainPath);

  const lunchbox = world.createEntity('lunchbox', EntityType.CONTAINER);
  lunchbox.add(new IdentityTrait({ name: 'lunchbox', description: 'A dented metal lunchbox decorated with cartoon zoo animals.', aliases: ['lunchbox', 'lunch box', 'box'], properName: false, article: 'a' }));
  lunchbox.add(new ContainerTrait({ capacity: { maxItems: 3 } }));
  lunchbox.add(new OpenableTrait({ isOpen: false }));
  world.moveEntity(lunchbox.id, rooms.mainPath);

  // Put juice inside the closed lunchbox (bypass validation)
  lunchbox.get(OpenableTrait)!.isOpen = true;
  const juice = world.createEntity('juice box', EntityType.ITEM);
  juice.add(new IdentityTrait({ name: 'juice box', description: 'A small juice box with a picture of a happy elephant.', aliases: ['juice', 'juice box', 'drink'], properName: false, article: 'a' }));
  world.moveEntity(juice.id, lunchbox.id);
  lunchbox.get(OpenableTrait)!.isOpen = false;

  const dispenser = world.createEntity('feed dispenser', EntityType.CONTAINER);
  dispenser.add(new IdentityTrait({ name: 'feed dispenser', description: 'A coin-operated feed dispenser mounted on a wooden post. Sign: "FREE — Just Turn!"', aliases: ['dispenser', 'feed dispenser'], properName: false, article: 'a' }));
  dispenser.add(new ContainerTrait({ capacity: { maxItems: 3 } }));
  dispenser.add(new OpenableTrait({ isOpen: false }));
  dispenser.add(new SceneryTrait());
  world.moveEntity(dispenser.id, rooms.pettingZoo);

  const souvenirPress = world.createEntity('souvenir press', EntityType.CONTAINER);
  souvenirPress.add(new IdentityTrait({ name: 'souvenir press', description: 'A heavy cast-iron machine with a big crank handle. A slot on top accepts pennies, and the mechanism stamps them with a zoo animal design. A sign reads: "INSERT PENNY, TURN HANDLE, KEEP FOREVER!"', aliases: ['press', 'souvenir press', 'penny press', 'machine'], properName: false, article: 'a' }));
  souvenirPress.add(new ContainerTrait({ capacity: { maxItems: 1 } }));
  souvenirPress.add(new SceneryTrait());
  world.moveEntity(souvenirPress.id, rooms.giftShop);

  return {
    animalFeed: animalFeed.id,
    penny: penny.id,
    souvenirPress: souvenirPress.id,
    brochure: brochure.id,
    zooMap: zooMap.id,
  };
}
