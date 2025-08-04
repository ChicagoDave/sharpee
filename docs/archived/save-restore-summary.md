# Save/Restore Implementation Summary

## What Was Implemented

### 1. Data Structures (in `packages/core/src/types/save-data.ts`)
Created comprehensive TypeScript interfaces for save/restore functionality:
- `SaveData` - Complete save game structure
- `SaveRestoreHooks` - Client-provided storage interface  
- `SerializedEvent`, `SerializedEntity`, `SerializedLocation`, etc. - Serialization formats
- All types properly documented with JSDoc comments

### 2. Engine Changes (in `packages/engine/src/game-engine.ts`)
Added full save/restore support to the GameEngine class:

**Public API:**
- `registerSaveRestoreHooks(hooks)` - Register client storage hooks
- `save(): Promise<boolean>` - Save current game state
- `restore(): Promise<boolean>` - Restore saved game state

**Implementation:**
- Serializes complete engine state to JSON
- Tracks all events in event source for save/restore
- Validates save compatibility on restore
- Handles version checking and story ID verification

### 3. Architecture Decisions
- **ADR-033**: Documented snapshot-based save/restore design
- **ADR-034**: Documented future event sourcing approach

## How It Works

### Saving
1. Client registers save/restore hooks with the engine
2. Save action/command triggers `engine.save()`
3. Engine serializes current state to `SaveData` object
4. Engine calls client's `onSaveRequested` hook with JSON data
5. Client stores JSON however it wants (localStorage, file, cloud)

### Restoring  
1. Restore action/command triggers `engine.restore()`
2. Engine calls client's `onRestoreRequested` hook
3. Client returns saved JSON data (or null if cancelled)
4. Engine validates save (version, story ID)
5. Engine deserializes and restores all state
6. UI refreshes to show restored state

## Example Client Implementation

```typescript
// Browser client
const browserHooks: SaveRestoreHooks = {
  async onSaveRequested(data: SaveData) {
    localStorage.setItem('sharpee_save', JSON.stringify(data));
  },
  
  async onRestoreRequested() {
    const json = localStorage.getItem('sharpee_save');
    return json ? JSON.parse(json) : null;
  }
};

// Register with engine
engine.registerSaveRestoreHooks(browserHooks);
```

## What's Next

The core functionality is complete, but integration with the existing save/restore actions needs to be finished. The main challenge is that actions are synchronous but save/restore operations are async. This could be solved with an event-based approach where actions emit save/restore request events that the engine handles asynchronously.
