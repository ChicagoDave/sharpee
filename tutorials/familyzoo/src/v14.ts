/**
 * Family Zoo Tutorial — Version 14: Capability Dispatch
 *
 * NEW IN THIS VERSION:
 *   - Capability dispatch (ADR-090) — one verb, different behavior per entity
 *   - Custom traits with capabilities[] — declaring what an entity can do
 *   - registerCapabilityBehavior() — registering what happens when you do it
 *   - CapabilityBehavior interface — validate/execute/report/blocked
 *
 * WHAT YOU'LL LEARN:
 *   - Some verbs mean different things for different entities
 *   - "pet goats" (affectionate) vs "pet parrot" (bites!) vs "pet snake" (glass blocks)
 *   - The entity decides how to respond, not the action
 *   - This is the most powerful pattern for entity-specific behavior
 *
 * TRY IT:
 *   > south / east                  (go to petting zoo)
 *   > pet goats                     (they love it)
 *   > pet rabbits                   (they're fuzzy)
 *   > west / west                   (go to aviary)
 *   > pet parrot                    (ouch!)
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
  // --- Capability Dispatch types (NEW in V14) ---
  CapabilityBehavior,             // Interface for capability behaviors
  CapabilityValidationResult,     // What validate() returns
  CapabilitySharedData,           // Shared state between phases
  CapabilityEffect,               // What report/blocked return
  createEffect,                   // Helper to build effects
  registerCapabilityBehavior,     // Register behavior for trait+capability
  hasCapabilityBehavior,          // Check if already registered
  findTraitWithCapability,        // Find trait on entity claiming a capability
  getBehaviorForCapability,       // Get behavior registered for trait+capability
  ITrait,                         // Base trait interface
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
  NpcBehavior, NpcContext, NpcAction, createPatrolBehavior,
  Action, ActionContext, ValidationResult,
} from '@sharpee/stdlib';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';


// ============================================================================
// STORY CONFIGURATION
// ============================================================================

const config: StoryConfig = {
  id: 'familyzoo',
  title: 'Family Zoo',
  author: 'Sharpee Tutorial',
  version: '0.14.0',
  description: 'A small family zoo — learn Sharpee one concept at a time.',
};


// ============================================================================
// CUSTOM TRAIT: PettableTrait — NEW IN V14
// ============================================================================
//
// A custom trait declares that an entity supports certain capabilities.
// The 'capabilities' array lists which action IDs this trait responds to.
//
// When the action fires, the engine:
//   1. Finds the trait on the target entity that claims the capability
//   2. Looks up the registered behavior for that trait + capability
//   3. Calls the behavior's validate/execute/report/blocked phases
//
// This way, different entities can have different PettableTrait instances
// with different registered behaviors, all responding to the same "pet" verb.

/**
 * PettableTrait — marks an entity as pettable.
 *
 * Each entity with this trait gets a behavior registered for it.
 * The behavior defines what happens when you pet that specific entity.
 */
class PettableTrait implements ITrait {
  // The type string must be unique across all traits in the game.
  static readonly type = 'zoo.trait.pettable' as const;

  // Capabilities: which action IDs this trait responds to.
  // 'zoo.action.petting' is our custom action created below.
  static readonly capabilities = ['zoo.action.petting'] as const;

  // Every trait instance must have a runtime 'type' property.
  readonly type = PettableTrait.type;

  // Custom data — what kind of animal this is (for choosing response)
  readonly animalKind: 'goats' | 'rabbits' | 'parrot' | 'snake';

  constructor(kind: 'goats' | 'rabbits' | 'parrot' | 'snake') {
    this.animalKind = kind;
  }
}


// ============================================================================
// CAPABILITY BEHAVIORS — NEW IN V14
// ============================================================================
//
// A CapabilityBehavior implements the four-phase pattern for a specific
// trait + capability combination. Each phase receives:
//   entity     — the target entity being acted upon
//   world      — the world model (for mutations)
//   actorId    — who is performing the action
//   sharedData — object for passing data between phases
//
// The report() and blocked() methods return CapabilityEffect[] —
// arrays of { type, payload } objects that become semantic events.

