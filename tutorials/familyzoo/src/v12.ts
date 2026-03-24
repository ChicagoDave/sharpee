/**
 * Family Zoo Tutorial — Version 12: Event Handlers
 *
 * NEW IN THIS VERSION:
 *   - world.registerEventHandler() — react to game events with custom logic
 *   - if.event.dropped — fires after an item is successfully dropped
 *   - if.event.put_in — fires after an item is put into a container
 *   - Item transformation — destroy one item and create another in response
 *   - A new Gift Shop room with a souvenir press machine
 *
 * WHAT YOU'LL LEARN:
 *   - Every stdlib action emits an event when it succeeds (dropped, taken, etc.)
 *   - world.registerEventHandler(eventType, handler) lets you react to these
 *   - Handlers receive the event data (which item, where, etc.)
 *   - Handlers can mutate the world — move items, create new ones, etc.
 *   - This is how you build puzzles without writing custom actions
 *
 * TRY IT:
 *   > south / east                    (go to the petting zoo)
 *   > take feed                       (pick up the bag of feed)
 *   > drop feed                       (the goats rush to eat!)
 *   > west / west                     (go to the gift shop)
 *   > look                            (see the souvenir press)
 *   > west / take penny / east / east (get the penny from main path)
 *   > put penny in press              (get a pressed penny!)
 *   > inventory                       (see the pressed penny)
 *
 * BUILD & RUN:
 *   ./build.sh -s familyzoo
 *   node dist/cli/sharpee.js --story tutorials/familyzoo --play
 */

// ============================================================================
// IMPORTS
// ============================================================================

import { Story, StoryConfig, GameEngine } from '@sharpee/engine';
import {
  WorldModel,
  IFEntity,
  EntityType,
  Direction,
  NpcTrait,
} from '@sharpee/world-model';
import {
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  SupporterTrait,
  RoomTrait,
  SceneryTrait,
  OpenableTrait,
  LockableTrait,
  DoorTrait,
  SwitchableTrait,
  LightSourceTrait,
  ReadableTrait,
} from '@sharpee/world-model';

// ISemanticEvent is the type for events flowing through the system.
// We need it to type-annotate our event handler parameters and return values.
import { ISemanticEvent } from '@sharpee/core';
// IWorldModel is the interface for the world model passed to chain handlers.
import { IWorldModel } from '@sharpee/world-model';

import { NpcPlugin } from '@sharpee/plugin-npc';
import {
  NpcBehavior,
  NpcContext,
  NpcAction,
  createPatrolBehavior,
} from '@sharpee/stdlib';


// ============================================================================
// STORY CONFIGURATION
// ============================================================================

const config: StoryConfig = {
  id: 'familyzoo',
  title: 'Family Zoo',
  author: 'Sharpee Tutorial',
  version: '0.12.0',
  description: 'A small family zoo — learn Sharpee one concept at a time.',
};


// ============================================================================
// PARROT BEHAVIOR — same as V11
// ============================================================================

const PARROT_PHRASES = [
  'Polly wants a cracker!',
  'SQUAWK! Pretty bird! Pretty bird!',
  'Pieces of eight! Pieces of eight!',
  'Who\'s a good bird? WHO\'S A GOOD BIRD?',
  'BAWK! Welcome to the zoo!',
];

const parrotBehavior: NpcBehavior = {
  id: 'zoo-parrot',
  name: 'Parrot Behavior',

  onTurn(context: NpcContext): NpcAction[] {
    if (!context.playerVisible) return [];
    if (context.random.chance(0.5)) {
      const phrase = context.random.pick(PARROT_PHRASES);
      return [{ type: 'speak', messageId: 'npc.speech', data: { npcName: 'parrot', text: phrase } }];
    }
    return [];
  },

  onPlayerEnters(_context: NpcContext): NpcAction[] {
    return [{ type: 'emote', messageId: 'npc.emote', data: { npcName: 'parrot', text: 'The parrot ruffles its feathers and eyes you with interest.' } }];
  },
};


// ============================================================================
// THE STORY CLASS
// ============================================================================

