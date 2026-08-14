/**
 * Family Zoo Tutorial — Version 13: Custom Actions
 *
 * NEW IN THIS VERSION:
 *   - Story-specific actions — new verbs that don't exist in stdlib
 *   - The Action interface — validate / execute / report / blocked
 *   - Grammar extension via extendParser() — teaching the parser new verbs
 *   - Language extension via extendLanguage() — registering message text
 *   - getCustomActions() — telling the engine about your actions
 *   - A disposable camera item in the gift shop
 *
 * WHAT YOU'LL LEARN:
 *   - Custom actions let you add any verb to your game
 *   - Actions follow the four-phase pattern: validate → execute → report → blocked
 *   - Grammar patterns teach the parser to recognize your new verbs
 *   - Message IDs let you define the text the player sees
 *
 * TRY IT:
 *   > south / east                   (go to petting zoo)
 *   > take feed                      (pick up the feed)
 *   > feed goats                     (feed the goats!)
 *   > feed goats                     (already fed — blocked)
 *   > west / west / west             (go to gift shop)
 *   > take camera                    (pick up the camera)
 *   > photograph postcards           (take a photo)
 *   > east                           (go to aviary)
 *   > photograph toucan              (take another photo)
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
  IWorldModel,
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
import { ISemanticEvent } from '@sharpee/core';
import { NpcPlugin } from '@sharpee/plugin-npc';
import {
  NpcBehavior,
  NpcContext,
  NpcAction,
  createPatrolBehavior,
  // --- Custom Action types (NEW in V13) ---
  Action,           // The interface your action must implement
  ActionContext,    // Context passed to each action phase
  ValidationResult, // What validate() returns
} from '@sharpee/stdlib';

// Parser type — needed for extendParser()
import type { Parser } from '@sharpee/parser-en-us';

// LanguageProvider type — needed for extendLanguage()
import type { LanguageProvider } from '@sharpee/lang-en-us';


// ============================================================================
// STORY CONFIGURATION
// ============================================================================

const config: StoryConfig = {
  id: 'familyzoo',
  title: 'Family Zoo',
  author: 'Sharpee Tutorial',
  version: '0.13.0',
  description: 'A small family zoo — learn Sharpee one concept at a time.',
};


// ============================================================================
// CUSTOM ACTION: FEED — NEW IN V13
// ============================================================================
//
// A custom action is any new verb the player can type.
// It must implement the Action interface with four phases:
//
//   validate(context) — can the action proceed? Returns { valid, error }
//   execute(context)  — do the mutation (change world state)
//   report(context)   — return events describing what happened (for text output)
//   blocked(context)  — return events explaining why it failed
//
// The engine calls these in order:
//   1. validate() — if invalid, skip to blocked()
//   2. execute()  — mutate the world
//   3. report()   — generate success events
//   (or)
//   1. validate() — if invalid...
//   4. blocked()  — generate failure events

// Action ID — this must match the grammar's mapsTo() call.
const FEED_ACTION_ID = 'zoo.action.feeding';

// Message IDs — these are looked up in the language provider.
const FeedMessages = {
  NO_FEED: 'zoo.feeding.no_feed',
  NOT_AN_ANIMAL: 'zoo.feeding.not_animal',
  ALREADY_FED: 'zoo.feeding.already_fed',
  FED_GOATS: 'zoo.feeding.fed_goats',
  FED_RABBITS: 'zoo.feeding.fed_rabbits',
  FED_GENERIC: 'zoo.feeding.fed_generic',
} as const;

/**
 * The feed action — "feed goats", "feed rabbits", etc.
 *
 * Validates that:
 *   - The player is carrying animal feed
 *   - The target is a scenery animal (goats, rabbits)
 *   - The animal hasn't been fed already
 *
 * Executes:
 *   - Sets a "fed" flag on the target entity
 *
 * Reports:
 *   - A custom message based on which animal was fed
 */
