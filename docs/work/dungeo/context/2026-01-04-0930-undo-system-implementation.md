# Work Summary: UNDO System Implementation

**Date**: 2026-01-04 09:30
**Branch**: dungeo
**Commit**: be6ecd7

## Overview

Implemented a simple snapshot-based UNDO system to support death recovery in Dungeo (and any Sharpee story). The system allows players to undo the last 5-10 state-changing commands.

## What Was Implemented

### Engine Snapshot System (`packages/engine/src/game-engine.ts`)

1. **Circular buffer for snapshots**:
   - `undoSnapshots: string[]` - JSON-serialized world states
   - `undoSnapshotTurns: number[]` - Turn numbers for each snapshot
   - `maxUndoSnapshots` config option (default 10)

2. **Snapshot creation logic**:
   - `createUndoSnapshot()` - Saves `world.toJSON()` before command execution
   - Skips snapshots for meta/info commands that don't change state:
     - `undo, save, restore, restart, quit`
     - `score, version, about, help`
     - `look, l, examine, x, inventory, i`
     - `verbose, brief, superbrief, notify`

3. **Undo restoration**:
   - `undo()` - Pops most recent snapshot, calls `world.loadJSON()`
   - Restores turn counter to snapshot's turn
   - Updates scope vocabulary after restore

### Platform Events (`packages/core/src/events/platform-events.ts`)

- Added `UNDO_REQUESTED`, `UNDO_COMPLETED`, `UNDO_FAILED` event types
- `createUndoRequestedEvent()` and `createUndoCompletedEvent()` helpers
- Engine processes `UNDO_REQUESTED` in `processPlatformOperations()`

### UndoAction (`packages/stdlib/src/actions/standard/undoing/`)

- New action that emits `platform.undo_requested` event
- Registered as meta-command (doesn't increment turns)
- Grammar pattern: `undo` → `if.action.undoing`

### Language Messages (`packages/lang-en-us/src/actions/undoing.ts`)

- `undo_success`, `undo_failed`, `nothing_to_undo` messages

## Bugs Fixed During Implementation

### 1. Command Executor Stripping Event Properties

**Location**: `packages/engine/src/command-executor.ts:203-206`

**Problem**: Events were being transformed to `{ type, data }` only, losing `requiresClientAction` property.

**Fix**: Changed from:
```typescript
eventSequencer.sequenceAll(allEvents.map(e => ({ type: e.type, data: e.data })), turn);
```
To:
```typescript
eventSequencer.sequenceAll(allEvents, turn);
```

### 2. Event Adapter Stripping Platform Properties

**Location**: `packages/engine/src/event-adapter.ts`

**Problem A**: `normalizeEvent()` was converting underscores to dots in ALL event types, changing `platform.undo_requested` to `platform.undo.requested`.

**Fix**: Skip underscore replacement for platform events:
```typescript
if (!normalized.type.startsWith('platform.')) {
  normalized.type = normalized.type.toLowerCase().replace(/_/g, '.');
} else {
  normalized.type = normalized.type.toLowerCase();
}
```

**Problem B**: Neither `normalizeEvent()` nor `toSemanticEvent()` preserved `requiresClientAction` or `payload` properties from platform events.

**Fix**: Added preservation logic in both functions:
```typescript
if ('requiresClientAction' in event && (event as any).requiresClientAction) {
  (normalized as any).requiresClientAction = true;
}
if ('payload' in event) {
  (normalized as any).payload = (event as any).payload;
}
```

### 3. GameEvent Type Compatibility

**Location**: `packages/engine/src/types.ts:17`

**Problem**: `GameEvent.data` was required but `ISemanticEvent.data` is optional.

**Fix**: Made `data` optional in `GameEvent` interface.

## Test Results

- All 680 transcript tests pass
- New test: `stories/dungeo/tests/transcripts/undo-basic.transcript`

## Files Changed

- `packages/core/src/events/platform-events.ts` - Added UNDO event types
- `packages/engine/src/command-executor.ts` - Preserve event properties
- `packages/engine/src/event-adapter.ts` - Preserve platform event properties
- `packages/engine/src/game-engine.ts` - Undo snapshot system
- `packages/engine/src/types.ts` - GameEvent.data optional
- `packages/lang-en-us/src/actions/index.ts` - Export undoing
- `packages/lang-en-us/src/actions/undoing.ts` - New file
- `packages/parser-en-us/src/grammar.ts` - Undo pattern
- `packages/stdlib/src/actions/constants.ts` - UNDOING constant
- `packages/stdlib/src/actions/meta-registry.ts` - Register as meta
- `packages/stdlib/src/actions/standard/index.ts` - Export undoing
- `packages/stdlib/src/actions/standard/undoing/` - New action directory
- `packages/transcript-tester/src/runner.ts` - Type fix
- `packages/world-model/src/traits/vehicle/VehicleTrait.ts` - Case fix (unrelated)

## Usage Example

```
> north
North of House
...

> undo
[Previous turn undone]

> look
West of House
...
```

## Design Notes

- Snapshots are taken BEFORE commands that change state
- Meta/info commands don't create snapshots (LOOK doesn't "consume" undo)
- This means UNDO restores to before the last state-changing command
- Simple and efficient - no event replay or branching narratives
