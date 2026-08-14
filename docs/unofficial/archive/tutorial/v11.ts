/**
 * Family Zoo Tutorial — Version 11: Non-Player Characters (NPCs)
 *
 * NEW IN THIS VERSION:
 *   - NpcPlugin — the engine plugin that gives NPCs their own turn phase
 *   - NpcTrait — marks an entity as an NPC with movement and behavior rules
 *   - NpcBehavior — defines what an NPC does each turn
 *   - createPatrolBehavior — a built-in behavior for NPCs that walk a fixed route
 *   - Custom NpcBehavior — writing your own behavior from scratch
 *   - onEngineReady() — the Story hook where plugins are registered
 *
 * WHAT YOU'LL LEARN:
 *   - NPCs are just entities with NpcTrait + ActorTrait + a registered behavior
 *   - The NPC plugin runs after each player turn, giving every NPC a chance to act
 *   - Behaviors return NpcAction[] — move, speak, emote, wait, etc.
 *   - Built-in behaviors (patrol, wanderer, follower, guard, passive) cover common patterns
 *   - Custom behaviors let you write any logic you want
 *
 * TRY IT:
 *   > look                     (you might see the zookeeper here)
 *   > wait                     (the zookeeper patrols between rooms)
 *   > wait                     (keep waiting to watch the patrol)
 *   > west                     (go to the aviary)
 *   > look                     (see the parrot)
 *   > wait                     (the parrot squawks or talks)
 *
 * BUILD & RUN:
 *   ./build.sh -s familyzoo
 *   node dist/cli/sharpee.js --story tutorials/familyzoo --play
 */

// ============================================================================
// IMPORTS
// ============================================================================

// --- Engine ---
// Story and StoryConfig are the same as always.
// GameEngine is new — we need it in onEngineReady() to register the NPC plugin.
import { Story, StoryConfig, GameEngine } from '@sharpee/engine';

// --- World Model ---
// NpcTrait is the trait that marks an entity as a non-player character.
// It stores NPC-specific state: movement restrictions, behavior ID, etc.
import {
  WorldModel,
  IFEntity,
  EntityType,
  Direction,
  NpcTrait,          // ← NEW: marks an entity as an NPC
} from '@sharpee/world-model';