const feedAction: Action = {
  id: FEED_ACTION_ID,
  group: 'interaction',

  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity;

    // Check the player is carrying the feed
    const player = context.player;
    const inventory = context.world.getContents(player.id);
    const hasFeed = inventory.some(item => {
      const identity = item.get(IdentityTrait);
      return identity?.aliases?.includes('feed');
    });

    if (!hasFeed) {
      return { valid: false, error: FeedMessages.NO_FEED };
    }

    // Check we have a target animal
    if (!target) {
      return { valid: false, error: FeedMessages.NOT_AN_ANIMAL };
    }

    // Check target is a known feedable animal
    const identity = target.get(IdentityTrait);
    const name = identity?.name?.toLowerCase() || '';
    const feedable = ['pygmy goats', 'rabbits'].some(a => name.includes(a));
    if (!feedable) {
      return { valid: false, error: FeedMessages.NOT_AN_ANIMAL };
    }

    // Check not already fed
    if (context.world.getStateValue(`fed-${target.id}`)) {
      return { valid: false, error: FeedMessages.ALREADY_FED };
    }

    // Store the target for execute/report
    context.sharedData.feedTarget = target;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const target = context.sharedData.feedTarget as IFEntity;
    if (target) {
      // Mark this animal as fed
      context.world.setStateValue(`fed-${target.id}`, true);
    }
  },

  report(context: ActionContext): ISemanticEvent[] {
    const target = context.sharedData.feedTarget as IFEntity;
    const identity = target?.get(IdentityTrait);
    const name = identity?.name?.toLowerCase() || '';

    // Pick a message based on the animal
    let messageId: string = FeedMessages.FED_GENERIC;
    if (name.includes('goats')) messageId = FeedMessages.FED_GOATS;
    else if (name.includes('rabbits')) messageId = FeedMessages.FED_RABBITS;

    return [
      context.event('zoo.event.fed', {
        messageId,
        params: { animal: identity?.name || 'animal' },
      }),
    ];
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [
      context.event('zoo.event.feeding_blocked', {
        messageId: result.error || FeedMessages.NOT_AN_ANIMAL,
      }),
    ];
  },
};


// ============================================================================
// CUSTOM ACTION: PHOTOGRAPH — NEW IN V13
// ============================================================================

const PHOTOGRAPH_ACTION_ID = 'zoo.action.photographing';

const PhotoMessages = {
  NO_CAMERA: 'zoo.photo.no_camera',
  TOOK_PHOTO: 'zoo.photo.took_photo',
} as const;

/**
 * The photograph action — "photograph toucan", "photograph sign", etc.
 *
 * Validates that the player is carrying a camera.
 * On success, reports a fun message about the photo.
 */
