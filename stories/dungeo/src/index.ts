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
// ScopeBuilder now used in grammar files
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
  CombatantTrait,
  StoryInfoTrait,
  EntityType,
  Direction,
  TraitType,
  StandardCapabilities,
  IWorldModel,
  IParsedCommand,
  registerCapabilityBehavior,
  hasCapabilityBehavior,
  VisibilityBehavior,
  registerActionInterceptor,
  hasActionInterceptor
} from '@sharpee/world-model';
import { DungeoScoringService } from './scoring';
import { ScoringEventProcessor, MetaCommandRegistry } from '@sharpee/stdlib';

// Import custom actions
import { customActions, GDT_ACTION_ID, GDT_COMMAND_ACTION_ID, GDTEventTypes, isGDTActive, WALK_THROUGH_ACTION_ID, BankPuzzleMessages, SAY_ACTION_ID, SayMessages, RING_ACTION_ID, RingMessages, PUSH_WALL_ACTION_ID, PushWallMessages, BREAK_ACTION_ID, BreakMessages, BURN_ACTION_ID, BurnMessages, PRAY_ACTION_ID, PrayMessages, INCANT_ACTION_ID, IncantMessages, LIFT_ACTION_ID, LiftMessages, LOWER_ACTION_ID, LowerMessages, PUSH_PANEL_ACTION_ID, PushPanelMessages, KNOCK_ACTION_ID, KnockMessages, ANSWER_ACTION_ID, AnswerMessages, SET_DIAL_ACTION_ID, SetDialMessages, PUSH_DIAL_BUTTON_ACTION_ID, PushDialButtonMessages, WAVE_ACTION_ID, WaveMessages, DIG_ACTION_ID, DigMessages, WIND_ACTION_ID, WindMessages, SEND_ACTION_ID, SendMessages, POUR_ACTION_ID, PourMessages, FILL_ACTION_ID, FillMessages, LIGHT_ACTION_ID, LightMessages, TIE_ACTION_ID, TieMessages, UNTIE_ACTION_ID, UntieMessages, PRESS_BUTTON_ACTION_ID, PressButtonMessages, setPressButtonScheduler, TURN_BOLT_ACTION_ID, TurnBoltMessages, setTurnBoltReservoirIds, blockReservoirExits, TURN_SWITCH_ACTION_ID, TurnSwitchMessages, PUT_UNDER_ACTION_ID, PutUnderMessages, PUSH_KEY_ACTION_ID, PushKeyMessages, DOOR_BLOCKED_ACTION_ID, DoorBlockedMessages, INFLATE_ACTION_ID, InflateMessages, DEFLATE_ACTION_ID, DeflateMessages, COMMANDING_ACTION_ID, CommandingMessages, LAUNCH_ACTION_ID, LaunchMessages, TALK_TO_TROLL_ACTION_ID, TalkToTrollMessages, DIAGNOSE_ACTION_ID, DiagnoseMessages, ROOM_ACTION_ID, RNAME_ACTION_ID, OBJECTS_ACTION_ID, RoomInfoMessages, GRUE_DEATH_ACTION_ID, GrueDeathMessages, CHIMNEY_BLOCKED_ACTION_ID, ChimneyBlockedMessages } from './actions';

// Import scheduler module
import { registerScheduledEvents, DungeoSchedulerMessages, FloodingMessages, BalloonHandlerMessages, registerTrollRecoveryDaemon, SwordGlowMessages } from './scheduler';
import { setSchedulerForGDT, setEngineForKL } from './actions/gdt/commands';

// Import handlers
import { registerBatHandler, BatMessages, registerExorcismHandler, ExorcismMessages, registerRoundRoomHandler, RoundRoomMessages, registerRealityAlteredHandler, registerRealityAlteredDaemon, RealityAlteredMessages, registerEndgameTriggerHandler, EndgameTriggerMessages, registerLaserPuzzleHandler, LaserPuzzleMessages, registerInsideMirrorHandler, InsideMirrorMessages, registerVictoryHandler, VictoryMessages, createDeathPenaltyHandler, DeathPenaltyMessages, registerTrapdoorHandler, TrapdoorMessages } from './handlers';
import { GhostRitualMessages } from './traits';
import { initializeMirrorRoom, createMirrorTouchHandler, MirrorRoomConfig, MirrorRoomMessages } from './handlers/mirror-room-handler';
import { MIRROR_ID } from './regions/temple';