// --- Standard Traits (carried forward) ---
import {
  IdentityTrait,
  ActorTrait,         // ← NPCs need this too — they are actors, just not the player
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

// --- NPC Plugin ---
// NpcPlugin is a TurnPlugin. It hooks into the engine's turn cycle and,
// after each player action, gives every NPC a chance to act. Without
// registering this plugin, NPC behaviors would never fire.
import { NpcPlugin } from '@sharpee/plugin-npc';

// --- NPC Behaviors ---
// NpcBehavior is the interface your behavior must implement.
// NpcContext is what gets passed to each behavior hook (npc, world, etc.).
// NpcAction is a union type describing what the NPC can do (move, speak, etc.).
// createPatrolBehavior is a factory that builds a patrol behavior from a route.
import {
  NpcBehavior,
  NpcContext,
  NpcAction,
  createPatrolBehavior,   // ← Built-in: NPC walks a fixed route of rooms
} from '@sharpee/stdlib';


// ============================================================================
// STORY CONFIGURATION
// ============================================================================

const config: StoryConfig = {
  id: 'familyzoo',
  title: 'Family Zoo',
  author: 'Sharpee Tutorial',
  version: '0.11.0',
  description: 'A small family zoo — learn Sharpee one concept at a time.',
};


// ============================================================================
// CUSTOM NPC BEHAVIOR: PARROT
// ============================================================================
//
// While createPatrolBehavior() handles the zookeeper, the parrot needs
// something custom. We'll write a behavior from scratch.
//
// An NpcBehavior has these hooks (all optional except onTurn):
//
//   onTurn(context)              — called every turn; return actions for the NPC
//   onPlayerEnters?(context)     — called when the player enters the NPC's room
//   onPlayerLeaves?(context)     — called when the player leaves the NPC's room
//   onSpokenTo?(context, words)  — called when the player talks to the NPC
//   onAttacked?(context, attacker) — called when the NPC is attacked
//
// Each hook returns NpcAction[] — an array of things the NPC does.
// Common action types:
//   { type: 'move', direction: Direction.NORTH }  — walk to a room
//   { type: 'speak', messageId: '...', data: {} } — say something (text output)
//   { type: 'emote', messageId: '...', data: {} } — do something visible
//   { type: 'wait' }                              — do nothing this turn
//

// The parrot's phrases — it picks one at random each turn.
const PARROT_PHRASES = [
  'Polly wants a cracker!',
  'SQUAWK! Pretty bird! Pretty bird!',
  'Pieces of eight! Pieces of eight!',
  'Who\'s a good bird? WHO\'S A GOOD BIRD?',
  'BAWK! Welcome to the zoo!',
];

/**
 * Custom parrot behavior.
 *
 * The parrot sits in the aviary and occasionally squawks a random phrase.
 * It also greets the player when they enter the aviary.
 */
const parrotBehavior: NpcBehavior = {
  // Every behavior needs a unique ID. This must match the behaviorId
  // on the NPC's NpcTrait so the NPC service knows which behavior to use.
  id: 'zoo-parrot',
  name: 'Parrot Behavior',

  // onTurn is called every turn, whether the player is in the room or not.
  // The parrot only speaks when the player is visible (in the same room).
  onTurn(context: NpcContext): NpcAction[] {
    // context.playerVisible is true when the player is in the same room.
    if (!context.playerVisible) {
      return []; // No one to talk to — do nothing
    }

    // 50% chance to squawk each turn (so it's not every single turn)
    if (context.random.chance(0.5)) {
      // Pick a random phrase from our list.
      // context.random.pick() selects a random element from an array.
      const phrase = context.random.pick(PARROT_PHRASES);

      // Return a 'speak' action. The NPC service will emit a text event
      // that the player sees as: "The parrot says: ..."
      return [
        {
          type: 'speak',
          messageId: 'npc.speech',
          data: { npcName: 'parrot', text: phrase },
        },
      ];
    }

    return []; // Quiet this turn
  },

  // onPlayerEnters is called once when the player walks into the parrot's room.
  // Great for greeting messages.
  onPlayerEnters(context: NpcContext): NpcAction[] {
    return [
      {
        type: 'emote',
        messageId: 'npc.emote',
        data: {
          npcName: 'parrot',
          text: 'The parrot ruffles its feathers and eyes you with interest.',
        },
      },
    ];
  },
};


// ============================================================================
// THE STORY CLASS
// ============================================================================

class FamilyZooStory implements Story {
  config = config;

  // We need to store room IDs so onEngineReady() can set up the patrol route.
  // In initializeWorld(), we save the IDs; in onEngineReady(), we use them.
  private roomIds: {
    entrance: string;
    mainPath: string;
    pettingZoo: string;
    aviary: string;
    supplyRoom: string;
    nocturnalExhibit: string;
  } = { entrance: '', mainPath: '', pettingZoo: '', aviary: '', supplyRoom: '', nocturnalExhibit: '' };

  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new IdentityTrait({ name: 'yourself', description: 'Just an ordinary visitor to the zoo.', aliases: ['self', 'myself', 'me'], properName: true, article: '' }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
    return player;
  }

  initializeWorld(world: WorldModel): void {

    // ========================================================================
    // ROOMS — same as V10
    // ========================================================================

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
    aviary.add(new IdentityTrait({ name: 'Aviary', description: 'You step inside a soaring mesh dome. Brilliantly colored parrots chatter from rope perches, and a toucan eyes you curiously from a branch overhead. A small waterfall splashes into a stone basin. An info plaque hangs near the entrance. The exit back to the main path is to the east.', aliases: ['aviary', 'bird house', 'dome'], properName: false, article: 'the' }));

    const supplyRoom = world.createEntity('Supply Room', EntityType.ROOM);
    supplyRoom.add(new RoomTrait({ exits: {}, isDark: false }));
    supplyRoom.add(new IdentityTrait({ name: 'Supply Room', description: 'A cluttered storage room behind the staff gate. Metal shelves line the walls. A cork board on the wall is covered with staff schedules. A battered radio sits on one of the shelves. The staff gate leads back north.', aliases: ['supply room', 'storage room', 'storeroom'], properName: false, article: 'the' }));

    const nocturnalExhibit = world.createEntity('Nocturnal Animals Exhibit', EntityType.ROOM);
    nocturnalExhibit.add(new RoomTrait({ exits: {}, isDark: true }));
    nocturnalExhibit.add(new IdentityTrait({ name: 'Nocturnal Animals Exhibit', description: 'A cool, dimly lit cavern designed to simulate nighttime. Glass enclosures line both walls with soft red lights. You can see sugar gliders, bush babies, and a barn owl. A warning sign is posted near the entrance. The exit leads back north to the supply room.', aliases: ['nocturnal exhibit', 'nocturnal animals', 'exhibit'], properName: false, article: 'the' }));

    // Save room IDs for onEngineReady() — the patrol route needs them
    this.roomIds = {
      entrance: entrance.id,
      mainPath: mainPath.id,
      pettingZoo: pettingZoo.id,
      aviary: aviary.id,
      supplyRoom: supplyRoom.id,
      nocturnalExhibit: nocturnalExhibit.id,
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
    // EXITS — same as V10
    // ========================================================================

    entrance.get(RoomTrait)!.exits = { [Direction.SOUTH]: { destination: mainPath.id } };
    mainPath.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: entrance.id }, [Direction.EAST]: { destination: pettingZoo.id }, [Direction.WEST]: { destination: aviary.id }, [Direction.SOUTH]: { destination: supplyRoom.id, via: staffGate.id } };
    pettingZoo.get(RoomTrait)!.exits = { [Direction.WEST]: { destination: mainPath.id } };
    aviary.get(RoomTrait)!.exits = { [Direction.EAST]: { destination: mainPath.id } };
    supplyRoom.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: mainPath.id, via: staffGate.id }, [Direction.SOUTH]: { destination: nocturnalExhibit.id } };
    nocturnalExhibit.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: supplyRoom.id } };


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
    brochure.add(new ReadableTrait({ text: 'WILLOWBROOK FAMILY ZOO — Your Guide\n\nEXHIBITS:\n  Petting Zoo — East from Main Path\n  Aviary — West from Main Path\n  Nocturnal Animals — Staff Area\n\n"Where every visit is a wild adventure!"' }));
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
    dispenser.add(new IdentityTrait({ name: 'feed dispenser', description: 'A coin-operated feed dispenser mounted on a wooden post. Sign: "FREE — Just Turn!"', aliases: ['dispenser', 'feed dispenser', 'machine'], properName: false, article: 'a' }));
    dispenser.add(new ContainerTrait({ capacity: { maxItems: 3 } }));
    dispenser.add(new OpenableTrait({ isOpen: false }));
    dispenser.add(new SceneryTrait());
    world.moveEntity(dispenser.id, pettingZoo.id);


    // ========================================================================
    // NPCs — NEW IN V11
    // ========================================================================
    //
    // Creating an NPC is a three-step process:
    //
    //   1. Create the entity with IdentityTrait + ActorTrait + NpcTrait
    //   2. Define a behavior (or use a built-in one)
    //   3. Register the behavior with the NPC service (in onEngineReady)
    //
    // Step 1 happens here in initializeWorld().
    // Steps 2 and 3 happen in onEngineReady().
    //
    // The key difference from scenery or items:
    //   - NPCs use EntityType.ACTOR (not ITEM or SCENERY)
    //   - NPCs have ActorTrait with isPlayer: false
    //   - NPCs have NpcTrait which connects them to a behavior

    // --- Zookeeper NPC ---
    //
    // The zookeeper patrols between Main Path, Petting Zoo, and Aviary.
    // When you're in the same room, you'll see them in the room description.
    // The patrol behavior handles all the movement automatically.

    const zookeeper = world.createEntity('zookeeper', EntityType.ACTOR);

    // IdentityTrait — same as any entity: name, description, aliases.
    zookeeper.add(new IdentityTrait({
      name: 'zookeeper',
      description:
        'A friendly zookeeper in khaki overalls and a wide-brimmed hat, ' +
        'carrying a bucket of mixed animal feed. A name tag reads "Sam."',
      aliases: ['keeper', 'zookeeper', 'sam'],
      properName: false,
      article: 'a',
    }));

    // ActorTrait — marks this entity as an actor (a character in the world).
    // isPlayer: false — this is an NPC, not the player.
    zookeeper.add(new ActorTrait({ isPlayer: false }));

    // NpcTrait — the NPC-specific trait.
    //   behaviorId: must match the behavior's id (registered in onEngineReady)
    //   canMove: true — this NPC moves between rooms
    //   isAlive: true — alive and active
    //   isConscious: true — awake and able to act
    zookeeper.add(new NpcTrait({
      behaviorId: 'zoo-keeper-patrol',  // Must match the behavior's id
      canMove: true,
      isAlive: true,
      isConscious: true,
    }));

    // Place the zookeeper in the Main Path to start
    world.moveEntity(zookeeper.id, mainPath.id);


    // --- Parrot NPC ---
    //
    // The parrot sits in the Aviary and squawks random phrases.
    // It uses our custom parrotBehavior defined above.

    const parrot = world.createEntity('parrot', EntityType.ACTOR);

    parrot.add(new IdentityTrait({
      name: 'parrot',
      description:
        'A magnificent scarlet macaw perched on a rope near the entrance. ' +
        'It tilts its head and watches you with one bright eye.',
      aliases: ['parrot', 'macaw', 'scarlet macaw'],
      properName: false,
      article: 'a',
    }));

    parrot.add(new ActorTrait({ isPlayer: false }));

    // canMove: false — the parrot stays in the aviary
    parrot.add(new NpcTrait({
      behaviorId: 'zoo-parrot',  // Must match parrotBehavior.id
      canMove: false,
      isAlive: true,
      isConscious: true,
    }));

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
  // onEngineReady — NEW IN V11
  // ==========================================================================
  //
  // This method is called AFTER the engine is fully initialized, AFTER
  // initializeWorld() has run. This is where you register plugins that
  // need the engine reference.
  //
  // The NPC system requires two registrations:
  //   1. Register the NpcPlugin with the engine (so NPCs get a turn phase)
  //   2. Register each behavior with the NPC service (so NPCs know what to do)
  //
  // Without step 1, NPC behaviors never fire.
  // Without step 2, NPCs with a behaviorId have no behavior to execute.

  onEngineReady(engine: GameEngine): void {
    // Step 1: Create and register the NPC plugin.
    //
    // NpcPlugin is a TurnPlugin — it hooks into the engine's turn cycle.
    // After the player's action executes, the NPC plugin runs, calling
    // onTurn() on every registered NPC behavior.
    const npcPlugin = new NpcPlugin();
    engine.getPluginRegistry().register(npcPlugin);

    // Step 2: Get the NPC service from the plugin.
    //
    // The NPC service manages behavior registration and NPC turn execution.
    // It's the bridge between the plugin and your behavior objects.
    const npcService = npcPlugin.getNpcService();

    // Step 3: Register the zookeeper's patrol behavior.
    //
    // createPatrolBehavior() is a built-in factory. You give it:
    //   route: an array of room IDs to visit in order
    //   loop: true means go A→B→C→A→B→C...; false means A→B→C→B→A (ping-pong)
    //   waitTurns: how many turns to wait at each waypoint before moving on
    //
    // The patrol behavior automatically finds the exit to the next waypoint
    // and moves the NPC there. If there's no direct exit (rooms aren't
    // connected), the NPC stays put until a path opens.
    const keeperPatrol = createPatrolBehavior({
      route: [
        this.roomIds.mainPath,
        this.roomIds.pettingZoo,
        this.roomIds.aviary,
      ],
      loop: true,      // Main Path → Petting Zoo → Aviary → Main Path → ...
      waitTurns: 1,    // Wait 1 turn at each stop before moving on
    });

    // IMPORTANT: Override the default id ('patrol') with the one that
    // matches the zookeeper's NpcTrait.behaviorId.
    keeperPatrol.id = 'zoo-keeper-patrol';

    npcService.registerBehavior(keeperPatrol);

    // Step 4: Register the parrot's custom behavior.
    //
    // Since parrotBehavior is defined above with id: 'zoo-parrot',
    // it already matches the parrot's NpcTrait.behaviorId.
    npcService.registerBehavior(parrotBehavior);
  }
}


// ============================================================================
// EXPORTS
// ============================================================================

export const story = new FamilyZooStory();
export default story;
