/**
 * Family Zoo Tutorial — Version 8: Light & Dark
 *
 * NEW IN THIS VERSION:
 *   - Dark rooms (isDark: true on RoomTrait)
 *   - LightSourceTrait — entities that provide illumination
 *   - SwitchableTrait — entities with on/off state (the flashlight)
 *   - A Nocturnal Animals exhibit that's dark without a light source
 *   - A flashlight in the supply room
 *
 * WHAT YOU'LL LEARN:
 *   - Setting isDark: true on a room makes it pitch black
 *   - Dark rooms block examine, take, and most other actions
 *   - LightSourceTrait + SwitchableTrait = a switchable light source
 *   - Carrying a lit light source illuminates dark rooms
 *
 * TRY IT:
 *   > take keycard                (at entrance)
 *   > south                      (Main Path)
 *   > unlock gate with keycard   (unlock the staff gate)
 *   > open gate                  (open it)
 *   > south                      (Supply Room)
 *   > take flashlight            (get the flashlight)
 *   > north                      (back to Main Path)
 *   > south; south               (through to Nocturnal Exhibit — dark!)
 *   > switch on flashlight       (let there be light!)
 *   > look                       (now you can see)
 *
 * BUILD & RUN:
 *   ./build.sh -s familyzoo
 *   node dist/cli/sharpee.js --story tutorials/familyzoo --play
 */

// ============================================================================
// IMPORTS
// ============================================================================

import { Story, StoryConfig } from '@sharpee/engine';
import {
  WorldModel,
  IFEntity,
  EntityType,
  Direction,
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
  SwitchableTrait,     // ← NEW: on/off state for devices
  LightSourceTrait,    // ← NEW: provides illumination in dark rooms
} from '@sharpee/world-model';


// ============================================================================
// STORY CONFIGURATION
// ============================================================================

const config: StoryConfig = {
  id: 'familyzoo',
  title: 'Family Zoo',
  author: 'Sharpee Tutorial',
  version: '0.8.0',
  description: 'A small family zoo — learn Sharpee one concept at a time.',
};


// ============================================================================
// THE STORY CLASS
// ============================================================================

class FamilyZooStory implements Story {
  config = config;

  // createPlayer — same as V1, see v01.ts
  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new IdentityTrait({ name: 'yourself', description: 'Just an ordinary visitor to the zoo.', aliases: ['self', 'myself', 'me'], properName: true, article: '' }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
    return player;
  }

