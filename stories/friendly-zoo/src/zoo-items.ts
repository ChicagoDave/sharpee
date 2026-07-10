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
} from '@sharpee/world-model';
import {
  ContainerTrait,
  SupporterTrait,
  SceneryTrait,
  OpenableTrait,
  SwitchableTrait,
  ReadableTrait,
  RoomTrait,
} from '@sharpee/world-model';
import { createHelpers } from '@sharpee/helpers';
import type { RoomIds } from './zoo-map.js';


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
  const { object, container } = createHelpers(world);

  // We need entities for .in() — look them up from room IDs
  const entranceEntity = world.getEntity(rooms.entrance)!;
  const mainPathEntity = world.getEntity(rooms.mainPath)!;
  const pettingZooEntity = world.getEntity(rooms.pettingZoo)!;
  const supplyRoomEntity = world.getEntity(rooms.supplyRoom)!;
  const giftShopEntity = world.getEntity(rooms.giftShop)!;

  // --- Portable items ---

  const brochure = object('zoo brochure')
    .description('A glossy tri-fold brochure with "WILLOWBROOK FAMILY ZOO" on the cover.')
    .aliases('brochure', 'zoo brochure', 'pamphlet', 'leaflet')
    .addTrait(new ReadableTrait({ text: 'WILLOWBROOK FAMILY ZOO — Your Guide\n\nEXHIBITS:\n  Petting Zoo — East from Main Path\n  Aviary — West from Main Path\n  Gift Shop — West from Aviary\n  Nocturnal Animals — Staff Area\n\n"Where every visit is a wild adventure!"' }))
    .in(entranceEntity)
    .build();

  const zooMap = object('zoo map')
    .description('A colorful folding map of the Willowbrook Family Zoo.')
    .aliases('map', 'zoo map', 'folding map')
    .in(entranceEntity)
    .build();

  const animalFeed = object('bag of animal feed')
    .description('A small brown paper bag filled with dried corn and pellets.')
    .aliases('feed', 'animal feed', 'bag of feed', 'corn')
    .in(pettingZooEntity)
    .build();

  // Enamel-pin rack — quiet scenery surfaced by the gift shop's description
  // snippet (ADR-209): the room prose whispers it via {snippet:pins}; examine
  // gives the close-up from its own identity. Exercises the book ch5 example
  // shape end to end (cycling list, legal empty entry, mentions presence gate)
  // in a room with no ADR-195 presence contributors to muddy assertions.
  const enamelPins = object('enamel pins')
    .description('A spinning rack of enamel pins: parrots, pygmy goats, a grinning snake. Every one of them costs more than it should.')
    .aliases('pins', 'pin', 'enamel pins', 'rack', 'pin rack')
    .scenery()
    .plural()
    .in(giftShopEntity)
    .build();

  giftShopEntity.get(RoomTrait)!.snippets = {
    pins: {
      texts: [
        ', and a spinning rack of enamel pins wobbles by the register',
        ', and the enamel-pin rack stands picked half bare',
        '',
      ],
      mentions: enamelPins.id,
    },
  };

  const penny = object('souvenir penny')
    .description('A shiny copper penny.')
    .aliases('penny', 'souvenir penny', 'coin')
    .in(mainPathEntity)
    .build();

  const flashlight = object('flashlight')
    .description('A heavy-duty yellow flashlight.')
    .aliases('flashlight', 'torch', 'light', 'lamp')
    // ADR-195 S2: author-set state detail feeds the examine `{slot:detail}` channel
    // (appended, not replacing) — switched on it clicks, lit it casts a beam.
    .lightSource({ isLit: false, detailWhenLit: 'A thin beam plays across the floor.' })
    .addTrait(new SwitchableTrait({ isOn: false, detailWhenOn: 'It clicks faintly as it powers up.' }))
    .in(supplyRoomEntity)
    .build();

  const camera = object('disposable camera')
    .description('A cheap yellow disposable camera with "ZOO MEMORIES" printed on the side.')
    .aliases('camera', 'disposable camera')
    .in(giftShopEntity)
    .build();

  const radio = object('radio')
    .description('A battered portable radio held together with duct tape. The antenna is bent at a jaunty angle. A faded sticker on the side reads "ZOO FM — All Animals, All The Time."')
    .aliases('radio', 'portable radio')
    .scenery()
    // ADR-195 S2: switched on, the radio appends "It hums softly." to its examine
    // `{slot:detail}` (the base description stays).
    .addTrait(new SwitchableTrait({ isOn: false, detailWhenOn: 'It hums softly.' }))
    .in(supplyRoomEntity)
    .build();

  // --- Containers and supporters ---

  const backpack = container('backpack')
    .description('A small red canvas backpack.')
    .aliases('backpack', 'rucksack', 'pack')
    .in(entranceEntity)
    .build();

  const parkBench = object('park bench')
    .description('A sturdy park bench painted forest green.')
    .aliases('bench', 'park bench', 'benches', 'seat')
    .scenery()
    .addTrait(new SupporterTrait({ capacity: { maxItems: 3 } }))
    .in(mainPathEntity)
    .build();

  const lunchbox = container('lunchbox')
    .description('A dented metal lunchbox decorated with cartoon zoo animals.')
    .aliases('lunchbox', 'lunch box', 'box')
    .openable({ isOpen: false })
    .in(mainPathEntity)
    .build();

  // Put juice inside the closed lunchbox — skipValidation bypasses the closed check
  const juice = object('juice box')
    .description('A small juice box with a picture of a happy elephant.')
    .aliases('juice', 'juice box', 'drink')
    .skipValidation()
    .in(lunchbox)
    .build();

  const dispenser = container('feed dispenser')
    .description('A coin-operated feed dispenser mounted on a wooden post. Sign: "FREE — Just Turn!"')
    .aliases('dispenser', 'feed dispenser')
    .openable({ isOpen: false })
    .addTrait(new SceneryTrait())
    .in(pettingZooEntity)
    .build();

  const souvenirPress = container('souvenir press')
    .description('A heavy cast-iron machine with a big crank handle. A slot on top accepts pennies, and the mechanism stamps them with a zoo animal design. A sign reads: "INSERT PENNY, TURN HANDLE, KEEP FOREVER!"')
    .aliases('press', 'souvenir press', 'penny press', 'machine')
    .addTrait(new SceneryTrait())
    .in(giftShopEntity)
    .build();

  return {
    animalFeed: animalFeed.id,
    penny: penny.id,
    souvenirPress: souvenirPress.id,
    brochure: brochure.id,
    zooMap: zooMap.id,
  };
}