class FamilyZooStory implements Story {
  config = config;

  private roomIds: {
    entrance: string;
    mainPath: string;
    pettingZoo: string;
    aviary: string;
    supplyRoom: string;
    nocturnalExhibit: string;
    giftShop: string;     // ← NEW room in V12
  } = { entrance: '', mainPath: '', pettingZoo: '', aviary: '', supplyRoom: '', nocturnalExhibit: '', giftShop: '' };

  // We also need to store entity IDs for the event handlers.
  // The handlers need to know which item was dropped and where.
  private entityIds: {
    animalFeed: string;
    penny: string;
    souvenirPress: string;
  } = { animalFeed: '', penny: '', souvenirPress: '' };

  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new IdentityTrait({ name: 'yourself', description: 'Just an ordinary visitor to the zoo.', aliases: ['self', 'myself', 'me'], properName: true, article: '' }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
    return player;
  }

  initializeWorld(world: WorldModel): void {

    // ========================================================================
    // ROOMS — V10 rooms + Gift Shop (new in V12)
    // ========================================================================

    const entrance = world.createEntity('Zoo Entrance', EntityType.ROOM);
    entrance.add(new RoomTrait({ exits: {}, isDark: false }));
    entrance.add(new IdentityTrait({ name: 'Zoo Entrance', description: 'You stand before the wrought-iron gates of the Willowbrook Family Zoo. A cheerful welcome sign arches over the entrance, and a small ticket booth sits to one side. A sturdy iron fence runs along either side of the gates. The main path leads south into the zoo grounds.', aliases: ['entrance', 'gates', 'gate'], properName: false, article: 'the' }));

    const mainPath = world.createEntity('Main Path', EntityType.ROOM);
    mainPath.add(new RoomTrait({ exits: {}, isDark: false }));
    mainPath.add(new IdentityTrait({ name: 'Main Path', description: 'A wide gravel path winds through the heart of the zoo. Colorful direction signs point every which way. A park bench sits beside the path. To the east, the petting zoo. To the west, the aviary. A staff gate blocks the path to the south. The gift shop is also to the west, past the aviary. The entrance is back to the north.', aliases: ['path', 'main path', 'gravel path'], properName: false, article: 'the' }));

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

    // --- Gift Shop (NEW in V12) ---
    //
    // The gift shop houses the souvenir press machine. It's connected
    // to the aviary to the west, giving the player a reason to explore
    // past the aviary.
    const giftShop = world.createEntity('Gift Shop', EntityType.ROOM);
    giftShop.add(new RoomTrait({ exits: {}, isDark: false }));
    giftShop.add(new IdentityTrait({
      name: 'Gift Shop',
      description:
        'A small zoo gift shop crammed with stuffed animals and postcards. ' +
        'A large souvenir penny press machine stands near the door, its ' +
        'handle gleaming invitingly. A sign above it reads: "INSERT PENNY, ' +
        'TURN HANDLE, KEEP FOREVER!" The aviary is back to the east.',
      aliases: ['gift shop', 'shop', 'store'],
      properName: false,
      article: 'the',
    }));

    this.roomIds = {
      entrance: entrance.id,
      mainPath: mainPath.id,
      pettingZoo: pettingZoo.id,
      aviary: aviary.id,
      supplyRoom: supplyRoom.id,
      nocturnalExhibit: nocturnalExhibit.id,
      giftShop: giftShop.id,
    };


    // ========================================================================
    // STAFF GATE — same as V7
    // ========================================================================

    const keycard = world.createEntity('staff keycard', EntityType.ITEM);
    keycard.add(new IdentityTrait({ name: 'staff keycard', description: 'A white plastic keycard with "WILLOWBROOK ZOO — STAFF ONLY" printed in blue.', aliases: ['keycard', 'key card', 'card', 'key', 'staff keycard'], properName: false, article: 'a' }));
    world.moveEntity(keycard.id, entrance.id);

    const staffGate = world.createEntity('staff gate', EntityType.DOOR);
    staffGate.add(new IdentityTrait({ name: 'staff gate', description: 'A sturdy metal gate with a "STAFF ONLY" sign. There\'s a card reader beside it.', aliases: ['gate', 'staff gate', 'metal gate', 'staff door'], properName: false, article: 'a' }));
    staffGate.add(new DoorTrait({ room1: mainPath.id, room2: supplyRoom.id, bidirectional: true }));
    staffGate.add(new OpenableTrait({ isOpen: false }));
    staffGate.add(new LockableTrait({ isLocked: true, keyId: keycard.id }));
    staffGate.add(new SceneryTrait());
    world.moveEntity(staffGate.id, mainPath.id);


    // ========================================================================
    // EXITS — V10 exits + Gift Shop connections
    // ========================================================================

    entrance.get(RoomTrait)!.exits = { [Direction.SOUTH]: { destination: mainPath.id } };
    mainPath.get(RoomTrait)!.exits = {
      [Direction.NORTH]: { destination: entrance.id },
      [Direction.EAST]: { destination: pettingZoo.id },
      [Direction.WEST]: { destination: aviary.id },
      [Direction.SOUTH]: { destination: supplyRoom.id, via: staffGate.id },
    };
    pettingZoo.get(RoomTrait)!.exits = { [Direction.WEST]: { destination: mainPath.id } };
    aviary.get(RoomTrait)!.exits = {
      [Direction.EAST]: { destination: mainPath.id },
      [Direction.WEST]: { destination: giftShop.id },   // ← NEW exit to gift shop
    };
    supplyRoom.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: mainPath.id, via: staffGate.id }, [Direction.SOUTH]: { destination: nocturnalExhibit.id } };
    nocturnalExhibit.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: supplyRoom.id } };
    giftShop.get(RoomTrait)!.exits = {
      [Direction.EAST]: { destination: aviary.id },      // ← back to aviary
    };


    // ========================================================================
    // SCENERY — abbreviated (same as V10)
    // ========================================================================

    const sign = world.createEntity('welcome sign', EntityType.SCENERY);
    sign.add(new IdentityTrait({ name: 'welcome sign', description: 'A brightly painted wooden sign reads: "WELCOME TO WILLOWBROOK FAMILY ZOO."', aliases: ['sign', 'welcome sign'], properName: false, article: 'a' }));
    sign.add(new SceneryTrait());
    world.moveEntity(sign.id, entrance.id);

    const booth = world.createEntity('ticket booth', EntityType.SCENERY);
    booth.add(new IdentityTrait({ name: 'ticket booth', description: 'A small wooden booth with a "Self-Guided Tours" sign.', aliases: ['booth', 'ticket booth'], properName: false, article: 'a' }));
    booth.add(new SceneryTrait());
    world.moveEntity(booth.id, entrance.id);

    const ironFence = world.createEntity('iron fence', EntityType.SCENERY);
    ironFence.add(new IdentityTrait({ name: 'iron fence', description: 'A tall wrought-iron fence with animal silhouettes.', aliases: ['fence', 'iron fence', 'railing'], properName: false, article: 'an' }));
    ironFence.add(new SceneryTrait());
    world.moveEntity(ironFence.id, entrance.id);

    const directionSigns = world.createEntity('direction signs', EntityType.SCENERY);
    directionSigns.add(new IdentityTrait({ name: 'direction signs', description: 'Arrow signs: PETTING ZOO (east), AVIARY (west), EXIT (north).', aliases: ['signs', 'direction signs', 'arrow signs'], properName: false, article: 'some' }));
    directionSigns.add(new SceneryTrait());
    world.moveEntity(directionSigns.id, mainPath.id);

    const flowerBeds = world.createEntity('flower beds', EntityType.SCENERY);
    flowerBeds.add(new IdentityTrait({ name: 'flower beds', description: 'Tidy beds of marigolds and petunias.', aliases: ['flowers', 'flower beds'], properName: false, article: 'some' }));
    flowerBeds.add(new SceneryTrait());
    world.moveEntity(flowerBeds.id, mainPath.id);

    const goats = world.createEntity('pygmy goats', EntityType.SCENERY);
    goats.add(new IdentityTrait({ name: 'pygmy goats', description: 'Three pygmy goats hoping you have food.', aliases: ['goats', 'pygmy goats', 'goat'], properName: false, article: 'some' }));
    goats.add(new SceneryTrait());
    world.moveEntity(goats.id, pettingZoo.id);

    const hayBale = world.createEntity('hay bale', EntityType.SCENERY);
    hayBale.add(new IdentityTrait({ name: 'hay bale', description: 'A large round bale of golden hay.', aliases: ['hay', 'hay bale', 'bale'], properName: false, article: 'a' }));
    hayBale.add(new SceneryTrait());
    world.moveEntity(hayBale.id, pettingZoo.id);

    const rabbits = world.createEntity('rabbits', EntityType.SCENERY);
    rabbits.add(new IdentityTrait({ name: 'rabbits', description: 'A pair of Holland Lop rabbits with floppy ears.', aliases: ['rabbits', 'rabbit', 'bunnies'], properName: false, article: 'some' }));
    rabbits.add(new SceneryTrait());
    world.moveEntity(rabbits.id, pettingZoo.id);

    const toucan = world.createEntity('toucan', EntityType.SCENERY);
    toucan.add(new IdentityTrait({ name: 'toucan', description: 'A Toco toucan with an enormous orange-and-black bill.', aliases: ['toucan', 'toco toucan'], properName: false, article: 'a' }));
    toucan.add(new SceneryTrait());
    world.moveEntity(toucan.id, aviary.id);

    const parrots = world.createEntity('parrots', EntityType.SCENERY);
    parrots.add(new IdentityTrait({ name: 'parrots', description: 'A raucous flock of scarlet macaws and grey African parrots.', aliases: ['parrots', 'macaws', 'birds'], properName: false, article: 'some' }));
    parrots.add(new SceneryTrait());
    world.moveEntity(parrots.id, aviary.id);

    const waterfall = world.createEntity('waterfall', EntityType.SCENERY);
    waterfall.add(new IdentityTrait({ name: 'waterfall', description: 'A gentle artificial waterfall cascading into a stone basin.', aliases: ['waterfall', 'water', 'basin'], properName: false, article: 'a' }));
    waterfall.add(new SceneryTrait());
    world.moveEntity(waterfall.id, aviary.id);

    const perches = world.createEntity('rope perches', EntityType.SCENERY);
    perches.add(new IdentityTrait({ name: 'rope perches', description: 'Thick sisal ropes strung between wooden posts — both furniture and snacks for the parrots.', aliases: ['perches', 'rope perches', 'ropes', 'rope'], properName: false, article: 'some' }));
    perches.add(new SceneryTrait());
    world.moveEntity(perches.id, aviary.id);

    const shelves = world.createEntity('metal shelves', EntityType.SCENERY);
    shelves.add(new IdentityTrait({ name: 'metal shelves', description: 'Industrial metal shelving units stacked with supplies.', aliases: ['shelves', 'metal shelves', 'shelf'], properName: false, article: 'some' }));
    shelves.add(new SceneryTrait());
    world.moveEntity(shelves.id, supplyRoom.id);

    const corkBoard = world.createEntity('cork board', EntityType.SCENERY);
    corkBoard.add(new IdentityTrait({ name: 'cork board', description: 'A cork board with staff schedules. A note in red marker: "DON\'T FORGET: nocturnal exhibit lights need new batteries!"', aliases: ['cork board', 'board', 'notices'], properName: false, article: 'a' }));
    corkBoard.add(new SceneryTrait());
    world.moveEntity(corkBoard.id, supplyRoom.id);

    const sugarGliders = world.createEntity('sugar gliders', EntityType.SCENERY);
    sugarGliders.add(new IdentityTrait({ name: 'sugar gliders', description: 'A family of tiny sugar gliders with enormous dark eyes, leaping between branches.', aliases: ['sugar gliders', 'gliders'], properName: false, article: 'some' }));
    sugarGliders.add(new SceneryTrait());
    world.moveEntity(sugarGliders.id, nocturnalExhibit.id);

    const bushBabies = world.createEntity('bush babies', EntityType.SCENERY);
    bushBabies.add(new IdentityTrait({ name: 'bush babies', description: 'Two bush babies with impossibly large round eyes, clinging to a rope with tiny hands.', aliases: ['bush babies', 'galagos'], properName: false, article: 'some' }));
    bushBabies.add(new SceneryTrait());
    world.moveEntity(bushBabies.id, nocturnalExhibit.id);

    const barnOwl = world.createEntity('barn owl', EntityType.SCENERY);
    barnOwl.add(new IdentityTrait({ name: 'barn owl', description: 'An enormous barn owl with a heart-shaped white face on a fake tree stump.', aliases: ['barn owl', 'owl'], properName: false, article: 'a' }));
    barnOwl.add(new SceneryTrait());
    world.moveEntity(barnOwl.id, nocturnalExhibit.id);

    // --- Gift Shop scenery ---

    const stuffedAnimals = world.createEntity('stuffed animals', EntityType.SCENERY);
    stuffedAnimals.add(new IdentityTrait({ name: 'stuffed animals', description: 'Shelves of plush tigers, pandas, and penguins in various sizes.', aliases: ['stuffed animals', 'plush', 'toys'], properName: false, article: 'some' }));
    stuffedAnimals.add(new SceneryTrait());
    world.moveEntity(stuffedAnimals.id, giftShop.id);

    const postcards = world.createEntity('postcards', EntityType.SCENERY);
    postcards.add(new IdentityTrait({ name: 'postcards', description: 'A spinning rack of postcards showing the zoo\'s greatest hits.', aliases: ['postcards', 'cards', 'postcard rack'], properName: false, article: 'some' }));
    postcards.add(new SceneryTrait());
    world.moveEntity(postcards.id, giftShop.id);


    // ========================================================================
    // READABLE OBJECTS — from V9
    // ========================================================================

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

    const brochure = world.createEntity('zoo brochure', EntityType.ITEM);
    brochure.add(new IdentityTrait({ name: 'zoo brochure', description: 'A glossy tri-fold brochure with "WILLOWBROOK FAMILY ZOO" on the cover.', aliases: ['brochure', 'zoo brochure', 'pamphlet', 'leaflet'], properName: false, article: 'a' }));
    brochure.add(new ReadableTrait({ text: 'WILLOWBROOK FAMILY ZOO — Your Guide\n\nEXHIBITS:\n  Petting Zoo — East from Main Path\n  Aviary — West from Main Path\n  Gift Shop — West from Aviary\n  Nocturnal Animals — Staff Area\n\n"Where every visit is a wild adventure!"' }));
    world.moveEntity(brochure.id, entrance.id);


    // ========================================================================
    // SWITCHABLE DEVICES — from V10
    // ========================================================================

    const radio = world.createEntity('radio', EntityType.ITEM);
    radio.add(new IdentityTrait({ name: 'radio', description: 'A battered portable radio held together with duct tape. The antenna is bent at a jaunty angle. A faded sticker on the side reads "ZOO FM — All Animals, All The Time."', aliases: ['radio', 'portable radio'], properName: false, article: 'a' }));
    radio.add(new SwitchableTrait({ isOn: false }));
    radio.add(new SceneryTrait());
    world.moveEntity(radio.id, supplyRoom.id);


    // ========================================================================
    // PORTABLE OBJECTS
    // ========================================================================

    const zooMap = world.createEntity('zoo map', EntityType.ITEM);
    zooMap.add(new IdentityTrait({ name: 'zoo map', description: 'A colorful folding map of the Willowbrook Family Zoo.', aliases: ['map', 'zoo map', 'folding map'], properName: false, article: 'a' }));
    world.moveEntity(zooMap.id, entrance.id);

    const animalFeed = world.createEntity('bag of animal feed', EntityType.ITEM);
    animalFeed.add(new IdentityTrait({ name: 'bag of animal feed', description: 'A small brown paper bag filled with dried corn and pellets.', aliases: ['feed', 'animal feed', 'bag of feed', 'corn'], properName: false, article: 'a' }));
    world.moveEntity(animalFeed.id, pettingZoo.id);

    const penny = world.createEntity('souvenir penny', EntityType.ITEM);
    penny.add(new IdentityTrait({ name: 'souvenir penny', description: 'A shiny copper penny that could fit in a souvenir press machine.', aliases: ['penny', 'souvenir penny', 'coin'], properName: false, article: 'a' }));
    world.moveEntity(penny.id, mainPath.id);

    const flashlight = world.createEntity('flashlight', EntityType.ITEM);
    flashlight.add(new IdentityTrait({ name: 'flashlight', description: 'A heavy-duty yellow flashlight with "PROPERTY OF WILLOWBROOK ZOO" stenciled on the side.', aliases: ['flashlight', 'torch', 'light', 'lamp'], properName: false, article: 'a' }));
    flashlight.add(new SwitchableTrait({ isOn: false }));
    flashlight.add(new LightSourceTrait({ brightness: 8, isLit: false }));
    world.moveEntity(flashlight.id, supplyRoom.id);

    // Save entity IDs for event handlers (used in onEngineReady)
    this.entityIds = {
      animalFeed: animalFeed.id,
      penny: penny.id,
      souvenirPress: '',  // Set below after creating the press
    };


    // ========================================================================
    // CONTAINERS
    // ========================================================================

    const backpack = world.createEntity('backpack', EntityType.CONTAINER);
    backpack.add(new IdentityTrait({ name: 'backpack', description: 'A small red canvas backpack with a cartoon monkey patch.', aliases: ['backpack', 'rucksack', 'pack'], properName: false, article: 'a' }));
    backpack.add(new ContainerTrait({ capacity: { maxItems: 5 } }));
    world.moveEntity(backpack.id, entrance.id);

    const parkBench = world.createEntity('park bench', EntityType.SUPPORTER);
    parkBench.add(new IdentityTrait({ name: 'park bench', description: 'A sturdy park bench painted forest green. Plaque: "In memory of Mr. Whiskers."', aliases: ['bench', 'park bench', 'benches', 'seat'], properName: false, article: 'a' }));
    parkBench.add(new SupporterTrait({ capacity: { maxItems: 3 } }));
    parkBench.add(new SceneryTrait());
    world.moveEntity(parkBench.id, mainPath.id);

    const lunchbox = world.createEntity('lunchbox', EntityType.CONTAINER);
    lunchbox.add(new IdentityTrait({ name: 'lunchbox', description: 'A dented metal lunchbox decorated with cartoon zoo animals.', aliases: ['lunchbox', 'lunch box', 'box'], properName: false, article: 'a' }));
    lunchbox.add(new ContainerTrait({ capacity: { maxItems: 3 } }));
    lunchbox.add(new OpenableTrait({ isOpen: false }));
    world.moveEntity(lunchbox.id, mainPath.id);

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
    world.moveEntity(dispenser.id, pettingZoo.id);


    // ========================================================================
    // SOUVENIR PRESS — NEW IN V12
    // ========================================================================
    //
    // The souvenir press is a container that accepts pennies. When a penny
    // is put in, an event handler (registered in onEngineReady) transforms
    // the penny into a pressed penny with a zoo animal design.
    //
    // We use ContainerTrait so the player can "put penny in press".
    // The event handler reacts to the if.event.put_in event.

    const souvenirPress = world.createEntity('souvenir press', EntityType.CONTAINER);
    souvenirPress.add(new IdentityTrait({
      name: 'souvenir press',
      description:
        'A heavy cast-iron machine with a big crank handle. A slot on top ' +
        'accepts pennies, and the mechanism stamps them with a zoo animal ' +
        'design. A sign reads: "INSERT PENNY, TURN HANDLE, KEEP FOREVER!"',
      aliases: ['press', 'souvenir press', 'penny press', 'machine'],
      properName: false,
      article: 'a',
    }));
    souvenirPress.add(new ContainerTrait({ capacity: { maxItems: 1 } }));
    souvenirPress.add(new SceneryTrait());
    world.moveEntity(souvenirPress.id, giftShop.id);

    this.entityIds.souvenirPress = souvenirPress.id;


    // ========================================================================
    // NPCs — from V11
    // ========================================================================

    const zookeeper = world.createEntity('zookeeper', EntityType.ACTOR);
    zookeeper.add(new IdentityTrait({ name: 'zookeeper', description: 'A friendly zookeeper in khaki overalls and a wide-brimmed hat, carrying a bucket of mixed animal feed. A name tag reads "Sam."', aliases: ['keeper', 'zookeeper', 'sam'], properName: false, article: 'a' }));
    zookeeper.add(new ActorTrait({ isPlayer: false }));
    zookeeper.add(new NpcTrait({ behaviorId: 'zoo-keeper-patrol', canMove: true, isAlive: true, isConscious: true }));
    world.moveEntity(zookeeper.id, mainPath.id);

    const parrot = world.createEntity('parrot', EntityType.ACTOR);
    parrot.add(new IdentityTrait({ name: 'parrot', description: 'A magnificent scarlet macaw perched on a rope near the entrance. It tilts its head and watches you with one bright eye.', aliases: ['parrot', 'macaw', 'scarlet macaw'], properName: false, article: 'a' }));
    parrot.add(new ActorTrait({ isPlayer: false }));
    parrot.add(new NpcTrait({ behaviorId: 'zoo-parrot', canMove: false, isAlive: true, isConscious: true }));
    world.moveEntity(parrot.id, aviary.id);


    // ========================================================================
    // PLAYER STARTING LOCATION
    // ========================================================================

    const player = world.getPlayer();
    if (player) {
      world.moveEntity(player.id, entrance.id);
    }
  }


  // ==========================================================================
  // onEngineReady — NPC registration (V11) + Event Handlers (V12)
  // ==========================================================================

  onEngineReady(engine: GameEngine): void {
    const world = engine.getWorld();

    // --- NPC Plugin and Behaviors (same as V11) ---

    const npcPlugin = new NpcPlugin();
    engine.getPluginRegistry().register(npcPlugin);
    const npcService = npcPlugin.getNpcService();

    const keeperPatrol = createPatrolBehavior({
      route: [this.roomIds.mainPath, this.roomIds.pettingZoo, this.roomIds.aviary],
      loop: true,
      waitTurns: 1,
    });
    keeperPatrol.id = 'zoo-keeper-patrol';
    npcService.registerBehavior(keeperPatrol);
    npcService.registerBehavior(parrotBehavior);


    // ========================================================================
    // EVENT CHAIN HANDLERS — NEW IN V12
    // ========================================================================
    //
    // Event handlers let you react to things that happen in the game.
    // Every stdlib action emits an event when it succeeds:
    //
    //   if.event.taken    — player took an item
    //   if.event.dropped  — player dropped an item
    //   if.event.put_in   — player put an item in a container
    //   if.event.put_on   — player put an item on a supporter
    //   if.event.opened   — player opened something
    //   if.event.closed   — player closed something
    //   if.event.locked   — player locked something
    //   if.event.unlocked — player unlocked something
    //   ...and many more
    //
    // There are two kinds of handlers:
    //
    //   world.registerEventHandler(eventType, fn)
    //     - fn returns void — can only mutate world state silently
    //     - Good for bookkeeping (setting flags, tracking state)
    //
    //   world.chainEvent(eventType, fn, options)
    //     - fn returns an ISemanticEvent | null
    //     - The returned event gets dispatched and rendered as text
    //     - This is what you use when you want the player to SEE something
    //
    // For this tutorial, we use chainEvent() because we want to show
    // the player custom text when they drop feed or press a penny.


    // --- Handler 1: Goats react to dropped feed ---
    //
    // When the player drops the bag of animal feed in the Petting Zoo,
    // the goats rush over and eat it. This is a "react to drop" pattern.
    //
    // The chain handler checks:
    //   1. Was it the animal feed that was dropped? (by item ID)
    //   2. Was it dropped in the Petting Zoo? (by location ID)
    // If yes, it returns a game.message event with custom text.

    const feedId = this.entityIds.animalFeed;
    const pettingZooId = this.roomIds.pettingZoo;

    world.chainEvent(
      'if.event.dropped',
      (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null => {
        // The event's data contains information about what was dropped.
        // DroppedEventData has:
        //   item     — the item's NAME (string, e.g., "bag of animal feed")
        //   itemId   — the item's entity ID (what we compare against)
        //   toLocation — the entity ID of where it was dropped
        const data = event.data as Record<string, any>;

        // Check if it's the feed being dropped in the petting zoo
        if (data.itemId !== feedId || data.toLocation !== pettingZooId) {
          return null; // Not our event — ignore it
        }

        // Prevent repeated reactions with a state flag
        if (w.getStateValue('goats-fed')) return null;
        w.setStateValue('goats-fed', true);

        // Return a custom event — the text service's generic handler will
        // render any event type that has a 'text' field in its data.
        //
        // IMPORTANT: Don't use type 'game.message' here! The event processor
        // treats game.message reactions as overrides of the original event's
        // text, which is not what we want. Use a custom event type instead.
        return {
          id: `zoo-goats-eat-${Date.now()}`,
          type: 'zoo.event.goats_react',
          timestamp: Date.now(),
          entities: {},
          data: {
            text: 'The pygmy goats spot the bag of feed and rush over! They crowd around, bleating excitedly, and devour the corn and pellets in seconds. The smallest goat looks up at you with big grateful eyes.',
          },
        };
      },
      { key: 'zoo.chain.goats-eat-feed' },
    );


    // --- Handler 2: Souvenir press transforms penny ---
    //
    // When the player puts the souvenir penny into the souvenir press,
    // the penny is consumed and a pressed penny appears in the player's
    // inventory. This is an "item transformation" pattern.
    //
    // The chain handler checks:
    //   1. Was it the penny that was put in? (by item ID)
    //   2. Was it put in the souvenir press? (by target ID)

    const pennyId = this.entityIds.penny;
    const pressId = this.entityIds.souvenirPress;

    world.chainEvent(
      'if.event.put_in',
      (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null => {
        const data = event.data as Record<string, any>;

        // Check: was the penny put into the press?
        if (data.itemId !== pennyId || data.targetId !== pressId) {
          return null; // Not our event
        }

        // Step 1: Remove the penny from the press (destroy it).
        w.removeEntity(pennyId);

        // Step 2: Create the pressed penny — a brand new item.
        const pressedPenny = w.createEntity('pressed penny', EntityType.ITEM);
        pressedPenny.add(new IdentityTrait({
          name: 'pressed penny',
          description:
            'A flattened oval of copper with an embossed image of a toucan. ' +
            'The text reads: "WILLOWBROOK FAMILY ZOO — I WAS HERE!"',
          aliases: ['pressed penny', 'pressed coin', 'souvenir'],
          properName: false,
          article: 'a',
        }));

        // Step 3: Place the pressed penny in the player's inventory.
        const player = w.getPlayer();
        if (player) {
          w.moveEntity(pressedPenny.id, player.id);
        }

        // Step 4: Return a custom event — the player sees the text.
        // Use a custom type (not 'game.message') so the event processor
        // doesn't consume it as an override of the put_in message.
        return {
          id: `zoo-press-penny-${Date.now()}`,
          type: 'zoo.event.penny_pressed',
          timestamp: Date.now(),
          entities: {},
          data: {
            text: 'CLUNK! CRUNCH! WHIRRR! The souvenir press swallows the penny and spits out a beautiful pressed penny with an embossed toucan design. You pocket it proudly.',
          },
        };
      },
      { key: 'zoo.chain.penny-press' },
    );
  }
}


// ============================================================================
// EXPORTS
// ============================================================================

export const story = new FamilyZooStory();
export default story;