  initializeWorld(world: WorldModel): void {

    // ========================================================================
    // ROOMS
    // ========================================================================

    const entrance = world.createEntity('Zoo Entrance', EntityType.ROOM);
    entrance.add(new RoomTrait({ exits: {}, isDark: false }));
    entrance.add(new IdentityTrait({ name: 'Zoo Entrance', description: 'You stand before the wrought-iron gates of the Willowbrook Family Zoo. A cheerful welcome sign arches over the entrance, and a small ticket booth sits to one side. A sturdy iron fence runs along either side of the gates. The main path leads south into the zoo grounds.', aliases: ['entrance', 'gates', 'gate'], properName: false, article: 'the' }));

    const mainPath = world.createEntity('Main Path', EntityType.ROOM);
    mainPath.add(new RoomTrait({ exits: {}, isDark: false }));
    mainPath.add(new IdentityTrait({ name: 'Main Path', description: 'A wide gravel path winds through the heart of the zoo. Colorful direction signs point every which way. A park bench sits beside the path. To the east, the petting zoo. To the west, the aviary. A staff gate blocks the path to the south. The entrance is back to the north.', aliases: ['path', 'main path', 'gravel path'], properName: false, article: 'the' }));

    const pettingZoo = world.createEntity('Petting Zoo', EntityType.ROOM);
    pettingZoo.add(new RoomTrait({ exits: {}, isDark: false }));
    pettingZoo.add(new IdentityTrait({ name: 'Petting Zoo', description: 'A cheerful open-air enclosure filled with friendly animals. Pygmy goats trot around nibbling at visitors\' shoelaces, while a pair of fluffy rabbits hop lazily near a hay bale. A feed dispenser is mounted on a post near the entrance. The main path is back to the west.', aliases: ['petting zoo', 'petting area', 'pen'], properName: false, article: 'the' }));

    const aviary = world.createEntity('Aviary', EntityType.ROOM);
    aviary.add(new RoomTrait({ exits: {}, isDark: false }));
    aviary.add(new IdentityTrait({ name: 'Aviary', description: 'You step inside a soaring mesh dome. Brilliantly colored parrots chatter from rope perches, and a toucan eyes you curiously from a branch overhead. A small waterfall splashes into a stone basin. The exit back to the main path is to the east.', aliases: ['aviary', 'bird house', 'dome'], properName: false, article: 'the' }));

    const supplyRoom = world.createEntity('Supply Room', EntityType.ROOM);
    supplyRoom.add(new RoomTrait({ exits: {}, isDark: false }));
    supplyRoom.add(new IdentityTrait({ name: 'Supply Room', description: 'A cluttered storage room behind the staff gate. Metal shelves line the walls, stacked with bags of feed, cleaning supplies, and spare parts for the exhibits. A cork board on the wall is covered with staff schedules. A heavy door to the south leads to the nocturnal exhibit. The staff gate leads back north.', aliases: ['supply room', 'storage room', 'storeroom'], properName: false, article: 'the' }));

    // --- Nocturnal Animals Exhibit (NEW — dark room!) ---
    const nocturnalExhibit = world.createEntity('Nocturnal Animals Exhibit', EntityType.ROOM);

    nocturnalExhibit.add(new RoomTrait({
      exits: {},
      // isDark: true — THIS IS THE KEY!
      // When isDark is true, the player can't see anything in the room.
      // They'll get a "It is pitch dark" message instead of the room
      // description. They can't examine things, take things, or interact
      // with anything in the room.
      //
      // The ONLY way to see in a dark room is to carry a lit light source
      // (an entity with LightSourceTrait that has isLit: true).
      isDark: true,
    }));

    nocturnalExhibit.add(new IdentityTrait({
      name: 'Nocturnal Animals Exhibit',
      description:
        'A cool, dimly lit cavern designed to simulate nighttime. Glass ' +
        'enclosures line both walls, each with a soft red light inside. ' +
        'You can see a family of sugar gliders leaping between branches, ' +
        'a pair of wide-eyed bush babies clinging to a rope, and an ' +
        'enormous barn owl perched motionless on a fake tree stump. ' +
        'The exit leads back north to the supply room.',
      aliases: ['nocturnal exhibit', 'nocturnal animals', 'dark exhibit', 'exhibit'],
      properName: false,
      article: 'the',
    }));


    // ========================================================================
    // THE STAFF GATE — same as V7, see v07.ts for detailed comments
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
    // EXITS
    // ========================================================================

    entrance.get(RoomTrait)!.exits = { [Direction.SOUTH]: { destination: mainPath.id } };
    mainPath.get(RoomTrait)!.exits = {
      [Direction.NORTH]: { destination: entrance.id },
      [Direction.EAST]:  { destination: pettingZoo.id },
      [Direction.WEST]:  { destination: aviary.id },
      [Direction.SOUTH]: { destination: supplyRoom.id, via: staffGate.id },
    };
    pettingZoo.get(RoomTrait)!.exits = { [Direction.WEST]: { destination: mainPath.id } };
    aviary.get(RoomTrait)!.exits = { [Direction.EAST]: { destination: mainPath.id } };
    supplyRoom.get(RoomTrait)!.exits = {
      [Direction.NORTH]: { destination: mainPath.id, via: staffGate.id },
      [Direction.SOUTH]: { destination: nocturnalExhibit.id },
    };
    nocturnalExhibit.get(RoomTrait)!.exits = {
      [Direction.NORTH]: { destination: supplyRoom.id },
    };


    // ========================================================================
    // SCENERY — abbreviated, see v03.ts
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
    parrots.add(new IdentityTrait({ name: 'parrots', description: 'A raucous flock of scarlet macaws and grey African parrots.', aliases: ['parrots', 'parrot', 'macaws', 'birds'], properName: false, article: 'some' }));
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

    // Nocturnal exhibit scenery (only visible when the room is lit)
    const sugarGliders = world.createEntity('sugar gliders', EntityType.SCENERY);
    sugarGliders.add(new IdentityTrait({
      name: 'sugar gliders',
      description:
        'A family of tiny sugar gliders with enormous dark eyes. They ' +
        'leap from branch to branch with their patagium spread wide, ' +
        'gliding silently through the red-lit enclosure.',
      aliases: ['sugar gliders', 'gliders', 'sugar glider'],
      properName: false,
      article: 'some',
    }));
    sugarGliders.add(new SceneryTrait());
    world.moveEntity(sugarGliders.id, nocturnalExhibit.id);

    const bushBabies = world.createEntity('bush babies', EntityType.SCENERY);
    bushBabies.add(new IdentityTrait({
      name: 'bush babies',
      description:
        'Two bush babies with impossibly large round eyes, clinging to ' +
        'a rope with tiny hands. They freeze and stare at you with an ' +
        'expression of perpetual surprise.',
      aliases: ['bush babies', 'bush baby', 'galagos'],
      properName: false,
      article: 'some',
    }));
    bushBabies.add(new SceneryTrait());
    world.moveEntity(bushBabies.id, nocturnalExhibit.id);

    const barnOwl = world.createEntity('barn owl', EntityType.SCENERY);
    barnOwl.add(new IdentityTrait({
      name: 'barn owl',
      description:
        'An enormous barn owl with a heart-shaped white face, perched ' +
        'motionless on a fake tree stump. It swivels its head to follow ' +
        'your movement with unsettling precision.',
      aliases: ['barn owl', 'owl'],
      properName: false,
      article: 'a',
    }));
    barnOwl.add(new SceneryTrait());
    world.moveEntity(barnOwl.id, nocturnalExhibit.id);


    // ========================================================================
    // THE FLASHLIGHT — NEW IN V8
    // ========================================================================
    //
    // A flashlight is an entity with THREE traits:
    //   1. SwitchableTrait — it can be switched on and off
    //   2. LightSourceTrait — it provides illumination when lit
    //   3. IdentityTrait — it has a name and description (as always)
    //
    // HOW LIGHT WORKS IN SHARPEE:
    //
    // When the player enters a dark room (isDark: true), the engine checks:
    //   "Is the player carrying any entity with LightSourceTrait where
    //    isLit is true?"
    //
    //   - If yes: the room is illuminated and the player can see normally
    //   - If no:  "It is pitch dark. You can't see a thing."
    //
    // For a flashlight, isLit is tied to SwitchableTrait's isOn state.
    // When the player types "switch on flashlight":
    //   1. SwitchableTrait.isOn becomes true
    //   2. LightSourceTrait.isLit becomes true (they're linked)
    //   3. The room is now illuminated
    //
    // OTHER LIGHT SOURCES:
    //   - A candle might have LightSourceTrait with fuelRemaining (burns out)
    //   - A glowing gem might always be lit (isLit: true, no SwitchableTrait)
    //   - A lantern might have both SwitchableTrait and fuel mechanics

    const flashlight = world.createEntity('flashlight', EntityType.ITEM);

    flashlight.add(new IdentityTrait({
      name: 'flashlight',
      description:
        'A heavy-duty yellow flashlight with "PROPERTY OF WILLOWBROOK ' +
        'ZOO" stenciled on the side. It looks well-used but functional.',
      aliases: ['flashlight', 'torch', 'light', 'lamp'],
      properName: false,
      article: 'a',
    }));

    // SwitchableTrait — the flashlight can be switched on and off.
    // isOn: false means it starts switched off.
    flashlight.add(new SwitchableTrait({
      isOn: false,
    }));

    // LightSourceTrait — when lit, it illuminates dark rooms.
    // brightness controls how powerful the light is (1-10).
    // isLit starts as false — it will become true when switched on.
    flashlight.add(new LightSourceTrait({
      brightness: 8,
      isLit: false,
    }));

    // Place the flashlight in the supply room.
    // The player needs to unlock the staff gate (V7) to reach it.
    world.moveEntity(flashlight.id, supplyRoom.id);


    // ========================================================================
    // OTHER PORTABLE OBJECTS
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


    // ========================================================================
    // CONTAINERS — from V5/V6
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
    dispenser.add(new IdentityTrait({ name: 'feed dispenser', description: 'A coin-operated feed dispenser mounted on a wooden post. Sign: "FREE — Just Turn!"', aliases: ['dispenser', 'feed dispenser', 'machine'], properName: false, article: 'a' }));
    dispenser.add(new ContainerTrait({ capacity: { maxItems: 3 } }));
    dispenser.add(new OpenableTrait({ isOpen: false }));
    dispenser.add(new SceneryTrait());
    world.moveEntity(dispenser.id, pettingZoo.id);


    // ========================================================================
    // PLAYER STARTING LOCATION
    // ========================================================================

    const player = world.getPlayer();
    if (player) {
      world.moveEntity(player.id, entrance.id);
    }
  }
}


// ============================================================================
// EXPORTS
// ============================================================================

export const story = new FamilyZooStory();
export default story;
