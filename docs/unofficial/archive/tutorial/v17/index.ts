/**
 * Family Zoo Tutorial — Version 17: After Hours & Multi-File Organization
 *
 * NEW IN THIS VERSION:
 *   - Multi-file story organization — split by concern, not by code type
 *   - After-hours phase — zoo closes, zookeeper leaves, animals speak candidly
 *   - Runtime NPC behavior swap — parrot switches from squawking to articulate
 *   - Bonus scoring — 25 pts for witnessing after-hours events (max 100)
 *
 * WHAT YOU'LL LEARN:
 *   - How to organize a growing story across multiple files
 *   - Runtime NPC behavior switching (unregister/register mid-game)
 *   - Conditional daemons that activate when game state changes
 *   - World state flags as game-phase switches
 *
 * FILE ORGANIZATION:
 *   zoo-map.ts     — rooms, exits, scenery (the physical zoo)
 *   zoo-items.ts   — objects players interact with
 *   characters.ts  — zookeeper, parrot, pettable animals, NPC behaviors
 *   events.ts      — PA announcements, feeding time, after-hours daemons
 *   scoring.ts     — points, IDs, victory condition
 *   language.ts    — all player-facing prose
 *   index.ts       — this file; the Story class that wires everything together
 *
 * SCORING BREAKDOWN (100 points total):
 *   Base game (75 pts):
 *     Visit Petting Zoo:        5 pts
 *     Visit Aviary:             5 pts
 *     Visit Gift Shop:          5 pts
 *     Visit Supply Room:        5 pts
 *     Visit Nocturnal Exhibit:  5 pts
 *     Feed the goats:          10 pts
 *     Feed the rabbits:        10 pts
 *     Collect zoo map:          5 pts
 *     Collect pressed penny:   10 pts
 *     Photograph an animal:     5 pts
 *     Pet an animal:            5 pts
 *     Read the brochure:        5 pts
 *   After-hours bonus (25 pts):
 *     See the zookeeper leave:  5 pts
 *     Hear the goats:           5 pts
 *     Hear the rabbits:         5 pts
 *     Hear the parrot:          5 pts
 *     Hear the snake:           5 pts
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
} from '@sharpee/world-model';
import { IdentityTrait, ActorTrait, ContainerTrait } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { NpcPlugin } from '@sharpee/plugin-npc';
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';
import {
  NpcBehavior, NpcContext, NpcAction, createPatrolBehavior,
  Action, ActionContext, ValidationResult,
} from '@sharpee/stdlib';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';

// --- Our files ---
import { createZooMap, RoomIds } from './zoo-map';
import { createZooItems, ItemIds } from './zoo-items';
import {
  createCharacters, CharacterIds, PettableTrait,
  parrotBehavior, parrotAfterHoursBehavior, KEEPER_PATROL_ID,
} from './characters';
import { MAX_SCORE, ScoreIds, ScorePoints, ROOM_SCORE_MAP } from './scoring';
import {
  createPAAnnouncementDaemon, createFeedingTimeFuse,
  createGoatBleatingDaemon, createVictoryDaemon, createAfterHoursDaemons,
} from './events';
import { registerMessages, FeedMessages, PhotoMessages, PetMessages } from './language';


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
// PETTING ACTION — capability behavior + custom action
// ============================================================================

const PETTING_ACTION_ID = 'zoo.action.petting';

const pettingBehavior: CapabilityBehavior = {
  validate(_entity: IFEntity, _world: WorldModel, _actorId: string, _sharedData: CapabilitySharedData): CapabilityValidationResult {
    return { valid: true };
  },
  execute(_entity: IFEntity, _world: WorldModel, _actorId: string, _sharedData: CapabilitySharedData): void {},
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
      context.world.awardScore(ScoreIds.PET_ANIMAL, ScorePoints[ScoreIds.PET_ANIMAL], 'Petted an animal');
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
// FEED ACTION
// ============================================================================

const FEED_ACTION_ID = 'zoo.action.feeding';

const feedAction: Action = {
  id: FEED_ACTION_ID,
  group: 'interaction',
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
      const name = target.get(IdentityTrait)?.name?.toLowerCase() || '';
      if (name.includes('goats')) {
        context.world.awardScore(ScoreIds.FEED_GOATS, ScorePoints[ScoreIds.FEED_GOATS], 'Fed the pygmy goats');
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


// ============================================================================
// PHOTOGRAPH ACTION
// ============================================================================

const PHOTOGRAPH_ACTION_ID = 'zoo.action.photographing';

const photographAction: Action = {
  id: PHOTOGRAPH_ACTION_ID,
  group: 'interaction',
  validate(context: ActionContext): ValidationResult {
    const inventory = context.world.getContents(context.player.id);
    const hasCamera = inventory.some(i => i.get(IdentityTrait)?.aliases?.includes('camera'));
    if (!hasCamera) return { valid: false, error: PhotoMessages.NO_CAMERA };
    const target = context.command.directObject?.entity;
    if (target) context.sharedData.photoTarget = target;
    return { valid: true };
  },
  execute(context: ActionContext): void {
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
// THE STORY CLASS
// ============================================================================

class FamilyZooStory implements Story {
  config = config;
  private roomIds!: RoomIds;
  private itemIds!: ItemIds;
  private characterIds!: CharacterIds;

  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new IdentityTrait({ name: 'yourself', description: 'Just an ordinary visitor to the zoo.', aliases: ['self', 'myself', 'me'], properName: true, article: '' }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
    return player;
  }

  initializeWorld(world: WorldModel): void {
    world.setMaxScore(MAX_SCORE);

    // Build the zoo from our separate files
    const { rooms, keycardId: _keycardId } = createZooMap(world);
    this.roomIds = rooms;

    this.itemIds = createZooItems(world, rooms);
    this.characterIds = createCharacters(world, rooms);

    // Register petting capability
    if (!hasCapabilityBehavior(PettableTrait.type, PETTING_ACTION_ID)) {
      registerCapabilityBehavior(PettableTrait.type, PETTING_ACTION_ID, pettingBehavior);
    }

    // Place the player
    const player = world.getPlayer();
    if (player) world.moveEntity(player.id, rooms.entrance);
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
    registerMessages(language);
  }

  onEngineReady(engine: GameEngine): void {
    const world = engine.getWorld();

    // --- NPC Plugin ---
    const npcPlugin = new NpcPlugin();
    engine.getPluginRegistry().register(npcPlugin);
    const npcService = npcPlugin.getNpcService();

    const keeperPatrol = createPatrolBehavior({
      route: [this.roomIds.mainPath, this.roomIds.pettingZoo, this.roomIds.aviary],
      loop: true,
      waitTurns: 1,
    });
    keeperPatrol.id = KEEPER_PATROL_ID;
    npcService.registerBehavior(keeperPatrol);
    npcService.registerBehavior(parrotBehavior);

    // --- Scheduler Plugin ---
    const schedulerPlugin = new SchedulerPlugin();
    engine.getPluginRegistry().register(schedulerPlugin);
    const scheduler = schedulerPlugin.getScheduler();

    scheduler.registerDaemon(createPAAnnouncementDaemon());
    scheduler.setFuse(createFeedingTimeFuse());
    scheduler.registerDaemon(createGoatBleatingDaemon());
    scheduler.registerDaemon(createVictoryDaemon());

    // --- After-hours daemons (NEW IN V17) ---
    for (const daemon of createAfterHoursDaemons(this.characterIds)) {
      scheduler.registerDaemon(daemon);
    }

    // --- After-hours behavior swap (NEW IN V17) ---
    //
    // A daemon watches for zoo.after_hours to become true and then swaps
    // the parrot's NPC behavior from daytime squawking to candid after-hours
    // dialogue. This is the "runtime behavior swap" pattern — the canonical
    // way to change how an NPC acts mid-game.
    let behaviorSwapped = false;
    scheduler.registerDaemon({
      id: 'zoo.daemon.parrot_behavior_swap',
      name: 'Parrot Behavior Swap',
      priority: 8,
      condition: (ctx) => !behaviorSwapped && ctx.world.getStateValue('zoo.after_hours') === true,
      run: () => {
        behaviorSwapped = true;
        npcService.removeBehavior('zoo-parrot');
        npcService.registerBehavior(parrotAfterHoursBehavior);
        return [];  // silent — the after-hours animal daemon handles the dialogue
      },
      getRunnerState(): Record<string, unknown> { return { behaviorSwapped }; },
      restoreRunnerState(state: Record<string, unknown>): void { behaviorSwapped = (state.behaviorSwapped as boolean) ?? false; },
    });

    // --- Scoring event chains (from V16) ---

    world.chainEvent('if.event.actor_moved', (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null => {
      const data = event.data as Record<string, any>;
      const toRoom = data.toRoom || data.destination;
      if (!toRoom) return null;
      const roomEntity = w.getEntity(toRoom);
      if (!roomEntity) return null;
      const roomName = roomEntity.get(IdentityTrait)?.name || '';
      const scoreId = ROOM_SCORE_MAP[roomName];
      if (!scoreId) return null;
      w.awardScore(scoreId, ScorePoints[scoreId], `Visited ${roomName}`);
      return null;
    }, { key: 'zoo.chain.room-visit-scoring' });

    const mapId = this.itemIds.zooMap;
    world.chainEvent('if.event.taken', (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null => {
      const data = event.data as Record<string, any>;
      if (data.itemId === mapId) {
        w.awardScore(ScoreIds.COLLECT_MAP, ScorePoints[ScoreIds.COLLECT_MAP], 'Collected the zoo map');
      }
      return null;
    }, { key: 'zoo.chain.take-scoring' });

    const brochureId = this.itemIds.brochure;
    world.chainEvent('if.event.read', (event: ISemanticEvent, w: IWorldModel): ISemanticEvent | null => {
      const data = event.data as Record<string, any>;
      if (data.entityId === brochureId || data.targetId === brochureId) {
        w.awardScore(ScoreIds.READ_BROCHURE, ScorePoints[ScoreIds.READ_BROCHURE], 'Read the zoo brochure');
      }
      return null;
    }, { key: 'zoo.chain.read-scoring' });

    const pennyId = this.itemIds.penny;
    const pressId = this.itemIds.souvenirPress;
    const feedId = this.itemIds.animalFeed;
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
      w.awardScore(ScoreIds.COLLECT_PRESSED_PENNY, ScorePoints[ScoreIds.COLLECT_PRESSED_PENNY], 'Pressed a souvenir penny');
      return { id: `zoo-press-${Date.now()}`, type: 'zoo.event.penny_pressed', timestamp: Date.now(), entities: {}, data: { text: 'CLUNK! CRUNCH! WHIRRR! The souvenir press produces a beautiful pressed penny with an embossed toucan.' } };
    }, { key: 'zoo.chain.penny-press' });
  }
}

export const story = new FamilyZooStory();
export default story;
