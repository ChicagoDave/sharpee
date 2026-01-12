# Scoring Service Assessment

**Date**: 2026-01-11
**Status**: Architecture Review

## Executive Summary

The stdlib scoring service (ADR-085) provides solid foundations but lacks **clear, documented hooks** for common scoring scenarios. Story authors must discover scoring patterns through trial and error. The Dungeo implementation reveals these gaps:

1. **No standard pattern for "first take" scoring** - Authors must manually wire `if.event.taken` handlers
2. **No standard pattern for "put in container" scoring** - Authors must manually wire `if.event.put_in` handlers
3. **No room-visit scoring support** - No events or hooks for first-time room entry
4. **No simple "award points" API** - Authors use low-level `addPoints()` without deduplication

## What the Scoring Service Should Provide

### Required Scoring Hooks

| Scenario | Expected API | Current State |
|----------|--------------|---------------|
| Take treasure first time | `onFirstTake(itemId, points)` | Manual event handler |
| Put item in scoring container | `onPutInScoringContainer(containerId, itemId, points)` | Manual event handler |
| Visit room first time | `onFirstVisit(roomId, points)` | Not supported |
| Arbitrary story points | `awardPoints(sourceId, points, reason)` | Exists but undocumented |
| Puzzle completion | `awardAchievement(name, points)` | Exists in Dungeo only |
| Multi-step goals | `registerGoal(steps[], reward)` | Not supported |
| Chained event sequences | `onSequence([event1, event2], callback)` | Not supported |

### Expected Author Experience

```typescript
// What authors SHOULD be able to write:
scoring.registerTreasure('jade-figurine', {
  takePoints: 5,
  casePoints: 5,
  caseContainerId: 'trophy-case'
});

scoring.registerRoomPoints('cellar', 25);

scoring.registerPuzzleBonus('light-shaft-solved', 10);
```

### What Authors Actually Write Today

```typescript
// Current reality - scattered, manual, error-prone:
world.registerEventHandler('if.event.taken', (event, w) => {
  const data = event.data as Record<string, any> | undefined;
  const itemId = data?.itemId as string | undefined;
  if (!itemId) return;

  const item = w.getEntity(itemId);
  if (!item) return;

  const isTreasure = (item as any).isTreasure;
  if (!isTreasure) return;

  const treasureValue = (item as any).treasureValue || 0;
  const treasureId = (item as any).treasureId || item.id;

  if (treasureValue > 0) {
    scoringService.scoreTreasureTake(treasureId, treasureValue);
  }
});
```

## Current Architecture Analysis

### stdlib ScoringService (`packages/stdlib/src/services/scoring/`)

**Strengths:**
- Clean `IScoringService` interface
- Deduplication via `sourceId` (prevents double-scoring)
- Event emission (`if.event.score_displayed`)
- Save/restore support
- Rank system with i18n message IDs
- Category-based definitions (treasure, puzzle, exploration, action)