// Import room and object creators
import { createWhiteHouseRegion, createWhiteHouseObjects, WhiteHouseRoomIds } from './regions/white-house';
import { createHouseInteriorRegion, createHouseInteriorObjects, connectHouseInteriorToExterior, HouseInteriorRoomIds } from './regions/house-interior';
import { createForestRegion, createForestObjects, connectForestToExterior, ForestRoomIds } from './regions/forest';
import { createUndergroundRegion, createUndergroundObjects, connectUndergroundToHouse, connectStudioToKitchen, UndergroundRoomIds } from './regions/underground';
import { createDamRegion, createDamObjects, connectDamToRoundRoom, connectDamToFrigidRiver, connectStreamViewToGlacier, DamRoomIds } from './regions/dam';
import { createCoalMineRegion, createCoalMineObjects, CoalMineRoomIds } from './regions/coal-mine';
import { createTempleRegion, createTempleObjects, connectTempleToUnderground, connectTempleToWellRoom, connectTempleToFrigidRiver, TempleRoomIds } from './regions/temple';
import { createVolcanoRegion, createVolcanoObjects, connectVolcanoToUnderground, VolcanoRoomIds, VolcanoObjectIds } from './regions/volcano';
import { createBankRegion, connectBankToUnderground, createBankObjects, BankRoomIds } from './regions/bank-of-zork';
import { createWellRoomRegion, createWellRoomObjects, connectWellRoomToRoundRoom, connectCaveToHades, WellRoomIds } from './regions/well-room';
import { createRoundRoomRegion, createRoundRoomObjects, RoundRoomIds, connectRoundRoomToUnderground, connectRoundRoomToTemple, connectRoundRoomToWellRoom, connectRoundRoomToDam, connectRoundRoomToMaze } from './regions/round-room';
import { createFrigidRiverRegion, connectFrigidRiverToDam, connectRainbowToCanyon, createFrigidRiverObjects, FrigidRiverRoomIds } from './regions/frigid-river';
import { createMazeRegion, connectMazeToClearing, connectCyclopsToLivingRoom, connectMazeToTrollRoom, connectMazeToRoundRoom, createMazeObjects, MazeRoomIds } from './regions/maze';
import { createRoyalPuzzleRegion, connectRoyalPuzzleToTreasureRoom, RoyalPuzzleRoomIds } from './regions/royal-puzzle';
import { createEndgameRegion, createEndgameObjects, EndgameRoomIds } from './regions/endgame';

// Import handlers
import { registerRoyalPuzzleHandler, initializePuzzleState, createPuzzleCommandTransformer, PuzzleHandlerMessages } from './handlers/royal-puzzle';
import { createRainbowCommandTransformer } from './handlers/rainbow-handler';
import { createBalloonExitTransformer } from './handlers/balloon-handler';
import { createRiverEntryTransformer, RiverMessages } from './handlers/river-handler';
import { createFallsDeathTransformer, registerFallsRoom, FallsDeathMessages } from './handlers/falls-death-handler';
import { createGrueDeathTransformer } from './handlers/grue-handler';
import { createChimneyCommandTransformer } from './handlers/chimney-handler';
import { createTinyRoomDoorTransformer, createTinyRoomMatTransformer, TinyRoomMessages } from './handlers/tiny-room-handler';

// Import NPCs
import { registerThief, ThiefMessages } from './npcs/thief';
import { registerCyclops, CyclopsMessages } from './npcs/cyclops';
import { RobotMessages } from './npcs/robot';
import { registerDungeonMaster, DungeonMasterMessages } from './npcs/dungeon-master';
import { registerTrollBehavior, TrollMessages } from './npcs/troll';

// Import traits (ADR-090 capability dispatch)
import {
  BasketElevatorTrait,
  BasketLoweringBehavior,
  BasketRaisingBehavior,
  BasketElevatorMessages,
  TrollAxeTrait,
  TrollAxeTakingInterceptor,
  TrollAxeVisibilityBehavior,
  TrollAxeMessages,
  TrollTrait,
  TrollTakingInterceptor,
  TrollTalkingInterceptor,
  TrollCapabilityMessages,
  EggTrait,
  EggOpeningBehavior,
  EggMessages,
  // ADR-118 interceptors
  InflatableTrait,
  InflatableEnteringInterceptor,
  GlacierTrait,
  GlacierThrowingInterceptor,
  BalloonReceptacleTrait,
  ReceptaclePuttingInterceptor,
  FramePieceTrait,
  GhostRitualDroppingInterceptor,
  // Sphere/Cage puzzle interceptor
  SphereTrait,
  SphereTakingInterceptor,
  CageMessages,
  // Gas Room destination interceptor (ADR-126)
  GasRoomTrait,
  GasRoomEntryInterceptor,
  GasRoomEntryMessages
} from './traits';

