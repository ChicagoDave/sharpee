# Engine Remediation Plan

**Date**: 2026-01-16
**Scope**: Internal refactoring only - no changes to public API
**Risk**: Low - engine is a leaf node for lower packages

---

## Architectural Context

The engine is the **pinch-point** between the Sharpee platform and consumers:

```
Platform Layer              Engine (Pinch Point)              Consumer Layer
─────────────────           ─────────────────────             ─────────────────
world-model      ──┐                                  ┌──→    text-service
stdlib           ──┼──→     GameEngine      ─────────→│       (ISemanticEvent[])
parser-en-us     ──┤        executeTurn()             │
lang-en-us       ──┘             │                    └──→    clients/platforms
                                 ↓                            (TurnResult)
                          ISemanticEvent[]
```

**Critical Contracts**:

| Direction | Contract | Defined In |
|-----------|----------|------------|
| Platform → Engine | `IParser`, `WorldModel`, `Action`, `LanguageProvider` | world-model, stdlib |
| Engine → Text Service | `ISemanticEvent[]` | @sharpee/core |
| Engine → Clients | `TurnResult`, `GameEngine` public methods | @sharpee/engine |

**Why This Matters**: The engine's internal mess affects both directions:
- Upstream: Duck-typing parsers and language providers makes integration fragile
- Downstream: Event transformation (`event-adapter`) hides bugs from text-service

The remediation must preserve these contracts while fixing internals.

---

## Boundary Analysis

### Public API (FROZEN - do not change signatures)

These are consumed by stories and platforms:

```typescript
// Classes
GameEngine                    // Used by platforms, stories, transcript-tester
CommandExecutor               // Rarely used directly
ISchedulerService             // Used by dungeo handlers extensively

// Interfaces
Story                         // Implemented by all stories
StoryConfig                   // Used by all stories

// Types
TurnResult                    // Used by test runners
SequencedEvent               // Used by transcript-tester
ParsedCommandTransformer     // Used by dungeo handlers

// Functions
createCommandExecutor()      // Factory
eventSequencer               // Singleton
```

### Internal (CAN REFACTOR)

```
game-engine.ts          - Private methods, internal state management
command-executor.ts     - Internal orchestration logic
event-adapter.ts        - Entire file is internal pipeline
action-context-factory.ts - Internal context creation
event-sequencer.ts      - Internal implementation
types.ts                - Internal types (GameEvent, etc.)
scheduler/*             - Internal implementation (interface is public)
narrative/*             - Internal
```

---

## Phase 1: Dead Code Removal (1 day)

**Goal**: Remove cruft without changing behavior

### 1.1 Remove deprecated methods
```typescript
// DELETE from game-engine.ts (lines 1092-1121)
saveState(): GameState { ... }
loadState(state: GameState): void { ... }
```

Also delete `GameState` interface from types.ts - only used by deprecated methods.

### 1.2 Remove empty code paths
```typescript
// DELETE from game-engine.ts (lines 545-548)
if (semanticEvent.type === 'client.query') {
  // The handleClientQuery will be called by the event listener
}
```

### 1.3 Remove orphaned allocation
```typescript
// DELETE from action-context-factory.ts (line 70)
const eventSource = createSemanticEventSource();
```

### 1.4 Remove TODO comments
- Line 768: `// TODO: Get score from story`
- Line 2012: `// TODO: Serialize other relationships`

Either implement or remove. If removing, leave no trace.

### 1.5 Fix misleading comment
```typescript
// command-executor.ts line 1-3
// CHANGE FROM:
/**
 * Command Executor - Thin Orchestrator (~100 lines)

// CHANGE TO:
/**
 * Command Executor - Orchestrates command pipeline
```

**Verification**: All existing tests pass. No API changes.

---

## Phase 2: Type Safety (2 days)

**Goal**: Replace `any` with proper types without changing behavior

### 2.1 Define IEngineAwareParser interface

```typescript
// NEW FILE: packages/engine/src/parser-interface.ts

import { WorldModel, IValidatedCommand } from '@sharpee/world-model';

/**
 * Extended parser interface for engine integration
 */
export interface IEngineAwareParser {
  // Required (from IParser)
  parse(input: string): ParseResult;

  // Optional engine integration
  setWorldContext?(world: WorldModel, playerId: string, locationId: string): void;
  setPlatformEventEmitter?(emitter: (event: any) => void): void;
  updatePronounContext?(command: IValidatedCommand, turn: number): void;
  resetPronounContext?(): void;
}
```

Then replace duck-typing:
```typescript
// BEFORE (game-engine.ts line 117-119)
if (player && 'setWorldContext' in this.parser) {
  (this.parser as any).setWorldContext(world, player.id, playerLocation);
}

// AFTER
if (player && this.isEngineAwareParser(this.parser)) {
  this.parser.setWorldContext?.(world, player.id, playerLocation);
}

private isEngineAwareParser(p: IParser): p is IEngineAwareParser {
  return 'setWorldContext' in p || 'updatePronounContext' in p;
}
```

