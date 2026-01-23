# Meta-Command Architecture Refactor

## Status: Implemented (2026-01-22)

## Problem Statement

Meta-commands (VERSION, SCORE, DIAGNOSE, HELP, etc.) are currently processed through the same `executeTurn()` pipeline as regular game commands. This creates several issues:

### Observed Bug

When entering VERSION (a meta-command):
1. Turn count incorrectly increments
2. The next command (meta or regular) does not increment turn count

### Root Cause

The current architecture treats meta-commands as "regular commands with some flags turned off" using scattered `if (!isMeta)` checks throughout `executeTurn()`. This leads to:

1. **Shared turn number**: Meta-commands get a turn number even though they conceptually operate outside the turn cycle
2. **turnEvents confusion**: Events are stored/cleared using turn numbers, but meta-commands don't advance the turn
3. **Event accumulation edge cases**: Multiple meta-commands on the same "turn" can interfere with each other
4. **Implicit coupling**: The turn machinery (NPC ticks, scheduler, history) must explicitly exclude meta-commands

### Current Code Flow

```
executeTurn(input)
├── Parse command
├── Validate command
├── Execute action (4-phase pattern)
├── Store events in turnEvents[turn]
├── if (!isMeta) { NPC ticks, scheduler }
├── if (!isMeta) { updateContext() → increment turn }
├── Process text from turnEvents[turn]
└── Clear turnEvents[turn]
```

The problem: `turn` is captured at the START of `executeTurn()`, but whether to increment happens at the END. Meta-commands leave `turn` unchanged, so the next command uses the same turn number.

## Proposed Solution: Early Divergence

Detect meta-commands early (after parsing) and route them to a completely separate execution path that doesn't interact with turn machinery at all.

### New Code Flow

```
executeTurn(input)
├── Parse command
├── Check if meta-command → executeMetaCommand() [NEW PATH]
│   ├── Validate
│   ├── Execute action (4-phase)
│   ├── Handle platform ops (SAVE, QUIT, AGAIN, etc.)
│   │   └── AGAIN: recursive executeTurn() with previous command
│   ├── Process events through text service
│   ├── Emit text:output (with currentTurn for context)
│   └── Return MetaCommandResult
│
└── [Regular path - unchanged]
    ├── Validate command
    ├── Execute action
    ├── Store events in turnEvents[turn]
    ├── NPC ticks, scheduler
    ├── updateContext() → increment turn
    ├── Process text from turnEvents
    └── Clear turnEvents
```

### Key Design Decisions

#### 1. Detection Point

Meta-commands are detected **after parsing but before validation**. At this point we have the action ID from the parsed command.

```typescript
// In executeTurn(), after parsing:
const actionId = parsedCommand.action;
if (MetaCommandRegistry.isMeta(actionId)) {
  return this.executeMetaCommand(input, parsedCommand, world, context);
}
```

#### 2. Separate Result Type

Meta-commands return a distinct result type that explicitly has no turn:

```typescript
interface MetaCommandResult {
  type: 'meta';
  input: string;
  success: boolean;
  events: ISemanticEvent[];  // Semantic events (text emitted via text:output)
}

interface TurnResult {
  type: 'turn';
  turn: number;
  input: string;
  success: boolean;
  events: SequencedEvent[];
  // ... existing fields
}

type CommandResult = TurnResult | MetaCommandResult;
```

#### 3. Events Through Text Service (No Turn Storage)

Meta-commands still emit semantic events and use the text service for proper i18n/message resolution. The difference is:
- Events are processed **immediately** in the same call
- Events are **not stored** in `turnEvents[turn]`
- No turn number is associated with the events

This preserves the language layer separation principle while avoiding turn-based event accumulation issues.

```typescript
private async executeMetaCommand(
  input: string,
  parsed: IParsedCommand,
  world: WorldModel,
  context: GameContext
): Promise<MetaCommandResult> {
  // Validate
  const validation = this.validator.validate(parsed);
  if (!validation.success) {
    const errorEvent = createValidationErrorEvent(validation.error);
    this.processMetaEvents([errorEvent], context);
    return {
      type: 'meta',
      input,
      success: false,
      events: [errorEvent]
    };
  }

  // Execute action (4-phase pattern)
  const command = validation.value;
  const action = this.actionRegistry.get(command.actionId);
  const actionContext = createActionContext(world, context, command, action);

  const actionValidation = action.validate(actionContext);

  let events: ISemanticEvent[];
  if (actionValidation.valid) {
    action.execute(actionContext);
    events = action.report(actionContext);
  } else {
    events = action.blocked(actionContext, actionValidation);
  }

  // Handle platform operations (SAVE, RESTORE, QUIT, AGAIN, etc.)
  // Must happen before text processing so completion events get rendered
  const platformOps = events.filter(isPlatformRequestEvent);
  for (const op of platformOps) {
    const completionEvents = await this.processPlatformOperation(op);
    events.push(...completionEvents);
  }

  // Process events through text service and emit to clients
  // Events are NOT stored in turnEvents - processed immediately
  this.processMetaEvents(events, context);

  return {
    type: 'meta',
    input,
    success: actionValidation.valid,
    events
  };
}

/**
 * Process meta-command events: text service → emit to clients
 *
 * - Does NOT store in turnEvents
 * - Passes currentTurn for display context (turn/score shown to player)
 * - Turn counter is NOT incremented
 */
private processMetaEvents(events: ISemanticEvent[], context: GameContext): void {
  const text = this.textService.processEvents(events, context);
  if (text) {
    this.emit('text:output', text, context.currentTurn);
  }
}
```

