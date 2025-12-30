/**
 * Dungeo - A Sharpee Implementation of Mainframe Zork
 *
 * "WEST OF HOUSE
 * You are standing in an open field west of a white house, with a boarded front door.
 * There is a small mailbox here."
 */

import { Story, StoryConfig, GameEngine } from '@sharpee/engine';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';
import { ISemanticEvent } from '@sharpee/core';
import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
  OpenableTrait,
  ReadableTrait,
  SceneryTrait,
  EntityType,
  Direction,
  StandardCapabilities,
  IWorldModel,
  IParsedCommand
} from '@sharpee/world-model';
import { DungeoScoringService } from './scoring';

// Import custom actions
import { customActions, GDT_ACTION_ID, GDT_COMMAND_ACTION_ID, GDTEventTypes, isGDTActive, WALK_THROUGH_ACTION_ID, BankPuzzleMessages, SAY_ACTION_ID, SayMessages, RING_ACTION_ID, RingMessages } from './actions';

// Import scheduler module
import { registerScheduledEvents, DungeoSchedulerMessages } from './scheduler';
import { setSchedulerForGDT } from './actions/gdt/commands';

// Import handlers
import { registerBatHandler, BatMessages, registerExorcismHandler, ExorcismMessages, registerRoundRoomHandler, RoundRoomMessages } from './handlers';
import { initializeMirrorRoom, createMirrorTouchHandler, MirrorRoomConfig, MirrorRoomMessages } from './handlers/mirror-room-handler';
import { MIRROR_ID } from './regions/underground/objects';

// Import room and object creators
import { createWhiteHouseRooms, createWhiteHouseObjects, WhiteHouseRoomIds } from './regions/white-house';
import { createHouseInteriorRooms, createHouseInteriorObjects, connectHouseInteriorToExterior, HouseInteriorRoomIds } from './regions/house-interior';
import { createForestRooms, createForestObjects, connectForestToExterior, ForestRoomIds } from './regions/forest';
import { createUndergroundRooms, createUndergroundObjects, connectUndergroundToHouse, connectStudioToKitchen, connectUndergroundToDam, connectGrailRoomToTemple, connectCaveToHades, UndergroundRoomIds } from './regions/underground';
import { createDamRooms, connectDamToUnderground, connectReservoirToAtlantis, connectGlacierToEgyptian, connectTempleSmallCaveToRockyShore, createDamObjects, DamRoomIds } from './regions/dam';
import { createCoalMineRooms, connectCoalMineToDam, createCoalMineObjects, CoalMineRoomIds } from './regions/coal-mine';
import { createTempleRooms, connectTempleToDam, connectTempleToUnderground, createTempleObjects, TempleRoomIds } from './regions/temple';
import { createVolcanoRooms, connectVolcanoToGlacier, createVolcanoObjects, VolcanoRoomIds } from './regions/volcano';
import { createBankRooms, connectBankToUnderground, createBankObjects, BankRoomIds } from './regions/bank-of-zork';
import { createWellRoomRooms, connectWellRoomToTemple, createWellRoomObjects, WellRoomIds } from './regions/well-room';
import { createFrigidRiverRooms, connectFrigidRiverToDam, connectRainbowToCanyon, createFrigidRiverObjects, FrigidRiverRoomIds } from './regions/frigid-river';
import { createMazeRooms, connectMazeToClearing, connectCyclopsToLivingRoom, connectMazeToTrollRoom, connectMazeToRoundRoom, createMazeObjects, MazeRoomIds } from './regions/maze';
import { createRoyalPuzzleRooms, connectRoyalPuzzleToTreasureRoom, RoyalPuzzleRoomIds } from './regions/royal-puzzle';

// Import handlers
import { registerRoyalPuzzleHandler, initializePuzzleState, PuzzleHandlerMessages } from './handlers/royal-puzzle';

// Import NPCs
import { registerThief, ThiefMessages } from './npcs/thief';
import { registerCyclops, CyclopsMessages } from './npcs/cyclops';
import { RobotMessages } from './npcs/robot';

/**
 * Dungeo story configuration
 */
export const config: StoryConfig = {
  id: "dungeo",
  title: "Dungeo",
  author: "Based on Zork by MIT (Sharpee implementation)",
  version: "1.0.0-alpha.1",
  description: "A Sharpee implementation of Mainframe Zork. Welcome to the Great Underground Empire!"
};

/**
 * Dungeo story implementation
 */
export class DungeoStory implements Story {
  config = config;

