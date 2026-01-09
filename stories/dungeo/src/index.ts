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
import { ScopeBuilder } from '@sharpee/if-domain';
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
  IParsedCommand,
  registerCapabilityBehavior,
  hasCapabilityBehavior
} from '@sharpee/world-model';
import { DungeoScoringService } from './scoring';

// Import custom actions
import { customActions, GDT_ACTION_ID, GDT_COMMAND_ACTION_ID, GDTEventTypes, isGDTActive, WALK_THROUGH_ACTION_ID, BankPuzzleMessages, SAY_ACTION_ID, SayMessages, RING_ACTION_ID, RingMessages, PUSH_WALL_ACTION_ID, PushWallMessages, BREAK_ACTION_ID, BreakMessages, BURN_ACTION_ID, BurnMessages, PRAY_ACTION_ID, PrayMessages, INCANT_ACTION_ID, IncantMessages, LIFT_ACTION_ID, LiftMessages, LOWER_ACTION_ID, LowerMessages, PUSH_PANEL_ACTION_ID, PushPanelMessages, KNOCK_ACTION_ID, KnockMessages, ANSWER_ACTION_ID, AnswerMessages, SET_DIAL_ACTION_ID, SetDialMessages, PUSH_DIAL_BUTTON_ACTION_ID, PushDialButtonMessages, WAVE_ACTION_ID, WaveMessages, DIG_ACTION_ID, DigMessages, WIND_ACTION_ID, WindMessages, SEND_ACTION_ID, SendMessages, POUR_ACTION_ID, PourMessages, FILL_ACTION_ID, FillMessages, LIGHT_ACTION_ID, LightMessages, TIE_ACTION_ID, TieMessages, UNTIE_ACTION_ID, UntieMessages, PRESS_BUTTON_ACTION_ID, PressButtonMessages, setPressButtonScheduler, TURN_BOLT_ACTION_ID, TurnBoltMessages, setTurnBoltScheduler, TURN_SWITCH_ACTION_ID, TurnSwitchMessages, PUT_UNDER_ACTION_ID, PutUnderMessages, PUSH_KEY_ACTION_ID, PushKeyMessages, DOOR_BLOCKED_ACTION_ID, DoorBlockedMessages, INFLATE_ACTION_ID, InflateMessages, DEFLATE_ACTION_ID, DeflateMessages, COMMANDING_ACTION_ID, CommandingMessages } from './actions';

// Import scheduler module
import { registerScheduledEvents, DungeoSchedulerMessages, FloodingMessages, registerBalloonPutHandler, BalloonHandlerMessages } from './scheduler';
import { setSchedulerForGDT, setEngineForKL } from './actions/gdt/commands';

// Import handlers
import { registerBatHandler, BatMessages, registerExorcismHandler, ExorcismMessages, registerRoundRoomHandler, RoundRoomMessages, registerGhostRitualHandler, GhostRitualMessages, registerRealityAlteredHandler, registerRealityAlteredDaemon, RealityAlteredMessages, registerEndgameTriggerHandler, EndgameTriggerMessages, registerLaserPuzzleHandler, LaserPuzzleMessages, registerInsideMirrorHandler, InsideMirrorMessages, registerVictoryHandler, VictoryMessages, registerGlacierHandler, GlacierMessages, registerReservoirExitHandler } from './handlers';
import { initializeMirrorRoom, createMirrorTouchHandler, MirrorRoomConfig, MirrorRoomMessages } from './handlers/mirror-room-handler';
import { MIRROR_ID } from './regions/temple';

// Import room and object creators
import { createWhiteHouseRegion, createWhiteHouseObjects, WhiteHouseRoomIds } from './regions/white-house';
import { createHouseInteriorRegion, createHouseInteriorObjects, connectHouseInteriorToExterior, HouseInteriorRoomIds } from './regions/house-interior';
import { createForestRegion, createForestObjects, connectForestToExterior, ForestRoomIds } from './regions/forest';
import { createUndergroundRegion, createUndergroundObjects, connectUndergroundToHouse, connectStudioToKitchen, UndergroundRoomIds } from './regions/underground';
import { createDamRegion, createDamObjects, connectDamToRoundRoom, connectDamToFrigidRiver, connectDamToTemple, DamRoomIds } from './regions/dam';
import { createCoalMineRegion, createCoalMineObjects, CoalMineRoomIds } from './regions/coal-mine';
import { createTempleRegion, createTempleObjects, connectTempleToUnderground, connectTempleToWellRoom, connectTempleToFrigidRiver, TempleRoomIds } from './regions/temple';
import { createVolcanoRegion, createVolcanoObjects, connectVolcanoToUnderground, VolcanoRoomIds, VolcanoObjectIds } from './regions/volcano';
import { createBankRegion, connectBankToUnderground, createBankObjects, BankRoomIds } from './regions/bank-of-zork';
import { createWellRoomRegion, createWellRoomObjects, connectWellRoomToRoundRoom, connectCaveToHades, WellRoomIds } from './regions/well-room';
import { createRoundRoomRegion, RoundRoomIds, connectRoundRoomToUnderground, connectRoundRoomToTemple, connectRoundRoomToWellRoom, connectRoundRoomToDam, connectRoundRoomToMaze } from './regions/round-room';
import { createFrigidRiverRegion, connectFrigidRiverToDam, connectRainbowToCanyon, createFrigidRiverObjects, FrigidRiverRoomIds } from './regions/frigid-river';
import { createMazeRegion, connectMazeToClearing, connectCyclopsToLivingRoom, connectMazeToTrollRoom, connectMazeToRoundRoom, createMazeObjects, MazeRoomIds } from './regions/maze';
import { createRoyalPuzzleRegion, connectRoyalPuzzleToTreasureRoom, RoyalPuzzleRoomIds } from './regions/royal-puzzle';
import { createEndgameRegion, createEndgameObjects, EndgameRoomIds } from './regions/endgame';

// Import handlers
import { registerRoyalPuzzleHandler, initializePuzzleState, createPuzzleCommandTransformer, PuzzleHandlerMessages } from './handlers/royal-puzzle';
import { createRainbowCommandTransformer } from './handlers/rainbow-handler';
import { createBalloonExitTransformer } from './handlers/balloon-handler';
import { createRiverEntryTransformer, registerBoatMovementHandler, RiverMessages } from './handlers/river-handler';
import { createFallsDeathTransformer, registerFallsRoom, FallsDeathMessages } from './handlers/falls-death-handler';
import { createTinyRoomDoorTransformer, createTinyRoomMatTransformer, TinyRoomMessages } from './handlers/tiny-room-handler';

// Import NPCs
import { registerThief, ThiefMessages } from './npcs/thief';
import { registerCyclops, CyclopsMessages } from './npcs/cyclops';
import { RobotMessages } from './npcs/robot';
import { registerDungeonMaster, DungeonMasterMessages } from './npcs/dungeon-master';