#### 4. No Turn State Modification

Meta-commands do NOT:
- Increment turn counter
- Store events in turnEvents
- Trigger NPC ticks
- Trigger scheduler ticks
- Create undo snapshots
- Update command history
- Update pronoun context

Meta-commands MAY:
- Update scope vocabulary (player might have moved, affecting what's visible)
- Read world state (for DIAGNOSE, SCORE, etc.)
- Emit platform events (for SAVE, RESTORE, QUIT)

**Turn/Score Display**: Meta-commands still report the current turn and score to the player (e.g., in status line or SCORE output). They read the current values but don't modify them. The `text:output` event includes `currentTurn` for display context.

#### 5. Platform Operations

Some meta-commands (SAVE, RESTORE, QUIT, RESTART, UNDO, AGAIN) trigger platform operations via `platform.*_requested` events. These are handled inline in `executeMetaCommand()`:

```typescript
private async executeMetaCommand(...): Promise<MetaCommandResult> {
  // ... execute action, get events ...

  // Handle platform operations before text processing
  const platformOps = events.filter(isPlatformRequestEvent);
  for (const op of platformOps) {
    const completionEvents = await this.processPlatformOperation(op);
    events.push(...completionEvents);  // Add completion events for text output
  }

  // Process all events (including completion events) through text service
  this.processMetaEvents(events, context);

  return { type: 'meta', input, success, events };
}
```

Platform operations are processed **directly** (not queued in `pendingPlatformOps`). Completion events (e.g., `platform.save_completed`) are added to the event list for text rendering.

#### 6. AGAIN is Special

AGAIN is a meta-command that recursively invokes `executeTurn()` with the previous command:

```typescript
case PlatformEventType.AGAIN_REQUESTED: {
  const previousCommand = againContext.command;
  // Recursive call - dispatches to meta or regular path as appropriate
  const repeatResult = await this.executeTurn(previousCommand);
  // ...
}
```

The repeated command goes through normal dispatch:
- If previous was "take lamp" → regular turn path (increments turn, NPCs act)
- If previous was "score" → meta path (no turn increment)

This means AGAIN itself doesn't increment the turn, but the repeated command might.

## Implementation Plan

### Phase 1: Add executeMetaCommand Method

1. Add `MetaCommandResult` type to `types.ts`
2. Add `executeMetaCommand()` method to `GameEngine`
3. Add early detection check at start of `executeTurn()`
4. Route meta-commands to new method

### Phase 2: Migrate Text Processing

1. Create helper to process events directly to text (without turnEvents)
2. Use in `executeMetaCommand()`
3. Ensure text output emits via `text:output` event

### Phase 3: Handle Platform Operations

1. Extract platform operation handling to separate method
2. Call from `executeMetaCommand()` for SAVE/RESTORE/QUIT/etc.
3. Ensure proper result is returned

### Phase 4: Clean Up

1. Remove `if (!isMeta)` checks from regular turn path
2. Remove meta-command handling from turnEvents logic
3. Update tests

### Phase 5: Update Return Type

1. Change `executeTurn()` return type to `CommandResult`
2. Update all callers to handle both result types
3. Update clients (CLI, browser) to handle `MetaCommandResult`

## Files to Modify

- `packages/engine/src/types.ts` - Add MetaCommandResult type
- `packages/engine/src/game-engine.ts` - Add executeMetaCommand(), modify executeTurn()
- `packages/engine/tests/` - Update tests for new behavior
- Clients may need updates to handle new result type

## Migration Notes

### Backward Compatibility

The change to return type is breaking. Callers must be updated:

```typescript
// Before:
const result = await engine.executeTurn(input);
console.log(`Turn ${result.turn}`);

// After:
const result = await engine.executeTurn(input);
if (result.type === 'meta') {
  // No turn number for meta-commands
  // Text already emitted via text:output event
} else {
  console.log(`Turn ${result.turn}`);
}
```

### Testing

Need to verify:
1. VERSION does not increment turn
2. SCORE does not increment turn
3. DIAGNOSE does not increment turn
4. HELP does not increment turn
5. Regular commands after meta-commands increment correctly
6. Multiple meta-commands in a row work correctly
7. Platform operations (SAVE, RESTORE, QUIT) still work
8. Story-registered meta-commands work

## Alternative Approaches Considered

### Option 2: Meta-Command Phase

Add explicit phase concept where meta-commands run in "phase 0" before turn cycle. Rejected because:
- More complex conceptually
- Still interacts with turn machinery
- Doesn't solve the "no turn number" problem

### Option 3: TurnResult with Optional Turn

Make turn number optional in TurnResult. Rejected because:
- Doesn't fix event accumulation issues
- Still routes through same code path
- Callers must handle optional turn anyway

## References

- `packages/stdlib/src/actions/meta-registry.ts` - MetaCommandRegistry
- `packages/engine/src/game-engine.ts` - Current executeTurn()
- Previous session (2026-01-21): Text accumulation bug fix (related issue)
