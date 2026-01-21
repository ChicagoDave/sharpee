# Story Index Refactoring Analysis

## Overview

`stories/dungeo/src/index.ts` is ~2460 lines containing the entire DUNGEON story implementation. This document analyzes what could be extracted into a reusable `BaseStory` class vs what must remain DUNGEON-specific.

## Current Structure

| Section | Lines | Description |
|---------|-------|-------------|
| Imports | 1-103 | Dependencies from engine, stdlib, regions, NPCs, etc. |
| Config | 107-119 | StoryConfig definition |
| Class declaration | 121-146 | DungeoStory class with region ID fields |
| `initializeWorld()` | 151-391 | Room creation, connections, objects, handlers |
| `initializeMirrorRoomHandler()` | 397-437 | Mirror puzzle setup (private) |
| `createPlayer()` | 442-518 | Player entity creation |
| `extendParser()` | 523-1520 | Grammar patterns (~1000 lines) |
| `extendLanguage()` | 1525-2156 | Message registration (~630 lines) |
| `getCustomActions()` | 2161-2163 | Returns action array |
| `initialize()` | 2168-2170 | Empty |
| `isComplete()` | 2175-2178 | Returns false |
| `onEngineReady()` | 2184-2452 | Transformers, scheduler, NPCs, handlers (~270 lines) |

## Candidate for BaseStory Class

### 1. Player Creation Pattern

The `createPlayer()` method is nearly identical across IF games:

```typescript
// Current DUNGEON implementation
createPlayer(world: WorldModel): IFEntity {
  const player = world.createEntity('yourself', EntityType.ACTOR);

  player.add(new IdentityTrait({
    name: 'yourself',
    description: 'A brave adventurer...',
    aliases: ['self', 'myself', 'me', 'yourself', 'adventurer'],
    properName: true,
    article: ''
  }));

  player.add(new ActorTrait({ isPlayer: true }));
  player.add(new ContainerTrait({ capacity: { maxItems: 15, maxWeight: 100 } }));
  player.add(new CombatantTrait({ health: 100, maxHealth: 100, ... }));

  return player;
}
```

**Extraction**: Move to `BaseStory` with configuration options:

```typescript
// packages/engine/src/base-story.ts
export interface PlayerConfig {
  name?: string;           // default: 'yourself'
  description?: string;    // default: 'An adventurer.'
  aliases?: string[];      // default: ['self', 'myself', 'me']
  inventoryCapacity?: number;  // default: 10
  inventoryWeight?: number;    // default: 50
  hasCombat?: boolean;     // default: false
}

export abstract class BaseStory implements Story {
  protected playerConfig: PlayerConfig = {};

  createPlayer(world: WorldModel): IFEntity {
    // Check for existing player, create with config...
  }
}
```

### 2. Scoring Infrastructure

Basic scoring setup is boilerplate:

```typescript
// Current DUNGEON implementation
world.registerCapability(StandardCapabilities.SCORING, {
  initialData: {
    scoreValue: 0,
    maxScore: 616,
    moves: 0,
    deaths: 0,
    achievements: [],
    scoredTreasures: []
  }
});

this.scoringService = new DungeoScoringService(world);
this.scoringProcessor = new ScoringEventProcessor(this.scoringService, world)
  .enableDynamicTreasures('trophy case');
```

**Extraction**: Move pattern to `BaseStory` with configuration:

```typescript
export interface ScoringConfig {
  maxScore: number;
  trophyContainerName?: string;  // default: 'trophy case'
  deathPenalty?: number;         // default: 0
  trackDeaths?: boolean;         // default: false
}

export abstract class BaseStory {
  protected scoringConfig?: ScoringConfig;

  protected initializeScoring(world: WorldModel): void {
    if (!this.scoringConfig) return;
    // Register capability, create services...
  }
}
```

### 3. Default Method Implementations

These are always the same:

```typescript
initialize(): void {}
isComplete(): boolean { return false; }
```

**Extraction**: Provide defaults in `BaseStory`, stories override if needed.

## DUNGEON-Specific (Must Remain)

### 1. Story Configuration

```typescript
export const config: StoryConfig = {
  id: "dungeon",
  title: "DUNGEON",
  author: "Tim Anderson, Marc Blank, Bruce Daniels, and Dave Lebling",
  // ...
};
```

Every story defines its own config. Keep in story.

### 2. World Initialization

191 rooms across 15 regions, specific connections, object placements, puzzle initializations. Entirely game-specific.

### 3. Grammar Patterns (~1000 lines)

All puzzle-specific: GDT, SAY, RING, BREAK, BURN, PRAY, INCANT, LIFT, LOWER, PUSH, DIG, WIND, POUR, FILL, etc.

**Recommendation**: Split into separate files by feature:

```
src/grammar/
├── index.ts              # Re-exports all
├── gdt-grammar.ts        # GDT debugging commands
├── speech-grammar.ts     # SAY, ANSWER patterns
├── puzzle-grammar.ts     # PUSH WALL, SET DIAL, etc.
├── boat-grammar.ts       # INFLATE, DEFLATE, LAUNCH, BOARD
├── combat-grammar.ts     # DIAGNOSE, RING, BREAK
└── ...
```