// Melee combat interceptor (Phase 3)
import { MeleeInterceptor } from './interceptors/melee-interceptor';

// Import version info (auto-generated by bundle script)
import { VERSION_INFO } from './version';

// Import grammar registration
import { registerAllGrammar } from './grammar';

// Import message registration
import { registerAllMessages } from './messages';

// Import orchestration registration
import { initializeOrchestration } from './orchestration';

/**
 * Dungeo story configuration
 */
export const config: StoryConfig = {
  id: "dungeon",
  title: "DUNGEON",
  author: "Tim Anderson, Marc Blank, Bruce Daniels, and Dave Lebling",
  version: VERSION_INFO.version,
  buildDate: VERSION_INFO.buildDate,
  description: "A port of Mainframe Zork (1981)",
  custom: {
    portedBy: "David Cornelson"
  }
};

/**
 * Dungeo story implementation
 */
export class DungeoStory implements Story {
  config = config;

  private world!: WorldModel;
  private scoringService!: DungeoScoringService;
  private scoringProcessor!: ScoringEventProcessor;
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

    // Create system entity with story metadata (replaces (world as any) casts)
    const storyInfoEntity = world.createEntity('story-info', EntityType.OBJECT);
    storyInfoEntity.add(new StoryInfoTrait({
      title: config.title,
      author: Array.isArray(config.author) ? config.author.join(', ') : config.author,
      version: config.version,
      description: config.description,
      buildDate: VERSION_INFO.buildDate,
      engineVersion: VERSION_INFO.engineVersion,
      portedBy: config.custom?.portedBy as string | undefined,
    }));

    // Register story-specific meta-commands (don't increment turn or run daemons)
    MetaCommandRegistry.register(DIAGNOSE_ACTION_ID);
    // Also register GDT commands as meta (debugging tools)
    MetaCommandRegistry.register(GDT_ACTION_ID);
    MetaCommandRegistry.register(GDT_COMMAND_ACTION_ID);
    MetaCommandRegistry.register(ROOM_ACTION_ID);
    MetaCommandRegistry.register(RNAME_ACTION_ID);
    MetaCommandRegistry.register(OBJECTS_ACTION_ID);

    // Register scoring capability (Zork max score is 616, includes treasures + room entry points)
    world.registerCapability(StandardCapabilities.SCORING, {
      initialData: {
        scoreValue: 0,
        maxScore: 616,
        moves: 0,
        deaths: 0,  // Track death count for -10 penalty per death
        achievements: [],
        scoredTreasures: []
      }
    });

    // Create scoring service
    this.scoringService = new DungeoScoringService(world);

    // Create scoring event processor with dynamic treasure detection
    // Uses entity properties (isTreasure, treasureValue, trophyCaseValue) instead of explicit registration
    // NOTE: initializeHandlers() must be called in onEngineReady(), not here!
    this.scoringProcessor = new ScoringEventProcessor(this.scoringService, world)
      .enableDynamicTreasures('trophy case')
      .setTreasureTakeCallback((treasureId: string, points: number) => {
        this.scoringService.scoreTreasureTake(treasureId, points);
      })
      .setTreasurePlaceCallback((treasureId: string, points: number) => {
        this.scoringService.scoreTreasureCase(treasureId, points);
      });

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

    // Troll axe uses action interceptor for taking (ADR-118: blocks while troll is alive)
    if (!hasActionInterceptor(TrollAxeTrait.type, 'if.action.taking')) {
      registerActionInterceptor(
        TrollAxeTrait.type,
        'if.action.taking',
        TrollAxeTakingInterceptor
      );
    }

    // Troll axe uses universal dispatch for visibility (hidden when troll unconscious)
    if (!hasCapabilityBehavior(TrollAxeTrait.type, 'if.scope.visible')) {
      registerCapabilityBehavior(
        TrollAxeTrait.type,
        'if.scope.visible',
        TrollAxeVisibilityBehavior
      );
    }