// Message IDs for petting responses
const PetMessages = {
  PET_GOATS: 'zoo.petting.goats',
  PET_RABBITS: 'zoo.petting.rabbits',
  PET_PARROT: 'zoo.petting.parrot',
  PET_SNAKE: 'zoo.petting.snake_glass',
  CANT_PET: 'zoo.petting.cant_pet',
} as const;

/**
 * Unified petting behavior — dispatches by animalKind.
 *
 * The capability registry only allows ONE behavior per trait type + capability.
 * So we write ONE behavior that checks PettableTrait.animalKind to decide
 * what message to show. This is the standard pattern when the same trait
 * type appears on multiple entities with different semantics.
 */
const pettingBehavior: CapabilityBehavior = {
  validate(
    _entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    _sharedData: CapabilitySharedData,
  ): CapabilityValidationResult {
    // All pettable animals accept being petted (validation always passes)
    return { valid: true };
  },

  execute(
    _entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    _sharedData: CapabilitySharedData,
  ): void {
    // No world mutation — petting is cosmetic
  },

  report(
    entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    _sharedData: CapabilitySharedData,
  ): CapabilityEffect[] {
    // Dispatch by animalKind — each animal gets a different message
    const pettable = entity.get(PettableTrait);
    let messageId: string = PetMessages.CANT_PET;

    switch (pettable?.animalKind) {
      case 'goats':   messageId = PetMessages.PET_GOATS; break;
      case 'rabbits': messageId = PetMessages.PET_RABBITS; break;
      case 'parrot':  messageId = PetMessages.PET_PARROT; break;
    }

    return [
      createEffect('action.success', {
        actionId: PETTING_ACTION_ID,
        messageId,
        params: { target: entity.name },
      }),
    ];
  },

  blocked(
    entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    error: string,
    _sharedData: CapabilitySharedData,
  ): CapabilityEffect[] {
    return [
      createEffect('action.blocked', {
        actionId: PETTING_ACTION_ID,
        messageId: error,
        params: { target: entity.name },
      }),
    ];
  },
};


// ============================================================================
// PETTING ACTION — manual dispatch action
// ============================================================================
//
// The petting action uses capability dispatch:
//   1. Find the PettableTrait on the target entity
//   2. Look up the registered behavior for that trait + capability
//   3. Delegate to the behavior's phases
//
// This is a manual version of what createCapabilityDispatchAction() does
// in the stdlib. We write it out so you can see exactly how it works.

const PETTING_ACTION_ID = 'zoo.action.petting';

const pettingAction: Action = {
  id: PETTING_ACTION_ID,
  group: 'interaction',

  validate(context: ActionContext): ValidationResult {
    const entity = context.command.directObject?.entity;

    // Must have a target
    if (!entity) {
      return { valid: false, error: PetMessages.CANT_PET };
    }

    // Find the trait that claims this capability
    const trait = findTraitWithCapability(entity, PETTING_ACTION_ID);
    if (!trait) {
      // Target doesn't have PettableTrait — can't pet it
      return { valid: false, error: PetMessages.CANT_PET };
    }

    // Get the registered behavior
    const behavior = getBehaviorForCapability(trait, PETTING_ACTION_ID);
    if (!behavior) {
      return { valid: false, error: PetMessages.CANT_PET };
    }

    // Create shared data for passing between phases
    const sharedData: CapabilitySharedData = {};

    // Delegate validation to the behavior
    const behaviorResult = behavior.validate(entity, context.world, context.player.id, sharedData);
    if (!behaviorResult.valid) {
      return { valid: false, error: behaviorResult.error };
    }

    // Store everything for execute/report
    context.sharedData.capEntity = entity;
    context.sharedData.capBehavior = behavior;
    context.sharedData.capSharedData = sharedData;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const entity = context.sharedData.capEntity as IFEntity;
    const behavior = context.sharedData.capBehavior as CapabilityBehavior;
    const sharedData = context.sharedData.capSharedData as CapabilitySharedData;
    if (entity && behavior) {
      behavior.execute(entity, context.world, context.player.id, sharedData);
    }
  },

  report(context: ActionContext): ISemanticEvent[] {
    const entity = context.sharedData.capEntity as IFEntity;
    const behavior = context.sharedData.capBehavior as CapabilityBehavior;
    const sharedData = context.sharedData.capSharedData as CapabilitySharedData;
    if (!entity || !behavior) return [];

    // Get effects from the behavior
    const effects = behavior.report(entity, context.world, context.player.id, sharedData);
    // Convert CapabilityEffect[] to ISemanticEvent[]
    return effects.map(effect => context.event(effect.type, effect.payload));
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [
      context.event('action.blocked', {
        messageId: result.error || PetMessages.CANT_PET,
      }),
    ];
  },
};