### 2.2 Define SharedDataKeys constants

```typescript
// NEW FILE: packages/engine/src/shared-data-keys.ts

export const SharedDataKeys = {
  INFERENCE_PERFORMED: 'inferencePerformed',
  ORIGINAL_TARGET: 'originalTarget',
  INFERRED_TARGET: 'inferredTarget',
  IMPLICIT_TAKE_EVENTS: 'implicitTakeEvents',
  VALIDATION_RESULT: 'validationResult'
} as const;

export interface ActionSharedData {
  [SharedDataKeys.INFERENCE_PERFORMED]?: boolean;
  [SharedDataKeys.ORIGINAL_TARGET]?: IFEntity;
  [SharedDataKeys.INFERRED_TARGET]?: IFEntity;
  [SharedDataKeys.IMPLICIT_TAKE_EVENTS]?: ISemanticEvent[];
  [SharedDataKeys.VALIDATION_RESULT]?: ValidationResult;
}
```

Then use typed access instead of `any`:
```typescript
// BEFORE
(inferredContext.sharedData as any).inferencePerformed = true;

// AFTER
inferredContext.sharedData[SharedDataKeys.INFERENCE_PERFORMED] = true;
```

### 2.3 Type event data properly

```typescript
// types.ts
// BEFORE
export interface GameEvent {
  type: string;
  data?: any;
}

// AFTER
export interface GameEvent<T = unknown> {
  type: string;
  data?: T;
}
```

### 2.4 Fix types.ts TurnResult.parsedCommand

```typescript
// BEFORE
parsedCommand?: any;

// AFTER
parsedCommand?: IParsedCommand;
```

**Verification**: `pnpm build` succeeds with no type errors. All tests pass.

---

## Phase 3: event-adapter Cleanup (1 day)

**Goal**: Remove legacy code, fix hidden transformation

### 3.1 Remove legacy migration

Delete `migrateLegacyEvent()` function entirely. If there's no legacy format in use, this is dead code.

### 3.2 Remove underscore transformation

This is the most dangerous hidden transformation - it breaks the contract between engine and text-service:

```typescript
// BEFORE (line 39-40)
normalized.type = normalized.type.toLowerCase().replace(/_/g, '.');

// AFTER
normalized.type = normalized.type.toLowerCase();
```

**Impact Analysis**:
- Engine emits: `if.event.implicit_take`
- Text-service receives: `if.event.implicit.take` (silently transformed)
- Debugging: You search for `implicit_take`, find nothing in text-service

**IMPORTANT**: This requires auditing all event type usages:
```bash
# Find all event type checks in text-service
grep -r "if\.event\." packages/text-service/src --include="*.ts"

# Find all event emissions in stdlib
grep -r "type:.*if\.event\." packages/stdlib/src --include="*.ts"
```

Changes needed:
- Either standardize on underscores everywhere
- Or standardize on dots everywhere
- Pick ONE and enforce it - no hidden transformation

### 3.3 Type the entry point

```typescript
// BEFORE
export function processEvent(event: any, context?: {...}): ISemanticEvent

// AFTER
export function processEvent(event: Partial<ISemanticEvent>, context?: {...}): ISemanticEvent
```

### 3.4 Fix input mutation

```typescript
// migrateLegacyEvent mutates input - if kept, make it immutable:
export function migrateLegacyEvent(event: any): ISemanticEvent {
  const result = { ...event };
  // mutate result, not event
  return result;
}
```

**Verification**: Transcript tests pass. Event types are consistent.

---

## Phase 4: Extract Services from GameEngine (3 days)

**Goal**: Break up god object while keeping public API stable

### 4.1 Extract TurnEventProcessor

```typescript
// NEW FILE: packages/engine/src/turn-event-processor.ts

export class TurnEventProcessor {
  constructor(
    private eventSource: ISemanticEventSource,
    private perceptionService?: IPerceptionService
  ) {}

  processEvents(
    events: ISemanticEvent[],
    turn: number,
    player: IFEntity,
    world: WorldModel,
    enrichmentContext: EnrichmentContext
  ): ProcessedEvents {
    // Move lines 523-553 from game-engine.ts
    // Move lines 614-659 (NPC processing)
    // Move lines 669-717 (scheduler processing)
    // DRY into single method
  }
}
```

### 4.2 Extract PlatformOperationHandler

```typescript
// NEW FILE: packages/engine/src/platform-operations.ts

export class PlatformOperationHandler {
  constructor(
    private saveRestoreHooks?: ISaveRestoreHooks,
    private eventSource: ISemanticEventSource
  ) {}

  async handle(
    operation: IPlatformEvent,
    context: PlatformContext
  ): Promise<ISemanticEvent[]> {
    // Move lines 1311-1540 from game-engine.ts
    // Use strategy pattern instead of switch
  }
}
```

