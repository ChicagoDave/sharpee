/**
 * Family Zoo Tutorial — Version 16: Scoring and Endgame
 *
 * NEW IN THIS VERSION:
 *   - world.awardScore() — award points for achievements (idempotent)
 *   - world.setMaxScore() — set the maximum possible score
 *   - world.getScore() — check current score
 *   - Victory daemon — checks for win condition each turn
 *   - Score command — built-in "score" command reports progress
 *
 * WHAT YOU'LL LEARN:
 *   - Points are awarded with unique IDs (prevents double-scoring)
 *   - awardScore() returns true if new, false if already awarded
 *   - A victory daemon watches for the win condition each turn
 *   - The game ends with a congratulatory message when max score is reached
 *
 * SCORING BREAKDOWN (75 points total):
 *   Visit Petting Zoo:     5 pts
 *   Visit Aviary:          5 pts
 *   Visit Gift Shop:       5 pts
 *   Visit Supply Room:     5 pts
 *   Visit Nocturnal Exhibit: 5 pts
 *   Feed the goats:       10 pts
 *   Feed the rabbits:     10 pts
 *   Collect zoo map:       5 pts
 *   Collect pressed penny: 10 pts
 *   Photograph an animal:  5 pts
 *   Pet an animal:         5 pts
 *   Read the brochure:     5 pts
 *
 * TRY IT:
 *   > score                           (check current score)
 *   > south                           (visit main path)
 *   > east                            (visit petting zoo — 5 pts!)
 *   > score                           (score increased)
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
  CapabilityBehavior,
  CapabilityValidationResult,
  CapabilitySharedData,
  CapabilityEffect,
  createEffect,
  registerCapabilityBehavior,
  hasCapabilityBehavior,
  findTraitWithCapability,
  getBehaviorForCapability,
  ITrait,
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
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';
import type { ISchedulerService, Daemon, Fuse, SchedulerContext } from '@sharpee/plugin-scheduler';
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
  version: '1.0.0',
  description: 'A small family zoo — learn Sharpee one concept at a time.',
};


// ============================================================================
// SCORING CONSTANTS — NEW IN V16
// ============================================================================
//
// Define score IDs and point values as constants. The IDs must be unique
// because awardScore() is idempotent — awarding the same ID twice does
// nothing the second time. This prevents double-scoring.

const MAX_SCORE = 75;

const ScoreIds = {
  // Room visits (5 pts each)
  VISIT_PETTING_ZOO: 'zoo.visit.petting_zoo',
  VISIT_AVIARY: 'zoo.visit.aviary',
  VISIT_GIFT_SHOP: 'zoo.visit.gift_shop',
  VISIT_SUPPLY_ROOM: 'zoo.visit.supply_room',
  VISIT_NOCTURNAL: 'zoo.visit.nocturnal',

  // Actions (10 pts each for feeding, 5 pts for others)
  FEED_GOATS: 'zoo.action.fed_goats',
  FEED_RABBITS: 'zoo.action.fed_rabbits',
  COLLECT_MAP: 'zoo.collect.map',
  COLLECT_PRESSED_PENNY: 'zoo.collect.pressed_penny',
  PHOTOGRAPH_ANIMAL: 'zoo.action.photographed',
  PET_ANIMAL: 'zoo.action.petted',
  READ_BROCHURE: 'zoo.action.read_brochure',
} as const;

const ScorePoints: Record<string, number> = {
  [ScoreIds.VISIT_PETTING_ZOO]: 5,
  [ScoreIds.VISIT_AVIARY]: 5,
  [ScoreIds.VISIT_GIFT_SHOP]: 5,
  [ScoreIds.VISIT_SUPPLY_ROOM]: 5,
  [ScoreIds.VISIT_NOCTURNAL]: 5,
  [ScoreIds.FEED_GOATS]: 10,
  [ScoreIds.FEED_RABBITS]: 10,
  [ScoreIds.COLLECT_MAP]: 5,
  [ScoreIds.COLLECT_PRESSED_PENNY]: 10,
  [ScoreIds.PHOTOGRAPH_ANIMAL]: 5,
  [ScoreIds.PET_ANIMAL]: 5,
  [ScoreIds.READ_BROCHURE]: 5,
};

// Score message IDs
const ScoreMessages = {
  VICTORY: 'zoo.victory',
  SCORE_GAINED: 'zoo.score.gained',
} as const;

// Room name → score ID mapping for visit scoring
const ROOM_SCORE_MAP: Record<string, string> = {
  'Petting Zoo': ScoreIds.VISIT_PETTING_ZOO,
  'Aviary': ScoreIds.VISIT_AVIARY,
  'Gift Shop': ScoreIds.VISIT_GIFT_SHOP,
  'Supply Room': ScoreIds.VISIT_SUPPLY_ROOM,
  'Nocturnal Animals Exhibit': ScoreIds.VISIT_NOCTURNAL,
};


// ============================================================================
// CUSTOM TRAIT: PettableTrait (from V14)
// ============================================================================

class PettableTrait implements ITrait {
  static readonly type = 'zoo.trait.pettable' as const;
  static readonly capabilities = ['zoo.action.petting'] as const;
  readonly type = PettableTrait.type;
  readonly animalKind: 'goats' | 'rabbits' | 'parrot' | 'snake';
  constructor(kind: 'goats' | 'rabbits' | 'parrot' | 'snake') {
    this.animalKind = kind;
  }
}


// ============================================================================
// CAPABILITY BEHAVIORS (from V14)
// ============================================================================

const PetMessages = {
  PET_GOATS: 'zoo.petting.goats', PET_RABBITS: 'zoo.petting.rabbits',
  PET_PARROT: 'zoo.petting.parrot', PET_SNAKE: 'zoo.petting.snake_glass',
  CANT_PET: 'zoo.petting.cant_pet',
} as const;

const PETTING_ACTION_ID = 'zoo.action.petting';

const pettingBehavior: CapabilityBehavior = {
  validate(_entity: IFEntity, _world: WorldModel, _actorId: string, _sharedData: CapabilitySharedData): CapabilityValidationResult {
    return { valid: true };
  },
  execute(_entity: IFEntity, world: WorldModel, _actorId: string, _sharedData: CapabilitySharedData): void {
    // --- V16: Award score for petting ---
    world.awardScore(ScoreIds.PET_ANIMAL, ScorePoints[ScoreIds.PET_ANIMAL], 'Petted an animal');
  },
  report(entity: IFEntity, _world: WorldModel, _actorId: string, _sharedData: CapabilitySharedData): CapabilityEffect[] {
    const pettable = entity.get(PettableTrait);
    let messageId: string = PetMessages.CANT_PET;
    switch (pettable?.animalKind) {
      case 'goats':   messageId = PetMessages.PET_GOATS; break;
      case 'rabbits': messageId = PetMessages.PET_RABBITS; break;
      case 'parrot':  messageId = PetMessages.PET_PARROT; break;
    }
    return [createEffect('zoo.event.petted', { messageId, params: { target: entity.name } })];
  },
  blocked(entity: IFEntity, _world: WorldModel, _actorId: string, error: string, _sharedData: CapabilitySharedData): CapabilityEffect[] {
    return [createEffect('zoo.event.petting_blocked', { messageId: error, params: { target: entity.name } })];
  },
};


// ============================================================================
// PETTING ACTION (from V14) — Modified in V16 to award score
// ============================================================================

const pettingAction: Action = {
  id: PETTING_ACTION_ID,
  group: 'interaction',
  validate(context: ActionContext): ValidationResult {
    const entity = context.command.directObject?.entity;
    if (!entity) return { valid: false, error: PetMessages.CANT_PET };
    const trait = findTraitWithCapability(entity, PETTING_ACTION_ID);
    if (!trait) return { valid: false, error: PetMessages.CANT_PET };
    const behavior = getBehaviorForCapability(trait, PETTING_ACTION_ID);
    if (!behavior) return { valid: false, error: PetMessages.CANT_PET };
    const sharedData: CapabilitySharedData = {};
    const behaviorResult = behavior.validate(entity, context.world, context.player.id, sharedData);
    if (!behaviorResult.valid) return { valid: false, error: behaviorResult.error };
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
    const effects = behavior.report(entity, context.world, context.player.id, sharedData);
    return effects.map(effect => context.event(effect.type, effect.payload));
  },
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('zoo.event.petting_blocked', { messageId: result.error || PetMessages.CANT_PET })];
  },
};


// ============================================================================
// CUSTOM ACTIONS FROM V13 (carried forward) — Modified in V16 for scoring
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
    if (target) {
      context.world.setStateValue(`fed-${target.id}`, true);

      // --- NEW IN V16: Award score for feeding ---
      const name = target.get(IdentityTrait)?.name?.toLowerCase() || '';
      if (name.includes('goats')) {
        context.world.awardScore(ScoreIds.FEED_GOATS, ScorePoints[ScoreIds.FEED_GOATS], 'Fed the pygmy goats');
        // Also clear feeding time bleating
        context.world.setStateValue('zoo.feeding_time_active', false);
        context.world.setStateValue('zoo.bleat_turns_remaining', 0);
      } else if (name.includes('rabbits')) {
        context.world.awardScore(ScoreIds.FEED_RABBITS, ScorePoints[ScoreIds.FEED_RABBITS], 'Fed the rabbits');
      }
    }
  },
  report(context: ActionContext): ISemanticEvent[] {
    const target = context.sharedData.feedTarget as IFEntity;
    const name = target?.get(IdentityTrait)?.name?.toLowerCase() || '';
    let messageId: string = FeedMessages.FED_GENERIC;
    if (name.includes('goats')) messageId = FeedMessages.FED_GOATS;
    else if (name.includes('rabbits')) messageId = FeedMessages.FED_RABBITS;
    return [context.event('zoo.event.fed', { messageId, params: { animal: target?.get(IdentityTrait)?.name } })];
  },
  blocked(_context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [_context.event('zoo.event.feeding_blocked', { messageId: result.error || FeedMessages.NOT_AN_ANIMAL })];
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
  execute(context: ActionContext): void {
    // --- NEW IN V16: Award score for photographing ---
    context.world.awardScore(ScoreIds.PHOTOGRAPH_ANIMAL, ScorePoints[ScoreIds.PHOTOGRAPH_ANIMAL], 'Took a photograph');
  },
  report(context: ActionContext): ISemanticEvent[] {
    const target = context.sharedData.photoTarget as IFEntity | undefined;
    const name = target?.get(IdentityTrait)?.name || 'the scenery';
    return [context.event('zoo.event.photographed', { messageId: PhotoMessages.TOOK_PHOTO, params: { target: name } })];
  },
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('zoo.event.photographing_blocked', { messageId: result.error || PhotoMessages.NO_CAMERA })];
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
// TIMED EVENT MESSAGES (from V15)
// ============================================================================

const TimedMessages = {
  PA_CLOSING_3: 'zoo.pa.closing_3',
  PA_CLOSING_2: 'zoo.pa.closing_2',
  PA_CLOSING_1: 'zoo.pa.closing_1',
  PA_CLOSED: 'zoo.pa.closed',
  FEEDING_TIME: 'zoo.feeding_time.announced',
  GOATS_BLEATING: 'zoo.goats.bleating',
} as const;


// ============================================================================
// DAEMONS AND FUSES (from V15)
// ============================================================================

function createPAAnnouncementDaemon(): Daemon {
  let announcementCount = 0;
  return {
    id: 'zoo.daemon.pa_announcements', name: 'Zoo PA Announcements', priority: 5,
    condition: (ctx: SchedulerContext): boolean => ctx.turn > 0 && ctx.turn % 5 === 0 && announcementCount < 4,
    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      announcementCount++;
      let messageId: string;
      switch (announcementCount) {
        case 1: messageId = TimedMessages.PA_CLOSING_3; break;
        case 2: messageId = TimedMessages.PA_CLOSING_2; break;
        case 3: messageId = TimedMessages.PA_CLOSING_1; break;
        default: messageId = TimedMessages.PA_CLOSED; break;
      }
      return [{ id: `zoo-pa-${ctx.turn}`, type: 'game.message', timestamp: Date.now(), entities: {}, data: { messageId }, narrate: true }];
    },
    getRunnerState(): Record<string, unknown> { return { announcementCount }; },
    restoreRunnerState(state: Record<string, unknown>): void { announcementCount = (state.announcementCount as number) ?? 0; },
  };
}

function createFeedingTimeFuse(): Fuse {
  return {
    id: 'zoo.fuse.feeding_time', name: 'Feeding Time', turns: 10,
    repeat: true, originalTurns: 8, priority: 10,
    trigger: (ctx: SchedulerContext): ISemanticEvent[] => {
      ctx.world.setStateValue('zoo.feeding_time_active', true);
      ctx.world.setStateValue('zoo.bleat_turns_remaining', 3);
      return [{ id: `zoo-feeding-${ctx.turn}`, type: 'game.message', timestamp: Date.now(), entities: {}, data: { messageId: TimedMessages.FEEDING_TIME }, narrate: true }];
    },
  };
}

function createGoatBleatingDaemon(): Daemon {
  return {
    id: 'zoo.daemon.goat_bleating', name: 'Goat Bleating', priority: 3,
    condition: (ctx: SchedulerContext): boolean => {
      const feedingActive = ctx.world.getStateValue('zoo.feeding_time_active') as boolean;
      const bleatsLeft = ctx.world.getStateValue('zoo.bleat_turns_remaining') as number;
      return feedingActive === true && (bleatsLeft ?? 0) > 0;
    },
    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      const bleatsLeft = (ctx.world.getStateValue('zoo.bleat_turns_remaining') as number) ?? 0;
      if (bleatsLeft <= 1) {
        ctx.world.setStateValue('zoo.feeding_time_active', false);
        ctx.world.setStateValue('zoo.bleat_turns_remaining', 0);
      } else {
        ctx.world.setStateValue('zoo.bleat_turns_remaining', bleatsLeft - 1);
      }
      const playerRoom = ctx.world.getEntity(ctx.playerLocation);
      const roomName = playerRoom?.get(IdentityTrait)?.name || '';
      if (roomName.includes('Petting Zoo')) {
        return [{ id: `zoo-bleat-${ctx.turn}`, type: 'game.message', timestamp: Date.now(), entities: {}, data: { messageId: TimedMessages.GOATS_BLEATING }, narrate: true }];
      }
      return [];
    },
  };
}


// ============================================================================
// VICTORY DAEMON — NEW IN V16
// ============================================================================
//
// A daemon that checks each turn whether the player has reached the maximum
// score. When they do, it emits a victory message and marks the game as ended.
//
// This is the same pattern used in dungeo's victory handler — a daemon with
// a condition that watches for a specific game state, and a run function
// that triggers the endgame.

function createVictoryDaemon(): Daemon {
  let victoryTriggered = false;

  return {
    id: 'zoo.daemon.victory',
    name: 'Victory Check',
    priority: 100,  // Run last, after all other daemons

    // Only check once, and only after some progress
    condition: (ctx: SchedulerContext): boolean => {
      if (victoryTriggered) return false;
      return ctx.world.getScore() >= MAX_SCORE;
    },

    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      victoryTriggered = true;

      // Mark the game as won
      ctx.world.setStateValue('game.victory', true);
      ctx.world.setStateValue('game.ended', true);

      return [{
        id: `zoo-victory-${ctx.turn}`,
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: { messageId: ScoreMessages.VICTORY },
        narrate: true,
      }];
    },

    getRunnerState(): Record<string, unknown> { return { victoryTriggered }; },
    restoreRunnerState(state: Record<string, unknown>): void { victoryTriggered = (state.victoryTriggered as boolean) ?? false; },
  };
}


// ============================================================================
// THE STORY CLASS
// ============================================================================

class FamilyZooStory implements Story {
  config = config;
  private roomIds = { entrance: '', mainPath: '', pettingZoo: '', aviary: '', supplyRoom: '', nocturnalExhibit: '', giftShop: '' };
  private entityIds = { animalFeed: '', penny: '', souvenirPress: '', brochure: '', zooMap: '' };

  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new IdentityTrait({ name: 'yourself', description: 'Just an ordinary visitor to the zoo.', aliases: ['self', 'myself', 'me'], properName: true, article: '' }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
    return player;
  }

  initializeWorld(world: WorldModel): void {

    // ========================================================================
    // SET MAX SCORE — NEW IN V16
    // ========================================================================
    //
    // This tells the engine what the maximum score is, so the built-in
    // "score" command can show "X out of Y points".
    world.setMaxScore(MAX_SCORE);

    // ROOMS — Same as V15
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

    // SCENERY
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

    // Additional scenery with special traits
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
    this.entityIds.brochure = brochure.id;

    // PETTABLE ANIMALS
    const goats = world.createEntity('pygmy goats', EntityType.SCENERY);
    goats.add(new IdentityTrait({ name: 'pygmy goats', description: 'Three pygmy goats hoping you have food.', aliases: ['goats', 'pygmy goats', 'goat'], properName: false, article: 'some' }));
    goats.add(new SceneryTrait());
    goats.add(new PettableTrait('goats'));
    world.moveEntity(goats.id, pettingZoo.id);

    const rabbits = world.createEntity('rabbits', EntityType.SCENERY);
    rabbits.add(new IdentityTrait({ name: 'rabbits', description: 'A pair of Holland Lop rabbits with floppy ears.', aliases: ['rabbits', 'rabbit', 'bunnies'], properName: false, article: 'some' }));
    rabbits.add(new SceneryTrait());
    rabbits.add(new PettableTrait('rabbits'));
    world.moveEntity(rabbits.id, pettingZoo.id);

    const parrots = world.createEntity('parrots', EntityType.SCENERY);
    parrots.add(new IdentityTrait({ name: 'parrots', description: 'A raucous flock of scarlet macaws and grey African parrots.', aliases: ['parrots', 'macaws', 'birds'], properName: false, article: 'some' }));
    parrots.add(new SceneryTrait());
    world.moveEntity(parrots.id, aviary.id);

    // PORTABLE OBJECTS
    const zooMap = world.createEntity('zoo map', EntityType.ITEM);
    zooMap.add(new IdentityTrait({ name: 'zoo map', description: 'A colorful folding map of the Willowbrook Family Zoo.', aliases: ['map', 'zoo map', 'folding map'], properName: false, article: 'a' }));
    world.moveEntity(zooMap.id, entrance.id);
    this.entityIds.zooMap = zooMap.id;

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

    this.entityIds = { ...this.entityIds, animalFeed: animalFeed.id, penny: penny.id, souvenirPress: '' };

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

    const parrot = world.createEntity('parrot', EntityType.ACTOR);
    parrot.add(new IdentityTrait({ name: 'parrot', description: 'A magnificent scarlet macaw perched on a rope. It tilts its head and watches you with one bright eye.', aliases: ['parrot', 'macaw', 'scarlet macaw'], properName: false, article: 'a' }));
    parrot.add(new ActorTrait({ isPlayer: false }));
    parrot.add(new NpcTrait({ behaviorId: 'zoo-parrot', canMove: false, isAlive: true, isConscious: true }));
    parrot.add(new PettableTrait('parrot'));
    world.moveEntity(parrot.id, aviary.id);

    // REGISTER CAPABILITY BEHAVIOR
    if (!hasCapabilityBehavior(PettableTrait.type, PETTING_ACTION_ID)) {
      registerCapabilityBehavior(PettableTrait.type, PETTING_ACTION_ID, pettingBehavior);
    }

    // PLAYER STARTING LOCATION
    const player = world.getPlayer();
    if (player) world.moveEntity(player.id, entrance.id);
  }


  getCustomActions(): any[] {
    return [feedAction, photographAction, pettingAction];
  }


  extendParser(parser: Parser): void {
    const grammar = parser.getStoryGrammar();
    grammar.define('feed :thing').mapsTo(FEED_ACTION_ID).withPriority(150).build();
    grammar.define('photograph :thing').mapsTo(PHOTOGRAPH_ACTION_ID).withPriority(150).build();
    grammar.define('photo :thing').mapsTo(PHOTOGRAPH_ACTION_ID).withPriority(150).build();
    grammar.define('snap :thing').mapsTo(PHOTOGRAPH_ACTION_ID).withPriority(150).build();
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

    // V14 messages
    language.addMessage(PetMessages.PET_GOATS, 'You reach down and pet the nearest goat. It leans into your hand and bleats happily. The others crowd around, demanding equal attention.');
    language.addMessage(PetMessages.PET_RABBITS, 'You gently stroke one of the rabbits. Its fur is incredibly soft. It twitches its nose at you contentedly.');
    language.addMessage(PetMessages.PET_PARROT, 'You reach toward the parrot. CHOMP! It nips your finger with its beak. "NO TOUCHING!" it squawks indignantly.');
    language.addMessage(PetMessages.CANT_PET, "You can't pet that.");

    // V15 messages — timed events
    language.addMessage(TimedMessages.PA_CLOSING_3, '*DING DONG* "Attention visitors! The Willowbrook Family Zoo will be closing in three hours. Please make sure to visit all exhibits before closing time!"');
    language.addMessage(TimedMessages.PA_CLOSING_2, '*DING DONG* "Attention visitors! Two hours until closing. Don\'t forget to stop by the gift shop for souvenirs!"');
    language.addMessage(TimedMessages.PA_CLOSING_1, '*DING DONG* "Attention visitors! One hour until closing. Please begin making your way toward the exit."');
    language.addMessage(TimedMessages.PA_CLOSED, '*DING DONG* "The Willowbrook Family Zoo is now closed. Thank you for visiting! We hope to see you again soon!"');
    language.addMessage(TimedMessages.FEEDING_TIME, '*DING DONG* "It\'s FEEDING TIME at the Petting Zoo! Come watch our pygmy goats and rabbits enjoy their favorite snacks!"');
    language.addMessage(TimedMessages.GOATS_BLEATING, 'The pygmy goats are bleating loudly and headbutting the fence. They seem very hungry!');

    // ========================================================================
    // V16 MESSAGES — NEW: Victory and scoring
    // ========================================================================

    language.addMessage(ScoreMessages.VICTORY,
      'Congratulations! You\'ve earned your JUNIOR ZOOKEEPER badge! You\'ve visited every exhibit, fed the animals, collected souvenirs, and made memories to last a lifetime. The Willowbrook Family Zoo thanks you for being such an outstanding visitor!\n\n*** You have won ***');
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

    // Scheduler Plugin (from V15)
    const schedulerPlugin = new SchedulerPlugin();
    engine.getPluginRegistry().register(schedulerPlugin);
    const scheduler = schedulerPlugin.getScheduler();
    scheduler.registerDaemon(createPAAnnouncementDaemon());
    scheduler.setFuse(createFeedingTimeFuse());
    scheduler.registerDaemon(createGoatBleatingDaemon());

    // ========================================================================
    // VICTORY DAEMON — NEW IN V16
    // ========================================================================
    //
    // Register a daemon that checks for the win condition each turn.
    // When the player reaches MAX_SCORE, the daemon triggers the ending.
    scheduler.registerDaemon(createVictoryDaemon());

    // ========================================================================
    // ROOM VISIT SCORING — NEW IN V16
    // ========================================================================
    //
    // Award points when the player enters certain rooms for the first time.
    // We use world.chainEvent() to listen for the 'if.event.actor_moved'
    // event and check if the destination is a scoring room.
    //
    // awardScore() is idempotent — if the player re-enters a room they
    // already scored for, awardScore() returns false and nothing happens.

    world.chainEvent('if.event.actor_moved', (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null => {
      const data = event.data as Record<string, any>;
      const toRoom = data.toRoom || data.destination;
      if (!toRoom) return null;

      const roomEntity = w.getEntity(toRoom);
      if (!roomEntity) return null;

      const roomName = roomEntity.get(IdentityTrait)?.name || '';
      const scoreId = ROOM_SCORE_MAP[roomName];
      if (!scoreId) return null;

      // Award points — awardScore returns true only on first award
      w.awardScore(scoreId, ScorePoints[scoreId], `Visited ${roomName}`);

      return null;  // No custom event needed — scoring is silent
    }, { key: 'zoo.chain.room-visit-scoring' });

    // ========================================================================
    // ITEM COLLECTION SCORING — NEW IN V16
    // ========================================================================
    //
    // Award points when the player picks up specific items.

    const mapId = this.entityIds.zooMap;
    world.chainEvent('if.event.taken', (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null => {
      const data = event.data as Record<string, any>;
      if (data.itemId === mapId) {
        w.awardScore(ScoreIds.COLLECT_MAP, ScorePoints[ScoreIds.COLLECT_MAP], 'Collected the zoo map');
      }
      return null;
    }, { key: 'zoo.chain.take-scoring' });

    // ========================================================================
    // READING SCORING — NEW IN V16
    // ========================================================================
    //
    // Award points when the player reads the brochure.

    const brochureId = this.entityIds.brochure;
    world.chainEvent('if.event.read', (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null => {
      const data = event.data as Record<string, any>;
      if (data.entityId === brochureId || data.targetId === brochureId) {
        w.awardScore(ScoreIds.READ_BROCHURE, ScorePoints[ScoreIds.READ_BROCHURE], 'Read the zoo brochure');
      }
      return null;
    }, { key: 'zoo.chain.read-scoring' });

    // ========================================================================
    // PRESSED PENNY SCORING — NEW IN V16
    // ========================================================================
    //
    // Award points when the penny press creates the pressed penny.

    const pennyId = this.entityIds.penny;
    const pressId = this.entityIds.souvenirPress;

    // Event chain handlers (from V12) — Modified in V16 to award score
    const feedId = this.entityIds.animalFeed;
    const pettingZooId = this.roomIds.pettingZoo;
    world.chainEvent('if.event.dropped', (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null => {
      const data = event.data as Record<string, any>;
      if (data.itemId !== feedId || data.toLocation !== pettingZooId) return null;
      if (w.getStateValue('goats-fed')) return null;
      w.setStateValue('goats-fed', true);
      return { id: `zoo-goats-${Date.now()}`, type: 'zoo.event.goats_react', timestamp: Date.now(), entities: {}, data: { text: 'The pygmy goats spot the bag of feed and rush over! They crowd around, bleating excitedly, and devour the corn and pellets in seconds. The smallest goat looks up at you with big grateful eyes.' } };
    }, { key: 'zoo.chain.goats-eat-feed' });

    world.chainEvent('if.event.put_in', (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null => {
      const data = event.data as Record<string, any>;
      if (data.itemId !== pennyId || data.targetId !== pressId) return null;
      w.removeEntity(pennyId);
      const pp = w.createEntity('pressed penny', EntityType.ITEM);
      pp.add(new IdentityTrait({ name: 'pressed penny', description: 'A flattened oval of copper with an embossed toucan.', aliases: ['pressed penny', 'pressed coin', 'souvenir'], properName: false, article: 'a' }));
      const player = w.getPlayer();
      if (player) w.moveEntity(pp.id, player.id);

      // --- NEW IN V16: Award score for pressed penny ---
      w.awardScore(ScoreIds.COLLECT_PRESSED_PENNY, ScorePoints[ScoreIds.COLLECT_PRESSED_PENNY], 'Pressed a souvenir penny');

      return { id: `zoo-press-${Date.now()}`, type: 'zoo.event.penny_pressed', timestamp: Date.now(), entities: {}, data: { text: 'CLUNK! CRUNCH! WHIRRR! The souvenir press produces a beautiful pressed penny with an embossed toucan.' } };
    }, { key: 'zoo.chain.penny-press' });
  }
}

export const story = new FamilyZooStory();
export default story;