// ============================================================================
// CUSTOM ACTIONS FROM V13 (carried forward)
// ============================================================================

const FEED_ACTION_ID = 'zoo.action.feeding';
const FeedMessages = {
  NO_FEED: 'zoo.feeding.no_feed', NOT_AN_ANIMAL: 'zoo.feeding.not_animal',
  ALREADY_FED: 'zoo.feeding.already_fed', FED_GOATS: 'zoo.feeding.fed_goats',
  FED_RABBITS: 'zoo.feeding.fed_rabbits', FED_GENERIC: 'zoo.feeding.fed_generic',
} as const;

const feedAction: Action = {
  id: FEED_ACTION_ID, group: 'interaction',
  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity;
    const inventory = context.world.getContents(context.player.id);
    const hasFeed = inventory.some(i => i.get(IdentityTrait)?.aliases?.includes('feed'));
    if (!hasFeed) return { valid: false, error: FeedMessages.NO_FEED };
    if (!target) return { valid: false, error: FeedMessages.NOT_AN_ANIMAL };
    const name = target.get(IdentityTrait)?.name?.toLowerCase() || '';
    if (!['pygmy goats', 'rabbits'].some(a => name.includes(a))) return { valid: false, error: FeedMessages.NOT_AN_ANIMAL };
    if (context.world.getStateValue(`fed-${target.id}`)) return { valid: false, error: FeedMessages.ALREADY_FED };
    context.sharedData.feedTarget = target;
    return { valid: true };
  },
  execute(context: ActionContext): void {
    const target = context.sharedData.feedTarget as IFEntity;
    if (target) context.world.setStateValue(`fed-${target.id}`, true);
  },
  report(context: ActionContext): ISemanticEvent[] {
    const target = context.sharedData.feedTarget as IFEntity;
    const name = target?.get(IdentityTrait)?.name?.toLowerCase() || '';
    let messageId: string = FeedMessages.FED_GENERIC;
    if (name.includes('goats')) messageId = FeedMessages.FED_GOATS;
    else if (name.includes('rabbits')) messageId = FeedMessages.FED_RABBITS;
    return [context.event('action.success', { messageId, params: { animal: target?.get(IdentityTrait)?.name } })];
  },
  blocked(_context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [_context.event('action.blocked', { messageId: result.error || FeedMessages.NOT_AN_ANIMAL })];
  },
};

const PHOTOGRAPH_ACTION_ID = 'zoo.action.photographing';
const PhotoMessages = { NO_CAMERA: 'zoo.photo.no_camera', TOOK_PHOTO: 'zoo.photo.took_photo' } as const;

const photographAction: Action = {
  id: PHOTOGRAPH_ACTION_ID, group: 'interaction',
  validate(context: ActionContext): ValidationResult {
    const inventory = context.world.getContents(context.player.id);
    const hasCamera = inventory.some(i => i.get(IdentityTrait)?.aliases?.includes('camera'));
    if (!hasCamera) return { valid: false, error: PhotoMessages.NO_CAMERA };
    const target = context.command.directObject?.entity;
    if (target) context.sharedData.photoTarget = target;
    return { valid: true };
  },
  execute(): void {},
  report(context: ActionContext): ISemanticEvent[] {
    const target = context.sharedData.photoTarget as IFEntity | undefined;
    const name = target?.get(IdentityTrait)?.name || 'the scenery';
    return [context.event('action.success', { messageId: PhotoMessages.TOOK_PHOTO, params: { target: name } })];
  },
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', { messageId: result.error || PhotoMessages.NO_CAMERA })];
  },
};