Then `extendParser()` becomes:

```typescript
extendParser(parser: Parser): void {
  const grammar = parser.getStoryGrammar();
  registerGDTGrammar(grammar);
  registerSpeechGrammar(grammar);
  registerPuzzleGrammar(grammar);
  registerBoatGrammar(grammar);
  // ...
}
```

### 4. Language Messages (~630 lines)

All game-specific messages. Same recommendation - split by feature:

```
src/messages/
├── index.ts              # Re-exports all
├── npc-messages.ts       # Thief, Cyclops, Troll, Robot, DM
├── puzzle-messages.ts    # Royal puzzle, mirror, laser, etc.
├── scheduler-messages.ts # Lantern, candles, dam, flooding
├── combat-messages.ts    # Death, diagnose, wounds
└── ...
```

Then `extendLanguage()` becomes:

```typescript
extendLanguage(language: LanguageProvider): void {
  registerNPCMessages(language);
  registerPuzzleMessages(language);
  registerSchedulerMessages(language);
  registerCombatMessages(language);
  // ...
}
```

### 5. Engine Ready Handlers (~270 lines)

Command transformers, scheduler registrations, NPC registrations, event handlers. This is orchestration that ties story-specific systems together. Keep in story but consider grouping registrations by subsystem.

## Recommended Refactoring Plan

### Phase 1: Extract BaseStory (Platform Change)

Create `packages/engine/src/base-story.ts`:

```typescript
export interface PlayerConfig { ... }
export interface ScoringConfig { ... }

export abstract class BaseStory implements Story {
  abstract config: StoryConfig;

  protected playerConfig: PlayerConfig = {};
  protected scoringConfig?: ScoringConfig;

  // Default implementations
  createPlayer(world: WorldModel): IFEntity { ... }
  initialize(): void {}
  isComplete(): boolean { return false; }

  // Protected helpers
  protected initializeScoring(world: WorldModel): void { ... }

  // Abstract methods stories must implement
  abstract initializeWorld(world: WorldModel): void;
  abstract extendParser(parser: Parser): void;
  abstract extendLanguage(language: LanguageProvider): void;
  abstract onEngineReady(engine: GameEngine): void;
}
```

### Phase 2: Split Grammar (Story Change)

Move grammar patterns to `src/grammar/` folder:
- ~15 files, each ~50-100 lines
- `index.ts` exports registration functions
- `extendParser()` imports and calls them

### Phase 3: Split Messages (Story Change)

Move messages to `src/messages/` folder:
- ~10 files organized by feature
- `index.ts` exports registration functions
- `extendLanguage()` imports and calls them

### Phase 4: Update DUNGEON to Use BaseStory

```typescript
// stories/dungeo/src/index.ts (after refactoring)
import { BaseStory, PlayerConfig, ScoringConfig } from '@sharpee/engine';
import { registerAllGrammar } from './grammar';
import { registerAllMessages } from './messages';

export class DungeoStory extends BaseStory {
  config = config;

  protected playerConfig: PlayerConfig = {
    description: 'A brave adventurer, ready to explore the Great Underground Empire.',
    inventoryCapacity: 15,
    inventoryWeight: 100,
    hasCombat: true
  };

  protected scoringConfig: ScoringConfig = {
    maxScore: 616,
    trophyContainerName: 'trophy case',
    deathPenalty: 10,
    trackDeaths: true
  };

  initializeWorld(world: WorldModel): void {
    super.initializeScoring(world);
    // Region creation, connections, etc.
  }

  extendParser(parser: Parser): void {
    registerAllGrammar(parser.getStoryGrammar());
  }

  extendLanguage(language: LanguageProvider): void {
    registerAllMessages(language);
  }

  onEngineReady(engine: GameEngine): void {
    // Transformers, handlers, NPCs...
  }
}
```

## File Size Impact

| File | Before | After |
|------|--------|-------|
| `index.ts` | ~2460 lines | ~500 lines |
| `grammar/index.ts` | N/A | ~50 lines |
| `grammar/*.ts` (15 files) | N/A | ~1000 lines total |
| `messages/index.ts` | N/A | ~50 lines |
| `messages/*.ts` (10 files) | N/A | ~650 lines total |
| **Total** | ~2460 lines | ~2250 lines |

Line count stays similar, but code is now:
- **Organized by feature** - easier to find/modify
- **Testable in isolation** - grammar and messages can have unit tests
- **Reusable patterns** - BaseStory for other games

## Priority

1. **Phase 2 & 3 (Grammar/Messages split)**: High - Story-only change, no platform impact
2. **Phase 1 (BaseStory)**: Medium - Platform change, discuss first
3. **Phase 4 (Use BaseStory)**: Low - After platform work complete

## Notes

- Grammar split could be done incrementally (one feature at a time)
- Messages split is straightforward - just moving `addMessage()` calls
- BaseStory extraction is a bigger architectural decision
- Consider whether other stories (armoured, future games) would benefit from BaseStory before investing in it