### 4.3 Extract SaveRestoreService

```typescript
// NEW FILE: packages/engine/src/save-restore-service.ts

export class SaveRestoreService {
  createSaveData(engine: GameEngineInternal): ISaveData { ... }
  loadSaveData(data: ISaveData, engine: GameEngineInternal): void { ... }

  // Move serialization methods
  private serializeEventSource(): ISerializedEvent[] { ... }
  private serializeSpatialIndex(): ISerializedSpatialIndex { ... }
  // etc.
}
```

### 4.4 Extract VocabularyManager

```typescript
// NEW FILE: packages/engine/src/vocabulary-manager.ts

export class VocabularyManager {
  updateEntityVocabulary(entity: IFEntity, inScope: boolean): void { ... }
  updateScopeVocabulary(world: WorldModel, player: IFEntity): void { ... }
}
```

### 4.5 Refactor GameEngine to use services

```typescript
export class GameEngine {
  private turnProcessor: TurnEventProcessor;
  private platformOps: PlatformOperationHandler;
  private saveRestore: SaveRestoreService;
  private vocabulary: VocabularyManager;

  constructor(options: {...}) {
    // Create services
    this.turnProcessor = new TurnEventProcessor(...);
    this.platformOps = new PlatformOperationHandler(...);
    // etc.
  }

  async executeTurn(input: string): Promise<TurnResult> {
    // Delegate to services
    const events = await this.turnProcessor.processEvents(...);
    await this.platformOps.handlePending(...);
    // etc.
  }
}
```

**Target**: GameEngine reduced from 2060 lines to ~500 lines (orchestration only).

**Verification**: All tests pass. Public API unchanged.

---

## Phase 5: Fix Race Condition (0.5 day)

### 5.1 Remove setTimeout

```typescript
// BEFORE (lines 216-219)
setTimeout(() => {
  const initializedEvent = createGameInitializedEvent();
  this.emitGameEvent(initializedEvent);
}, 0);

// AFTER - emit in start() instead
start(): void {
  // ... existing validation

  // Emit initialized event (was previously in constructor)
  if (!this.hasEmittedInitialized) {
    const initializedEvent = createGameInitializedEvent();
    this.emitGameEvent(initializedEvent);
    this.hasEmittedInitialized = true;
  }

  // ... rest of start()
}
```

Or better: remove the event entirely if nothing listens to it.

---

## Phase 6: Cleanup MetaCommand Handling (0.5 day)

### 6.1 Remove hardcoded list

```typescript
// BEFORE (lines 427-434)
const nonUndoableCommands = [
  'undo', 'save', 'restore', 'restart', 'quit',
  'score', 'version', 'about', 'help',
  'look', 'l', 'examine', 'x', 'inventory', 'i',
  'verbose', 'brief', 'superbrief', 'notify'
];
if (!nonUndoableCommands.some(cmd => ...)) {
  this.createUndoSnapshot();
}

// AFTER
// Check against MetaCommandRegistry (already used on line 557)
const actionId = parseResult?.value?.action;
if (actionId && !MetaCommandRegistry.isMeta(actionId)) {
  this.createUndoSnapshot();
}
```

Note: Need to verify MetaCommandRegistry includes all the commands from the hardcoded list. If not, register them.

---

## Execution Order

| Phase | Duration | Risk | Dependency |
|-------|----------|------|------------|
| 1. Dead Code Removal | 1 day | Very Low | None |
| 2. Type Safety | 2 days | Low | Phase 1 |
| 3. event-adapter Cleanup | 1 day | Medium | Phase 2 |
| 4. Extract Services | 3 days | Medium | Phase 3 |
| 5. Fix Race Condition | 0.5 day | Low | Phase 4 |
| 6. MetaCommand Cleanup | 0.5 day | Low | Phase 4 |

**Total**: ~8 days of focused work

---

## Verification Strategy

After each phase:

1. **Build**: `./scripts/build-all-dungeo.sh`
2. **Unit tests**: `pnpm --filter @sharpee/engine test`
3. **Transcript tests**: `node dist/sharpee.js --test stories/dungeo/tests/transcripts/*.transcript`
4. **Integration**: Run through key dungeo areas manually

---

## What This Does NOT Change

- Story interface or callbacks
- How stories register handlers
- ISchedulerService API
- TurnResult structure
- SequencedEvent structure
- Any behavior visible to transcript tests

---

## Success Criteria

1. GameEngine reduced to ~500 lines
2. Zero `any` casts in engine package (or documented exceptions)
3. All existing tests pass
4. No changes to lower packages (stdlib, world-model, parser)
5. No changes to Story implementations required