// ============================================================================
// PARROT BEHAVIOR (from V11)
// ============================================================================

const PARROT_PHRASES = ['Polly wants a cracker!', 'SQUAWK! Pretty bird! Pretty bird!', 'Pieces of eight! Pieces of eight!', 'Who\'s a good bird? WHO\'S A GOOD BIRD?', 'BAWK! Welcome to the zoo!'];

const parrotBehavior: NpcBehavior = {
  id: 'zoo-parrot', name: 'Parrot Behavior',
  onTurn(context: NpcContext): NpcAction[] {
    if (!context.playerVisible) return [];
    if (context.random.chance(0.5)) return [{ type: 'speak', messageId: 'npc.speech', data: { npcName: 'parrot', text: context.random.pick(PARROT_PHRASES) } }];
    return [];
  },
  onPlayerEnters(): NpcAction[] {
    return [{ type: 'emote', messageId: 'npc.emote', data: { npcName: 'parrot', text: 'The parrot ruffles its feathers and eyes you with interest.' } }];
  },
};


// ============================================================================
// THE STORY CLASS
// ============================================================================

class FamilyZooStory implements Story {
  config = config;
  private roomIds = { entrance: '', mainPath: '', pettingZoo: '', aviary: '', supplyRoom: '', nocturnalExhibit: '', giftShop: '' };
  private entityIds = { animalFeed: '', penny: '', souvenirPress: '' };

  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new IdentityTrait({ name: 'yourself', description: 'Just an ordinary visitor to the zoo.', aliases: ['self', 'myself', 'me'], properName: true, article: '' }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
    return player;
  }

