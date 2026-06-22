/**
 * Family Zoo Tutorial — Version 9: Readable Objects
 *
 * NEW IN THIS VERSION:
 *   - ReadableTrait — entities with text the player can read
 *   - Animal info plaques at exhibits (scenery + readable)
 *   - A zoo brochure (portable + readable)
 *   - A warning sign at the nocturnal exhibit
 *   - The "read" action (built into stdlib)
 *
 * WHAT YOU'LL LEARN:
 *   - ReadableTrait gives an entity text that "read X" displays
 *   - ReadableTrait.text is separate from IdentityTrait.description
 *   - "examine" shows the description; "read" shows the text
 *   - Readable objects can be scenery (plaques) or portable (brochure)
 *
 * TRY IT:
 *   > take brochure          (pick up the zoo brochure)
 *   > read brochure          (read its text — different from examine!)
 *   > examine brochure       (see its physical description)
 *   > south                  (Main Path)
 *   > east                   (Petting Zoo)
 *   > read plaque            (read the animal info plaque)
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
  SwitchableTrait,
  LightSourceTrait,
  ReadableTrait,       // ← NEW: gives entities readable text
} from '@sharpee/world-model';


// ============================================================================
// STORY CONFIGURATION
// ============================================================================

const config: StoryConfig = {
  id: 'familyzoo',
  title: 'Family Zoo',
  author: 'Sharpee Tutorial',
  version: '0.9.0',
  description: 'A small family zoo — learn Sharpee one concept at a time.',
};


// ============================================================================
// THE STORY CLASS
// ============================================================================

class FamilyZooStory implements Story {
  config = config;

  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new IdentityTrait({ name: 'yourself', description: 'Just an ordinary visitor to the zoo.', aliases: ['self', 'myself', 'me'], properName: true, article: '' }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
    return player;
  }

  initializeWorld(world: WorldModel): void {

    // ========================================================================
    // ROOMS — same as V8
    // ========================================================================

    const entrance = world.createEntity('Zoo Entrance', EntityType.ROOM);
    entrance.add(new RoomTrait({ exits: {}, isDark: false }));
    entrance.add(new IdentityTrait({ name: 'Zoo Entrance', description: 'You stand before the wrought-iron gates of the Willowbrook Family Zoo. A cheerful welcome sign arches over the entrance, and a small ticket booth sits to one side. A sturdy iron fence runs along either side of the gates. The main path leads south into the zoo grounds.', aliases: ['entrance', 'gates', 'gate'], properName: false, article: 'the' }));

    const mainPath = world.createEntity('Main Path', EntityType.ROOM);
    mainPath.add(new RoomTrait({ exits: {}, isDark: false }));
    mainPath.add(new IdentityTrait({ name: 'Main Path', description: 'A wide gravel path winds through the heart of the zoo. Colorful direction signs point every which way. A park bench sits beside the path. To the east, the petting zoo. To the west, the aviary. A staff gate blocks the path to the south. The entrance is back to the north.', aliases: ['path', 'main path', 'gravel path'], properName: false, article: 'the' }));

    const pettingZoo = world.createEntity('Petting Zoo', EntityType.ROOM);
    pettingZoo.add(new RoomTrait({ exits: {}, isDark: false }));
    pettingZoo.add(new IdentityTrait({ name: 'Petting Zoo', description: 'A cheerful open-air enclosure filled with friendly animals. Pygmy goats trot around nibbling at visitors\' shoelaces, while a pair of fluffy rabbits hop lazily near a hay bale. A feed dispenser is mounted on a post near the entrance. An info plaque is posted by the gate. The main path is back to the west.', aliases: ['petting zoo', 'petting area', 'pen'], properName: false, article: 'the' }));

    const aviary = world.createEntity('Aviary', EntityType.ROOM);
    aviary.add(new RoomTrait({ exits: {}, isDark: false }));
    aviary.add(new IdentityTrait({ name: 'Aviary', description: 'You step inside a soaring mesh dome. Brilliantly colored parrots chatter from rope perches, and a toucan eyes you curiously from a branch overhead. A small waterfall splashes into a stone basin. An info plaque hangs near the entrance. The exit back to the main path is to the east.', aliases: ['aviary', 'bird house', 'dome'], properName: false, article: 'the' }));

    const supplyRoom = world.createEntity('Supply Room', EntityType.ROOM);
    supplyRoom.add(new RoomTrait({ exits: {}, isDark: false }));
    supplyRoom.add(new IdentityTrait({ name: 'Supply Room', description: 'A cluttered storage room behind the staff gate. Metal shelves line the walls. A cork board on the wall is covered with staff schedules. The staff gate leads back north.', aliases: ['supply room', 'storage room', 'storeroom'], properName: false, article: 'the' }));

    const nocturnalExhibit = world.createEntity('Nocturnal Animals Exhibit', EntityType.ROOM);
    nocturnalExhibit.add(new RoomTrait({ exits: {}, isDark: true }));
    nocturnalExhibit.add(new IdentityTrait({ name: 'Nocturnal Animals Exhibit', description: 'A cool, dimly lit cavern designed to simulate nighttime. Glass enclosures line both walls with soft red lights. You can see sugar gliders, bush babies, and a barn owl. A warning sign is posted near the entrance. The exit leads back north to the supply room.', aliases: ['nocturnal exhibit', 'nocturnal animals', 'exhibit'], properName: false, article: 'the' }));


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
    // EXITS — same as V8
    // ========================================================================

    entrance.get(RoomTrait)!.exits = { [Direction.SOUTH]: { destination: mainPath.id } };
    mainPath.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: entrance.id }, [Direction.EAST]: { destination: pettingZoo.id }, [Direction.WEST]: { destination: aviary.id }, [Direction.SOUTH]: { destination: supplyRoom.id, via: staffGate.id } };
    pettingZoo.get(RoomTrait)!.exits = { [Direction.WEST]: { destination: mainPath.id } };
    aviary.get(RoomTrait)!.exits = { [Direction.EAST]: { destination: mainPath.id } };
    supplyRoom.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: mainPath.id, via: staffGate.id }, [Direction.SOUTH]: { destination: nocturnalExhibit.id } };
    nocturnalExhibit.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: supplyRoom.id } };


    // ========================================================================
    // SCENERY — abbreviated
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


    // ========================================================================
    // READABLE OBJECTS — NEW IN V9
    // ========================================================================
    //
    // ReadableTrait gives an entity text that the player can read.
    //
    // This is DIFFERENT from IdentityTrait.description:
    //   - "examine plaque"  → shows IdentityTrait.description
    //     ("A brass plaque mounted on a wooden post.")
    //   - "read plaque"     → shows ReadableTrait.text
    //     ("PYGMY GOATS — These Nigerian Dwarf goats...")
    //
    // Think of it this way:
    //   - description = what the object LOOKS like
    //   - text = what the object SAYS
    //
    // Not everything that can be examined can be read, and vice versa.
    // A rock has a description but no text. A plaque has both.
    //
    // ReadableTrait works with any entity type:
    //   - Scenery plaques (can't take, can read)
    //   - Portable brochures (can take AND read)
    //   - Signs on doors, labels on bottles, etc.

    // --- Petting Zoo Info Plaque (scenery + readable) ---
    const pettingPlaque = world.createEntity('info plaque', EntityType.SCENERY);

    pettingPlaque.add(new IdentityTrait({
      name: 'info plaque',
      description:
        'A brass plaque mounted on a wooden post near the petting zoo ' +
        'gate. It has text etched into the metal.',
      aliases: ['plaque', 'info plaque', 'brass plaque'],
      properName: false,
      article: 'an',
    }));

    // ReadableTrait — the text the player sees when they type "read plaque"
    pettingPlaque.add(new ReadableTrait({
      text:
        'PYGMY GOATS — These Nigerian Dwarf goats are gentle, curious, ' +
        'and always hungry. They can eat up to 3% of their body weight ' +
        'daily. Please use only zoo-approved feed from the dispensers.\n\n' +
        'HOLLAND LOP RABBITS — Known for their floppy ears and calm ' +
        'temperament. Our pair, Biscuit and Marmalade, were born right ' +
        'here at Willowbrook in 2023.',
    }));

    pettingPlaque.add(new SceneryTrait());
    world.moveEntity(pettingPlaque.id, pettingZoo.id);


    // --- Aviary Info Plaque (scenery + readable) ---
    const aviaryPlaque = world.createEntity('aviary plaque', EntityType.SCENERY);

    aviaryPlaque.add(new IdentityTrait({
      name: 'aviary plaque',
      description:
        'A colorful information board hanging near the aviary entrance, ' +
        'decorated with painted feathers along the border.',
      aliases: ['plaque', 'aviary plaque', 'information board'],
      properName: false,
      article: 'an',
    }));

    aviaryPlaque.add(new ReadableTrait({
      text:
        'WELCOME TO THE AVIARY — Home to over 30 species of tropical ' +
        'and temperate birds!\n\n' +
        'TOCO TOUCAN (Ramphastos toco) — The largest toucan species. ' +
        'Despite its enormous bill, it weighs less than a smartphone.\n\n' +
        'SCARLET MACAW (Ara macao) — Can live over 75 years. Our oldest ' +
        'macaw, Captain, is 42 and has outlasted three zookeepers.',
    }));

    aviaryPlaque.add(new SceneryTrait());
    world.moveEntity(aviaryPlaque.id, aviary.id);


    // --- Warning Sign at Nocturnal Exhibit (scenery + readable) ---
    const warningSign = world.createEntity('warning sign', EntityType.SCENERY);

    warningSign.add(new IdentityTrait({
      name: 'warning sign',
      description:
        'A yellow warning sign posted near the entrance to the nocturnal ' +
        'exhibit. Bold black text demands attention.',
      aliases: ['warning', 'warning sign', 'yellow sign', 'notice'],
      properName: false,
      article: 'a',
    }));

    warningSign.add(new ReadableTrait({
      text:
        'CAUTION: The Nocturnal Animals Exhibit is kept dark to simulate ' +
        'the animals\' natural nighttime environment. Please use a ' +
        'flashlight if available. Do NOT use camera flash — it distresses ' +
        'the animals. Report any escaped animals to staff immediately. ' +
        '(Yes, it has happened. We don\'t talk about the Great Owl ' +
        'Incident of 2022.)',
    }));

    warningSign.add(new SceneryTrait());
    world.moveEntity(warningSign.id, supplyRoom.id);


    // --- Zoo Brochure (portable + readable) ---
    //
    // This shows that ReadableTrait works on portable items too.
    // The player can take the brochure and read it anywhere.
    const brochure = world.createEntity('zoo brochure', EntityType.ITEM);

    brochure.add(new IdentityTrait({
      name: 'zoo brochure',
      description:
        'A glossy tri-fold brochure with "WILLOWBROOK FAMILY ZOO" on ' +
        'the cover in cheerful yellow letters. A cartoon elephant waves ' +
        'from the corner.',
      aliases: ['brochure', 'zoo brochure', 'pamphlet', 'leaflet'],
      properName: false,
      article: 'a',
    }));

    brochure.add(new ReadableTrait({
      text:
        'WILLOWBROOK FAMILY ZOO — Your Guide\n\n' +
        'EXHIBITS:\n' +
        '  Petting Zoo ............ East from Main Path\n' +
        '  Aviary ................. West from Main Path\n' +
        '  Nocturnal Animals ...... Staff Area (ask a keeper!)\n\n' +
        'FEEDING TIMES:\n' +
        '  Goats & Rabbits ........ 10am, 2pm\n' +
        '  Birds .................. 11am, 3pm\n\n' +
        'FREE ACTIVITIES:\n' +
        '  Souvenir penny press ... Main Path\n' +
        '  Scavenger hunt ......... Pick up a card at the entrance!\n\n' +
        '"Where every visit is a wild adventure!"',
    }));

    world.moveEntity(brochure.id, entrance.id);


    // ========================================================================
    // PORTABLE OBJECTS — from V4
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

    // Flashlight — from V8
    const flashlight = world.createEntity('flashlight', EntityType.ITEM);
    flashlight.add(new IdentityTrait({ name: 'flashlight', description: 'A heavy-duty yellow flashlight with "PROPERTY OF WILLOWBROOK ZOO" stenciled on the side.', aliases: ['flashlight', 'torch', 'light', 'lamp'], properName: false, article: 'a' }));
    flashlight.add(new SwitchableTrait({ isOn: false }));
    flashlight.add(new LightSourceTrait({ brightness: 8, isLit: false }));
    world.moveEntity(flashlight.id, supplyRoom.id);


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
