/**
 * Family Zoo — The Map
 *
 * All rooms, exits, scenery, and the staff gate. This is the physical zoo
 * layout that everything else sits on top of.
 *
 * Public interface: createZooMap(world) → RoomIds
 * Owner: familyzoo tutorial, v17
 */

import {
  WorldModel,
  IFEntity,
  Direction,
} from '@sharpee/world-model';
import {
  RoomTrait,
  ReadableTrait,
} from '@sharpee/world-model';
import '@sharpee/helpers';


// ============================================================================
// ROOM IDS — returned so other files can reference locations
// ============================================================================

export interface RoomIds {
  entrance: string;
  mainPath: string;
  pettingZoo: string;
  aviary: string;
  supplyRoom: string;
  nocturnalExhibit: string;
  giftShop: string;
}


// ============================================================================
// MAP CREATION
// ============================================================================

export function createZooMap(world: WorldModel): { rooms: RoomIds; keycardId: string } {
  const { room, object, door } = world.helpers();

  // --- Rooms ---

  const entrance = room('Zoo Entrance')
    .description('You stand before the wrought-iron gates of the Willowbrook Family Zoo. A cheerful welcome sign arches over the entrance, and a small ticket booth sits to one side. A sturdy iron fence runs along either side of the gates. The main path leads south into the zoo grounds.')
    .aliases('entrance', 'gates', 'gate')
    .build();

  const mainPath = room('Main Path')
    .description('A wide gravel path winds through the heart of the zoo. Colorful direction signs point every which way. A park bench sits beside the path. To the east, the petting zoo. To the west, the aviary. A staff gate blocks the path to the south. The entrance is back to the north.')
    .aliases('path', 'main path', 'gravel path')
    .build();

  const pettingZoo = room('Petting Zoo')
    .description('A cheerful open-air enclosure filled with friendly animals. Pygmy goats trot around nibbling at visitors\' shoelaces, while a pair of fluffy rabbits hop lazily near a hay bale. A feed dispenser is mounted on a post. An info plaque is posted by the gate. The main path is back to the west.')
    .aliases('petting zoo', 'petting area', 'pen')
    .build();

  const aviary = room('Aviary')
    .description('You step inside a soaring mesh dome. Brilliantly colored parrots chatter from rope perches, and a toucan eyes you curiously from a branch overhead. A small waterfall splashes into a stone basin. An info plaque hangs near the entrance. The gift shop is to the west. The main path is back to the east.')
    .aliases('aviary', 'bird house', 'dome')
    .build();

  const supplyRoom = room('Supply Room')
    .description('A cluttered storage room behind the staff gate. Metal shelves line the walls. A cork board on the wall is covered with staff schedules. A battered radio sits on one of the shelves. The staff gate leads back north.')
    .aliases('supply room', 'storage room', 'storeroom')
    .build();

  const nocturnalExhibit = room('Nocturnal Animals Exhibit')
    .description('A cool, dimly lit cavern designed to simulate nighttime. Glass enclosures line both walls with soft red lights. You can see sugar gliders, bush babies, and a barn owl. A warning sign is posted near the entrance. The exit leads back north to the supply room.')
    .aliases('nocturnal exhibit', 'nocturnal animals', 'exhibit')
    .dark()
    .build();

  const giftShop = room('Gift Shop')
    .description('A small zoo gift shop crammed with stuffed animals and postcards. A large souvenir penny press machine stands near the door. A disposable camera sits on the counter. The aviary is back to the east.')
    .aliases('gift shop', 'shop', 'store')
    .build();

  // --- Staff Gate (locked door) ---

  const keycard = object('staff keycard')
    .description('A white plastic keycard with "WILLOWBROOK ZOO — STAFF ONLY" printed in blue.')
    .aliases('keycard', 'key card', 'card', 'key', 'staff keycard')
    .in(entrance)
    .build();

  door('staff gate')
    .description('A sturdy metal gate with a "STAFF ONLY" sign.')
    .aliases('gate', 'staff gate', 'metal gate', 'staff door')
    .between(mainPath, supplyRoom, Direction.SOUTH)
    .openable({ isOpen: false })
    .lockable({ isLocked: true, keyId: keycard.id })
    .build();

  // --- Exits (non-door connections) ---

  world.connectRooms(entrance.id, mainPath.id, Direction.SOUTH);
  world.connectRooms(mainPath.id, pettingZoo.id, Direction.EAST);
  world.connectRooms(mainPath.id, aviary.id, Direction.WEST);
  world.connectRooms(supplyRoom.id, nocturnalExhibit.id, Direction.SOUTH);
  world.connectRooms(aviary.id, giftShop.id, Direction.WEST);

  // --- Scenery ---

  for (const [name, desc, aliasList, location] of [
    ['welcome sign', 'A brightly painted wooden sign reads: "WELCOME TO WILLOWBROOK FAMILY ZOO."', ['sign', 'welcome sign'], entrance],
    ['ticket booth', 'A small wooden booth with a "Self-Guided Tours" sign.', ['booth', 'ticket booth'], entrance],
    ['iron fence', 'A tall wrought-iron fence with animal silhouettes.', ['fence', 'iron fence', 'railing'], entrance],
    ['direction signs', 'Arrow signs: PETTING ZOO (east), AVIARY (west), EXIT (north).', ['signs', 'direction signs', 'arrow signs'], mainPath],
    ['flower beds', 'Tidy beds of marigolds and petunias.', ['flowers', 'flower beds'], mainPath],
    ['hay bale', 'A large round bale of golden hay.', ['hay', 'hay bale', 'bale'], pettingZoo],
    ['toucan', 'A Toco toucan with an enormous orange-and-black bill.', ['toucan', 'toco toucan'], aviary],
    ['waterfall', 'A gentle artificial waterfall cascading into a stone basin.', ['waterfall', 'water', 'basin'], aviary],
    ['rope perches', 'Thick sisal ropes strung between wooden posts.', ['perches', 'rope perches', 'ropes'], aviary],
    ['metal shelves', 'Industrial metal shelving units stacked with supplies.', ['shelves', 'metal shelves', 'shelf'], supplyRoom],
    ['sugar gliders', 'A family of tiny sugar gliders with enormous dark eyes.', ['sugar gliders', 'gliders'], nocturnalExhibit],
    ['bush babies', 'Two bush babies with impossibly large round eyes.', ['bush babies', 'galagos'], nocturnalExhibit],
    ['barn owl', 'An enormous barn owl with a heart-shaped white face.', ['barn owl', 'owl'], nocturnalExhibit],
    ['stuffed animals', 'Shelves of plush tigers, pandas, and penguins.', ['stuffed animals', 'plush', 'toys'], giftShop],
    ['postcards', 'A spinning rack of postcards showing the zoo\'s greatest hits.', ['postcards', 'cards', 'postcard rack'], giftShop],
  ] as [string, string, string[], IFEntity][]) {
    object(name)
      .description(desc)
      .aliases(...aliasList)
      .scenery()
      .in(location)
      .build();
  }

  // Scenery with special traits
  const corkBoard = object('cork board')
    .description('A cork board with staff schedules. A note in red marker: "DON\'T FORGET: nocturnal exhibit lights need new batteries!"')
    .aliases('cork board', 'board', 'notices')
    .scenery()
    .in(supplyRoom)
    .build();

  const pettingPlaque = object('info plaque')
    .description('A brass plaque mounted on a wooden post near the petting zoo gate.')
    .aliases('plaque', 'info plaque', 'brass plaque')
    .scenery()
    .in(pettingZoo)
    .build();
  pettingPlaque.add(new ReadableTrait({ text: 'PYGMY GOATS — These Nigerian Dwarf goats are gentle, curious, and always hungry.\n\nHOLLAND LOP RABBITS — Known for their floppy ears. Our pair, Biscuit and Marmalade, were born here in 2023.' }));

  const aviaryPlaque = object('aviary plaque')
    .description('A colorful information board near the aviary entrance.')
    .aliases('plaque', 'aviary plaque', 'information board')
    .scenery()
    .in(aviary)
    .build();
  aviaryPlaque.add(new ReadableTrait({ text: 'WELCOME TO THE AVIARY — Home to over 30 species!\n\nTOCO TOUCAN — Its bill weighs less than a smartphone.\n\nSCARLET MACAW — Can live over 75 years. Our oldest, Captain, is 42.' }));

  const warningSign = object('warning sign')
    .description('A yellow warning sign near the nocturnal exhibit entrance.')
    .aliases('warning', 'warning sign', 'yellow sign')
    .scenery()
    .in(supplyRoom)
    .build();
  warningSign.add(new ReadableTrait({ text: 'CAUTION: The Nocturnal Animals Exhibit is kept dark. Please use a flashlight. Do NOT use camera flash. (We don\'t talk about the Great Owl Incident of 2022.)' }));

  return {
    rooms: {
      entrance: entrance.id,
      mainPath: mainPath.id,
      pettingZoo: pettingZoo.id,
      aviary: aviary.id,
      supplyRoom: supplyRoom.id,
      nocturnalExhibit: nocturnalExhibit.id,
      giftShop: giftShop.id,
    },
    keycardId: keycard.id,
  };
}
