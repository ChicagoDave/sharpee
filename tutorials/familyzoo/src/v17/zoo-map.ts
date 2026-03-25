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
  EntityType,
  Direction,
} from '@sharpee/world-model';
import {
  IdentityTrait,
  RoomTrait,
  SceneryTrait,
  OpenableTrait,
  LockableTrait,
  DoorTrait,
  ReadableTrait,
} from '@sharpee/world-model';


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

  // --- Rooms ---

  const entrance = world.createEntity('Zoo Entrance', EntityType.ROOM);
  entrance.add(new RoomTrait({ exits: {}, isDark: false }));
  entrance.add(new IdentityTrait({ name: 'Zoo Entrance', description: 'You stand before the wrought-iron gates of the Willowbrook Family Zoo. A cheerful welcome sign arches over the entrance, and a small ticket booth sits to one side. A sturdy iron fence runs along either side of the gates. The main path leads south into the zoo grounds.', aliases: ['entrance', 'gates', 'gate'], properName: false, article: 'the' }));

  const mainPath = world.createEntity('Main Path', EntityType.ROOM);
  mainPath.add(new RoomTrait({ exits: {}, isDark: false }));
  mainPath.add(new IdentityTrait({ name: 'Main Path', description: 'A wide gravel path winds through the heart of the zoo. Colorful direction signs point every which way. A park bench sits beside the path. To the east, the petting zoo. To the west, the aviary. A staff gate blocks the path to the south. The entrance is back to the north.', aliases: ['path', 'main path', 'gravel path'], properName: false, article: 'the' }));

  const pettingZoo = world.createEntity('Petting Zoo', EntityType.ROOM);
  pettingZoo.add(new RoomTrait({ exits: {}, isDark: false }));
  pettingZoo.add(new IdentityTrait({ name: 'Petting Zoo', description: 'A cheerful open-air enclosure filled with friendly animals. Pygmy goats trot around nibbling at visitors\' shoelaces, while a pair of fluffy rabbits hop lazily near a hay bale. A feed dispenser is mounted on a post. An info plaque is posted by the gate. The main path is back to the west.', aliases: ['petting zoo', 'petting area', 'pen'], properName: false, article: 'the' }));

  const aviary = world.createEntity('Aviary', EntityType.ROOM);
  aviary.add(new RoomTrait({ exits: {}, isDark: false }));
  aviary.add(new IdentityTrait({ name: 'Aviary', description: 'You step inside a soaring mesh dome. Brilliantly colored parrots chatter from rope perches, and a toucan eyes you curiously from a branch overhead. A small waterfall splashes into a stone basin. An info plaque hangs near the entrance. The gift shop is to the west. The main path is back to the east.', aliases: ['aviary', 'bird house', 'dome'], properName: false, article: 'the' }));

  const supplyRoom = world.createEntity('Supply Room', EntityType.ROOM);
  supplyRoom.add(new RoomTrait({ exits: {}, isDark: false }));
  supplyRoom.add(new IdentityTrait({ name: 'Supply Room', description: 'A cluttered storage room behind the staff gate. Metal shelves line the walls. A cork board on the wall is covered with staff schedules. A battered radio sits on one of the shelves. The staff gate leads back north.', aliases: ['supply room', 'storage room', 'storeroom'], properName: false, article: 'the' }));

  const nocturnalExhibit = world.createEntity('Nocturnal Animals Exhibit', EntityType.ROOM);
  nocturnalExhibit.add(new RoomTrait({ exits: {}, isDark: true }));
  nocturnalExhibit.add(new IdentityTrait({ name: 'Nocturnal Animals Exhibit', description: 'A cool, dimly lit cavern designed to simulate nighttime. Glass enclosures line both walls with soft red lights. You can see sugar gliders, bush babies, and a barn owl. A warning sign is posted near the entrance. The exit leads back north to the supply room.', aliases: ['nocturnal exhibit', 'nocturnal animals', 'exhibit'], properName: false, article: 'the' }));

  const giftShop = world.createEntity('Gift Shop', EntityType.ROOM);
  giftShop.add(new RoomTrait({ exits: {}, isDark: false }));
  giftShop.add(new IdentityTrait({ name: 'Gift Shop', description: 'A small zoo gift shop crammed with stuffed animals and postcards. A large souvenir penny press machine stands near the door. A disposable camera sits on the counter. The aviary is back to the east.', aliases: ['gift shop', 'shop', 'store'], properName: false, article: 'the' }));

  // --- Staff Gate (locked door) ---

  const keycard = world.createEntity('staff keycard', EntityType.ITEM);
  keycard.add(new IdentityTrait({ name: 'staff keycard', description: 'A white plastic keycard with "WILLOWBROOK ZOO — STAFF ONLY" printed in blue.', aliases: ['keycard', 'key card', 'card', 'key', 'staff keycard'], properName: false, article: 'a' }));
  world.moveEntity(keycard.id, entrance.id);

  const staffGate = world.createEntity('staff gate', EntityType.DOOR);
  staffGate.add(new IdentityTrait({ name: 'staff gate', description: 'A sturdy metal gate with a "STAFF ONLY" sign.', aliases: ['gate', 'staff gate', 'metal gate', 'staff door'], properName: false, article: 'a' }));
  staffGate.add(new DoorTrait({ room1: mainPath.id, room2: supplyRoom.id, bidirectional: true }));
  staffGate.add(new OpenableTrait({ isOpen: false }));
  staffGate.add(new LockableTrait({ isLocked: true, keyId: keycard.id }));
  staffGate.add(new SceneryTrait());
  world.moveEntity(staffGate.id, mainPath.id);

  // --- Exits ---

  entrance.get(RoomTrait)!.exits = { [Direction.SOUTH]: { destination: mainPath.id } };
  mainPath.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: entrance.id }, [Direction.EAST]: { destination: pettingZoo.id }, [Direction.WEST]: { destination: aviary.id }, [Direction.SOUTH]: { destination: supplyRoom.id, via: staffGate.id } };
  pettingZoo.get(RoomTrait)!.exits = { [Direction.WEST]: { destination: mainPath.id } };
  aviary.get(RoomTrait)!.exits = { [Direction.EAST]: { destination: mainPath.id }, [Direction.WEST]: { destination: giftShop.id } };
  supplyRoom.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: mainPath.id, via: staffGate.id }, [Direction.SOUTH]: { destination: nocturnalExhibit.id } };
  nocturnalExhibit.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: supplyRoom.id } };
  giftShop.get(RoomTrait)!.exits = { [Direction.EAST]: { destination: aviary.id } };

  // --- Scenery ---

  for (const [name, desc, aliases, room] of [
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
    const e = world.createEntity(name, EntityType.SCENERY);
    e.add(new IdentityTrait({ name, description: desc, aliases, properName: false, article: 'a' }));
    e.add(new SceneryTrait());
    world.moveEntity(e.id, room.id);
  }

  // Scenery with special traits
  const corkBoard = world.createEntity('cork board', EntityType.SCENERY);
  corkBoard.add(new IdentityTrait({ name: 'cork board', description: 'A cork board with staff schedules. A note in red marker: "DON\'T FORGET: nocturnal exhibit lights need new batteries!"', aliases: ['cork board', 'board', 'notices'], properName: false, article: 'a' }));
  corkBoard.add(new SceneryTrait());
  world.moveEntity(corkBoard.id, supplyRoom.id);


  const pettingPlaque = world.createEntity('info plaque', EntityType.SCENERY);
  pettingPlaque.add(new IdentityTrait({ name: 'info plaque', description: 'A brass plaque mounted on a wooden post near the petting zoo gate.', aliases: ['plaque', 'info plaque', 'brass plaque'], properName: false, article: 'an' }));
  pettingPlaque.add(new ReadableTrait({ text: 'PYGMY GOATS — These Nigerian Dwarf goats are gentle, curious, and always hungry.\n\nHOLLAND LOP RABBITS — Known for their floppy ears. Our pair, Biscuit and Marmalade, were born here in 2023.' }));
  pettingPlaque.add(new SceneryTrait());
  world.moveEntity(pettingPlaque.id, pettingZoo.id);

  const aviaryPlaque = world.createEntity('aviary plaque', EntityType.SCENERY);
  aviaryPlaque.add(new IdentityTrait({ name: 'aviary plaque', description: 'A colorful information board near the aviary entrance.', aliases: ['plaque', 'aviary plaque', 'information board'], properName: false, article: 'an' }));
  aviaryPlaque.add(new ReadableTrait({ text: 'WELCOME TO THE AVIARY — Home to over 30 species!\n\nTOCO TOUCAN — Its bill weighs less than a smartphone.\n\nSCARLET MACAW — Can live over 75 years. Our oldest, Captain, is 42.' }));
  aviaryPlaque.add(new SceneryTrait());
  world.moveEntity(aviaryPlaque.id, aviary.id);

  const warningSign = world.createEntity('warning sign', EntityType.SCENERY);
  warningSign.add(new IdentityTrait({ name: 'warning sign', description: 'A yellow warning sign near the nocturnal exhibit entrance.', aliases: ['warning', 'warning sign', 'yellow sign'], properName: false, article: 'a' }));
  warningSign.add(new ReadableTrait({ text: 'CAUTION: The Nocturnal Animals Exhibit is kept dark. Please use a flashlight. Do NOT use camera flash. (We don\'t talk about the Great Owl Incident of 2022.)' }));
  warningSign.add(new SceneryTrait());
  world.moveEntity(warningSign.id, supplyRoom.id);

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
