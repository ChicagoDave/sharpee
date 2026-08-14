# Restarting Action Design

## Overview
The restarting action handles game restart with confirmation for unsaved progress. Like quitting, this meta-action emits platform events and demonstrates complete logic duplication between validate and execute phases.

## Required Messages
- `restart_confirm` - Confirmation prompt
- `restart_unsaved` - Unsaved progress warning
- `restart_requested` - Restart has been requested
- `game_restarting` - Game is restarting
- `starting_over` - Starting over message
- `new_game` - New game message

## Validation Logic

### 1. Game State Gathering
- `hasUnsavedProgress`: Compares moves to last save
- `score`: Current score
- `moves`: Current move count
- `currentLocation`: Player's current location name

### 2. Force Restart Detection
Checks for:
- `extras.force` flag
- `extras.now` flag
- Action is 'reset' command

### 3. Restart Context Building
Creates `IRestartContext`:
```typescript
{
  currentProgress: {
    score: number,
    moves: number,
    location: string
  },
  confirmationRequired: boolean,
  hasUnsavedChanges: boolean,
  force: boolean
}
```

### 4. Confirmation Logic
Confirmation required when:
- Not force restart AND
- (Has unsaved progress OR moves > 10)

**Note**: Always returns `valid: true`

## Execution Flow

### CRITICAL ISSUE: Complete Logic Duplication
**Identical to quitting, entire validation logic duplicated:**
- Re-gathers all game state
- Recalculates unsaved progress
- Rebuilds restart context
- Recreates event data
- No state preservation

### Event Generation
1. **Platform restart event**: Via `createRestartRequestedEvent()`
2. **Domain event**: `if.event.restart_requested`
3. **Conditional hint**: If confirmation needed

## Data Structures

### IRestartContext
```typescript
interface IRestartContext {
  currentProgress: {
    score: number;
    moves: number;
    location: string;
  };
  confirmationRequired: boolean;
  hasUnsavedChanges: boolean;
  force: boolean;
}
```

### RestartRequestedEventData
```typescript
interface RestartRequestedEventData {
  timestamp: number;
  hasUnsavedChanges: boolean;
  force: boolean;
  currentProgress: {
    score: number;
    moves: number;
    location: string;
  };
}
```

## Current Implementation Issues

### Critical Problems
1. **Complete logic duplication**: All validation logic repeated
2. **No state preservation**: Everything recalculated
3. **No three-phase pattern**: Missing report phase
4. **Redundant computation**: Double processing

### Design Issues
1. **Unused messages**: Several messages never used
2. **No query event**: Unlike quitting, no query system integration
3. **Hardcoded thresholds**: Magic number (10 moves)

## Recommended Improvements
1. **Implement three-phase pattern**
2. **Store validation state**
3. **Add query event** like quitting
4. **Configure thresholds**
5. **Add checkpoint support**