# Saving Action Design

## Overview
The saving action handles game state persistence with support for named saves, quick saves, and auto-saves. Like other meta-actions, it shows significant logic duplication but includes validation for save names and restrictions.

## Required Messages
- `game_saved` - Default save success
- `game_saved_as` - Named save success
- `save_successful` - Generic success
- `save_slot` - Slot saved message
- `overwrite_save` - Overwrite confirmation
- `save_details` - Save information
- `quick_save` - Quick save message
- `auto_save` - Auto-save message
- `save_failed` - Save failed
- `no_save_slots` - No slots available
- `invalid_save_name` - Invalid name
- `save_not_allowed` - Saving disabled
- `save_in_progress` - Already saving
- `confirm_overwrite` - Overwrite prompt
- `save_reminder` - Reminder message
- `saved_locally` - Local save
- `saved_to_cloud` - Cloud save
- `save_exported` - Export success

## Validation Logic

### 1. Save Name Determination
Checks in order:
- `extras.name`
- `extras.slot`
- `indirectObject.parsed.text`
- Default: 'default'

### 2. Save Restrictions
- `disabled`: Returns `save_not_allowed`
- `inProgress`: Returns `save_in_progress`

### 3. Name Validation
- Max length: 50 characters
- Forbidden chars: `<>:"/\\|?*`
- Returns `invalid_save_name` if invalid

### 4. Save Type Detection
- Quick save: `saveName === 'quicksave'` or `extras.quick`
- Auto save: `extras.auto`

### 5. Context Building
Creates `ISaveContext`:
```typescript
{
  saveName?: string,
  autosave: boolean,
  timestamp: number,
  metadata: {
    score: number,
    moves: number,
    turnCount: number,
    quickSave: boolean
  }
}
```

### 6. Message Selection (Not Used)
Determines message but doesn't emit:
- Quick save → `quick_save`
- Auto save → `auto_save`
- Named save → `game_saved_as`
- Default → `game_saved`

## Execution Flow

### ISSUE: Partial Logic Duplication
**Most logic duplicated with differences:**
- Different save name extraction
- No restriction checking
- No name validation
- Rebuilds all contexts

### Debug Output
Contains `console.log` statement (should be removed)

### Event Generation
1. **Platform save event**: Via `createSaveRequestedEvent()`
2. **Domain event**: `if.event.save_requested`
3. **No success message** (relies on platform)

## Data Structures

### ISaveContext
```typescript
interface ISaveContext {
  saveName?: string;
  autosave: boolean;
  timestamp: number;
  metadata: {
    score: number;
    moves: number;
    turnCount: number;
    quickSave: boolean;
  };
}
```

## Current Implementation Issues

### Critical Problems
1. **Logic duplication**: Most validation repeated
2. **No validation in execute**: Missing checks
3. **Debug code**: Console.log in production
4. **Unused message selection**: Calculates but doesn't use

### Design Issues
1. **No user feedback**: Doesn't emit success message
2. **No overwrite checking**: Can't detect existing saves
3. **No slot management**: Can't list/manage saves

## Recommended Improvements
1. **Remove console.log**
2. **Implement three-phase pattern**
3. **Add success message emission**
4. **Check for existing saves**
5. **Add export/import support**