**Weaknesses:**
- No event listeners built-in (service doesn't subscribe to game events)
- No treasure registration API
- No room-visit tracking
- `scorePoints(sourceId)` requires pre-registered definitions
- No integration with world model traits

### DungeoScoringService (`stories/dungeo/src/scoring/`)

**Extensions Added:**
- `scoreTreasureTake()` / `scoreTreasureCase()` - Separate take vs case tracking
- `addAchievement()` - Named one-time awards
- Custom Zork rank system
- Dynamic max score (ADR-078)

**Problems:**
- Duplicates stdlib patterns instead of extending cleanly
- Tracking arrays (`takenTreasures[]`, `scoredTreasures[]`) parallel stdlib's `scoredSources[]`
- Handler registration happens in story `index.ts`, not in service
- Service doesn't own its event subscriptions

### Event Handler Pattern (Current)

```
stories/dungeo/src/index.ts:initializeWorld()
  └─> registerTreasureScoringHandlers()
        ├─> world.registerEventHandler('if.event.taken', ...)
        └─> world.registerEventHandler('if.event.put_in', ...)
```

**Issues:**
1. Handlers are in story index.ts (2000+ line file), not with scoring service
2. Uses `world.registerEventHandler()` not `engine.getEventProcessor().registerHandler()`
3. Registration timing is fragile (must be in initializeWorld, not onEngineReady)
4. No documentation of which registration method works when

## Gap Analysis: Dungeo Requirements vs Stdlib Support

### FORTRAN Zork Scoring (616 points)

| Category | Points | Stdlib Support | Dungeo Implementation |
|----------|--------|----------------|----------------------|
| OFVAL (treasure take) | 260 | None | Manual handler |
| OTVAL (trophy case) | 231 | None | Manual handler |
| RVAL (room visits) | 115 | None | **Not implemented** |
| LTSHFT (puzzle bonus) | 10 | None | **Not implemented** |

### What's Broken in Dungeo

1. **Handler Discovery**: Spent 30+ minutes debugging why `if.event.taken` handler wasn't firing
   - Root cause: Used wrong registration API (`engine.getEventProcessor()` vs `world.registerEventHandler()`)
   - No documentation on which to use when

2. **Entity Property Access**: Handler couldn't read `isTreasure` property
   - Root cause: Entity wrapper doesn't expose expando properties consistently
   - Workaround: Cast to `any` and hope

3. **No Room Scoring**: RVAL requires 7 rooms to award points on first visit
   - No `if.event.entered_room` or equivalent
   - Would require custom tracking in story code

## Goals and Chained Events

### The Problem

Many IF scoring scenarios involve **multi-step sequences** or **aggregate goals**:

1. **Chained Events**: Actions that must happen in order
   - Exorcism ritual: Light candles → Read prayer → Ring bell (in that order)
   - Dam puzzle: Turn bolt → Push yellow button
   - Thief encounter: Defeat thief → Take canvas → reveals hidden max score

2. **Aggregate Goals**: Collecting/completing a set of things
   - "Put all 19 treasures in trophy case" → Unlock endgame
   - "Visit all 7 special rooms" → Exploration bonus
   - "Solve all Bank of Zork puzzles" → Achievement

3. **Conditional Unlocks**: State changes that enable new scoring
   - Thief dead + canvas obtained → Max score increases from 616 to 650
   - All treasures collected → Endgame entrance opens

### Current State: No Support

Authors must implement these patterns manually:

```typescript
// Current approach for chained events (exorcism example)
let candlesLit = false;
let prayerRead = false;

world.registerEventHandler('if.event.switched_on', (event) => {
  if (event.data.itemId === candlesId) {
    candlesLit = true;
  }
});

world.registerEventHandler('if.event.read', (event) => {
  if (event.data.itemId === prayerId && candlesLit) {
    prayerRead = true;
  }
});

world.registerEventHandler('if.event.rung', (event) => {
  if (event.data.itemId === bellId && candlesLit && prayerRead) {
    // Exorcism complete!
    scoringService.awardAchievement('exorcism', 10);
  }
});
```

**Problems:**
- State tracking scattered across handlers
- Order enforcement is manual and error-prone
- No way to query "what steps remain?"
- No timeout/reset logic
- No save/restore of sequence state

### Proposed: Goals and Sequences API

#### Chained Event Sequences

```typescript
// Define a sequence that must happen in order
scoring.registerSequence('exorcism-ritual', {
  steps: [
    { event: 'if.event.switched_on', filter: { itemId: candlesId } },
    { event: 'if.event.read', filter: { itemId: prayerId } },
    { event: 'if.event.rung', filter: { itemId: bellId } }
  ],
  timeout: 10,  // Reset if 10 turns pass between steps (optional)
  onComplete: (scoring) => {
    scoring.awardOnce('exorcism', 10, 'Completed the exorcism ritual');
  },
  onStep: (stepIndex, scoring) => {
    // Optional: feedback on progress
  }
});

// Query sequence state
scoring.getSequenceProgress('exorcism-ritual');
// => { currentStep: 1, steps: ['candles', 'prayer', 'bell'], completed: false }
```

#### Aggregate Goals

```typescript
// Define a goal that tracks multiple items/conditions
scoring.registerGoal('all-treasures', {
  description: 'Place all treasures in the trophy case',
  conditions: [
    { type: 'item_in_container', itemId: 'jade', containerId: 'trophy-case' },
    { type: 'item_in_container', itemId: 'diamond', containerId: 'trophy-case' },
    // ... all 19 treasures
  ],
  // OR: dynamic condition
  conditionFn: (world) => {
    const treasures = world.findEntities({ isTreasure: true });
    return treasures.every(t => world.getLocation(t.id) === 'trophy-case');
  },
  onComplete: (scoring) => {
    scoring.awardOnce('treasure-master', 0, 'Collected all treasures');
    world.setStateValue('endgame.unlocked', true);
  }
});

// Query goal state
scoring.getGoalProgress('all-treasures');
// => { completed: 15, total: 19, percentage: 79, remaining: ['crown', 'violin', ...] }
```

#### Conditional Unlocks

```typescript
// Define state that unlocks when conditions are met
scoring.registerUnlock('hidden-points', {
  conditions: [
    { type: 'achievement', id: 'thief-dead' },
    { type: 'item_taken', itemId: 'canvas' }
  ],
  onUnlock: (scoring) => {
    scoring.setMaxScore(650);  // Reveal hidden 34 points
  }
});
```

### Zork Examples That Need This

| Feature | Type | Current Implementation |
|---------|------|----------------------|
| Exorcism ritual | Sequence | Manual handlers in `exorcism-handler.ts` |
| Dam puzzle | Sequence | Manual handlers |
| Light shaft bonus | Sequence | **Not implemented** |
| All treasures → Endgame | Goal | **Not implemented** |
| Thief dead → Hidden points | Unlock | Manual in `reality-altered-handler.ts` |
| Bank of Zork completion | Goal | **Not implemented** |
| Endgame room progression | Sequence | Partial via `awardsPointsOnEntry` |

### Implementation Approach

Add to `ScoringEventProcessor` (Option C):

```typescript
class ScoringEventProcessor {
  private sequences: Map<string, SequenceState> = new Map();
  private goals: Map<string, GoalState> = new Map();
  private unlocks: Map<string, UnlockState> = new Map();

  registerSequence(id: string, config: SequenceConfig): void;
  registerGoal(id: string, config: GoalConfig): void;
  registerUnlock(id: string, config: UnlockConfig): void;

  getSequenceProgress(id: string): SequenceProgress;
  getGoalProgress(id: string): GoalProgress;

  // Called internally on each event
  private processEvent(event: IFEvent): void {
    this.advanceSequences(event);
    this.checkGoals();
    this.checkUnlocks();
  }

  // Save/restore support
  getState(): ScoringProcessorState;
  restoreState(state: ScoringProcessorState): void;
}
```

### Benefits

1. **Declarative**: Authors describe what should happen, not how to track it
2. **Queryable**: "What steps remain?" / "How close to goal?"
3. **Save/restore**: Sequence progress persists across save/load
4. **Debuggable**: Clear state for debugging ("sequence at step 2 of 3")
5. **Reusable**: Common pattern across stories

## Recommended Architecture Changes

### Option A: Extend ScoringService with Built-in Hooks

Add to `IScoringService`:

```typescript
interface IScoringService {
  // Existing...

  // New: Treasure scoring with automatic event handling
  registerTreasure(config: TreasureConfig): void;

  // New: Room visit scoring
  registerRoomPoints(roomId: string, points: number): void;

  // New: Simple point award (combines addPoints + deduplication)
  awardOnce(sourceId: string, points: number, reason?: string): boolean;
}

interface TreasureConfig {
  entityId: string;
  takePoints?: number;        // Awarded on if.event.taken
  containerPoints?: number;   // Awarded on if.event.put_in
  containerId?: string;       // Target container (e.g., trophy case)
}
```

**Pros:** Clean API, all scoring logic in one place
**Cons:** Service needs engine/world access to register handlers

### Option B: Scoring Trait + Behavior Pattern

Create `ScoringTrait` that entities can have:

```typescript
interface ScoringTrait {
  type: 'if.trait.scoring';
  takePoints?: number;
  containerPoints?: number;
  targetContainerId?: string;
  visitPoints?: number;  // For rooms
}
```

Engine auto-registers handlers for entities with this trait.

**Pros:** Declarative, follows existing trait patterns
**Cons:** New trait type, requires engine integration

### Option C: Scoring Event Processor (Recommended)

Create dedicated `ScoringEventProcessor` that stories can configure:

```typescript
// In story setup:
const scoringProcessor = new ScoringEventProcessor(scoringService, world);

// Register treasures
scoringProcessor.registerTreasure('jade-figurine', {
  takePoints: 5,
  casePoints: 5,
  caseId: 'trophy-case'
});

// Register room visits
scoringProcessor.registerRoomVisit('cellar', 25);

// Processor automatically subscribes to relevant events
```

**Pros:**
- Encapsulates all event handling
- Clear ownership of subscriptions
- Reusable across stories
- Doesn't require engine/stdlib changes

**Cons:**
- Another class to maintain
- Stories must instantiate it

## Immediate Fixes for Dungeo

### 1. Document Handler Registration

Add to CLAUDE.md or create scoring guide:

```markdown
## Event Handler Registration

Use `world.registerEventHandler()` in `initializeWorld()`:
- ✅ `world.registerEventHandler('if.event.taken', handler)` - Works
- ❌ `engine.getEventProcessor().registerHandler()` in `onEngineReady()` - Doesn't work for scoring

Handler signature: `(event: IFEvent, world: WorldModel) => void`
```

### 2. Implement Room Visit Scoring

Add to DungeoScoringService:

```typescript
private visitedRooms: Set<string> = new Set();

scoreRoomVisit(roomId: string, points: number): boolean {
  if (this.visitedRooms.has(roomId)) return false;
  this.visitedRooms.push(roomId);
  this.addPoints(points, `Visited ${roomId}`);
  return true;
}
```

Wire to `if.event.player_moved` or check in room descriptions.

### 3. Fix Missing Trophy Case Values

Update all treasure definitions to include both `treasureValue` and `trophyCaseValue`.

### 4. Consolidate Handlers

Move treasure scoring handlers from `index.ts` to `dungeo-scoring-service.ts`:

```typescript
class DungeoScoringService {
  constructor(world: WorldModel, trophyCaseId: string) {
    this.registerHandlers(world, trophyCaseId);
  }

  private registerHandlers(world: WorldModel, trophyCaseId: string) {
    world.registerEventHandler('if.event.taken', ...);
    world.registerEventHandler('if.event.put_in', ...);
  }
}
```

## Summary

| Issue | Severity | Effort | Recommendation |
|-------|----------|--------|----------------|
| No take scoring API | High | Medium | Option C (ScoringEventProcessor) |
| No room visit scoring | High | Low | Add to DungeoScoringService |
| No chained event sequences | High | Medium | Add to ScoringEventProcessor |
| No aggregate goals | Medium | Medium | Add to ScoringEventProcessor |
| No conditional unlocks | Medium | Low | Add to ScoringEventProcessor |
| Handler registration confusion | Medium | Low | Documentation |
| Handlers in wrong file | Low | Low | Move to service |
| Missing stdlib hooks | Medium | High | Future stdlib enhancement |

The scoring service architecture is sound but incomplete. For Dungeo, we should implement Option C locally (ScoringEventProcessor) with support for:

1. **Basic hooks**: Treasure take/case, room visits, arbitrary points
2. **Sequences**: Ordered event chains with timeout/reset
3. **Goals**: Aggregate conditions with progress tracking
4. **Unlocks**: Conditional state changes

This gives authors a declarative, queryable, save/restore-friendly API while keeping stdlib changes minimal. If the pattern proves useful across stories, promote to stdlib.