  private world!: WorldModel;
  private scoringService!: DungeoScoringService;
  private whiteHouseIds: WhiteHouseRoomIds = {} as WhiteHouseRoomIds;
  private houseInteriorIds: HouseInteriorRoomIds = {} as HouseInteriorRoomIds;
  private forestIds: ForestRoomIds = {} as ForestRoomIds;
  private undergroundIds: UndergroundRoomIds = {} as UndergroundRoomIds;
  private damIds: DamRoomIds = {} as DamRoomIds;
  private coalMineIds: CoalMineRoomIds = {} as CoalMineRoomIds;
  private templeIds: TempleRoomIds = {} as TempleRoomIds;
  private volcanoIds: VolcanoRoomIds = {} as VolcanoRoomIds;
  private bankIds: BankRoomIds = {} as BankRoomIds;
  private wellRoomIds: WellRoomIds = {} as WellRoomIds;
  private frigidRiverIds: FrigidRiverRoomIds = {} as FrigidRiverRoomIds;
  private mazeIds: MazeRoomIds = {} as MazeRoomIds;
  private royalPuzzleIds: RoyalPuzzleRoomIds = {} as RoyalPuzzleRoomIds;
  private mirrorConfig: MirrorRoomConfig | null = null;

  /**
   * Initialize the world for Dungeo
   */
  initializeWorld(world: WorldModel): void {
    this.world = world;

    // Register scoring capability (Zork max score is 616)
    world.registerCapability(StandardCapabilities.SCORING, {
      initialData: {
        scoreValue: 0,
        maxScore: 616,
        moves: 0,
        achievements: [],
        scoredTreasures: []
      }
    });

    // Create scoring service
    this.scoringService = new DungeoScoringService(world);

    // Register trophy case scoring handler
    this.registerTrophyCaseHandler(world);

    // Create all rooms
    this.whiteHouseIds = createWhiteHouseRooms(world);
    this.houseInteriorIds = createHouseInteriorRooms(world);
    this.forestIds = createForestRooms(world);
    this.undergroundIds = createUndergroundRooms(world);
    this.damIds = createDamRooms(world);
    this.coalMineIds = createCoalMineRooms(world);
    this.templeIds = createTempleRooms(world);
    this.volcanoIds = createVolcanoRooms(world);
    this.bankIds = createBankRooms(world);
    this.wellRoomIds = createWellRoomRooms(world);
    this.frigidRiverIds = createFrigidRiverRooms(world);
    this.mazeIds = createMazeRooms(world);
    this.royalPuzzleIds = createRoyalPuzzleRooms(world);

    // Connect regions
    connectHouseInteriorToExterior(world, this.houseInteriorIds, this.whiteHouseIds.behindHouse);
    connectForestToExterior(world, this.forestIds, this.whiteHouseIds.northOfHouse, this.whiteHouseIds.behindHouse);
    connectUndergroundToHouse(world, this.undergroundIds, this.houseInteriorIds.livingRoom);
    connectStudioToKitchen(world, this.undergroundIds, this.houseInteriorIds.kitchen);
    connectDamToUnderground(world, this.damIds, this.undergroundIds.roundRoom);
    connectCoalMineToDam(world, this.coalMineIds, this.damIds.maintenanceRoom);
    connectTempleToDam(world, this.templeIds, this.damIds.reservoirSouth);
    connectTempleToUnderground(world, this.templeIds, this.undergroundIds.rockyCrawl);
    connectReservoirToAtlantis(world, this.damIds, this.undergroundIds.atlantisRoom);
    connectGlacierToEgyptian(world, this.damIds, this.templeIds.egyptianRoom);
    connectVolcanoToGlacier(world, this.volcanoIds, this.damIds.glacierRoom);
    connectBankToUnderground(world, this.bankIds, this.undergroundIds.cellar, this.undergroundIds.gallery, this.undergroundIds.narrowPassage);

    // Store bank room IDs in world state for walk-through action
    world.setStateValue('dungeo.bank.roomIds', this.bankIds);
    connectWellRoomToTemple(world, this.wellRoomIds, this.templeIds.torchRoom);
    connectFrigidRiverToDam(world, this.frigidRiverIds, this.damIds.damBase);
    connectTempleSmallCaveToRockyShore(world, this.damIds, this.frigidRiverIds.rockyShore);
    connectRainbowToCanyon(world, this.frigidRiverIds, this.forestIds.canyonBottom);
    connectMazeToClearing(world, this.mazeIds, this.forestIds.clearing);
    connectCyclopsToLivingRoom(world, this.mazeIds, this.houseInteriorIds.livingRoom);
    connectMazeToTrollRoom(world, this.mazeIds, this.undergroundIds.trollRoom);
    connectMazeToRoundRoom(world, this.mazeIds, this.undergroundIds.roundRoom);

    // Connect Royal Puzzle to Treasure Room
    connectRoyalPuzzleToTreasureRoom(world, this.royalPuzzleIds, this.mazeIds.treasureRoom);

    // Initialize puzzle state in world
    initializePuzzleState(world, this.royalPuzzleIds);

    // Connect Round Room hub area to Dam region (N/S Passage, Damp Cave, Loud Room)
    connectUndergroundToDam(world, this.undergroundIds, this.damIds.loudRoom);

    // Connect Grail Room to Temple
    connectGrailRoomToTemple(world, this.undergroundIds, this.templeIds.temple);

    // Connect Cave to Entry to Hades (default connection - mirror puzzle)
    connectCaveToHades(world, this.undergroundIds, this.templeIds.entryToHades);

    // Create all objects and place them in rooms
    createWhiteHouseObjects(world, this.whiteHouseIds);
    createHouseInteriorObjects(world, this.houseInteriorIds, this.undergroundIds.cellar);
    createForestObjects(world, this.forestIds);
    createUndergroundObjects(world, this.undergroundIds);
    createDamObjects(world, this.damIds);
    createCoalMineObjects(world, this.coalMineIds);
    createTempleObjects(world, this.templeIds);
    createVolcanoObjects(world, this.volcanoIds);
    createBankObjects(world, this.bankIds);
    createWellRoomObjects(world, this.wellRoomIds);
    createFrigidRiverObjects(world, this.frigidRiverIds);
    createMazeObjects(world, this.mazeIds);

    // Initialize Mirror Room state toggle
    this.initializeMirrorRoomHandler(world);

    // Set initial player location to West of House
    const player = world.getPlayer();
    if (player) {
      world.moveEntity(player.id, this.whiteHouseIds.westOfHouse);
    }
  }