const photographAction: Action = {
  id: PHOTOGRAPH_ACTION_ID,
  group: 'interaction',

  validate(context: ActionContext): ValidationResult {
    // Check the player has a camera
    const player = context.player;
    const inventory = context.world.getContents(player.id);
    const hasCamera = inventory.some(item => {
      const identity = item.get(IdentityTrait);
      return identity?.aliases?.includes('camera');
    });

    if (!hasCamera) {
      return { valid: false, error: PhotoMessages.NO_CAMERA };
    }

    // Any target is valid — you can photograph anything
    const target = context.command.directObject?.entity;
    if (target) {
      context.sharedData.photoTarget = target;
    }
    return { valid: true };
  },

  execute(_context: ActionContext): void {
    // No world mutation needed — photographs are cosmetic
  },

  report(context: ActionContext): ISemanticEvent[] {
    const target = context.sharedData.photoTarget as IFEntity | undefined;
    const name = target?.get(IdentityTrait)?.name || 'the scenery';

    return [
      context.event('zoo.event.photographed', {
        messageId: PhotoMessages.TOOK_PHOTO,
        params: { target: name },
      }),
    ];
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [
      context.event('zoo.event.photographing_blocked', {
        messageId: result.error || PhotoMessages.NO_CAMERA,
      }),
    ];
  },
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
    entrance: string; mainPath: string; pettingZoo: string;
    aviary: string; supplyRoom: string; nocturnalExhibit: string; giftShop: string;
  } = { entrance: '', mainPath: '', pettingZoo: '', aviary: '', supplyRoom: '', nocturnalExhibit: '', giftShop: '' };

  private entityIds: {
    animalFeed: string; penny: string; souvenirPress: string;
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
    // ROOMS — same as V12
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

    const giftShop = world.createEntity('Gift Shop', EntityType.ROOM);
    giftShop.add(new RoomTrait({ exits: {}, isDark: false }));
    giftShop.add(new IdentityTrait({ name: 'Gift Shop', description: 'A small zoo gift shop crammed with stuffed animals and postcards. A large souvenir penny press machine stands near the door. A disposable camera sits on the counter. The aviary is back to the east.', aliases: ['gift shop', 'shop', 'store'], properName: false, article: 'the' }));

    this.roomIds = {
      entrance: entrance.id, mainPath: mainPath.id, pettingZoo: pettingZoo.id,
      aviary: aviary.id, supplyRoom: supplyRoom.id,
      nocturnalExhibit: nocturnalExhibit.id, giftShop: giftShop.id,
    };

    // ========================================================================
    // STAFF GATE
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
    // EXITS — same as V12
    // ========================================================================

    entrance.get(RoomTrait)!.exits = { [Direction.SOUTH]: { destination: mainPath.id } };
    mainPath.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: entrance.id }, [Direction.EAST]: { destination: pettingZoo.id }, [Direction.WEST]: { destination: aviary.id }, [Direction.SOUTH]: { destination: supplyRoom.id, via: staffGate.id } };
    pettingZoo.get(RoomTrait)!.exits = { [Direction.WEST]: { destination: mainPath.id } };
    aviary.get(RoomTrait)!.exits = { [Direction.EAST]: { destination: mainPath.id }, [Direction.WEST]: { destination: giftShop.id } };
    supplyRoom.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: mainPath.id, via: staffGate.id }, [Direction.SOUTH]: { destination: nocturnalExhibit.id } };
    nocturnalExhibit.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: supplyRoom.id } };
    giftShop.get(RoomTrait)!.exits = { [Direction.EAST]: { destination: aviary.id } };

    // ========================================================================
    // SCENERY (abbreviated)
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

    const stuffedAnimals = world.createEntity('stuffed animals', EntityType.SCENERY);
    stuffedAnimals.add(new IdentityTrait({ name: 'stuffed animals', description: 'Shelves of plush tigers, pandas, and penguins in various sizes.', aliases: ['stuffed animals', 'plush', 'toys'], properName: false, article: 'some' }));
    stuffedAnimals.add(new SceneryTrait());
    world.moveEntity(stuffedAnimals.id, giftShop.id);

    const postcards = world.createEntity('postcards', EntityType.SCENERY);
    postcards.add(new IdentityTrait({ name: 'postcards', description: 'A spinning rack of postcards showing the zoo\'s greatest hits.', aliases: ['postcards', 'cards', 'postcard rack'], properName: false, article: 'some' }));
    postcards.add(new SceneryTrait());
    world.moveEntity(postcards.id, giftShop.id);

    // ========================================================================
    // READABLE OBJECTS
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
    // SWITCHABLE DEVICES
    // ========================================================================

    const radio = world.createEntity('radio', EntityType.ITEM);
    radio.add(new IdentityTrait({ name: 'radio', description: 'A battered portable radio held together with duct tape.', aliases: ['radio', 'portable radio'], properName: false, article: 'a' }));
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

    // --- Disposable Camera (NEW in V13) ---
    //
    // The camera is needed for the "photograph" action.
    // Without it, "photograph X" is blocked.
    const camera = world.createEntity('disposable camera', EntityType.ITEM);
    camera.add(new IdentityTrait({
      name: 'disposable camera',
      description: 'A cheap yellow disposable camera with "ZOO MEMORIES" printed on the side. It has a few exposures left.',
      aliases: ['camera', 'disposable camera'],
      properName: false,
      article: 'a',
    }));
    world.moveEntity(camera.id, giftShop.id);

    this.entityIds = {
      animalFeed: animalFeed.id,
      penny: penny.id,
      souvenirPress: '',
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

    const souvenirPress = world.createEntity('souvenir press', EntityType.CONTAINER);
    souvenirPress.add(new IdentityTrait({ name: 'souvenir press', description: 'A heavy cast-iron machine with a big crank handle. A slot on top accepts pennies.', aliases: ['press', 'souvenir press', 'penny press', 'machine'], properName: false, article: 'a' }));
    souvenirPress.add(new ContainerTrait({ capacity: { maxItems: 1 } }));
    souvenirPress.add(new SceneryTrait());
    world.moveEntity(souvenirPress.id, giftShop.id);
    this.entityIds.souvenirPress = souvenirPress.id;

    // ========================================================================
    // NPCs
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
  // getCustomActions — NEW IN V13
  // ==========================================================================
  //
  // The engine calls this to discover your story's custom actions.
  // Return an array of Action objects. Each one becomes a verb the
  // player can use.

  getCustomActions(): any[] {
    return [feedAction, photographAction];
  }


  // ==========================================================================
  // extendParser — NEW IN V13
  // ==========================================================================
  //
  // This is where you teach the parser to recognize your new verbs.
  // The grammar builder lets you define patterns like "feed :thing"
  // that map to your action IDs.
  //
  // Pattern syntax:
  //   'verb'           — a bare verb (no arguments)
  //   'verb :slot'     — verb + one argument (entity resolved by parser)
  //   'verb :slot1 prep :slot2' — verb + preposition + two arguments
  //
  // Use withPriority(150+) for story-specific patterns so they
  // take precedence over stdlib defaults.

  extendParser(parser: Parser): void {
    const grammar = parser.getStoryGrammar();

    // "feed <thing>" → zoo.action.feeding
    grammar
      .define('feed :thing')
      .mapsTo(FEED_ACTION_ID)
      .withPriority(150)
      .build();

    // "photograph <thing>" and "photo <thing>" → zoo.action.photographing
    grammar
      .define('photograph :thing')
      .mapsTo(PHOTOGRAPH_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('photo :thing')
      .mapsTo(PHOTOGRAPH_ACTION_ID)
      .withPriority(150)
      .build();

    // "snap :thing" as a fun alias
    grammar
      .define('snap :thing')
      .mapsTo(PHOTOGRAPH_ACTION_ID)
      .withPriority(150)
      .build();
  }


  // ==========================================================================
  // extendLanguage — NEW IN V13
  // ==========================================================================
  //
  // Register the text for your custom message IDs.
  // When an action returns context.event('zoo.event.fed', { messageId: '...' }),
  // the text service looks up the messageId in the language provider.
  //
  // language.addMessage(messageId, text) registers the text.
  // Use {param} for template parameters.

  extendLanguage(language: LanguageProvider): void {
    // Feed action messages
    language.addMessage(FeedMessages.NO_FEED,
      "You don't have any animal feed.");
    language.addMessage(FeedMessages.NOT_AN_ANIMAL,
      "That's not something you can feed.");
    language.addMessage(FeedMessages.ALREADY_FED,
      "You've already fed them. They look contentedly full.");
    language.addMessage(FeedMessages.FED_GOATS,
      'You scatter some feed on the ground. The pygmy goats rush over, bleating excitedly, and devour the corn and pellets in seconds. The smallest goat looks up at you with big grateful eyes.');
    language.addMessage(FeedMessages.FED_RABBITS,
      'You sprinkle some pellets near the rabbits. Biscuit and Marmalade hop over cautiously, then munch away happily, their little noses twitching.');
    language.addMessage(FeedMessages.FED_GENERIC,
      'You offer some feed. The animal eats it gratefully.');

    // Photograph action messages
    language.addMessage(PhotoMessages.NO_CAMERA,
      "You don't have a camera. There's one in the gift shop.");
    language.addMessage(PhotoMessages.TOOK_PHOTO,
      'Click! You snap a photo of {target}. That one\'s going on the fridge.');
  }


  // ==========================================================================
  // onEngineReady — NPC + Event Handlers (from V11/V12)
  // ==========================================================================

  onEngineReady(engine: GameEngine): void {
    const world = engine.getWorld();

    // NPC Plugin
    const npcPlugin = new NpcPlugin();
    engine.getPluginRegistry().register(npcPlugin);
    const npcService = npcPlugin.getNpcService();

    const keeperPatrol = createPatrolBehavior({
      route: [this.roomIds.mainPath, this.roomIds.pettingZoo, this.roomIds.aviary],
      loop: true, waitTurns: 1,
    });
    keeperPatrol.id = 'zoo-keeper-patrol';
    npcService.registerBehavior(keeperPatrol);
    npcService.registerBehavior(parrotBehavior);

    // Event chain handlers (from V12)
    const feedId = this.entityIds.animalFeed;
    const pettingZooId = this.roomIds.pettingZoo;

    world.chainEvent('if.event.dropped', (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null => {
      const data = event.data as Record<string, any>;
      if (data.itemId !== feedId || data.toLocation !== pettingZooId) return null;
      if (w.getStateValue('goats-fed')) return null;
      w.setStateValue('goats-fed', true);
      return {
        id: `zoo-goats-eat-${Date.now()}`, type: 'zoo.event.goats_react',
        timestamp: Date.now(), entities: {},
        data: { text: 'The pygmy goats spot the bag of feed and rush over! They crowd around, bleating excitedly, and devour the corn and pellets in seconds. The smallest goat looks up at you with big grateful eyes.' },
      };
    }, { key: 'zoo.chain.goats-eat-feed' });

    const pennyId = this.entityIds.penny;
    const pressId = this.entityIds.souvenirPress;

    world.chainEvent('if.event.put_in', (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null => {
      const data = event.data as Record<string, any>;
      if (data.itemId !== pennyId || data.targetId !== pressId) return null;
      w.removeEntity(pennyId);
      const pressedPenny = w.createEntity('pressed penny', EntityType.ITEM);
      pressedPenny.add(new IdentityTrait({ name: 'pressed penny', description: 'A flattened oval of copper with an embossed toucan.', aliases: ['pressed penny', 'pressed coin', 'souvenir'], properName: false, article: 'a' }));
      const player = w.getPlayer();
      if (player) w.moveEntity(pressedPenny.id, player.id);
      return {
        id: `zoo-press-${Date.now()}`, type: 'zoo.event.penny_pressed',
        timestamp: Date.now(), entities: {},
        data: { text: 'CLUNK! CRUNCH! WHIRRR! The souvenir press swallows the penny and spits out a beautiful pressed penny with an embossed toucan design. You pocket it proudly.' },
      };
    }, { key: 'zoo.chain.penny-press' });
  }
}


// ============================================================================
// EXPORTS
// ============================================================================

export const story = new FamilyZooStory();
export default story;
