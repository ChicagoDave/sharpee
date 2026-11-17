# Thin Web Client: Save/Restore Implementation

**Issue**: ISSUE-012
**Status**: Implemented
**Component**: Browser Client (`stories/dungeo/src/browser-entry.ts`)

## Overview

The thin browser client receives `platform.save_requested` events but doesn't persist game state. This document outlines the implementation for localStorage-based save/restore.

## Current State

The browser entry point (`browser-entry.ts`, ~323 lines):
- Initializes GameEngine with parser, language provider, perception service
- Listens to `text:output` and `event` emissions
- Handles audio beeps for errors and score changes
- **No save/restore handling** - events are emitted but ignored

## Architecture

### Platform Event Flow

```
Player: SAVE
    ↓
savingAction.report() emits platform.save_requested
    ↓
Engine collects in pendingPlatformOps
    ↓
Engine.processPlatformOperations() calls hooks.onSaveRequested(saveData)
    ↓
Browser hook persists to localStorage
    ↓
Engine emits platform.save_completed (or platform.save_failed)
    ↓
Browser event listener updates UI
```

### Save Data Structure

The engine's `SaveRestoreService` serializes complete game state:

```typescript
interface ISaveData {
  version: '1.0.0';
  timestamp: number;
  metadata: {
    storyId: string;
    storyVersion: string;
    turnCount: number;
    playTime?: number;
    description?: string;
  };
  engineState: {
    eventSource: ISerializedEvent[];      // Complete event history
    spatialIndex: ISerializedSpatialIndex; // World state
    turnHistory: ISerializedTurn[];        // Commands executed
    schedulerState?: {                     // Daemons and fuses
      turn: number;
      daemons: ISerializedDaemonState[];
      fuses: ISerializedFuseState[];
      randomSeed: number;
    };
  };
  storyConfig: {
    id: string;
    version: string;
    title: string;
    author: string;
  };
}
```

**Size**: Typically 50KB-500KB JSON depending on game progress.

### Required Interface

```typescript
interface ISaveRestoreHooks {
  onSaveRequested: (data: ISaveData) => Promise<void>;
  onRestoreRequested: () => Promise<ISaveData | null>;
  onQuitRequested?: (context: IQuitContext) => Promise<boolean>;
  onRestartRequested?: (context: IRestartContext) => Promise<boolean>;
}
```

### Platform Events

| Event | Description |
|-------|-------------|
| `platform.save_requested` | SAVE command executed, data ready |
| `platform.save_completed` | Save succeeded |
| `platform.save_failed` | Save failed (payload.error has message) |
| `platform.restore_requested` | RESTORE command executed |
| `platform.restore_completed` | Restore succeeded |
| `platform.restore_failed` | Restore failed |

## Implementation Plan

### Phase 1: Basic Save/Restore

Single save slot using localStorage.

#### 1.1 Add Storage Key Constants

```typescript
const STORAGE_KEY = 'dungeo-save';
const STORAGE_META_KEY = 'dungeo-save-meta';
```

#### 1.2 Implement Save/Restore Hooks

```typescript
const saveRestoreHooks: ISaveRestoreHooks = {
  async onSaveRequested(data: ISaveData): Promise<void> {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(STORAGE_KEY, json);

      // Store metadata separately for quick access
      const meta = {
        timestamp: data.timestamp,
        turnCount: data.metadata.turnCount,
        description: data.metadata.description
      };
      localStorage.setItem(STORAGE_META_KEY, JSON.stringify(meta));
    } catch (error) {
      // localStorage full or unavailable
      throw new Error(`Save failed: ${error.message}`);
    }
  },

  async onRestoreRequested(): Promise<ISaveData | null> {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (!json) {
        return null; // No save exists
      }
      return JSON.parse(json) as ISaveData;
    } catch (error) {
      console.error('Restore failed:', error);
      return null;
    }
  }
};
```

#### 1.3 Register Hooks

After `engine.setStory()`, before `engine.start()`:

```typescript
// In initGame():
await engine.setStory(dungeoStory);
engine.registerSaveRestoreHooks(saveRestoreHooks);
await engine.start();
```

#### 1.4 Handle Platform Events

Extend existing event listener:

```typescript
engine.on('event', (event: SequencedEvent) => {
  // Existing beep/score handling...

  // Platform event handling
  switch (event.type) {
    case 'platform.save_completed':
      // Success message already shown by text output
      break;

    case 'platform.save_failed':
      displayText(`\nSave failed: ${event.payload?.error || 'Unknown error'}\n`);
      beep();
      break;

    case 'platform.restore_completed':
      // Clear screen and show restored state
      clearOutput();
      break;

    case 'platform.restore_failed':
      displayText(`\nRestore failed: ${event.payload?.error || 'No saved game found'}\n`);
      beep();
      break;
  }
});
```