  /**
   * Initialize the Mirror Room handler with all connection IDs
   * The event handler is registered in onEngineReady via EventProcessor (ADR-075)
   */
  private initializeMirrorRoomHandler(world: WorldModel): void {
    // Find the mirror entity by scanning Mirror Room contents
    const mirrorRoom = world.getEntity(this.undergroundIds.mirrorRoom);
    if (!mirrorRoom) return;

    const contents = world.getContents(this.undergroundIds.mirrorRoom);
    const mirror = contents.find(e => {
      const identity = e.get('identity') as { aliases?: string[] } | undefined;
      return identity?.aliases?.includes('mirror');
    });

    if (!mirror) {
      console.warn('Mirror not found in Mirror Room');
      return;
    }

    // Create mirror config
    this.mirrorConfig = {
      mirrorRoomId: this.undergroundIds.mirrorRoom,
      mirrorId: mirror.id,

      // State A destinations (Grail Room/Hades)
      stateA: {
        north: this.undergroundIds.narrowCrawlway,
        west: this.undergroundIds.windingPassage,
        east: this.undergroundIds.cave  // Leads down to Hades
      },

      // State B destinations (Coal Mine)
      stateB: {
        north: this.coalMineIds.steepCrawlway,
        west: this.coalMineIds.coldPassage,
        east: this.undergroundIds.smallCave  // Leads down to Atlantis
      }
    };

    // Initialize to State A (sets up initial exits)
    initializeMirrorRoom(world, this.mirrorConfig);

    // Handler registration moved to onEngineReady (ADR-075)
  }

  /**
   * Create the player entity
   */
  createPlayer(world: WorldModel): IFEntity {
    // Check if a player already exists
    const existingPlayer = world.getPlayer();
    if (existingPlayer) {
      // Update the existing player with our traits
      existingPlayer.add(new IdentityTrait({
        name: 'yourself',
        description: 'A brave adventurer, ready to explore the Great Underground Empire.',
        aliases: ['self', 'myself', 'me', 'yourself', 'adventurer'],
        properName: true,
        article: ''
      }));

      if (!existingPlayer.has('actor')) {
        existingPlayer.add(new ActorTrait({
          isPlayer: true
        }));
      }

      if (!existingPlayer.has('container')) {
        existingPlayer.add(new ContainerTrait({
          capacity: {
            maxItems: 15,
            maxWeight: 100
          }
        }));
      }

      return existingPlayer;
    }

    // Create a new player
    const player = world.createEntity('yourself', EntityType.ACTOR);

    player.add(new IdentityTrait({
      name: 'yourself',
      description: 'A brave adventurer, ready to explore the Great Underground Empire.',
      aliases: ['self', 'myself', 'me', 'yourself', 'adventurer'],
      properName: true,
      article: ''
    }));

    player.add(new ActorTrait({
      isPlayer: true
    }));

    player.add(new ContainerTrait({
      capacity: {
        maxItems: 15,
        maxWeight: 100
      }
    }));

    return player;
  }

