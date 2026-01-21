# onEngineReady() Refactoring Plan

## Overview

Extract the ~270-line `onEngineReady()` method from `stories/dungeo/src/index.ts` into modular orchestration files. This establishes a **template pattern** for organizing Sharpee stories that future games can follow.

**Related**:
- `story-index-refactor.md` - Phase 1 (grammar) and Phase 2 (messages) complete
- ADR-070 (NPC System), ADR-071 (Daemons/Fuses), ADR-075 (Event Handlers)

## Current State

`onEngineReady()` handles 5 distinct concerns in ~270 lines:

| Subsystem | Lines | Description |
|-----------|-------|-------------|
| Command Transformers | ~75 | Intercept/modify parsed commands |
| Scheduler Events | ~80 | Daemons and fuses (timed events) |
| Puzzle Handlers | ~20 | Complex multi-room puzzle setup |
| NPC Registration | ~35 | NPC behaviors and spawning |
| Event Handlers | ~45 | React to game events (scoring, death, etc.) |

All registrations need access to `GameEngine` services:
- `engine.registerParsedCommandTransformer()`
- `engine.getScheduler()`
- `engine.getNpcService()`
- `engine.getEventProcessor()`

## Target Structure

```
stories/dungeo/src/
├── orchestration/
│   ├── index.ts                    # Exports + initializeOrchestration()
│   ├── command-transformers.ts     # All transformer registrations
│   ├── scheduler-setup.ts          # Daemon/fuse registrations
│   ├── puzzle-handlers.ts          # Complex puzzle setup
│   ├── npc-setup.ts                # NPC service registrations
│   └── event-handlers.ts           # Event processor handlers
├── grammar/                        # (already extracted)
├── messages/                       # (already extracted)
└── index.ts                        # Main story file
```

## Proposed Files

### 1. `orchestration/command-transformers.ts` (~100 lines)

Register all parsed command transformers:

```typescript
import { GameEngine, IParsedCommand, WorldModel } from '@sharpee/engine';
import { isGDTActive, GDT_COMMAND_ACTION_ID, GDT_ACTION_ID } from '../actions/gdt';
import { PUSH_PANEL_ACTION_ID } from '../actions/push-panel';
import { createPuzzleCommandTransformer } from '../handlers/royal-puzzle';
import { createRainbowCommandTransformer } from '../handlers/rainbow';
import { createBalloonExitTransformer } from '../handlers/balloon';
import { createTinyRoomDoorTransformer, createTinyRoomMatTransformer } from '../handlers/tiny-room';
import { createRiverEntryTransformer } from '../handlers/river';
import { createFallsDeathTransformer, registerFallsRoom } from '../handlers/falls';
import { createGrueDeathTransformer } from '../handlers/grue';
import { createChimneyCommandTransformer } from '../handlers/chimney';

export interface TransformerConfig {
  frigidRiverIds: { aragainFalls: string };
}

export function registerCommandTransformers(
  engine: GameEngine,
  config: TransformerConfig
): void {
  // GDT transformer - clear entity slots for raw text parsing
  engine.registerParsedCommandTransformer((parsed, world) => { ... });

  // Push-panel transformer
  engine.registerParsedCommandTransformer((parsed, _world) => { ... });

  // Royal Puzzle movement
  engine.registerParsedCommandTransformer(createPuzzleCommandTransformer());

  // Rainbow blocking
  engine.registerParsedCommandTransformer(createRainbowCommandTransformer());

  // Balloon exit
  engine.registerParsedCommandTransformer(createBalloonExitTransformer());

  // Tiny Room door/mat
  engine.registerParsedCommandTransformer(createTinyRoomDoorTransformer());
  engine.registerParsedCommandTransformer(createTinyRoomMatTransformer());

  // River entry (requires boat)
  engine.registerParsedCommandTransformer(createRiverEntryTransformer());

  // Falls death
  registerFallsRoom(config.frigidRiverIds.aragainFalls);
  engine.registerParsedCommandTransformer(createFallsDeathTransformer());

  // Grue death (75% in dark)
  engine.registerParsedCommandTransformer(createGrueDeathTransformer());

  // Chimney restriction
  engine.registerParsedCommandTransformer(createChimneyCommandTransformer());
}
```

### 2. `orchestration/scheduler-setup.ts` (~120 lines)

Register all daemons and fuses:

```typescript
import { IScheduler } from '@sharpee/engine';
import { WorldModel } from '@sharpee/world-model';
import { registerScheduledEvents, setSchedulerForGDT } from '../scheduler';
import { registerBatHandler } from '../handlers/bat';
import { registerExorcismHandler } from '../handlers/exorcism';
import { registerRoundRoomHandler } from '../handlers/round-room';
import { registerTrapdoorHandler } from '../handlers/trapdoor';
import { registerRoyalPuzzleHandler } from '../handlers/royal-puzzle';
import { registerGhostRitualHandler } from '../handlers/ghost-ritual';
import { registerRealityAlteredDaemon } from '../handlers/reality-altered';
import { registerEndgameTriggerHandler } from '../handlers/endgame-trigger';
import { registerVictoryHandler } from '../handlers/victory';
import { registerTrollRecoveryDaemon } from '../handlers/troll-recovery';
import { setPressButtonScheduler } from '../actions/press-button';

export interface SchedulerConfig {
  forestIds: Record<string, string>;
  damIds: { damLobby: string; dam: string; maintenanceRoom: string };
  bankIds: Record<string, string>;
  balloonIds?: { balloonId: string; receptacleId: string };
  undergroundIds: { cellar: string; trollRoom: string; /* ... */ };
  roundRoomIds: { roundRoom: string };
  coalMineIds: { squeakyRoom: string; bottomOfShaft: string };
  templeIds: { temple: string };
  endgameIds: { entryToHades: string; landOfDead: string; tomb: string; topOfStairs: string; treasury: string };
  mazeIds: { maze1: string; maze5: string; maze11: string; /* ... */ };
  houseInteriorIds: { livingRoom: string };
  royalPuzzleIds: Record<string, string>;
}

export function registerSchedulerEvents(
  scheduler: IScheduler,
  world: WorldModel,
  config: SchedulerConfig
): void {
  // Core scheduled events (lantern, candles, dam, etc.)
  registerScheduledEvents(scheduler, world, config.forestIds, config.damIds, config.bankIds, config.balloonIds);

  // Make scheduler accessible to GDT
  setSchedulerForGDT(world, scheduler);

  // Bat handler (random drops)
  const batDropLocations = [ /* ... */ ];
  registerBatHandler(scheduler, config.coalMineIds.squeakyRoom, batDropLocations);

  // Exorcism (bell/book/candle)
  registerExorcismHandler(scheduler, world, config.endgameIds.entryToHades, config.endgameIds.landOfDead);

  // Round Room randomization
  registerRoundRoomHandler(scheduler, config.roundRoomIds.roundRoom);

  // Trapdoor auto-close
  registerTrapdoorHandler(scheduler, config.houseInteriorIds.livingRoom, config.undergroundIds.cellar);

  // Royal Puzzle
  registerRoyalPuzzleHandler(scheduler, config.royalPuzzleIds);

  // Ghost Ritual (ADR-078)
  registerGhostRitualHandler(world);

  // Reality Altered daemon
  registerRealityAlteredDaemon(scheduler);

  // Endgame trigger
  registerEndgameTriggerHandler(scheduler, world, config.endgameIds.tomb, config.endgameIds.topOfStairs);

  // Victory
  registerVictoryHandler(scheduler, config.endgameIds.treasury);

  // Troll recovery
  registerTrollRecoveryDaemon(scheduler, config.undergroundIds.trollRoom);

  // Press button (flooding)
  setPressButtonScheduler(scheduler, config.damIds.maintenanceRoom);
}
```

### 3. `orchestration/puzzle-handlers.ts` (~40 lines)

Register complex multi-room puzzles:

```typescript
import { GameEngine } from '@sharpee/engine';
import { WorldModel } from '@sharpee/world-model';
import { registerLaserPuzzleHandler } from '../handlers/laser-puzzle';
import { registerInsideMirrorHandler } from '../handlers/inside-mirror';

export interface PuzzleConfig {
  endgameIds: {
    smallRoom: string;
    stoneRoom: string;
    hallway: string;
    insideMirror: string;
    dungeonEntrance: string;
  };
}

export function registerPuzzleHandlers(
  engine: GameEngine,
  world: WorldModel,
  config: PuzzleConfig
): void {
  const scheduler = engine.getScheduler();

  // Laser Puzzle (Small Room / Stone Room)
  registerLaserPuzzleHandler(
    engine, world,
    config.endgameIds.smallRoom,
    config.endgameIds.stoneRoom,
    scheduler || undefined
  );

  // Inside Mirror (rotating/sliding box puzzle)
  registerInsideMirrorHandler(
    engine, world,
    config.endgameIds.hallway,
    config.endgameIds.insideMirror,
    config.endgameIds.dungeonEntrance,
    scheduler || undefined
  );
}
```

### 4. `orchestration/npc-setup.ts` (~60 lines)

Register NPC behaviors:

```typescript
import { INpcService } from '@sharpee/engine';
import { WorldModel } from '@sharpee/world-model';
import { registerThief } from '../npcs/thief';
import { registerCyclops } from '../npcs/cyclops';
import { registerTrollBehavior } from '../npcs/troll';
import { registerDungeonMaster } from '../npcs/dungeon-master';
import { setEngineForKL } from '../actions/gdt';

export interface NpcConfig {
  whiteHouseIds: Record<string, string>;
  houseInteriorIds: Record<string, string>;
  forestIds: Record<string, string>;
  mazeIds: { treasureRoom: string; cyclopsRoom: string };
  endgameIds: { dungeonEntrance: string };
}

export function registerNpcs(
  npcService: INpcService,
  world: WorldModel,
  config: NpcConfig,
  engine: GameEngine
): void {
  // Calculate surface rooms (thief forbidden from surface)
  const surfaceRooms = [
    ...Object.values(config.whiteHouseIds),
    ...Object.values(config.houseInteriorIds),
    ...Object.values(config.forestIds)
  ];

  // Thief (in Treasure Room)
  registerThief(npcService, world, config.mazeIds.treasureRoom, surfaceRooms);

  // Cyclops (in Cyclops Room)
  registerCyclops(npcService, world, config.mazeIds.cyclopsRoom);

  // Troll (entity in underground.ts, just register behavior)
  registerTrollBehavior(npcService);

  // Dungeon Master (endgame)
  registerDungeonMaster(npcService, world, config.endgameIds.dungeonEntrance);

  // Make engine accessible to GDT KL command
  setEngineForKL(engine);
}
```

### 5. `orchestration/event-handlers.ts` (~80 lines)

Register event processor handlers:

```typescript
import { GameEngine, IEventProcessor, ISemanticEvent } from '@sharpee/engine';
import { WorldModel, VisibilityBehavior } from '@sharpee/world-model';
import { createMirrorTouchHandler, MirrorConfig } from '../handlers/mirror-room';
import { createDeathPenaltyHandler } from '../handlers/death-penalty';
import { registerBalloonPutHandler } from '../handlers/balloon';
import { ScoringEventProcessor, DungeoScoringService } from '../scoring';

export interface EventHandlerConfig {
  mirrorConfig?: MirrorConfig;
  coalMineIds: { bottomOfShaft: string };
  balloonIds?: { balloonId: string; receptacleId: string };
}

export function registerEventHandlers(
  engine: GameEngine,
  world: WorldModel,
  config: EventHandlerConfig,
  scoringProcessor: ScoringEventProcessor,
  scoringService: DungeoScoringService
): void {
  const eventProcessor = engine.getEventProcessor();

  // Mirror Room handler (ADR-075)
  if (config.mirrorConfig) {
    const mirrorHandler = createMirrorTouchHandler(config.mirrorConfig);
    eventProcessor.registerHandler('if.event.touched', mirrorHandler);
  }

  // Scoring event processor (treasures taken/placed)
  scoringProcessor.initializeHandlers(eventProcessor);

  // Light-shaft achievement (10 pts)
  registerLightShaftAchievement(eventProcessor, world, config.coalMineIds.bottomOfShaft, scoringProcessor);

  // Death penalty (-10 pts per death, game over after 2)
  eventProcessor.registerHandler('if.event.player.died',
    createDeathPenaltyHandler(world, scoringService));

  // Balloon PUT handler
  if (config.balloonIds) {
    registerBalloonPutHandler(engine, world, config.balloonIds.balloonId, config.balloonIds.receptacleId);
  }
}

function registerLightShaftAchievement(
  eventProcessor: IEventProcessor,
  world: WorldModel,
  bottomOfShaftId: string,
  scoringProcessor: ScoringEventProcessor
): void {
  eventProcessor.registerHandler('if.event.actor_moved', (event: ISemanticEvent) => {
    const data = event.data as { actorId?: string; toRoomId?: string } | undefined;
    if (!data?.toRoomId || data.toRoomId !== bottomOfShaftId) return [];

    const player = world.getPlayer();
    if (!player || data.actorId !== player.id) return [];

    const room = world.getEntity(bottomOfShaftId);
    if (!room) return [];

    const isLit = !VisibilityBehavior.isDark(room, world);
    if (isLit) {
      scoringProcessor.awardOnce('light-shaft', 10, 'LIGHT-SHAFT achievement');
    }

    return [];
  });
}
```

### 6. `orchestration/index.ts` (~50 lines)

Aggregator with unified config:

```typescript
import { GameEngine } from '@sharpee/engine';
import { WorldModel } from '@sharpee/world-model';
import { registerCommandTransformers, TransformerConfig } from './command-transformers';
import { registerSchedulerEvents, SchedulerConfig } from './scheduler-setup';
import { registerPuzzleHandlers, PuzzleConfig } from './puzzle-handlers';
import { registerNpcs, NpcConfig } from './npc-setup';
import { registerEventHandlers, EventHandlerConfig } from './event-handlers';
import { ScoringEventProcessor, DungeoScoringService } from '../scoring';
import { MirrorConfig } from '../handlers/mirror-room';

export interface OrchestrationConfig {
  // Room IDs by region
  whiteHouseIds: Record<string, string>;
  houseInteriorIds: Record<string, string>;
  forestIds: Record<string, string>;
  undergroundIds: Record<string, string>;
  frigidRiverIds: { aragainFalls: string };
  roundRoomIds: { roundRoom: string };
  damIds: Record<string, string>;
  bankIds: Record<string, string>;
  coalMineIds: Record<string, string>;
  templeIds: Record<string, string>;
  mazeIds: Record<string, string>;
  endgameIds: Record<string, string>;
  royalPuzzleIds: Record<string, string>;
  balloonIds?: { balloonId: string; receptacleId: string };

  // Puzzle configs
  mirrorConfig?: MirrorConfig;
}

export function initializeOrchestration(
  engine: GameEngine,
  world: WorldModel,
  config: OrchestrationConfig,
  scoringProcessor: ScoringEventProcessor,
  scoringService: DungeoScoringService
): void {
  // 1. Command transformers
  registerCommandTransformers(engine, { frigidRiverIds: config.frigidRiverIds });

  // 2. Scheduler events (if scheduler available)
  const scheduler = engine.getScheduler();
  if (scheduler) {
    registerSchedulerEvents(scheduler, world, config as SchedulerConfig);
  }

  // 3. Puzzle handlers
  registerPuzzleHandlers(engine, world, { endgameIds: config.endgameIds } as PuzzleConfig);

  // 4. NPC registration (if NPC service available)
  const npcService = engine.getNpcService();
  if (npcService) {
    registerNpcs(npcService, world, config as NpcConfig, engine);
  }

  // 5. Event handlers
  registerEventHandlers(engine, world, {
    mirrorConfig: config.mirrorConfig,
    coalMineIds: config.coalMineIds,
    balloonIds: config.balloonIds
  }, scoringProcessor, scoringService);
}

// Re-export for direct access if needed
export * from './command-transformers';
export * from './scheduler-setup';
export * from './puzzle-handlers';
export * from './npc-setup';
export * from './event-handlers';
```

## Result: New `onEngineReady()`

After extraction, `onEngineReady()` becomes ~15 lines:

```typescript
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
      balloonIds: this.balloonIds,
      mirrorConfig: this.mirrorConfig
    },
    this.scoringProcessor,
    this.scoringService
  );
}
```

## Impact Summary

| Metric | Before | After |
|--------|--------|-------|
| `onEngineReady()` lines | ~270 | ~15 |
| New files | 0 | 6 |
| Total orchestration lines | ~270 | ~450 (with types/imports) |

**Trade-offs**:
- More files (+6)
- More boilerplate (config interfaces, imports)
- **Much better organization** - each concern isolated
- **Testable** - can unit test individual registration functions
- **Template for future stories** - clear pattern to follow

## Implementation Order

1. Create `orchestration/` folder
2. Extract `command-transformers.ts` (most self-contained)
3. Extract `npc-setup.ts` (simple, few dependencies)
4. Extract `puzzle-handlers.ts` (small)
5. Extract `event-handlers.ts` (depends on scoring)
6. Extract `scheduler-setup.ts` (most complex, many handlers)
7. Create `index.ts` with aggregator
8. Update `index.ts` to use `initializeOrchestration()`
9. Build and test

## Validation

1. `./scripts/build-dungeo.sh --skip dungeo` - TypeScript compiles
2. `node packages/transcript-tester/dist/cli.js stories/dungeo --all` - No regressions
3. Manual play test - NPCs, puzzles, scoring all work

## Future Template

This establishes the **canonical Sharpee story structure**:

```
stories/{story}/src/
├── index.ts              # Story class, config, lifecycle methods
├── grammar/              # Parser extensions (Phase 1 pattern)
├── messages/             # Language extensions (Phase 2 pattern)
├── orchestration/        # Engine registrations (Phase 3 pattern)
│   ├── command-transformers.ts
│   ├── scheduler-setup.ts
│   ├── puzzle-handlers.ts
│   ├── npc-setup.ts
│   └── event-handlers.ts
├── regions/              # Room definitions by area
├── npcs/                 # NPC entities and behaviors
├── actions/              # Story-specific actions
├── handlers/             # Event handlers, puzzle logic
└── scheduler/            # Daemon/fuse definitions
```

New stories can copy this structure and fill in their content.
