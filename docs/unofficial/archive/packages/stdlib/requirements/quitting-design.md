# Quitting Action Design

## Overview
The quitting action handles game termination with support for save confirmations, force quit, and unsaved progress warnings. This meta-action emits platform events for proper game shutdown and demonstrates complete logic duplication between validate and execute phases.

## Required Messages
- `quit_confirm_query` - Confirmation prompt
- `quit_save_query` - Save before quit prompt
- `quit_unsaved_query` - Unsaved progress warning
- `quit_requested` - Quit has been requested
- `game_ending` - Game is ending

## Validation Logic

### 1. Game State Gathering
Retrieves from world shared data:
- `hasUnsavedProgress`: Compares current moves to last save move
- `score`: Current score
- `maxScore`: Maximum possible score
- `moves`: Current move count
- `nearComplete`: Whether player is near game completion (>80%)

### 2. Force Quit Detection
Checks for force quit indicators:
- `extras.force` flag
- `extras.now` flag  
- Action is 'exit' command

### 3. Quit Context Building
Creates `IQuitContext`:
```typescript
{
  score: number,
  moves: number,
  hasUnsavedChanges: boolean,
  force: boolean,
  stats: {
    maxScore: number,
    nearComplete: boolean,
    playTime: number,
    achievements: string[]
  }
}
```

### 4. Event Data Preparation
Builds `QuitRequestedEventData`:
```typescript
{
  timestamp: number,
  hasUnsavedChanges: boolean,
  force: boolean,
  score: number,
  moves: number
}
```

**Note**: Validation always returns `valid: true` - quitting cannot fail.

## Execution Flow

### CRITICAL ISSUE: Complete Logic Duplication
**The entire validation logic is duplicated in execute:**
- Re-gathers all game state
- Recalculates unsaved progress
- Rebuilds quit context from scratch
- Recreates event data
- No state preservation between phases

This represents unnecessary computation and maintenance burden.

### Event Generation
Emits multiple events:

1. **Platform quit event**: 
   - Uses `createQuitRequestedEvent(quitContext)`
   - Handled by engine after turn completion

2. **Query event** (`client.query`):
   ```typescript
   {
     queryId: `quit_${Date.now()}`,
     prompt: 'Are you sure you want to quit?',
     source: 'system',
     type: 'multiple_choice',
     messageId: 'quit_confirm_query',
     options: ['quit', 'cancel'],
     context: quitContext
   }
   ```

3. **Domain event** (`if.event.quit_requested`):
   - Contains quit request data

4. **Conditional success event**:
   - Only if not force quit AND has unsaved progress
   - Provides hint about unsaved changes

## Data Structures

### IQuitContext
```typescript
interface IQuitContext {
  score: number;
  moves: number;
  hasUnsavedChanges: boolean;
  force: boolean;
  stats: {
    maxScore: number;
    nearComplete: boolean;
    playTime: number;
    achievements: string[];
  }
}
```

### QuitRequestedEventData
```typescript
interface QuitRequestedEventData {
  timestamp: number;
  hasUnsavedChanges: boolean;
  force: boolean;
  score: number;
  moves: number;
}
```

## Integration Points
- **World model**: Queries shared data for game state
- **Platform events**: Uses core quit event system
- **Query system**: Integrates with client query mechanism
- **Turn system**: Quit handled after turn completion
- **Save system**: Checks for unsaved progress

## Message Selection Logic
- Always uses `quit_confirm_query` for query prompt
- Uses `quit_requested` for unsaved progress hint
- Other messages defined but not used in current implementation

## Current Implementation Issues

### Critical Problems
1. **Complete logic duplication**: All validation logic repeated in execute
2. **No state preservation**: Rebuilds everything twice
3. **No three-phase pattern**: Should use validate/execute/report
4. **Redundant computation**: Game state gathered twice

### Design Issues
1. **Unused messages**: Several messages defined but never used
2. **Hardcoded query prompt**: Uses string instead of message system
3. **Mixed event types**: Platform, domain, and UI events
4. **Time-based query ID**: Could cause collisions

## Recommended Improvements

### Immediate Fixes
1. **Implement three-phase pattern**: Move logic to validate, preserve state
2. **Store validation results**: Pass context between phases
3. **Use message system**: Replace hardcoded prompts
4. **Improve query ID**: Use more robust ID generation

### Feature Enhancements
1. **Save integration**: Auto-save option before quit
2. **Statistics display**: Show game stats on quit
3. **Achievement check**: Warn about missed achievements
4. **Resume support**: Save quit state for resume
5. **Graceful shutdown**: Clean up resources properly

## Usage Examples

### Standard Quit
```
> quit
Are you sure you want to quit? (You have unsaved progress)
```

### Force Quit
```
> quit now
[Game exits immediately]
```

### Exit Command
```
> exit
Are you sure you want to quit?
```

### With Near Completion
```
> quit
You're close to finishing! Are you sure you want to quit?
```

## Platform Integration
The quit action relies on platform-specific handling:
1. Action emits quit request events
2. Platform processes after turn completion
3. Platform may show additional confirmations
4. Platform handles actual game termination
5. Platform manages save prompts if configured

## State Machine
```
User Input → Validate → Execute → Emit Events → Platform Handler
                ↓                      ↓              ↓
           Always Valid          Query Shown    Confirmation
                                                      ↓
                                              Quit or Continue
```