  /**
   * Extend the parser with custom vocabulary for this story
   */
  extendParser(parser: Parser): void {
    const grammar = parser.getStoryGrammar();

    // GDT entry command
    grammar
      .define('gdt')
      .mapsTo(GDT_ACTION_ID)
      .withPriority(200)
      .build();

    // GDT two-letter commands (only active when in GDT mode)
    // These are high priority to override any other patterns

    // Commands that don't take arguments
    const noArgCodes = [
      'da', 'ds', 'he', 'ex', 'nd', 'rd', 'nc', 'rc', 'nr', 'rr', 'nt', 'rt'
    ];

    // Commands that take one optional argument
    const oneArgCodes = [
      'dr', 'dx', 'do', 'dv', 'dc', 'dh', 'dl', 'df', 'dn', 'dm', 'dt', 'dp', 'd2', 'dz',
      'ah', 'tk', 'ar', 'af', 'ac', 'aa', 'ax', 'av', 'an', 'az', 'pd'
    ];

    // Commands that take two arguments
    const twoArgCodes = ['ao'];

    // Register no-arg commands
    for (const code of noArgCodes) {
      grammar
        .define(code)
        .mapsTo(GDT_COMMAND_ACTION_ID)
        .withPriority(250)
        .build();
    }

    // Register one-arg commands (both standalone and with :arg)
    // Using :arg instead of :target to avoid entity resolution constraints
    for (const code of oneArgCodes) {
      // Standalone version
      grammar
        .define(code)
        .mapsTo(GDT_COMMAND_ACTION_ID)
        .withPriority(250)
        .build();

      // With one argument - use :arg to capture any following text without entity resolution
      grammar
        .define(`${code} :arg`)
        .mapsTo(GDT_COMMAND_ACTION_ID)
        .withPriority(251)
        .build();
    }

    // Register two-arg commands (standalone, one-arg, and two-arg versions)
    for (const code of twoArgCodes) {
      grammar
        .define(code)
        .mapsTo(GDT_COMMAND_ACTION_ID)
        .withPriority(250)
        .build();

      grammar
        .define(`${code} :arg`)
        .mapsTo(GDT_COMMAND_ACTION_ID)
        .withPriority(251)
        .build();

      grammar
        .define(`${code} :arg1 :arg2`)
        .mapsTo(GDT_COMMAND_ACTION_ID)
        .withPriority(252)
        .build();
    }

    // Walk through action (Bank of Zork puzzle)
    // "walk through curtain", "walk through north wall", "go through curtain", etc.
    grammar
      .define('walk through :target')
      .mapsTo(WALK_THROUGH_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('go through :target')
      .mapsTo(WALK_THROUGH_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('pass through :target')
      .mapsTo(WALK_THROUGH_ACTION_ID)
      .withPriority(150)
      .build();

    // Explicit patterns for walls (higher priority)
    grammar
      .define('walk through south wall')
      .mapsTo(WALK_THROUGH_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('walk through north wall')
      .mapsTo(WALK_THROUGH_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('go through south wall')
      .mapsTo(WALK_THROUGH_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('go through north wall')
      .mapsTo(WALK_THROUGH_ACTION_ID)
      .withPriority(155)
      .build();

    // Say action (Cyclops puzzle)
    // "say odysseus", "say ulysses", "say hello"
    grammar
      .define('say :arg')
      .mapsTo(SAY_ACTION_ID)
      .withPriority(150)
      .build();

    // Higher priority for specific magic words
    grammar
      .define('say odysseus')
      .mapsTo(SAY_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('say ulysses')
      .mapsTo(SAY_ACTION_ID)
      .withPriority(155)
      .build();

    // Ring action (Exorcism bell)
    grammar
      .define('ring :target')
      .mapsTo(RING_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('ring bell')
      .mapsTo(RING_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('ring the bell')
      .mapsTo(RING_ACTION_ID)
      .withPriority(155)
      .build();
  }

  /**
   * Extend the language provider with custom messages for this story
   */
  extendLanguage(language: LanguageProvider): void {
    // Rug/trapdoor puzzle
    language.addMessage('dungeo.rug.moved.reveal_trapdoor', 'Moving the rug reveals a trapdoor.');

    // Troll combat
    language.addMessage('dungeo.troll.death.passage_clear', 'With the troll dispatched, the passage to the north is now clear.');

    // Trophy case scoring
    language.addMessage('dungeo.treasure.scored', 'Your score just went up by {points} points!');

    // GDT messages - the actual formatting is done by the event data
    // These templates will be enhanced by a custom event handler
    language.addMessage(GDTEventTypes.ENTERED, '{message}');
    language.addMessage(GDTEventTypes.EXITED, '{message}');
    language.addMessage(GDTEventTypes.OUTPUT, '{output}');
    language.addMessage(GDTEventTypes.UNKNOWN_COMMAND, '{message}');

    // Bank of Zork puzzle messages
    language.addMessage(BankPuzzleMessages.WALK_THROUGH, 'You feel somewhat disoriented as you pass through...');
    language.addMessage(BankPuzzleMessages.NO_WALL, "I can't see any {direction} wall here.");
    language.addMessage(BankPuzzleMessages.CANT_WALK_THROUGH, "You can't walk through that.");

    // Scheduler messages (ADR-071)
    // Lantern battery
    language.addMessage(DungeoSchedulerMessages.LANTERN_DIM, 'Your lantern is getting dim.');
    language.addMessage(DungeoSchedulerMessages.LANTERN_FLICKERS, 'Your lantern flickers ominously.');
    language.addMessage(DungeoSchedulerMessages.LANTERN_DIES, 'Your lantern flickers and goes out.');
    language.addMessage(DungeoSchedulerMessages.LANTERN_DEAD, 'The lantern is dead. You need a new battery.');

    // Candle burning
    language.addMessage(DungeoSchedulerMessages.CANDLES_LOW, 'The candles are burning low.');
    language.addMessage(DungeoSchedulerMessages.CANDLES_FLICKER, 'The candles flicker.');
    language.addMessage(DungeoSchedulerMessages.CANDLES_OUT, 'The candles sputter and go out.');

    // Match burning
    language.addMessage(DungeoSchedulerMessages.MATCH_BURNING, 'The match sputters.');
    language.addMessage(DungeoSchedulerMessages.MATCH_OUT, 'The match goes out.');

    // Dam draining
    language.addMessage(DungeoSchedulerMessages.DAM_DRAINING, 'The sluice gates open and water begins draining from the reservoir.');
    language.addMessage(DungeoSchedulerMessages.DAM_NEARLY_EMPTY, 'The reservoir is nearly empty now.');
    language.addMessage(DungeoSchedulerMessages.DAM_EMPTY, 'The last of the water drains away.');
    language.addMessage(DungeoSchedulerMessages.DAM_TRUNK_REVEALED, 'As the mud settles, a trunk becomes visible in the reservoir bed!');

    // Forest ambience
    language.addMessage(DungeoSchedulerMessages.FOREST_BIRD, 'A songbird chirps in the distance.');
    language.addMessage(DungeoSchedulerMessages.FOREST_RUSTLE, 'Leaves rustle in the undergrowth.');
    language.addMessage(DungeoSchedulerMessages.FOREST_BREEZE, 'A gentle breeze stirs the branches.');
    language.addMessage(DungeoSchedulerMessages.FOREST_BRANCH, 'A branch cracks somewhere in the forest.');

    // Underground ambience
    language.addMessage(DungeoSchedulerMessages.UNDERGROUND_DRIP, 'Water drips somewhere in the darkness.');
    language.addMessage(DungeoSchedulerMessages.UNDERGROUND_ECHO, 'A distant echo reaches your ears.');
    language.addMessage(DungeoSchedulerMessages.UNDERGROUND_CREAK, 'The timbers creak ominously.');

    // NPC messages (ADR-070)
    // Guard behavior (troll)
    language.addMessage('npc.guard.blocks', 'The {npcName} growls menacingly, blocking your way.');
    language.addMessage('npc.guard.attacks', 'The {npcName} swings at you!');
    language.addMessage('npc.guard.defeated', 'The {npcName} has been defeated!');

    // Combat messages
    language.addMessage('npc.attacks', 'The {npcName} attacks!');
    language.addMessage('npc.misses', 'The {npcName} misses.');
    language.addMessage('npc.hits', 'The {npcName} hits you!');
    language.addMessage('npc.killed', 'The {npcName} is dead.');
    language.addMessage('npc.unconscious', 'The {npcName} slumps to the ground, unconscious.');

    // NPC movement
    language.addMessage('npc.enters', 'A {npcName} enters.');
    language.addMessage('npc.leaves', 'The {npcName} leaves.');
    language.addMessage('npc.notices_player', 'The {npcName} notices you.');

    // NPC speech
    language.addMessage('npc.no_response', 'The {npcName} does not respond.');

    // Thief NPC messages (ADR-070)
    // Appearance/Movement
    language.addMessage(ThiefMessages.APPEARS, 'A seedy-looking gentleman sidles into view.');
    language.addMessage(ThiefMessages.LEAVES, 'The thief slinks away into the shadows.');
    language.addMessage(ThiefMessages.LURKS, 'The thief lurks in the shadows, watching.');

    // Stealing
    language.addMessage(ThiefMessages.STEALS_FROM_PLAYER, '"My, what a lovely {itemName}!" The thief snatches it away.');
    language.addMessage(ThiefMessages.STEALS_FROM_ROOM, 'The thief pockets the {itemName}.');
    language.addMessage(ThiefMessages.NOTICES_VALUABLES, 'The thief\'s eyes gleam as he notices your possessions.');
    language.addMessage(ThiefMessages.GLOATS, 'The thief grins smugly at you.');

    // Egg-opening (special mechanic)
    language.addMessage(ThiefMessages.OPENS_EGG, 'The thief, eyeing the jeweled egg with professional interest, skillfully opens it and reveals a clockwork canary!');

    // Combat
    language.addMessage(ThiefMessages.ATTACKS, 'The thief lunges at you with his stiletto!');
    language.addMessage(ThiefMessages.COUNTERATTACKS, 'The thief parries and counterattacks!');
    language.addMessage(ThiefMessages.DODGES, 'The thief deftly dodges your attack.');
    language.addMessage(ThiefMessages.WOUNDED, 'The thief staggers from your blow.');
    language.addMessage(ThiefMessages.FLEES, 'The thief, badly wounded, stumbles away into the darkness.');
    language.addMessage(ThiefMessages.DIES, 'The thief falls to the ground, a look of surprise frozen on his face.');

    // Post-death
    language.addMessage(ThiefMessages.DROPS_LOOT, 'The thief\'s ill-gotten gains scatter across the floor.');

    // Cyclops NPC messages (ADR-070)
    // Appearance/Blocking
    language.addMessage(CyclopsMessages.BLOCKS, 'A huge cyclops stands before you, blocking the northern passage!');
    language.addMessage(CyclopsMessages.GROWLS, 'The cyclops growls menacingly.');

    // Speech responses
    language.addMessage(CyclopsMessages.IGNORES, 'The cyclops ignores your words.');
    language.addMessage(CyclopsMessages.PANICS, 'The cyclops, hearing that dreaded name, panics!');
    language.addMessage(CyclopsMessages.FLEES, 'The cyclops runs away in terror, revealing a hidden passage!');
    language.addMessage(CyclopsMessages.PASSAGE_OPENS, 'A passage north to the Strange Passage is now clear.');

    // Combat
    language.addMessage(CyclopsMessages.ATTACKS, 'The cyclops swings at you with massive fists!');
    language.addMessage(CyclopsMessages.COUNTERATTACKS, 'The cyclops roars and swings back at you!');
    language.addMessage(CyclopsMessages.WOUNDED, 'The cyclops staggers from your blow.');
    language.addMessage(CyclopsMessages.DIES, 'The cyclops crashes to the ground with a tremendous thud!');

    // Robot messages
    language.addMessage(RobotMessages.DESCRIPTION, 'A metallic robot with a hinged panel on its chest.');
    language.addMessage(RobotMessages.FOLLOWS, 'The robot follows you.');
    language.addMessage(RobotMessages.WAITS, 'The robot will wait here.');
    language.addMessage(RobotMessages.COMMAND_UNDERSTOOD, 'The robot beeps in acknowledgment.');
    language.addMessage(RobotMessages.COMMAND_UNKNOWN, 'The robot whirs confusedly.');
    language.addMessage(RobotMessages.PUSHES_BUTTON, 'The robot extends a thin metal finger and pushes the triangular button.');
    language.addMessage(RobotMessages.NO_BUTTON, 'The robot looks around but sees no button to push.');
    language.addMessage(RobotMessages.ALREADY_PUSHED, 'The robot has already pushed the button.');
    language.addMessage(RobotMessages.CAROUSEL_FIXED, 'You hear a grinding noise from somewhere nearby. The carousel mechanism has stopped spinning!');

    // Say action messages
    language.addMessage(SayMessages.NOTHING_TO_SAY, 'You need to say something.');
    language.addMessage(SayMessages.SAY_TO_AIR, 'You speak, but nobody is here to listen.');
    language.addMessage(SayMessages.NPC_RESPONDS, '{npcName} responds to your words.');

    // Loud Room echo puzzle messages
    language.addMessage(SayMessages.LOUD_ROOM_ECHO_DEATH,
      'The acoustics of the room cause your voice to echo back with increasing volume. ' +
      'The reverberations are deafening! CRASH! The room collapses around you!');
    language.addMessage(SayMessages.LOUD_ROOM_ECHO_SAFE,
      'The platinum bar seems to absorb the sound, preventing dangerous reverberations. ' +
      'The acoustics of the room cause your voice to echo: "echo...echo...echo..."');
    language.addMessage(SayMessages.LOUD_ROOM_ACOUSTICS,
      'The acoustics of the room cause your voice to echo: "echo...echo...echo..."');

    // Riddle Room puzzle messages
    language.addMessage(SayMessages.RIDDLE_CORRECT,
      'There is a loud rumble as the stone door swings open, revealing a passage to the east!');
    language.addMessage(SayMessages.RIDDLE_WRONG,
      'A hollow voice intones: "Wrong, adventurer! Think more carefully about the riddle..."');
    language.addMessage(SayMessages.RIDDLE_ALREADY_SOLVED,
      'The stone door is already open. You may proceed east.');

    // Vampire Bat messages
    language.addMessage(BatMessages.ATTACKS, 'A large vampire bat swoops down from the ceiling and grabs you!');
    language.addMessage(BatMessages.CARRIES_AWAY, 'The bat carries you off into the darkness...');
    language.addMessage(BatMessages.COWERS, 'The vampire bat cowers away from you, repelled by the smell of garlic!');
    language.addMessage(BatMessages.DROPPED, 'The bat drops you unceremoniously.');

    // Ring action messages
    language.addMessage(RingMessages.RING_SUCCESS, 'Ding!');
    language.addMessage(RingMessages.RING_BELL, 'The bell produces a clear, resonant tone.');
    language.addMessage(RingMessages.NOT_RINGABLE, "That doesn't make a sound when rung.");
    language.addMessage(RingMessages.NO_TARGET, 'Ring what?');

    // Mirror Room messages
    language.addMessage(MirrorRoomMessages.ROOM_SHAKES, 'There is a rumble from deep within the earth, and the room shakes.');

    // Exorcism messages
    language.addMessage(ExorcismMessages.SPIRITS_BLOCK, 'Ghostly figures bar your way, their hollow eyes staring through you. They will not let you pass.');
    language.addMessage(ExorcismMessages.SPIRITS_VANISH, 'The spirits shriek in terror and vanish in a blinding flash of light!');
    language.addMessage(ExorcismMessages.PASSAGE_OPENS, 'The way to the south is now clear.');
    language.addMessage(ExorcismMessages.BELL_ECHOES, 'The bell echoes through the chamber.');
    language.addMessage(ExorcismMessages.RITUAL_PROGRESS, 'You feel a strange energy building...');
  }

  /**
   * Register the trophy case event handler for treasure scoring
   *
   * Note: world.registerEventHandler returns void, so we can't emit events.
   * We just update the score directly - players can check with SCORE command.
   */
  private registerTrophyCaseHandler(world: WorldModel): void {
    const TROPHY_CASE_NAME = 'trophy case';
    const scoringService = this.scoringService;

    world.registerEventHandler('if.event.put_in', (event: ISemanticEvent, w): void => {
      const data = event.data as Record<string, any> | undefined;
      const targetId = data?.targetId as string | undefined;
      if (!targetId) return;

      // Check if target is the trophy case
      const targetEntity = w.getEntity(targetId);
      if (!targetEntity) return;

      const identity = targetEntity.get('identity') as { name?: string } | undefined;
      if (identity?.name !== TROPHY_CASE_NAME) return;

      // Get the item being placed
      const itemId = data?.itemId as string | undefined;
      if (!itemId) return;

      const item = w.getEntity(itemId);
      if (!item) return;

      // Check if item is a treasure
      const isTreasure = (item as any).isTreasure;
      if (!isTreasure) return;

      const treasureValue = (item as any).treasureValue || 0;
      const treasureId = (item as any).treasureId || item.id;

      // Score the treasure (prevents double-scoring)
      scoringService.scoreTreasure(treasureId, treasureValue);
    });
  }

  /**
   * Get custom actions for this story
   */
  getCustomActions(): any[] {
    return customActions;
  }

  /**
   * Story-specific initialization
   */
  initialize(): void {
    // Additional initialization if needed
  }

  /**
   * Check if the story is complete
   */
  isComplete(): boolean {
    // For now, story is never complete (full game completion TBD)
    return false;
  }

  /**
   * Called when the engine is fully initialized.
   * Registers the GDT command transformer and scheduler events.
   */
  onEngineReady(engine: GameEngine): void {
    // Register transformer that clears entity slots for GDT commands
    // This allows GDT to use raw text arguments without entity resolution
    engine.registerParsedCommandTransformer((parsed: IParsedCommand, world: WorldModel) => {
      // Only transform when GDT mode is active
      if (!isGDTActive(world)) {
        return parsed;
      }

      // Check if this is a GDT command
      if (parsed.action !== GDT_COMMAND_ACTION_ID && parsed.action !== GDT_ACTION_ID) {
        return parsed;
      }

      // Clear entity slots so CommandValidator doesn't try to resolve them
      // GDT will parse rawInput directly in its execute phase
      return {
        ...parsed,
        structure: {
          ...parsed.structure,
          directObject: undefined,
          indirectObject: undefined
        }
      };
    });

    // Register scheduler events (ADR-071 Phase 2)
    const scheduler = engine.getScheduler();
    if (scheduler) {
      // Register all daemons and fuses
      registerScheduledEvents(
        scheduler,
        this.world,
        this.forestIds,
        this.damIds,
        this.bankIds
      );

      // Make scheduler accessible to GDT DC command
      setSchedulerForGDT(this.world, scheduler);

      // Register bat handler for Bat Room (coal mine)
      // Valid drop locations: underground rooms excluding dangerous areas
      const batDropLocations = [
        this.undergroundIds.cellar,
        this.undergroundIds.trollRoom,
        this.undergroundIds.eastWestPassage,
        this.undergroundIds.roundRoom,
        this.undergroundIds.narrowPassage,
        this.undergroundIds.gallery,
        this.undergroundIds.studio,
        this.templeIds.temple,
        this.templeIds.narrowCorridor,
        this.damIds.damLobby,
        this.damIds.dam,
        // Maze rooms (some of them)
        this.mazeIds.maze1,
        this.mazeIds.maze5,
        this.mazeIds.maze11,
      ];
      registerBatHandler(scheduler, this.coalMineIds.squeakyRoom, batDropLocations);

      // Register exorcism handler (bell/book/candle puzzle)
      registerExorcismHandler(
        scheduler,
        this.world,
        this.templeIds.entryToHades,
        this.templeIds.landOfDead
      );

      // Register Round Room randomization handler (carousel room)
      registerRoundRoomHandler(scheduler, this.undergroundIds.roundRoom);

      // Register Royal Puzzle handler (sliding block puzzle)
      registerRoyalPuzzleHandler(scheduler, this.royalPuzzleIds);
    }

    // Register NPCs (ADR-070)
    const npcService = engine.getNpcService();
    if (npcService) {
      // Calculate surface room IDs (thief is forbidden from surface)
      const surfaceRooms = [
        ...Object.values(this.whiteHouseIds),
        ...Object.values(this.houseInteriorIds),
        ...Object.values(this.forestIds)
      ];

      // Register thief NPC in the Treasure Room (his lair)
      registerThief(
        npcService,
        this.world,
        this.mazeIds.treasureRoom,
        surfaceRooms
      );

      // Register cyclops NPC in the Cyclops Room
      registerCyclops(
        npcService,
        this.world,
        this.mazeIds.cyclopsRoom
      );
    }

    // Register Mirror Room handler (ADR-075)
    if (this.mirrorConfig) {
      const eventProcessor = engine.getEventProcessor();
      const mirrorHandler = createMirrorTouchHandler(this.mirrorConfig);
      eventProcessor.registerHandler('if.event.touched', mirrorHandler);
    }
  }
}

// Create and export the story instance
export const story = new DungeoStory();

// Default export for convenience
export default story;