  initializeWorld(world: WorldModel): void {

    // ROOMS
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

    this.roomIds = { entrance: entrance.id, mainPath: mainPath.id, pettingZoo: pettingZoo.id, aviary: aviary.id, supplyRoom: supplyRoom.id, nocturnalExhibit: nocturnalExhibit.id, giftShop: giftShop.id };

    // STAFF GATE
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

    // EXITS
    entrance.get(RoomTrait)!.exits = { [Direction.SOUTH]: { destination: mainPath.id } };
    mainPath.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: entrance.id }, [Direction.EAST]: { destination: pettingZoo.id }, [Direction.WEST]: { destination: aviary.id }, [Direction.SOUTH]: { destination: supplyRoom.id, via: staffGate.id } };
    pettingZoo.get(RoomTrait)!.exits = { [Direction.WEST]: { destination: mainPath.id } };
    aviary.get(RoomTrait)!.exits = { [Direction.EAST]: { destination: mainPath.id }, [Direction.WEST]: { destination: giftShop.id } };
    supplyRoom.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: mainPath.id, via: staffGate.id }, [Direction.SOUTH]: { destination: nocturnalExhibit.id } };
    nocturnalExhibit.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: supplyRoom.id } };
    giftShop.get(RoomTrait)!.exits = { [Direction.EAST]: { destination: aviary.id } };

    // SCENERY — abbreviated
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

    // Additional scenery with special traits (readable, switchable)
    const corkBoard = world.createEntity('cork board', EntityType.SCENERY);
    corkBoard.add(new IdentityTrait({ name: 'cork board', description: 'A cork board with staff schedules. A note in red marker: "DON\'T FORGET: nocturnal exhibit lights need new batteries!"', aliases: ['cork board', 'board', 'notices'], properName: false, article: 'a' }));
    corkBoard.add(new SceneryTrait());
    world.moveEntity(corkBoard.id, supplyRoom.id);

    const radio = world.createEntity('radio', EntityType.ITEM);
    radio.add(new IdentityTrait({ name: 'radio', description: 'A battered portable radio held together with duct tape. The antenna is bent at a jaunty angle. A faded sticker on the side reads "ZOO FM — All Animals, All The Time."', aliases: ['radio', 'portable radio'], properName: false, article: 'a' }));
    radio.add(new SwitchableTrait({ isOn: false }));
    radio.add(new SceneryTrait());
    world.moveEntity(radio.id, supplyRoom.id);

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

    // PETTABLE ANIMALS — NEW IN V14
    //
    // These scenery entities also get PettableTrait, which declares
    // that they respond to the 'zoo.action.petting' capability.
    // Each gets a different behavior registered below.

    const goats = world.createEntity('pygmy goats', EntityType.SCENERY);
    goats.add(new IdentityTrait({ name: 'pygmy goats', description: 'Three pygmy goats hoping you have food.', aliases: ['goats', 'pygmy goats', 'goat'], properName: false, article: 'some' }));
    goats.add(new SceneryTrait());
    goats.add(new PettableTrait('goats'));  // ← PettableTrait with 'goats' kind
    world.moveEntity(goats.id, pettingZoo.id);

    const rabbits = world.createEntity('rabbits', EntityType.SCENERY);
    rabbits.add(new IdentityTrait({ name: 'rabbits', description: 'A pair of Holland Lop rabbits with floppy ears.', aliases: ['rabbits', 'rabbit', 'bunnies'], properName: false, article: 'some' }));
    rabbits.add(new SceneryTrait());
    rabbits.add(new PettableTrait('rabbits'));  // ← PettableTrait with 'rabbits' kind
    world.moveEntity(rabbits.id, pettingZoo.id);

    const parrots = world.createEntity('parrots', EntityType.SCENERY);
    parrots.add(new IdentityTrait({ name: 'parrots', description: 'A raucous flock of scarlet macaws and grey African parrots.', aliases: ['parrots', 'macaws', 'birds'], properName: false, article: 'some' }));
    parrots.add(new SceneryTrait());
    world.moveEntity(parrots.id, aviary.id);

    // PORTABLE OBJECTS
    const zooMap = world.createEntity('zoo map', EntityType.ITEM);
    zooMap.add(new IdentityTrait({ name: 'zoo map', description: 'A colorful folding map of the Willowbrook Family Zoo.', aliases: ['map', 'zoo map', 'folding map'], properName: false, article: 'a' }));
    world.moveEntity(zooMap.id, entrance.id);

    const animalFeed = world.createEntity('bag of animal feed', EntityType.ITEM);
    animalFeed.add(new IdentityTrait({ name: 'bag of animal feed', description: 'A small brown paper bag filled with dried corn and pellets.', aliases: ['feed', 'animal feed', 'bag of feed', 'corn'], properName: false, article: 'a' }));
    world.moveEntity(animalFeed.id, pettingZoo.id);

    const penny = world.createEntity('souvenir penny', EntityType.ITEM);
    penny.add(new IdentityTrait({ name: 'souvenir penny', description: 'A shiny copper penny.', aliases: ['penny', 'souvenir penny', 'coin'], properName: false, article: 'a' }));
    world.moveEntity(penny.id, mainPath.id);

    const flashlight = world.createEntity('flashlight', EntityType.ITEM);
    flashlight.add(new IdentityTrait({ name: 'flashlight', description: 'A heavy-duty yellow flashlight.', aliases: ['flashlight', 'torch', 'light', 'lamp'], properName: false, article: 'a' }));
    flashlight.add(new SwitchableTrait({ isOn: false }));
    flashlight.add(new LightSourceTrait({ brightness: 8, isLit: false }));
    world.moveEntity(flashlight.id, supplyRoom.id);

    const camera = world.createEntity('disposable camera', EntityType.ITEM);
    camera.add(new IdentityTrait({ name: 'disposable camera', description: 'A cheap yellow disposable camera with "ZOO MEMORIES" printed on the side.', aliases: ['camera', 'disposable camera'], properName: false, article: 'a' }));
    world.moveEntity(camera.id, giftShop.id);

    this.entityIds = { animalFeed: animalFeed.id, penny: penny.id, souvenirPress: '' };

    // CONTAINERS
    const backpack = world.createEntity('backpack', EntityType.CONTAINER);
    backpack.add(new IdentityTrait({ name: 'backpack', description: 'A small red canvas backpack.', aliases: ['backpack', 'rucksack', 'pack'], properName: false, article: 'a' }));
    backpack.add(new ContainerTrait({ capacity: { maxItems: 5 } }));
    world.moveEntity(backpack.id, entrance.id);

    const parkBench = world.createEntity('park bench', EntityType.SUPPORTER);
    parkBench.add(new IdentityTrait({ name: 'park bench', description: 'A sturdy park bench painted forest green.', aliases: ['bench', 'park bench', 'benches', 'seat'], properName: false, article: 'a' }));
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
    souvenirPress.add(new IdentityTrait({ name: 'souvenir press', description: 'A heavy cast-iron machine with a big crank handle. A slot on top accepts pennies, and the mechanism stamps them with a zoo animal design. A sign reads: "INSERT PENNY, TURN HANDLE, KEEP FOREVER!"', aliases: ['press', 'souvenir press', 'penny press', 'machine'], properName: false, article: 'a' }));
    souvenirPress.add(new ContainerTrait({ capacity: { maxItems: 1 } }));
    souvenirPress.add(new SceneryTrait());
    world.moveEntity(souvenirPress.id, giftShop.id);
    this.entityIds.souvenirPress = souvenirPress.id;

    // NPCs
    const zookeeper = world.createEntity('zookeeper', EntityType.ACTOR);
    zookeeper.add(new IdentityTrait({ name: 'zookeeper', description: 'A friendly zookeeper in khaki overalls. A name tag reads "Sam."', aliases: ['keeper', 'zookeeper', 'sam'], properName: false, article: 'a' }));
    zookeeper.add(new ActorTrait({ isPlayer: false }));
    zookeeper.add(new NpcTrait({ behaviorId: 'zoo-keeper-patrol', canMove: true, isAlive: true, isConscious: true }));
    world.moveEntity(zookeeper.id, mainPath.id);

    // The parrot NPC also gets PettableTrait so "pet parrot" works via capability dispatch
    const parrot = world.createEntity('parrot', EntityType.ACTOR);
    parrot.add(new IdentityTrait({ name: 'parrot', description: 'A magnificent scarlet macaw perched on a rope. It tilts its head and watches you with one bright eye.', aliases: ['parrot', 'macaw', 'scarlet macaw'], properName: false, article: 'a' }));
    parrot.add(new ActorTrait({ isPlayer: false }));
    parrot.add(new NpcTrait({ behaviorId: 'zoo-parrot', canMove: false, isAlive: true, isConscious: true }));
    parrot.add(new PettableTrait('parrot'));  // ← Parrot is also pettable!
    world.moveEntity(parrot.id, aviary.id);

    // ========================================================================
    // REGISTER CAPABILITY BEHAVIOR — NEW IN V14
    // ========================================================================
    //
    // registerCapabilityBehavior(traitType, actionId, behavior) tells the
    // engine: "when someone does actionId on an entity with this trait,
    // use this behavior."
    //
    // The registry allows ONE behavior per trait type + capability.
    // Our unified pettingBehavior dispatches internally by animalKind.

    if (!hasCapabilityBehavior(PettableTrait.type, PETTING_ACTION_ID)) {
      registerCapabilityBehavior(
        PettableTrait.type,
        PETTING_ACTION_ID,
        pettingBehavior,
      );
    }

    // PLAYER STARTING LOCATION
    const player = world.getPlayer();
    if (player) world.moveEntity(player.id, entrance.id);
  }


  getCustomActions(): any[] {
    // Return all custom actions — both from V13 and V14
    return [feedAction, photographAction, pettingAction];
  }


  extendParser(parser: Parser): void {
    const grammar = parser.getStoryGrammar();

    // V13 grammar
    grammar.define('feed :thing').mapsTo(FEED_ACTION_ID).withPriority(150).build();
    grammar.define('photograph :thing').mapsTo(PHOTOGRAPH_ACTION_ID).withPriority(150).build();
    grammar.define('photo :thing').mapsTo(PHOTOGRAPH_ACTION_ID).withPriority(150).build();
    grammar.define('snap :thing').mapsTo(PHOTOGRAPH_ACTION_ID).withPriority(150).build();

    // V14 grammar — "pet" maps to the petting action
    grammar.define('pet :thing').mapsTo(PETTING_ACTION_ID).withPriority(150).build();
    grammar.define('stroke :thing').mapsTo(PETTING_ACTION_ID).withPriority(150).build();
  }


  extendLanguage(language: LanguageProvider): void {
    // V13 messages
    language.addMessage(FeedMessages.NO_FEED, "You don't have any animal feed.");
    language.addMessage(FeedMessages.NOT_AN_ANIMAL, "That's not something you can feed.");
    language.addMessage(FeedMessages.ALREADY_FED, "You've already fed them. They look contentedly full.");
    language.addMessage(FeedMessages.FED_GOATS, 'You scatter some feed on the ground. The pygmy goats rush over, bleating excitedly, and devour the corn and pellets in seconds. The smallest goat looks up at you with big grateful eyes.');
    language.addMessage(FeedMessages.FED_RABBITS, 'You sprinkle some pellets near the rabbits. Biscuit and Marmalade hop over cautiously, then munch away happily.');
    language.addMessage(FeedMessages.FED_GENERIC, 'You offer some feed. The animal eats it gratefully.');
    language.addMessage(PhotoMessages.NO_CAMERA, "You don't have a camera. There's one in the gift shop.");
    language.addMessage(PhotoMessages.TOOK_PHOTO, 'Click! You snap a photo of {target}. That one\'s going on the fridge.');

    // V14 messages — petting responses
    language.addMessage(PetMessages.PET_GOATS,
      'You reach down and pet the nearest goat. It leans into your hand and bleats happily. The others crowd around, demanding equal attention.');
    language.addMessage(PetMessages.PET_RABBITS,
      'You gently stroke one of the rabbits. Its fur is incredibly soft. It twitches its nose at you contentedly.');
    language.addMessage(PetMessages.PET_PARROT,
      'You reach toward the parrot. CHOMP! It nips your finger with its beak. "NO TOUCHING!" it squawks indignantly.');
    language.addMessage(PetMessages.CANT_PET,
      "You can't pet that.");
  }


  onEngineReady(engine: GameEngine): void {
    const world = engine.getWorld();

    // NPC Plugin
    const npcPlugin = new NpcPlugin();
    engine.getPluginRegistry().register(npcPlugin);
    const npcService = npcPlugin.getNpcService();
    const keeperPatrol = createPatrolBehavior({ route: [this.roomIds.mainPath, this.roomIds.pettingZoo, this.roomIds.aviary], loop: true, waitTurns: 1 });
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
      return { id: `zoo-goats-${Date.now()}`, type: 'zoo.event.goats_react', timestamp: Date.now(), entities: {}, data: { text: 'The pygmy goats spot the bag of feed and rush over! They crowd around, bleating excitedly, and devour the corn and pellets in seconds. The smallest goat looks up at you with big grateful eyes.' } };
    }, { key: 'zoo.chain.goats-eat-feed' });

    const pennyId = this.entityIds.penny;
    const pressId = this.entityIds.souvenirPress;
    world.chainEvent('if.event.put_in', (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null => {
      const data = event.data as Record<string, any>;
      if (data.itemId !== pennyId || data.targetId !== pressId) return null;
      w.removeEntity(pennyId);
      const pp = w.createEntity('pressed penny', EntityType.ITEM);
      pp.add(new IdentityTrait({ name: 'pressed penny', description: 'A flattened oval of copper with an embossed toucan.', aliases: ['pressed penny', 'pressed coin', 'souvenir'], properName: false, article: 'a' }));
      const player = w.getPlayer();
      if (player) w.moveEntity(pp.id, player.id);
      return { id: `zoo-press-${Date.now()}`, type: 'zoo.event.penny_pressed', timestamp: Date.now(), entities: {}, data: { text: 'CLUNK! CRUNCH! WHIRRR! The souvenir press produces a beautiful pressed penny with an embossed toucan.' } };
    }, { key: 'zoo.chain.penny-press' });
  }
}

export const story = new FamilyZooStory();
export default story;