    // Troll NPC uses action interceptors for TAKE/ATTACK/TALK interception
    // (Converted from capability behaviors to work around ISSUE-052: cross-module registry bug)
    if (!hasActionInterceptor(TrollTrait.type, 'if.action.taking')) {
      registerActionInterceptor(
        TrollTrait.type,
        'if.action.taking',
        TrollTakingInterceptor
      );
    }
    if (!hasActionInterceptor(TrollTrait.type, 'if.action.talking')) {
      registerActionInterceptor(
        TrollTrait.type,
        'if.action.talking',
        TrollTalkingInterceptor
      );
    }

    // Egg uses universal dispatch for opening (only thief can open)
    if (!hasCapabilityBehavior(EggTrait.type, 'if.action.opening')) {
      registerCapabilityBehavior(
        EggTrait.type,
        'if.action.opening',
        EggOpeningBehavior
      );
    }

    // Reality Altered: migrated to state machine (ADR-119)

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
    connectDamToFrigidRiver(world, this.damIds, this.frigidRiverIds.frigidRiver1);
    connectStreamViewToGlacier(world, this.damIds, this.volcanoIds.glacierRoom);

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
    createWhiteHouseObjects(world, this.whiteHouseIds, this.houseInteriorIds.kitchen);
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
    createRoundRoomObjects(world, this.roundRoomIds);
    createEndgameObjects(world, {
      smallRoom: this.endgameIds.smallRoom,
      stoneRoom: this.endgameIds.stoneRoom,
      parapet: this.endgameIds.parapet,
      insideMirror: this.endgameIds.insideMirror,
      prisonCell: this.endgameIds.prisonCell
    });

    // Initialize Mirror Room state toggle
    this.initializeMirrorRoomHandler(world);

    // Add GlacierTrait to glacier entity and register interceptor (ADR-118)
    // Find glacier and add trait with room connection info
    const glacierRoomContents = world.getContents(this.volcanoIds.glacierRoom);
    const glacier = glacierRoomContents.find(e => {
      const identity = e.get(IdentityTrait);
      return identity?.name === 'glacier';
    });
    if (glacier) {
      glacier.add(new GlacierTrait({
        glacierRoomId: this.volcanoIds.glacierRoom,
        northDestination: this.volcanoIds.volcanoView,
        torchDestination: this.damIds.streamView
      }));
    }

    // Register glacier throwing interceptor
    if (!hasActionInterceptor(GlacierTrait.type, 'if.action.throwing')) {
      registerActionInterceptor(
        GlacierTrait.type,
        'if.action.throwing',
        GlacierThrowingInterceptor
      );
    }

    // Register boat puncture interceptor (ADR-118)
    // Entering an inflated boat while carrying a sharp object punctures it
    if (!hasActionInterceptor(InflatableTrait.type, 'if.action.entering')) {
      registerActionInterceptor(
        InflatableTrait.type,
        'if.action.entering',
        InflatableEnteringInterceptor
      );
    }

    // Register balloon receptacle interceptor (ADR-118)
    // Putting a burning object in the receptacle inflates the balloon
    if (!hasActionInterceptor(BalloonReceptacleTrait.type, 'if.action.putting')) {
      registerActionInterceptor(
        BalloonReceptacleTrait.type,
        'if.action.putting',
        ReceptaclePuttingInterceptor
      );
    }

    // Register ghost ritual dropping interceptor (ADR-118)
    // Dropping frame piece in Basin Room while incense is burning completes the ritual
    if (!hasActionInterceptor(FramePieceTrait.type, 'if.action.dropping')) {
      registerActionInterceptor(
        FramePieceTrait.type,
        'if.action.dropping',
        GhostRitualDroppingInterceptor
      );
    }

    // Sphere/Cage puzzle interceptor (ADR-118: blocks taking when cage unsolved)
    if (!hasActionInterceptor(SphereTrait.type, 'if.action.taking')) {
      registerActionInterceptor(
        SphereTrait.type,
        'if.action.taking',
        SphereTakingInterceptor
      );
    }

    // Gas Room destination interceptor (ADR-126: blocks entry with lit flame)
    if (!hasActionInterceptor(GasRoomTrait.type, 'if.action.entering_room')) {
      registerActionInterceptor(
        GasRoomTrait.type,
        'if.action.entering_room',
        GasRoomEntryInterceptor
      );
    }

    // Melee combat interceptor (Phase 3: canonical MDL melee engine)
    // Replaces CombatService with score-scaled, table-based combat for all villains
    if (!hasActionInterceptor(TraitType.COMBATANT, 'if.action.attacking')) {
      registerActionInterceptor(
        TraitType.COMBATANT,
        'if.action.attacking',
        MeleeInterceptor
      );
    }