### Phase 2: Auto-Save Detection

Offer to continue saved game on page load.

#### 2.1 Check for Existing Save

```typescript
async function checkForSavedGame(): Promise<boolean> {
  const meta = localStorage.getItem(STORAGE_META_KEY);
  if (!meta) return false;

  try {
    const { timestamp, turnCount } = JSON.parse(meta);
    const date = new Date(timestamp).toLocaleString();

    // Show prompt to user
    const resume = confirm(
      `Found saved game from ${date} (${turnCount} turns).\n\nContinue?`
    );

    return resume;
  } catch {
    return false;
  }
}
```

#### 2.2 Auto-Restore Flow

```typescript
async function initGame() {
  // ... create engine, set story, register hooks ...

  const shouldRestore = await checkForSavedGame();

  if (shouldRestore) {
    await engine.start();
    // Trigger restore
    await engine.executeTurn('restore');
  } else {
    await engine.start();
  }
}
```

### Phase 3: Multiple Save Slots (Optional)

For v2, support named saves.

#### 3.1 Storage Structure

```typescript
// Index of all saves
const SAVES_INDEX_KEY = 'dungeo-saves-index';

interface SaveSlot {
  name: string;
  timestamp: number;
  turnCount: number;
  description?: string;
}

// Individual saves: dungeo-save-{name}
```

#### 3.2 List Available Saves

```typescript
function listSaves(): SaveSlot[] {
  const index = localStorage.getItem(SAVES_INDEX_KEY);
  if (!index) return [];
  return JSON.parse(index) as SaveSlot[];
}
```

#### 3.3 Save with Name

The SAVE command supports optional name: `SAVE CHECKPOINT1`

```typescript
async onSaveRequested(data: ISaveData): Promise<void> {
  const name = data.metadata.description || 'quicksave';
  const key = `dungeo-save-${name}`;

  // Store save
  localStorage.setItem(key, JSON.stringify(data));

  // Update index
  const saves = listSaves().filter(s => s.name !== name);
  saves.push({
    name,
    timestamp: data.timestamp,
    turnCount: data.metadata.turnCount
  });
  localStorage.setItem(SAVES_INDEX_KEY, JSON.stringify(saves));
}
```

## Testing

### Manual Test Cases

1. **Basic save/restore**
   - Play a few turns, SAVE, refresh page, RESTORE
   - Verify inventory, location, score match

2. **Save overwrites previous**
   - SAVE, play more, SAVE again
   - RESTORE should load second save

3. **No save exists**
   - Clear localStorage, RESTORE
   - Should show "No saved game found"

4. **localStorage full**
   - Fill localStorage near quota
   - SAVE should show error message

5. **Corrupted save**
   - Manually corrupt localStorage entry
   - RESTORE should handle gracefully

### Transcript Test

```transcript
# Test: Browser save/restore basic flow
# Note: Can't fully test localStorage in transcript, but can verify events

> save
Game saved.

> restore
[Restoring...]
```

## Files to Modify

1. **`stories/dungeo/src/browser-entry.ts`**
   - Add storage constants
   - Implement `ISaveRestoreHooks`
   - Register hooks after setStory()
   - Handle platform events in event listener
   - Add checkForSavedGame() for auto-restore prompt

2. **`stories/dungeo/public/index.html`** (optional)
   - Add save/load/quit buttons to UI
   - Style for save confirmation messages

## Notes

### localStorage Limitations

- **Quota**: ~5-10MB per origin (browser-dependent)
- **Synchronous**: Blocks main thread (acceptable for <1MB saves)
- **No expiry**: Persists until cleared
- **Same-origin only**: Can't share saves across domains

### IndexedDB Alternative

If saves exceed localStorage limits or multiple slots needed:

```typescript
// IndexedDB provides:
// - ~50MB+ quota
// - Async operations
// - Structured data storage
// - Better for large saves or many slots
```

For the thin client's single-save use case, localStorage is simpler and sufficient.

### Security Considerations

- Save data is not encrypted (could be manipulated by player)
- No authentication (local-only, not cloud saves)
- Trust the save format version matches current engine

## References

- Engine save/restore: `packages/engine/src/game-engine.ts` (lines 906-1010)
- SaveRestoreService: `packages/engine/src/save-restore-service.ts`
- Platform events: `packages/core/src/events/platform-events.ts`
- Save data types: `packages/core/src/types/save-data.ts`
- Saving action: `packages/stdlib/src/actions/standard/saving/saving.ts`
- Restoring action: `packages/stdlib/src/actions/standard/restoring/restoring.ts`