// Import traits (ADR-090 capability dispatch)
import {
  BasketElevatorTrait,
  BasketLoweringBehavior,
  BasketRaisingBehavior,
  BasketElevatorMessages
} from './traits';

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
  private endgameIds: EndgameRoomIds = {} as EndgameRoomIds;
  private roundRoomIds: RoundRoomIds = {} as RoundRoomIds;
  private balloonIds: VolcanoObjectIds | null = null;
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

    // Note: Trophy case handler is registered in onEngineReady() using EventProcessor

    // Register capability behaviors (ADR-090)
    // Basket elevator uses lowering/raising capability dispatch
    // Check first to avoid duplicate registration (global registry persists across test runs)
    if (!hasCapabilityBehavior(BasketElevatorTrait.type, 'if.action.lowering')) {
      registerCapabilityBehavior(
        BasketElevatorTrait.type,
        'if.action.lowering',
        BasketLoweringBehavior
      );
    }
    if (!hasCapabilityBehavior(BasketElevatorTrait.type, 'if.action.raising')) {
      registerCapabilityBehavior(
        BasketElevatorTrait.type,
        'if.action.raising',
        BasketRaisingBehavior
      );
    }

    // Register reality altered handler (ADR-078 hidden max points)
    registerRealityAlteredHandler(world);

    // Create all rooms
    this.whiteHouseIds = createWhiteHouseRegion(world);
    this.houseInteriorIds = createHouseInteriorRegion(world);
    this.forestIds = createForestRegion(world);
    this.undergroundIds = createUndergroundRegion(world);
    this.damIds = createDamRegion(world);
    this.coalMineIds = createCoalMineRegion(world);
    this.templeIds = createTempleRegion(world);
    this.volcanoIds = createVolcanoRegion(world);
    this.bankIds = createBankRegion(world);
    this.wellRoomIds = createWellRoomRegion(world);
    this.frigidRiverIds = createFrigidRiverRegion(world);
    this.mazeIds = createMazeRegion(world);
    this.royalPuzzleIds = createRoyalPuzzleRegion(world);
    this.endgameIds = createEndgameRegion(world);
    this.roundRoomIds = createRoundRoomRegion(world);

    // Connect regions
    connectHouseInteriorToExterior(world, this.houseInteriorIds, this.whiteHouseIds.behindHouse);
    connectForestToExterior(world, this.forestIds, this.whiteHouseIds.northOfHouse, this.whiteHouseIds.behindHouse);
    connectUndergroundToHouse(world, this.undergroundIds, this.houseInteriorIds.livingRoom);
    connectStudioToKitchen(world, this.undergroundIds, this.houseInteriorIds.kitchen);

    // Round Room is the central hub - connect to all surrounding regions
    connectRoundRoomToUnderground(world, this.roundRoomIds, this.undergroundIds.eastWestPassage);
    connectRoundRoomToTemple(world, this.roundRoomIds, {
      northSouthPassage: this.templeIds.northSouthPassage,
      grailRoom: this.templeIds.grailRoom,
      windingPassage: this.templeIds.windingPassage
    });
    connectRoundRoomToWellRoom(world, this.roundRoomIds, this.wellRoomIds.engravingsCave);
    connectRoundRoomToDam(world, this.roundRoomIds, this.damIds.deepCanyon);
    connectRoundRoomToMaze(world, this.roundRoomIds, this.mazeIds.maze1);

    // Temple connections
    connectTempleToUnderground(world, this.templeIds, this.undergroundIds.chasm);
    connectTempleToWellRoom(world, this.templeIds, this.wellRoomIds.cave);
    connectTempleToFrigidRiver(world, this.templeIds, this.frigidRiverIds.rockyShore);

    // Volcano connects to Underground via rocky crawl
    connectVolcanoToUnderground(world, this.volcanoIds, this.undergroundIds.rockyCrawl);

    // Dam connections
    connectDamToFrigidRiver(world, this.damIds, this.frigidRiverIds.shore);

    // Bank connects to Underground
    connectBankToUnderground(world, this.bankIds, this.undergroundIds.cellar, this.undergroundIds.gallery, this.undergroundIds.northSouthCrawlway);

    // Store bank room IDs in world state for walk-through action
    world.setStateValue('dungeo.bank.roomIds', this.bankIds);

    // Frigid River connections
    connectFrigidRiverToDam(world, this.frigidRiverIds, this.damIds.damBase);
    connectRainbowToCanyon(world, this.frigidRiverIds, this.forestIds.canyonBottom);

    // Maze connections
    connectMazeToClearing(world, this.mazeIds, this.forestIds.clearing);
    connectCyclopsToLivingRoom(world, this.mazeIds, this.houseInteriorIds.livingRoom);
    connectMazeToTrollRoom(world, this.mazeIds, this.undergroundIds.trollRoom);
    connectMazeToRoundRoom(world, this.mazeIds, this.roundRoomIds.roundRoom);

    // Connect Royal Puzzle to Treasure Room
    connectRoyalPuzzleToTreasureRoom(world, this.royalPuzzleIds, this.mazeIds.treasureRoom);

    // Initialize puzzle state in world
    initializePuzzleState(world, this.royalPuzzleIds);

    // Connect Well Room Cave to Entry to Hades (default connection - mirror puzzle)
    connectCaveToHades(world, this.wellRoomIds, this.endgameIds.entryToHades);

    // Create all objects and place them in rooms
    createWhiteHouseObjects(world, this.whiteHouseIds);
    createHouseInteriorObjects(world, this.houseInteriorIds, this.undergroundIds.cellar);
    createForestObjects(world, this.forestIds);
    createUndergroundObjects(world, this.undergroundIds);
    createDamObjects(world, this.damIds);
    createCoalMineObjects(world, this.coalMineIds);
    createTempleObjects(world, this.templeIds);
    this.balloonIds = createVolcanoObjects(world, this.volcanoIds);

    // Balloon PUT handler is registered in onEngineReady() using EventProcessor

    createBankObjects(world, this.bankIds);
    createWellRoomObjects(world, this.wellRoomIds);
    createFrigidRiverObjects(world, this.frigidRiverIds);
    createMazeObjects(world, this.mazeIds);
    createEndgameObjects(world, {
      smallRoom: this.endgameIds.smallRoom,
      stoneRoom: this.endgameIds.stoneRoom,
      parapet: this.endgameIds.parapet,
      insideMirror: this.endgameIds.insideMirror,
      prisonCell: this.endgameIds.prisonCell
    });

    // Initialize Mirror Room state toggle
    this.initializeMirrorRoomHandler(world);

    // Register glacier handler (throw torch at glacier puzzle)
    registerGlacierHandler(world, this.volcanoIds.glacierRoom, this.volcanoIds.volcanoView);

    // Register reservoir exit handler (dam draining opens reservoir path)
    registerReservoirExitHandler(world, {
      dam: this.damIds.dam,
      maintenanceRoom: this.damIds.maintenanceRoom,
      reservoirSouth: this.damIds.reservoirSouth,
      reservoir: this.damIds.reservoir,
      reservoirNorth: this.damIds.reservoirNorth
    });

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
    const mirrorRoom = world.getEntity(this.templeIds.mirrorRoom);
    if (!mirrorRoom) return;

    const contents = world.getContents(this.templeIds.mirrorRoom);
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
      mirrorRoomId: this.templeIds.mirrorRoom,
      mirrorId: mirror.id,

      // State A destinations (Grail Room/Hades)
      stateA: {
        north: this.templeIds.narrowCrawlway,
        west: this.templeIds.windingPassage,
        east: this.wellRoomIds.cave  // Leads down to Hades
      },

      // State B destinations (Coal Mine)
      stateB: {
        north: this.coalMineIds.steepCrawlway,
        west: this.coalMineIds.coldPassage,
        east: this.templeIds.smallCave  // Leads down to Atlantis
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

    // Register "under" as a preposition for the Tiny Room puzzle
    // This allows "put X under Y" to be parsed correctly
    parser.addPreposition('under');
    parser.addPreposition('beneath');

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
      'ah', 'tk', 'ar', 'af', 'ac', 'aa', 'ax', 'av', 'an', 'az', 'pd', 'kl'
    ];

    // Commands that take two arguments
    const twoArgCodes = ['ao', 'pz', 'tq'];

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

    // Bare magic words (mainframe Zork style - no "say" prefix needed)
    // echo - Loud Room puzzle
    grammar
      .define('echo')
      .mapsTo(SAY_ACTION_ID)
      .withPriority(155)
      .build();

    // ulysses/odysseus - Cyclops puzzle
    grammar
      .define('ulysses')
      .mapsTo(SAY_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('odysseus')
      .mapsTo(SAY_ACTION_ID)
      .withPriority(155)
      .build();

    // xyzzy - classic Adventure reference (does nothing in Zork)
    grammar
      .define('xyzzy')
      .mapsTo(SAY_ACTION_ID)
      .withPriority(155)
      .build();

    // Commanding action (Robot commands - FORTRAN Zork)
    // "tell robot to push button", "robot, follow me", "order robot to stay"
    // Note: :command... (greedy syntax) already implies text capture, no .text() needed
    grammar
      .define('tell :npc to :command...')
      .where('npc', (scope: ScopeBuilder) => scope.visible().matching({ animate: true }))
      .mapsTo(COMMANDING_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('order :npc to :command...')
      .where('npc', (scope: ScopeBuilder) => scope.visible().matching({ animate: true }))
      .mapsTo(COMMANDING_ACTION_ID)
      .withPriority(150)
      .build();

    // Note: Pattern ":npc, :command..." removed - patterns can't start with slots
    // Use "tell robot to X" or "order robot to X" instead

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

    // Push wall action (Royal Puzzle) - uses direction slot type
    // Handles: "push n wall", "push north wall", "push the east wall", etc.
    grammar
      .define('push :direction wall')
      .direction('direction')
      .mapsTo(PUSH_WALL_ACTION_ID)
      .withPriority(160)
      .build();

    grammar
      .define('push the :direction wall')
      .direction('direction')
      .mapsTo(PUSH_WALL_ACTION_ID)
      .withPriority(160)
      .build();

    // ADR-078: Ghost Ritual puzzle actions
    // Break action - for breaking the empty frame
    grammar
      .define('break :target')
      .mapsTo(BREAK_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('smash :target')
      .mapsTo(BREAK_ACTION_ID)
      .withPriority(150)
      .build();

    // Burn action - for burning incense
    grammar
      .define('burn :target')
      .mapsTo(BURN_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('light :target')
      .mapsTo(BURN_ACTION_ID)
      .withPriority(145) // Lower than stdlib LIGHT for lantern
      .build();

    // Pray action - for blessing the basin
    grammar
      .define('pray')
      .mapsTo(PRAY_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('pray at :target')
      .mapsTo(PRAY_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('pray to :target')
      .mapsTo(PRAY_ACTION_ID)
      .withPriority(155)
      .build();

    // INCANT action (endgame cheat command)
    // "incant mhoram dfnobo", "incant dnzhuo ideqtq"
    // Uses ADR-080 text slots - args are raw text, not entity references
    grammar
      .define('incant :challenge :response')
      .text('challenge')
      .text('response')
      .mapsTo(INCANT_ACTION_ID)
      .withPriority(200)
      .build();

    // LIFT action (Inside Mirror pole)
    // Note: Generic "lift/raise :target" patterns removed to allow stdlib
    // capability dispatch (ADR-090) for objects like the basket elevator.
    // Only pole-specific patterns remain for the Inside Mirror puzzle.
    grammar
      .define('lift pole')
      .mapsTo(LIFT_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('raise pole')
      .mapsTo(LIFT_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('lift short pole')
      .mapsTo(LIFT_ACTION_ID)
      .withPriority(156)
      .build();

    grammar
      .define('raise short pole')
      .mapsTo(LIFT_ACTION_ID)
      .withPriority(156)
      .build();

    // LOWER action (Inside Mirror pole)
    // Note: Generic "lower :target" pattern removed to allow stdlib
    // capability dispatch (ADR-090) for objects like the basket elevator.
    grammar
      .define('lower pole')
      .mapsTo(LOWER_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('lower short pole')
      .mapsTo(LOWER_ACTION_ID)
      .withPriority(156)
      .build();

    // GO IN (Inside Mirror entry from Hallway)
    // Note: This is handled by a command transformer that intercepts
    // the going action when player is in Hallway and direction is IN

    // PUSH PANEL action (Inside Mirror wall panels)
    // These have higher priority than stdlib push to bypass scenery check
    grammar
      .define('push red panel')
      .mapsTo(PUSH_PANEL_ACTION_ID)
      .withPriority(170)
      .build();

    grammar
      .define('push red wall')
      .mapsTo(PUSH_PANEL_ACTION_ID)
      .withPriority(170)
      .build();

    grammar
      .define('push red')
      .mapsTo(PUSH_PANEL_ACTION_ID)
      .withPriority(170)
      .build();

    grammar
      .define('push yellow panel')
      .mapsTo(PUSH_PANEL_ACTION_ID)
      .withPriority(170)
      .build();

    grammar
      .define('push yellow wall')
      .mapsTo(PUSH_PANEL_ACTION_ID)
      .withPriority(170)
      .build();

    grammar
      .define('push yellow')
      .mapsTo(PUSH_PANEL_ACTION_ID)
      .withPriority(170)
      .build();

    grammar
      .define('push mahogany panel')
      .mapsTo(PUSH_PANEL_ACTION_ID)
      .withPriority(170)
      .build();

    grammar
      .define('push mahogany wall')
      .mapsTo(PUSH_PANEL_ACTION_ID)
      .withPriority(170)
      .build();

    grammar
      .define('push mahogany')
      .mapsTo(PUSH_PANEL_ACTION_ID)
      .withPriority(170)
      .build();

    grammar
      .define('push pine panel')
      .mapsTo(PUSH_PANEL_ACTION_ID)
      .withPriority(170)
      .build();

    grammar
      .define('push pine wall')
      .mapsTo(PUSH_PANEL_ACTION_ID)
      .withPriority(170)
      .build();

    grammar
      .define('push pine')
      .mapsTo(PUSH_PANEL_ACTION_ID)
      .withPriority(170)
      .build();

    // Note: No generic "push :target wall" pattern - we only support explicit
    // panel colors (red/yellow/mahogany/pine) for Inside Mirror and explicit
    // directions (north/south/east/west) for Royal Puzzle. This prevents
    // ambiguity where "push east wall" would incorrectly match the panel action.

    // KNOCK action (Dungeon Master trivia trigger)
    grammar
      .define('knock')
      .mapsTo(KNOCK_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('knock on :target')
      .mapsTo(KNOCK_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('knock on door')
      .mapsTo(KNOCK_ACTION_ID)
      .withPriority(160)
      .build();

    grammar
      .define('knock on the door')
      .mapsTo(KNOCK_ACTION_ID)
      .withPriority(160)
      .build();

    grammar
      .define('knock door')
      .mapsTo(KNOCK_ACTION_ID)
      .withPriority(155)
      .build();

    // ANSWER action (Trivia responses) - uses greedy text slot (:text... syntax)
    // Note: Don't call .text() - the :text... syntax already sets TEXT_GREEDY
    grammar
      .define('answer :text...')
      .mapsTo(ANSWER_ACTION_ID)
      .withPriority(150)
      .build();

    // SET DIAL action (Parapet dial puzzle)
    // "set dial to 4", "turn dial to 6", "turn indicator to 8"
    grammar
      .define('set dial to :number')
      .text('number')
      .mapsTo(SET_DIAL_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('turn dial to :number')
      .text('number')
      .mapsTo(SET_DIAL_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('set indicator to :number')
      .text('number')
      .mapsTo(SET_DIAL_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('turn indicator to :number')
      .text('number')
      .mapsTo(SET_DIAL_ACTION_ID)
      .withPriority(150)
      .build();

    // PUSH DIAL BUTTON action (Parapet dial puzzle)
    // Only specific patterns to avoid interfering with laser puzzle button
    grammar
      .define('push dial button')
      .mapsTo(PUSH_DIAL_BUTTON_ACTION_ID)
      .withPriority(165)
      .build();

    grammar
      .define('press dial button')
      .mapsTo(PUSH_DIAL_BUTTON_ACTION_ID)
      .withPriority(165)
      .build();

    grammar
      .define('push the dial button')
      .mapsTo(PUSH_DIAL_BUTTON_ACTION_ID)
      .withPriority(165)
      .build();

    grammar
      .define('press the dial button')
      .mapsTo(PUSH_DIAL_BUTTON_ACTION_ID)
      .withPriority(165)
      .build();

    grammar
      .define('push sundial button')
      .mapsTo(PUSH_DIAL_BUTTON_ACTION_ID)
      .withPriority(165)
      .build();

    grammar
      .define('press sundial button')
      .mapsTo(PUSH_DIAL_BUTTON_ACTION_ID)
      .withPriority(165)
      .build();

    // WAVE action (Rainbow puzzle - wave sceptre at falls)
    grammar
      .define('wave :target')
      .mapsTo(WAVE_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('wave :target at :location')
      .mapsTo(WAVE_ACTION_ID)
      .withPriority(155)
      .build();

    // DIG action (Buried treasure - dig with shovel)
    grammar
      .define('dig')
      .mapsTo(DIG_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('dig with :tool')
      .mapsTo(DIG_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('dig :target')
      .mapsTo(DIG_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('dig in :target')
      .mapsTo(DIG_ACTION_ID)
      .withPriority(150)
      .build();

    // WIND action (Canary/bauble - wind clockwork canary)
    grammar
      .define('wind :target')
      .mapsTo(WIND_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('wind up :target')
      .mapsTo(WIND_ACTION_ID)
      .withPriority(155)
      .build();

    // SEND action (Mail order puzzle - send for brochure)
    grammar
      .define('send for brochure')
      .mapsTo(SEND_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('send for free brochure')
      .mapsTo(SEND_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('order brochure')
      .mapsTo(SEND_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('mail order')
      .mapsTo(SEND_ACTION_ID)
      .withPriority(145)
      .build();

    // POUR action (Bucket/Well puzzle - pour water to rise)
    grammar
      .define('pour :target')
      .mapsTo(POUR_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('pour water')
      .mapsTo(POUR_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('pour water in :container')
      .mapsTo(POUR_ACTION_ID)
      .withPriority(160)
      .build();

    grammar
      .define('pour water into :container')
      .mapsTo(POUR_ACTION_ID)
      .withPriority(160)
      .build();

    grammar
      .define('pour :target in :container')
      .mapsTo(POUR_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('pour :target into :container')
      .mapsTo(POUR_ACTION_ID)
      .withPriority(155)
      .build();

    // FILL action (Bucket/Well puzzle - fill bottle to descend)
    grammar
      .define('fill :target')
      .mapsTo(FILL_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('fill bottle')
      .mapsTo(FILL_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('fill :target from :source')
      .mapsTo(FILL_ACTION_ID)
      .withPriority(160)
      .build();

    grammar
      .define('fill bottle from bucket')
      .mapsTo(FILL_ACTION_ID)
      .withPriority(165)
      .build();

    grammar
      .define('fill bottle with water')
      .mapsTo(FILL_ACTION_ID)
      .withPriority(160)
      .build();

    // LIGHT action (Balloon puzzle - light objects with fire source)
    // Higher priority than "light :target" (BURN at 145) since this has a tool
    grammar
      .define('light :object with :tool')
      .mapsTo(LIGHT_ACTION_ID)
      .withPriority(160)
      .build();

    grammar
      .define('set fire to :object with :tool')
      .mapsTo(LIGHT_ACTION_ID)
      .withPriority(160)
      .build();

    grammar
      .define('ignite :object with :tool')
      .mapsTo(LIGHT_ACTION_ID)
      .withPriority(160)
      .build();

    // TIE action (Balloon puzzle - tie rope to hooks)
    grammar
      .define('tie :object to :target')
      .mapsTo(TIE_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('tie :object')
      .mapsTo(TIE_ACTION_ID)
      .withPriority(145)
      .build();

    grammar
      .define('fasten :object to :target')
      .mapsTo(TIE_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('attach :object to :target')
      .mapsTo(TIE_ACTION_ID)
      .withPriority(150)
      .build();

    // UNTIE action (Balloon puzzle - untie rope from hooks)
    grammar
      .define('untie :object')
      .mapsTo(UNTIE_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('untie :object from :target')
      .mapsTo(UNTIE_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('unfasten :object')
      .mapsTo(UNTIE_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('detach :object')
      .mapsTo(UNTIE_ACTION_ID)
      .withPriority(150)
      .build();

    // Press button patterns (dam maintenance room)
    // Use "press :target" which won't conflict with stdlib "push" patterns
    // This handles "press yellow", "press button", "press the yellow button", etc.
    grammar
      .define('press :target')
      .mapsTo(PRESS_BUTTON_ACTION_ID)
      .withPriority(150)
      .build();

    // Turn bolt patterns (dam) - use literal "bolt" to avoid "turn on lantern" conflict
    grammar
      .define('turn bolt')
      .mapsTo(TURN_BOLT_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('turn the bolt')
      .mapsTo(TURN_BOLT_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('turn bolt with :instrument')
      .instrument('instrument')
      .mapsTo(TURN_BOLT_ACTION_ID)
      .withPriority(155)
      .build();

    // Turn switch patterns (coal machine)
    grammar
      .define('turn switch')
      .mapsTo(TURN_SWITCH_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('turn the switch')
      .mapsTo(TURN_SWITCH_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('flip switch')
      .mapsTo(TURN_SWITCH_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('flip the switch')
      .mapsTo(TURN_SWITCH_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('activate machine')
      .mapsTo(TURN_SWITCH_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('activate the machine')
      .mapsTo(TURN_SWITCH_ACTION_ID)
      .withPriority(150)
      .build();

    // Tiny Room puzzle patterns - PUT UNDER
    grammar
      .define('put :item under :target')
      .mapsTo(PUT_UNDER_ACTION_ID)
      .withPriority(160)
      .build();

    grammar
      .define('slide :item under :target')
      .mapsTo(PUT_UNDER_ACTION_ID)
      .withPriority(160)
      .build();

    grammar
      .define('put mat under door')
      .mapsTo(PUT_UNDER_ACTION_ID)
      .withPriority(165)
      .build();

    grammar
      .define('slide mat under door')
      .mapsTo(PUT_UNDER_ACTION_ID)
      .withPriority(165)
      .build();

    // Tiny Room puzzle patterns - PUSH KEY WITH
    grammar
      .define('push key with :tool')
      .mapsTo(PUSH_KEY_ACTION_ID)
      .withPriority(160)
      .build();

    grammar
      .define('push key with screwdriver')
      .mapsTo(PUSH_KEY_ACTION_ID)
      .withPriority(165)
      .build();

    grammar
      .define('use :tool on keyhole')
      .mapsTo(PUSH_KEY_ACTION_ID)
      .withPriority(160)
      .build();

    grammar
      .define('use screwdriver on keyhole')
      .mapsTo(PUSH_KEY_ACTION_ID)
      .withPriority(165)
      .build();

    grammar
      .define('poke key with :tool')
      .mapsTo(PUSH_KEY_ACTION_ID)
      .withPriority(160)
      .build();

    grammar
      .define('push key through keyhole')
      .mapsTo(PUSH_KEY_ACTION_ID)
      .withPriority(165)
      .build();

    // INFLATE action (Boat puzzle - inflate boat with pump)
    grammar
      .define('inflate :target')
      .mapsTo(INFLATE_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('inflate :target with :tool')
      .mapsTo(INFLATE_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('pump :target')
      .mapsTo(INFLATE_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('pump up :target')
      .mapsTo(INFLATE_ACTION_ID)
      .withPriority(155)
      .build();

    // DEFLATE action (Boat puzzle - deflate boat by opening valve)
    grammar
      .define('deflate :target')
      .mapsTo(DEFLATE_ACTION_ID)
      .withPriority(150)
      .build();

    grammar
      .define('open valve')
      .mapsTo(DEFLATE_ACTION_ID)
      .withPriority(155)
      .build();

    grammar
      .define('let air out of :target')
      .mapsTo(DEFLATE_ACTION_ID)
      .withPriority(155)
      .build();

    // BOARD/DISEMBARK aliases for ENTER/EXIT (boat navigation)
    grammar
      .define('board :target')
      .mapsTo('if.action.entering')
      .withPriority(150)
      .build();

    grammar
      .define('board boat')
      .mapsTo('if.action.entering')
      .withPriority(155)
      .build();

    grammar
      .define('disembark')
      .mapsTo('if.action.exiting')
      .withPriority(150)
      .build();

    grammar
      .define('leave boat')
      .mapsTo('if.action.exiting')
      .withPriority(150)
      .build();

    grammar
      .define('get out of boat')
      .mapsTo('if.action.exiting')
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

    // Maintenance room flooding (blue button death trap)
    language.addMessage(FloodingMessages.LEAK_STARTED, 'There is a rumbling sound, and a stream of water appears to burst from the east wall of the room (apparently, a leak has occurred in a pipe).');
    language.addMessage(FloodingMessages.WATER_ANKLES, 'The water level is now up to your ankles.');
    language.addMessage(FloodingMessages.WATER_SHINS, 'The water level is now up to your shins.');
    language.addMessage(FloodingMessages.WATER_KNEES, 'The water level is now up to your knees.');
    language.addMessage(FloodingMessages.WATER_HIPS, 'The water level is now up to your hips.');
    language.addMessage(FloodingMessages.WATER_WAIST, 'The water level is now up to your waist.');
    language.addMessage(FloodingMessages.WATER_CHEST, 'The water level is now up to your chest.');
    language.addMessage(FloodingMessages.WATER_NECK, 'The water level is now up to your neck.');
    language.addMessage(FloodingMessages.WATER_HEAD, 'The water level is now over your head.');
    language.addMessage(FloodingMessages.ROOM_FLOODED, 'The room is full of water and cannot be entered.');
    language.addMessage(FloodingMessages.DROWNED, "I'm afraid you have done drowned yourself.");
    language.addMessage(FloodingMessages.BUTTON_JAMMED, 'The blue button appears to be jammed.');

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
    language.addMessage(RobotMessages.ARRIVES, 'The robot enters.');
    language.addMessage(RobotMessages.TAKES_OBJECT, 'The robot takes the {objectName}.');
    language.addMessage(RobotMessages.DROPS_OBJECT, 'The robot drops the {objectName}.');
    language.addMessage(RobotMessages.CAROUSEL_FIXED, 'You hear a grinding noise from somewhere nearby. The carousel mechanism has stopped spinning!');

    // Commanding action messages (FORTRAN Zork robot commands)
    language.addMessage(CommandingMessages.NO_TARGET, 'Command whom?');
    language.addMessage(CommandingMessages.CANT_COMMAND, 'You cannot command that.');
    language.addMessage(CommandingMessages.CANT_SEE, "You don't see that here.");
    language.addMessage(CommandingMessages.WHIRR_BUZZ_CLICK, '"Whirr, buzz, click!"');
    language.addMessage(CommandingMessages.STUPID_ROBOT, '"I am only a stupid robot and cannot perform that command."');

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

    // Royal Puzzle messages
    language.addMessage(PuzzleHandlerMessages.ENTER_PUZZLE, 'You squeeze through the narrow hole and find yourself in a confusing maze of sandstone walls.');
    language.addMessage(PuzzleHandlerMessages.EXIT_PUZZLE, 'You climb the ladder and squeeze back through the hole in the ceiling.');
    language.addMessage(PuzzleHandlerMessages.CANT_EXIT, 'There is no way to reach the hole in the ceiling.');
    language.addMessage(PuzzleHandlerMessages.MOVE_BLOCKED, 'You cannot go that way.');
    language.addMessage(PuzzleHandlerMessages.MOVE_SUCCESS, 'OK.');
    language.addMessage(PuzzleHandlerMessages.ROOM_DESCRIPTION, '{text}');
    language.addMessage(PuzzleHandlerMessages.TAKE_CARD, 'You carefully extract the gold card from its depression in the wall.');
    language.addMessage(PuzzleHandlerMessages.CANT_TAKE_CARD, 'You are not close enough to reach the card.');
    language.addMessage(PuzzleHandlerMessages.PUSH_SUCCESS, 'The sandstone wall slides into the space beyond.');
    language.addMessage(PuzzleHandlerMessages.PUSH_NO_WALL, 'There is no wall there.');
    language.addMessage(PuzzleHandlerMessages.PUSH_IMMOVABLE, 'The marble wall is unyielding.');
    language.addMessage(PuzzleHandlerMessages.PUSH_NO_ROOM, 'There is no room for the wall to slide.');

    // Push wall action messages
    language.addMessage(PushWallMessages.NOT_IN_PUZZLE, 'There are no walls to push here.');
    language.addMessage(PushWallMessages.NO_DIRECTION, 'Push which wall?');
    language.addMessage(PushWallMessages.INVALID_DIRECTION, 'That is not a valid direction.');
    language.addMessage(PushWallMessages.NO_WALL, 'There is no wall in that direction.');
    language.addMessage(PushWallMessages.IMMOVABLE, 'That wall is solid marble. It will not budge.');
    language.addMessage(PushWallMessages.NO_ROOM, 'There is no room for the wall to slide.');
    language.addMessage(PushWallMessages.BOUNDARY, 'You cannot push walls at the edge.');
    language.addMessage(PushWallMessages.SUCCESS, 'The sandstone wall slides into the space beyond.');
    language.addMessage(PushWallMessages.SUCCESS_FIRST, 'The sandstone wall slides into the space beyond. You step into the vacated space.');
    language.addMessage(PushWallMessages.LADDER_VISIBLE, 'One of the sandstone walls has a wooden ladder attached to it.');
    language.addMessage(PushWallMessages.CARD_VISIBLE, 'Set into one wall is a small depression. Within it rests a gold card.');

    // ADR-078: Ghost Ritual puzzle messages

    // Thief frame spawn
    language.addMessage('dungeo.thief.frame_spawns', 'As the thief falls, an ornate but empty picture frame crashes to the ground.');

    // Break action messages
    language.addMessage(BreakMessages.BREAK_SUCCESS, 'You break the {target}.');
    language.addMessage(BreakMessages.BREAK_FRAME, 'The frame shatters! Among the debris, you find a carved piece bearing strange symbols: "Only devotion can reveal my location."');
    language.addMessage(BreakMessages.CANT_BREAK, "You can't break that.");
    language.addMessage(BreakMessages.NO_TARGET, 'Break what?');
    language.addMessage(BreakMessages.NOT_VISIBLE, "You don't see that here.");

    // Burn action messages
    language.addMessage(BurnMessages.BURN_SUCCESS, 'You burn the {target}.');
    language.addMessage(BurnMessages.BURN_INCENSE, 'The incense begins to smolder, releasing fragrant smoke that fills the room.');
    language.addMessage(BurnMessages.ALREADY_BURNING, 'It is already burning.');
    language.addMessage(BurnMessages.BURNED_OUT, 'The incense has already burned out.');
    language.addMessage(BurnMessages.CANT_BURN, "You can't burn that.");
    language.addMessage(BurnMessages.NO_TARGET, 'Burn what?');
    language.addMessage(BurnMessages.NOT_VISIBLE, "You don't see that here.");

    // Incense fuse messages
    language.addMessage(DungeoSchedulerMessages.INCENSE_BURNING, 'The incense continues to smolder.');
    language.addMessage(DungeoSchedulerMessages.INCENSE_BURNS_OUT, 'The incense sputters and burns out completely, leaving only ash.');

    // Pray action messages
    language.addMessage(PrayMessages.PRAY_GENERIC, 'If you pray hard enough, your prayers may be answered.');
    language.addMessage(PrayMessages.PRAY_TELEPORT, 'In a shocking development, your prayer is answered!');

    // Ghost ritual messages
    language.addMessage(GhostRitualMessages.GHOST_APPEARS, 'The fragrant smoke swirls around the basin. A spectral figure rises - the ghost of the thief! Dressed in adventurer\'s robes, he gestures toward the Gallery and speaks: "Well done, my friend. You are nearing the end game. Look to the Gallery for your reward." Then he fades away...');
    language.addMessage(GhostRitualMessages.CANVAS_SPAWNS, 'A magnificent rolled up canvas has appeared in the Gallery!');
    language.addMessage(GhostRitualMessages.WRONG_ITEM, 'The spirit laughs mockingly: "As we said, you have no rights here!" The item vanishes.');
    language.addMessage(GhostRitualMessages.NOT_BLESSED, 'Nothing happens. The basin remains still.');

    // ADR-078: Hidden max points system
    language.addMessage(RealityAlteredMessages.REALITY_ALTERED, 'The death of the thief seems to alter reality in some subtle way...');

    // INCANT cheat command messages
    language.addMessage(IncantMessages.success, 'A hollow voice speaks: "Greetings, Implementor." You feel disoriented as reality shifts around you...');
    language.addMessage(IncantMessages.failure, 'Nothing happens.');
    language.addMessage(IncantMessages.syntax, 'The spell fizzles. (Usage: INCANT <challenge> <response>)');

    // Endgame trigger messages (Crypt darkness ritual)
    language.addMessage(EndgameTriggerMessages.DARKNESS_DESCENDS, 'The darkness seems to press in around you. You sense a presence watching from the shadows...');
    language.addMessage(EndgameTriggerMessages.CLOAKED_FIGURE, 'A cloaked figure appears from the shadows! "So, you have discovered the secret. Your quest is nearly at an end, but the final challenge awaits." The figure gestures, and reality dissolves around you...');
    language.addMessage(EndgameTriggerMessages.TELEPORT, 'When your vision clears, you find yourself in a completely different place.');
    language.addMessage(EndgameTriggerMessages.ENDGAME_BEGINS, 'The endgame has begun. Your score is now 15 out of a possible 100.');

    // Laser puzzle messages (Small Room / Stone Room)
    language.addMessage(LaserPuzzleMessages.BEAM_BROKEN, 'The sword falls through the beam of light, breaking it. The beam flickers and dies.');
    language.addMessage(LaserPuzzleMessages.BEAM_ACTIVE, 'A narrow red beam of light crosses the room at the north end.');
    language.addMessage(LaserPuzzleMessages.BUTTON_LASER_ACTIVE, 'You push the button, but nothing happens.');
    language.addMessage(LaserPuzzleMessages.BUTTON_PRESSED, 'There is a rumbling sound from the north.');
    language.addMessage(LaserPuzzleMessages.BUTTON_ALREADY_PRESSED, 'The button has already been pushed.');
    language.addMessage(LaserPuzzleMessages.LOOK_BEAM_ACTIVE, 'A narrow red beam of light crosses the room at the north end, inches above the floor.');
    language.addMessage(LaserPuzzleMessages.LOOK_BEAM_BROKEN, 'The beam of light is no longer visible.');

    // Inside Mirror puzzle messages
    language.addMessage(InsideMirrorMessages.POLE_RAISED, 'You raise the short pole until it is almost touching the ceiling.');
    language.addMessage(InsideMirrorMessages.POLE_LOWERED_CHANNEL, 'The short pole slides smoothly into the stone channel and clicks into place.');
    language.addMessage(InsideMirrorMessages.POLE_LOWERED_FLOOR, 'The short pole falls to the floor with a clunk. It doesn\'t fit into the channel at this angle.');
    language.addMessage(InsideMirrorMessages.POLE_ALREADY_RAISED, 'The pole is already raised.');
    language.addMessage(InsideMirrorMessages.POLE_ALREADY_LOWERED, 'The pole is already lowered.');
    language.addMessage(InsideMirrorMessages.POLE_CANT_LOWER, 'You can\'t lower the pole right now.');
    language.addMessage(InsideMirrorMessages.BOX_ROTATES, 'The structure rotates with a grinding sound. The T-bar arrow now points {direction}.');
    language.addMessage(InsideMirrorMessages.BOX_MOVES, 'The structure slides along the groove with a rumbling sound.');
    language.addMessage(InsideMirrorMessages.BOX_CANT_ROTATE, 'The structure won\'t rotate. The pole is locking it in place.');
    language.addMessage(InsideMirrorMessages.BOX_CANT_MOVE_UNLOCKED, 'The structure wobbles but doesn\'t move. The pole must be lowered into the channel first.');
    language.addMessage(InsideMirrorMessages.BOX_CANT_MOVE_ORIENTATION, 'The structure is not aligned with the groove. It won\'t slide.');
    language.addMessage(InsideMirrorMessages.BOX_AT_END, 'The structure has reached the end of the groove.');
    language.addMessage(InsideMirrorMessages.ENTER_MIRROR, 'You step into the strange wooden structure.');
    language.addMessage(InsideMirrorMessages.EXIT_MIRROR, 'You climb out of the structure to the north.');
    language.addMessage(InsideMirrorMessages.CANT_EXIT, 'You can\'t exit that way. The structure is not properly positioned.');
    language.addMessage(InsideMirrorMessages.NO_MIRROR_HERE, 'There is no structure here to enter.');
    language.addMessage(InsideMirrorMessages.TBAR_DIRECTION, 'The arrow on the T-bar points {direction}.');

    // Lift/Lower action messages
    language.addMessage(LiftMessages.CANT_LIFT, 'You can\'t lift that.');
    language.addMessage(LiftMessages.NO_TARGET, 'Lift what?');
    language.addMessage(LiftMessages.NOT_VISIBLE, 'You don\'t see that here.');
    language.addMessage(LiftMessages.NOT_IN_MIRROR, 'There is nothing here to lift.');
    language.addMessage(LowerMessages.CANT_LOWER, 'You can\'t lower that.');
    language.addMessage(LowerMessages.NO_TARGET, 'Lower what?');
    language.addMessage(LowerMessages.NOT_VISIBLE, 'You don\'t see that here.');
    language.addMessage(LowerMessages.NOT_IN_MIRROR, 'There is nothing here to lower.');

    // Push panel action messages
    language.addMessage(PushPanelMessages.NOT_IN_MIRROR, 'There are no panels to push here.');
    language.addMessage(PushPanelMessages.NO_TARGET, 'Push which panel?');
    language.addMessage(PushPanelMessages.NOT_VISIBLE, 'You don\'t see a {target} here.');
    language.addMessage(PushPanelMessages.NOT_A_PANEL, 'That isn\'t a panel you can push.');

    // Dungeon Master NPC messages
    language.addMessage(DungeonMasterMessages.DESCRIPTION, 'A strange old man with a long, flowing beard and penetrating eyes.');
    language.addMessage(DungeonMasterMessages.APPEARS_AT_DOOR, 'The barred panel in the door slides open, revealing a strange old man with a long, flowing beard and penetrating eyes. He speaks in a deep, resonant voice.');
    language.addMessage(DungeonMasterMessages.FOLLOWING, 'The Dungeon Master follows you.');
    language.addMessage(DungeonMasterMessages.STAYING, 'The Dungeon Master nods and remains where he is.');
    language.addMessage(DungeonMasterMessages.SETS_DIAL, 'The Dungeon Master turns the dial to {dialValue}.');
    language.addMessage(DungeonMasterMessages.PUSHES_BUTTON, 'The Dungeon Master pushes the button. You hear machinery grinding somewhere below.');
    language.addMessage(DungeonMasterMessages.CANNOT_DO_THAT, 'The Dungeon Master shakes his head slowly.');

    // Trivia question messages (based on FORTRAN source)
    language.addMessage(DungeonMasterMessages.QUESTION_0, '"What room can one enter, but yet not enter, and reach the lair of the thief?"');
    language.addMessage(DungeonMasterMessages.QUESTION_1, '"Where, besides the temple, can one end up after going through the altar?"');
    language.addMessage(DungeonMasterMessages.QUESTION_2, '"What is the minimum total value of the zorkmid treasures in the game?"');
    language.addMessage(DungeonMasterMessages.QUESTION_3, '"What item enables one to determine the function of the various cakes?"');
    language.addMessage(DungeonMasterMessages.QUESTION_4, '"What is a useful thing to do with the mirror?"');
    language.addMessage(DungeonMasterMessages.QUESTION_5, '"What body part offends the spirits in the land of the dead?"');
    language.addMessage(DungeonMasterMessages.QUESTION_6, '"What object in the game is haunted?"');
    language.addMessage(DungeonMasterMessages.QUESTION_7, '"Is the phrase \'hello sailor\' useful anywhere in the game?"');

    // Trivia response messages
    language.addMessage(DungeonMasterMessages.CORRECT_ANSWER, 'The old man nods approvingly. "Correct."');
    language.addMessage(DungeonMasterMessages.WRONG_ANSWER_1, 'The old man frowns. "That is not correct. Think carefully."');
    language.addMessage(DungeonMasterMessages.WRONG_ANSWER_2, 'The old man shakes his head. "Wrong again. You have three more chances."');
    language.addMessage(DungeonMasterMessages.WRONG_ANSWER_3, 'The old man sighs. "Still incorrect. Two chances remain."');
    language.addMessage(DungeonMasterMessages.WRONG_ANSWER_4, 'The old man looks disappointed. "Wrong. This is your last chance."');
    language.addMessage(DungeonMasterMessages.WRONG_ANSWER_5, 'The old man waves his hand dismissively. "You have failed. The door shall remain closed to you forever."');
    language.addMessage(DungeonMasterMessages.TRIVIA_PASSED, 'The old man smiles warmly. "You have proven your knowledge. Enter, friend, and face the final challenge."');
    language.addMessage(DungeonMasterMessages.TRIVIA_FAILED, 'The panel slides shut. You are not worthy to continue.');
    language.addMessage(DungeonMasterMessages.DOOR_OPENS, 'The wooden door swings open with a creak.');
    language.addMessage(DungeonMasterMessages.NO_ANSWER_YET, 'You must first knock on the door to begin the challenge.');
    language.addMessage(DungeonMasterMessages.ALREADY_PASSED, 'You have already passed the challenge. The door is open.');

    // Knock action messages
    language.addMessage(KnockMessages.KNOCK_GENERIC, 'You knock, but no one answers.');
    language.addMessage(KnockMessages.KNOCK_DOOR, 'You knock on the door.');
    language.addMessage(KnockMessages.DM_APPEARS, 'The barred panel in the door slides open, revealing a strange old man with a long, flowing beard. He speaks: "I am the Dungeon Master. To prove yourself worthy of entry, you must answer my questions correctly. Three correct answers will grant you passage; five wrong answers will seal your fate."');
    language.addMessage(KnockMessages.DM_ALREADY_APPEARED, 'The Dungeon Master waits for your answer.');
    language.addMessage(KnockMessages.TRIVIA_ALREADY_PASSED, 'The door is already open. You may proceed.');
    language.addMessage(KnockMessages.TRIVIA_ALREADY_FAILED, 'The door remains sealed. You have already failed the challenge.');
    language.addMessage(KnockMessages.NOTHING_TO_KNOCK, 'There is nothing here to knock on.');

    // Answer action messages
    language.addMessage(AnswerMessages.NO_QUESTION, 'There is no question to answer.');
    language.addMessage(AnswerMessages.NO_ANSWER_GIVEN, 'Answer what?');
    language.addMessage(AnswerMessages.TRIVIA_NOT_STARTED, 'You must first knock on the door to begin the challenge.');
    language.addMessage(AnswerMessages.TRIVIA_ALREADY_PASSED, 'You have already passed the challenge.');
    language.addMessage(AnswerMessages.TRIVIA_ALREADY_FAILED, 'You have already failed the challenge. There are no more questions.');

    // Set Dial action messages (Parapet puzzle)
    language.addMessage(SetDialMessages.SET_DIAL, 'You turn the dial to {dialValue}.');
    language.addMessage(SetDialMessages.DIAL_MUST_BE_1_TO_8, 'The dial only has numbers one through eight.');
    language.addMessage(SetDialMessages.NOT_AT_PARAPET, 'There is no dial here.');
    language.addMessage(SetDialMessages.NO_DIAL_HERE, 'There is no dial here.');

    // Push Dial Button action messages (Parapet puzzle)
    language.addMessage(PushDialButtonMessages.PUSH_BUTTON, 'You push the button in the center of the dial.');
    language.addMessage(PushDialButtonMessages.MACHINERY_SOUNDS, 'You hear grinding machinery somewhere below, as the cells around the pit rotate.');
    language.addMessage(PushDialButtonMessages.CELL_ROTATES, 'Cell {dialSetting} is now in position.');
    language.addMessage(PushDialButtonMessages.NOT_AT_PARAPET, 'There is no button here to push.');
    language.addMessage(PushDialButtonMessages.NO_BUTTON, 'There is no button here.');

    // Victory messages (Treasury of Zork)
    language.addMessage(VictoryMessages.ENTER_TREASURY, 'You have entered the Treasury of Zork!');
    language.addMessage(VictoryMessages.VICTORY_TEXT, 'Congratulations, brave adventurer! You have completed the greatest of all treasure hunts and discovered the legendary Treasury of Zork. The riches of the Great Underground Empire are yours!');
    language.addMessage(VictoryMessages.FINAL_SCORE, 'Your final score is {totalScore} points out of a possible 716 (616 main game + 100 endgame).\nEndgame score: {endgameScore}/100\nMain game score: {mainScore}/616');
    language.addMessage(VictoryMessages.CONGRATULATIONS, 'You have achieved the rank of MASTER ADVENTURER.\n\n*** THE END ***');

    // Wave action messages (Rainbow puzzle)
    language.addMessage(WaveMessages.SUCCESS, 'You wave the {target}.');
    language.addMessage(WaveMessages.RAINBOW_APPEARS, 'As you wave the sceptre, a shimmering rainbow appears, bridging the falls! You can now cross to the other side.');
    language.addMessage(WaveMessages.RAINBOW_GONE, 'The rainbow shimmers and fades away.');
    language.addMessage(WaveMessages.NO_EFFECT, 'You wave the {target}, but nothing happens.');
    language.addMessage(WaveMessages.NO_TARGET, 'Wave what?');
    language.addMessage(WaveMessages.NOT_HOLDING, "You're not holding that.");

    // Dig action messages (Buried treasure)
    language.addMessage(DigMessages.SUCCESS, 'You dig for a while.');
    language.addMessage(DigMessages.FOUND_STATUE, 'Your shovel strikes something solid! Digging more carefully, you uncover a beautiful statue.');
    language.addMessage(DigMessages.KEEP_DIGGING, 'You dig some sand away. You could swear the sand looks a bit different here.');
    language.addMessage(DigMessages.NOTHING_HERE, "You've already dug up everything here.");
    language.addMessage(DigMessages.NO_SHOVEL, 'You have nothing to dig with.');
    language.addMessage(DigMessages.CANT_DIG_HERE, "The ground is too hard to dig here.");

    // Wind action messages (Canary/bauble)
    language.addMessage(WindMessages.SUCCESS, 'You wind the {target}.');
    language.addMessage(WindMessages.CANARY_SINGS, 'The canary begins to sing a beautiful song.');
    language.addMessage(WindMessages.BAUBLE_APPEARS, 'The canary begins to sing. From somewhere nearby, an answering song is heard. Suddenly, a shiny brass bauble drops at your feet!');
    language.addMessage(WindMessages.NOT_IN_FOREST, 'The canary sings, but there is no response.');
    language.addMessage(WindMessages.NO_TARGET, 'Wind what?');
    language.addMessage(WindMessages.NOT_WINDABLE, "That doesn't have a winding mechanism.");
    language.addMessage(WindMessages.NOT_HOLDING, "You're not holding that.");
    language.addMessage(WindMessages.ALREADY_WOUND, "The canary seems content and doesn't need winding.");

    // Send action messages (Mail order puzzle)
    language.addMessage(SendMessages.SEND_FOR_BROCHURE, "Ok, but you know how strapped the postal service is lately...");
    language.addMessage(SendMessages.ALREADY_SENT, "You've already sent for the brochure.");
    language.addMessage(SendMessages.NO_TARGET, "Send for what?");
    language.addMessage(SendMessages.BROCHURE_KNOCK, "There is a knocking sound from the front of the house. The postal service must be getting faster!");

    // Pour action messages (Bucket/Well puzzle)
    language.addMessage(PourMessages.SUCCESS, 'The water spills on the ground and evaporates.');
    language.addMessage(PourMessages.INTO_BUCKET, 'The water splashes into the bucket.');
    language.addMessage(PourMessages.BUCKET_RISES, 'The bucket becomes heavy with water and slowly rises to the top of the well, carrying you with it!');
    language.addMessage(PourMessages.BUCKET_AT_TOP, 'The water splashes into the bucket, but it is already at the top of the well.');
    language.addMessage(PourMessages.NO_WATER, "You don't have any water to pour.");
    language.addMessage(PourMessages.NO_TARGET, 'Pour what?');
    language.addMessage(PourMessages.NOTHING_HAPPENS, 'Nothing happens.');
    language.addMessage(PourMessages.NOT_IN_BUCKET, "You're not in the bucket.");

    // Fill action messages (Bucket/Well puzzle)
    language.addMessage(FillMessages.SUCCESS, 'You fill the bottle.');
    language.addMessage(FillMessages.FROM_BUCKET, 'You fill the bottle from the bucket.');
    language.addMessage(FillMessages.BUCKET_DESCENDS, 'As the water leaves the bucket, it becomes lighter and slowly descends to the bottom of the well, carrying you with it!');
    language.addMessage(FillMessages.BUCKET_AT_BOTTOM, 'You fill the bottle from the bucket, but it is already at the bottom of the well.');
    language.addMessage(FillMessages.NO_BOTTLE, "You don't have a bottle to fill.");
    language.addMessage(FillMessages.BOTTLE_FULL, 'The bottle is already full.');
    language.addMessage(FillMessages.NO_SOURCE, 'There is no water source here.');
    language.addMessage(FillMessages.NO_WATER_IN_BUCKET, 'The bucket is empty.');
    language.addMessage(FillMessages.NOTHING_HAPPENS, 'Nothing happens.');

    // Glacier puzzle messages (throw torch at glacier)
    language.addMessage(GlacierMessages.GLACIER_MELTS, 'The torch strikes the glacier and begins to melt into it! Steam billows from the ice as a massive section collapses, revealing a passage to the north.');
    language.addMessage(GlacierMessages.TORCH_CONSUMED, 'The torch is consumed by the melting ice.');
    language.addMessage(GlacierMessages.PASSAGE_REVEALED, 'A passage north has been revealed!');
    language.addMessage(GlacierMessages.THROW_COLD, 'The torch bounces off the glacier harmlessly. Perhaps if it were lit, it might have more effect.');
    language.addMessage(GlacierMessages.THROW_WRONG_ITEM, 'The {item} bounces off the glacier and falls to the ground.');

    // Light action messages (Balloon puzzle - lighting objects with fire source)
    language.addMessage(LightMessages.SUCCESS, 'The {target} catches fire.');
    language.addMessage(LightMessages.NO_FIRE_SOURCE, "You don't have a way to light that.");
    language.addMessage(LightMessages.NOT_FLAMMABLE, "That won't burn.");
    language.addMessage(LightMessages.ALREADY_BURNING, 'It is already burning.');
    language.addMessage(LightMessages.GUIDEBOOK_LIT, 'The guidebook catches fire and begins to burn brightly.');
    language.addMessage(LightMessages.IN_RECEPTACLE, 'You place the burning {target} in the receptacle. The balloon begins to rise!');

    // Tie action messages (Balloon puzzle - tethering)
    language.addMessage(TieMessages.SUCCESS, 'The balloon is now anchored.');
    language.addMessage(TieMessages.NO_ROPE, "You don't have anything to tie with.");
    language.addMessage(TieMessages.NOT_AT_LEDGE, 'There is nothing to tie the rope to here.');
    language.addMessage(TieMessages.ALREADY_TIED, 'The rope is already tied to a hook.');
    language.addMessage(TieMessages.NO_HOOK, 'There is no hook to tie the rope to.');
    language.addMessage(TieMessages.NOT_IN_BALLOON, "You're not in the balloon.");
    // Tie action messages (Dome Room rope puzzle)
    language.addMessage(TieMessages.ROPE_TIED_TO_RAILING, 'The rope is now securely fastened to the railing, dangling down into the darkness below.');
    language.addMessage(TieMessages.ROPE_ALREADY_TIED, 'The rope is already tied to the railing.');
    language.addMessage(TieMessages.NO_RAILING, 'There is nothing here to tie the rope to.');
    language.addMessage(TieMessages.NEED_ROPE, "You don't have any rope.");

    // Untie action messages (Balloon puzzle - releasing tether)
    language.addMessage(UntieMessages.SUCCESS, 'You untie the rope.');
    language.addMessage(UntieMessages.NOT_TIED, "The rope isn't tied to anything.");
    language.addMessage(UntieMessages.NO_ROPE, "There's no rope here to untie.");

    // Balloon daemon messages
    language.addMessage(DungeoSchedulerMessages.BALLOON_RISING, 'The balloon rises slowly.');
    language.addMessage(DungeoSchedulerMessages.BALLOON_FALLING, 'The balloon sinks slowly.');
    language.addMessage(DungeoSchedulerMessages.BALLOON_AT_LEDGE, 'The balloon drifts near a ledge.');
    language.addMessage(DungeoSchedulerMessages.BALLOON_LANDED, 'The balloon settles to the ground.');
    language.addMessage(DungeoSchedulerMessages.BALLOON_CRASH, 'The balloon rises too high and hits the jagged ceiling of the volcano! The bag is torn apart and the balloon plunges to the ground far below.');
    language.addMessage(DungeoSchedulerMessages.BALLOON_HOOK_VISIBLE, 'You can see a hook on the rock face here.');
    language.addMessage(DungeoSchedulerMessages.BALLOON_INFLATING, 'Hot air fills the balloon and it begins to rise.');
    language.addMessage(DungeoSchedulerMessages.BALLOON_DEFLATING, 'The balloon deflates as the heat source dies.');

    // Balloon handler messages
    language.addMessage(BalloonHandlerMessages.OBJECT_BURNED_OUT, 'The {itemName} has burned out completely.');

    // Balloon exit messages (from handlers)
    const BalloonExitMessages = {
      EXIT_SUCCESS: 'dungeo.balloon.exit_success',
      EXIT_BLOCKED_MIDAIR: 'dungeo.balloon.exit_blocked_midair',
      EXIT_TO_LEDGE: 'dungeo.balloon.exit_to_ledge'
    };
    language.addMessage(BalloonExitMessages.EXIT_SUCCESS, 'You climb out of the balloon.');
    language.addMessage(BalloonExitMessages.EXIT_BLOCKED_MIDAIR, 'You are too high in the air to exit safely! The balloon is floating in mid-air.');
    language.addMessage(BalloonExitMessages.EXIT_TO_LEDGE, 'You carefully climb out of the balloon onto the ledge.');

    // Dam puzzle - Press button action messages
    language.addMessage(PressButtonMessages.CLICK, 'Click.');
    language.addMessage(PressButtonMessages.NOT_A_BUTTON, "That's not a button.");
    language.addMessage(PressButtonMessages.LIGHTS_ON, 'The lights come on.');
    language.addMessage(PressButtonMessages.LIGHTS_OFF, 'The lights go out.');
    language.addMessage(PressButtonMessages.BLUE_JAMMED, 'The blue button appears to be jammed.');
    language.addMessage(PressButtonMessages.BLUE_LEAK_STARTED, 'There is a rumbling sound from below, and water begins to leak into the room!');

    // Dam puzzle - Turn bolt action messages
    language.addMessage(TurnBoltMessages.NOT_A_BOLT, "You can't turn that.");
    language.addMessage(TurnBoltMessages.WONT_TURN, 'The bolt won\'t turn. Perhaps the control panel has something to do with it.');
    language.addMessage(TurnBoltMessages.NO_TOOL, 'You can\'t turn the bolt with your bare hands.');
    language.addMessage(TurnBoltMessages.WRONG_TOOL, 'The wrench won\'t fit on that.');
    language.addMessage(TurnBoltMessages.GATES_OPEN, 'The sluice gates open and water pours through the dam.');
    language.addMessage(TurnBoltMessages.GATES_CLOSE, 'The sluice gates close, stopping the flow of water.');

    // Coal machine puzzle - Turn switch action messages
    language.addMessage(TurnSwitchMessages.NO_SWITCH, "There's no switch here.");
    language.addMessage(TurnSwitchMessages.NO_COAL, 'The machine makes a grinding noise, but nothing happens. Perhaps it needs fuel.');
    language.addMessage(TurnSwitchMessages.ALREADY_USED, 'The machine has already been used.');
    language.addMessage(TurnSwitchMessages.SUCCESS, 'The machine comes to life with a deafening roar! The lid slams shut, and the sounds of immense pressure fill the room. After a moment, the lid opens to reveal that the coal has been transformed into a huge diamond!');

    // Tiny Room puzzle messages
    language.addMessage(TinyRoomMessages.MAT_PLACED, 'You slide the mat under the door.');
    language.addMessage(TinyRoomMessages.MAT_NOT_HELD, "You don't have a mat.");
    language.addMessage(TinyRoomMessages.MAT_ALREADY_PLACED, 'The mat is already under the door.');
    language.addMessage(TinyRoomMessages.NO_DOOR_HERE, "There's no door here to put anything under.");
    language.addMessage(TinyRoomMessages.KEY_PUSHED, 'You insert the screwdriver in the keyhole and push. You hear a small clink as the key falls on the other side.');
    language.addMessage(TinyRoomMessages.KEY_PUSHED_NO_MAT, 'You insert the screwdriver in the keyhole and push. You hear a small clink as the key falls... and then nothing. Without something to catch it, the key has slid away under the door, out of reach.');
    language.addMessage(TinyRoomMessages.KEY_ALREADY_PUSHED, 'The keyhole is empty.');
    language.addMessage(TinyRoomMessages.NO_SCREWDRIVER, "You don't have anything suitable to push the key out.");
    language.addMessage(TinyRoomMessages.MAT_PULLED, 'You pull the mat back from under the door.');
    language.addMessage(TinyRoomMessages.MAT_PULLED_WITH_KEY, 'You pull the mat back from under the door. A small brass key comes with it!');
    language.addMessage(TinyRoomMessages.MAT_NOT_UNDER_DOOR, "There's no mat under the door.");
    language.addMessage(TinyRoomMessages.DOOR_LOCKED, 'The door is locked, and there is no keyhole on this side.');
    language.addMessage(TinyRoomMessages.DOOR_UNLOCKED, 'The door is now unlocked.');
    language.addMessage(TinyRoomMessages.WRONG_KEY, "That key doesn't fit this lock.");
    language.addMessage(TinyRoomMessages.KEYHOLE_BLOCKED, 'Something is blocking the keyhole from the other side.');
    language.addMessage(PutUnderMessages.GENERIC_FAIL, "You can't put that under there.");
    language.addMessage(DoorBlockedMessages.DOOR_LOCKED, 'The door is locked, and there is no keyhole on this side.');

    // Inflate/Deflate boat messages
    language.addMessage(InflateMessages.SUCCESS, 'The boat inflates and rises to its full size.');
    language.addMessage(InflateMessages.NO_PUMP, "You don't have anything to inflate it with.");
    language.addMessage(InflateMessages.ALREADY_INFLATED, 'The boat is already inflated.');
    language.addMessage(InflateMessages.NOT_INFLATABLE, "That can't be inflated.");
    language.addMessage(InflateMessages.CANT_REACH, "You can't reach the boat from here.");

    language.addMessage(DeflateMessages.SUCCESS, 'The boat deflates.');
    language.addMessage(DeflateMessages.ALREADY_DEFLATED, 'The boat is already deflated.');
    language.addMessage(DeflateMessages.NOT_DEFLATABLE, "That can't be deflated.");
    language.addMessage(DeflateMessages.CANT_REACH, "You can't reach the boat from here.");

    // River navigation messages
    language.addMessage(RiverMessages.NO_BOAT, 'The water is too cold and the current too strong to swim. You need a boat.');

    // Aragain Falls death message
    language.addMessage(FallsDeathMessages.DEATH, 'You tumble over Aragain Falls, plunging hundreds of feet to your doom in the mist below.\n\n    **** You have died ****');
  }

  /**
   * Register the trophy case event handler for treasure scoring (ADR-085)
   *
   * Uses EventProcessor.registerHandler for proper event dispatch.
   * Returns empty effects array since scoring updates capability directly.
   */
  private registerTrophyCaseHandler(engine: GameEngine): void {
    const TROPHY_CASE_NAME = 'trophy case';
    const scoringService = this.scoringService;
    const world = this.world;

    engine.getEventProcessor().registerHandler('if.event.put_in', (event) => {
      const data = event.data as Record<string, any> | undefined;
      const targetId = data?.targetId as string | undefined;
      if (!targetId) return [];

      // Check if target is the trophy case
      const targetEntity = world.getEntity(targetId);
      if (!targetEntity) return [];

      const identity = targetEntity.get('identity') as { name?: string } | undefined;
      if (identity?.name !== TROPHY_CASE_NAME) return [];

      // Get the item being placed
      const itemId = data?.itemId as string | undefined;
      if (!itemId) return [];

      const item = world.getEntity(itemId);
      if (!item) return [];

      // Check if item is a treasure
      const isTreasure = (item as any).isTreasure;
      if (!isTreasure) return [];

      const treasureValue = (item as any).treasureValue || 0;
      const treasureId = (item as any).treasureId || item.id;

      // Score the treasure (prevents double-scoring)
      scoringService.scoreTreasure(treasureId, treasureValue);

      return [];
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

    // Register transformer for push-panel action
    // Clears entity slots so CommandValidator doesn't try to resolve panel names
    // The action extracts panel type from rawInput directly
    engine.registerParsedCommandTransformer((parsed: IParsedCommand, _world: WorldModel) => {
      if (parsed.action !== PUSH_PANEL_ACTION_ID) {
        return parsed;
      }

      // Clear entity slots - action will use rawInput to find panel type
      return {
        ...parsed,
        structure: {
          ...parsed.structure,
          directObject: undefined,
          indirectObject: undefined
        }
      };
    });


    // Register Royal Puzzle movement transformer
    // This intercepts GO commands when player is inside the puzzle grid
    engine.registerParsedCommandTransformer(createPuzzleCommandTransformer());

    // Register Rainbow blocking transformer
    // Intercepts "go west" at Aragain Falls when rainbow is not solid
    engine.registerParsedCommandTransformer(createRainbowCommandTransformer());

    // Register Balloon exit transformer
    // Handles exit from balloon at ledge positions vs mid-air
    engine.registerParsedCommandTransformer(createBalloonExitTransformer());

    // Register Tiny Room door transformer
    // Intercepts "go north" in Tiny Room when door is locked
    engine.registerParsedCommandTransformer(createTinyRoomDoorTransformer());
    engine.registerParsedCommandTransformer(createTinyRoomMatTransformer());

    // Register River entry transformer
    // Blocks entry to water rooms without inflated boat
    engine.registerParsedCommandTransformer(createRiverEntryTransformer());

    // Register Falls death transformer
    // Any action except LOOK at Aragain Falls = death
    registerFallsRoom(this.frigidRiverIds.aragainFalls);
    engine.registerParsedCommandTransformer(createFallsDeathTransformer());

    // Register boat movement handler
    // Moves boat with player when navigating river
    registerBoatMovementHandler(engine, this.world);

    // Register scheduler events (ADR-071 Phase 2)
    const scheduler = engine.getScheduler();
    if (scheduler) {
      // Register all daemons and fuses
      registerScheduledEvents(
        scheduler,
        this.world,
        this.forestIds,
        this.damIds,
        this.bankIds,
        this.balloonIds ? {
          balloonId: this.balloonIds.balloonId,
          receptacleId: this.balloonIds.receptacleId
        } : undefined
      );

      // Make scheduler accessible to GDT DC command
      setSchedulerForGDT(this.world, scheduler);

      // Make engine accessible to GDT KL command
      setEngineForKL(engine);

      // Register bat handler for Bat Room (coal mine)
      // Valid drop locations: underground rooms excluding dangerous areas
      const batDropLocations = [
        this.undergroundIds.cellar,
        this.undergroundIds.trollRoom,
        this.undergroundIds.eastWestPassage,
        this.roundRoomIds.roundRoom,
        this.undergroundIds.northSouthCrawlway,
        this.undergroundIds.gallery,
        this.undergroundIds.studio,
        this.templeIds.temple,
        this.endgameIds.narrowCorridor,
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
        this.endgameIds.entryToHades,
        this.endgameIds.landOfDead
      );

      // Register Round Room randomization handler (carousel room)
      registerRoundRoomHandler(scheduler, this.roundRoomIds.roundRoom);

      // Register Royal Puzzle handler (sliding block puzzle)
      registerRoyalPuzzleHandler(scheduler, this.royalPuzzleIds);

      // Register Ghost Ritual handler (ADR-078 Thief's Canvas puzzle)
      registerGhostRitualHandler(this.world);

      // Register Reality Altered daemon (ADR-078 hidden max points)
      registerRealityAlteredDaemon(scheduler);

      // Register Endgame Trigger handler (Tomb darkness ritual)
      registerEndgameTriggerHandler(
        scheduler,
        this.world,
        this.endgameIds.tomb,
        this.endgameIds.topOfStairs
      );

      // Register Victory handler (Treasury of Zork entry)
      registerVictoryHandler(scheduler, this.endgameIds.treasury);

      // Wire turn bolt action to scheduler (dam puzzle)
      setTurnBoltScheduler(scheduler, this.damIds.reservoir);

      // Wire press button action to scheduler (flooding)
      setPressButtonScheduler(scheduler, this.damIds.maintenanceRoom);
    }

    // Register Laser Puzzle handler (Small Room / Stone Room)
    const schedulerForLaser = engine.getScheduler();
    registerLaserPuzzleHandler(
      engine,
      this.world,
      this.endgameIds.smallRoom,
      this.endgameIds.stoneRoom,
      schedulerForLaser || undefined
    );

    // Register Inside Mirror handler (rotating/sliding box puzzle)
    const schedulerForMirror = engine.getScheduler();
    registerInsideMirrorHandler(
      engine,
      this.world,
      this.endgameIds.hallway,
      this.endgameIds.insideMirror,
      this.endgameIds.dungeonEntrance,
      schedulerForMirror || undefined
    );

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

      // Register Dungeon Master NPC in the Dungeon Entrance (endgame)
      registerDungeonMaster(
        npcService,
        this.world,
        this.endgameIds.dungeonEntrance
      );
    }

    // Register Mirror Room handler (ADR-075)
    if (this.mirrorConfig) {
      const eventProcessor = engine.getEventProcessor();
      const mirrorHandler = createMirrorTouchHandler(this.mirrorConfig);
      eventProcessor.registerHandler('if.event.touched', mirrorHandler);
    }

    // Register trophy case scoring handler (ADR-085)
    this.registerTrophyCaseHandler(engine);

    // Register balloon PUT handler (tracks burning objects in receptacle)
    if (this.balloonIds) {
      registerBalloonPutHandler(engine, this.world, this.balloonIds.balloonId, this.balloonIds.receptacleId);
    }
  }
}

// Create and export the story instance
export const story = new DungeoStory();

// Default export for convenience
export default story;
