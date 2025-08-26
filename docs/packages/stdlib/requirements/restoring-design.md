# Restoring Action Design

## Overview
The restoring action handles loading saved game states with support for multiple save slots. This meta-action exhibits significant logic duplication between validation and execution phases.

## Required Messages
- `game_restored` - Game restored successfully
- `game_loaded` - Save loaded
- `restore_successful` - Restore completed
- `welcome_back` - Welcome message
- `restore_details` - Restore information
- `quick_restore` - Quick restore message
- `resuming_game` - Resuming from save
- `restore_failed` - Restore failed
- `save_not_found` - Save slot not found
- `no_saves` - No saved games
- `corrupt_save` - Save file corrupted
- `incompatible_save` - Save incompatible
- `restore_not_allowed` - Restore disabled
- `confirm_restore` - Restore confirmation
- `unsaved_progress` - Unsaved progress warning
- `available_saves` - List saves
- `no_saves_available` - No saves message
- `choose_save` - Choose save prompt
- `import_save` - Import save option
- `save_imported` - Import success

## Validation Logic

### 1. Save Name Determination
Checks in order:
- `extras.name`
- `extras.slot`
- `indirectObject.parsed.text`
- Default: 'default'

### 2. Restore Restrictions
- Checks `restoreRestrictions.disabled` flag
- Returns `restore_not_allowed` if disabled

### 3. Save Discovery
- Retrieves saves from `sharedData.saves`
- Maps to structured format with metadata
- Returns `no_saves` if empty

### 4. Context Building
Creates `IRestoreContext`:
```typescript
{
  slot?: string,
  availableSaves: SaveInfo[],
  lastSave?: {
    slot: string,
    timestamp: number
  }
}
```

## Execution Flow

### ISSUE: Partial Logic Duplication
**Most validation logic is duplicated:**
- Different save name extraction (uses `saveName` instead)
- Rebuilds available saves list
- Recalculates last save
- Recreates context and event data

### Notable Differences
- No restriction checking in execute
- No validation of saves existence
- Different parameter extraction logic

### Event Generation
1. **Platform restore event**: Via `createRestoreRequestedEvent()`
2. **Domain event**: `if.event.restore_requested`
3. **No success message** (unlike other meta actions)

## Data Structures

### IRestoreContext
```typescript
interface IRestoreContext {
  slot?: string;
  availableSaves: SaveInfo[];
  lastSave?: {
    slot: string;
    timestamp: number;
  };
}
```

### RestoreRequestedEventData
```typescript
interface RestoreRequestedEventData {
  saveName: string;
  timestamp: number;
  availableSaves: number;
}
```

## Current Implementation Issues

### Critical Problems
1. **Logic duplication**: Most validation logic repeated
2. **Inconsistent parameter extraction**: Different in validate vs execute
3. **No save validation**: Execute doesn't check if save exists
4. **Missing error handling**: Execute assumes saves exist

### Design Issues
1. **Many unused messages**: 22 messages defined, few used
2. **No user feedback**: No success message emitted
3. **No save selection UI**: Can't choose from list

## Recommended Improvements
1. **Implement three-phase pattern**
2. **Unify parameter extraction**
3. **Add save validation in execute**
4. **Show available saves list**
5. **Add import/export support**