    // Store room IDs for ghost ritual interceptor
    world.setStateValue('dungeo.ghost_ritual.basin_room_id', this.templeIds.basinRoom);
    world.setStateValue('dungeo.ghost_ritual.gallery_id', this.undergroundIds.gallery);

    // Configure turn-bolt action with reservoir room IDs and block exits initially (dam starts closed)
    setTurnBoltReservoirIds({
      reservoirSouth: this.damIds.reservoirSouth,
      reservoir: this.damIds.reservoir,
      reservoirNorth: this.damIds.reservoirNorth
    });
    blockReservoirExits(world);

    // Register room entry scoring (RVAL) - points for first visiting certain rooms
    // From 1981 MDL source: 13 rooms worth 215 total points
    this.scoringProcessor.registerRoomVisit(this.houseInteriorIds.kitchen, 10);      // KITCH
    this.scoringProcessor.registerRoomVisit(this.undergroundIds.cellar, 25);         // CELLA
    this.scoringProcessor.registerRoomVisit(this.volcanoIds.volcanoBottom, 10);      // BLROO (Balloon Room)
    this.scoringProcessor.registerRoomVisit(this.mazeIds.treasureRoom, 25);          // TREAS (Trophy Room)
    this.scoringProcessor.registerRoomVisit(this.endgameIds.narrowCorridor, 5);      // PASS1 (Narrow Passage)
    this.scoringProcessor.registerRoomVisit(this.endgameIds.landOfDead, 30);         // LLD2 (Land of Living Dead)
    this.scoringProcessor.registerRoomVisit(this.wellRoomIds.topOfWell, 10);         // TWELL (Temple Well)
    this.scoringProcessor.registerRoomVisit(this.endgameIds.insideMirror, 15);       // INMIR (Inside Mirror)
    this.scoringProcessor.registerRoomVisit(this.endgameIds.tomb, 5);                // CRYPT
    this.scoringProcessor.registerRoomVisit(this.undergroundIds.torchRoom, 10);      // TSTRS (Torch Room Stairs)
    this.scoringProcessor.registerRoomVisit(this.endgameIds.dungeonEntrance, 20);    // BDOOR (Behind Dungeon Door)
    this.scoringProcessor.registerRoomVisit(this.endgameIds.hallway, 15);            // FDOOR (Front Door/Hallway)
    this.scoringProcessor.registerRoomVisit(this.endgameIds.treasury, 35);           // NIRVA (Nirvana/Treasury)

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

      if (!existingPlayer.has('combatant')) {
        existingPlayer.add(new CombatantTrait({
          health: 100,
          maxHealth: 100,
          skill: 50,
          baseDamage: 1,
          armor: 0,
          hostile: false,
          canRetaliate: false
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

    player.add(new CombatantTrait({
      health: 100,
      maxHealth: 100,
      skill: 50,
      baseDamage: 1,
      armor: 0,
      hostile: false,
      canRetaliate: false
    }));

    return player;
  }

  /**
   * Extend the parser with custom vocabulary for this story.
   * Grammar patterns are organized in src/grammar/ by feature area.
   */
  extendParser(parser: Parser): void {
    registerAllGrammar(parser);
  }

  /**
   * Extend the language provider with custom messages for this story.
   * Messages are organized in src/messages/ by category.
   */
  extendLanguage(language: LanguageProvider): void {
    registerAllMessages(language);
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
   * Delegates to orchestration module for all engine registrations.
   */
  onEngineReady(engine: GameEngine): void {
    initializeOrchestration(
      engine,
      this.world,
      {
        whiteHouseIds: this.whiteHouseIds,
        houseInteriorIds: this.houseInteriorIds,
        forestIds: this.forestIds,
        undergroundIds: this.undergroundIds,
        frigidRiverIds: this.frigidRiverIds,
        roundRoomIds: this.roundRoomIds,
        damIds: this.damIds,
        bankIds: this.bankIds,
        coalMineIds: this.coalMineIds,
        templeIds: this.templeIds,
        mazeIds: this.mazeIds,
        endgameIds: this.endgameIds,
        royalPuzzleIds: this.royalPuzzleIds,
        wellRoomIds: this.wellRoomIds,
        balloonIds: this.balloonIds || undefined,
        mirrorConfig: this.mirrorConfig || undefined
      },
      this.scoringProcessor,
      this.scoringService
    );
  }
}

// Create and export the story instance
export const story = new DungeoStory();

// Default export for convenience
export default story;
