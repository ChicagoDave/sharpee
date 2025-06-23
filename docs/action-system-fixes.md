# Action System Build Errors - Fixed!

## Summary of Fixes

### 1. Import Errors ✅
- `ActionDefinition` now imports from local `./types`
- `IFCommand` imports from `../parser/if-parser-types`
- `GameContext` imports from `../world-model/types`
- Core imports come through `../core-imports`
- IF constants import from `../constants/`

### 2. IFCommand Interface Issues ✅
The IFCommand interface doesn't have `commandText`, `indirect`, or `metadata`. Instead:
- Topic extraction uses `second` (second noun), `text`, or `originalInput`
- State storage uses a module-level Map instead of command metadata
- The actual IFCommand properties are:
  - `action`: The action name
  - `noun`: First noun matches
  - `second`: Second noun matches
  - `actor`: Who's performing
  - `text`: Free text
  - `originalInput`: Original user input
  - `pattern`: Grammar pattern that matched

### 3. Event-Sourced Architecture ✅
Updated to proper event-sourced pattern:
- `validate`: Returns `boolean | string`
- `execute`: Returns `SemanticEvent[]` (not void)
- No direct event emission
- Events flow through command processor

### 4. World Events ✅
IFWorld only emits world-model events like:
- `entity:created`
- `entity:moved`
- `relationship:added`

Game events (like `NPC_ASKED_ABOUT`) are returned from actions and processed by the command system.

## Correct Action Pattern

```typescript
export const myAction: ActionDefinition = {
  id: IFActions.MY_ACTION,
  name: IFActions.MY_ACTION,
  verbs: [], // Populated by language provider
  metadata: {
    changesWorld: true,
    undoable: true,
    category: 'manipulation'
  },
  phases: {
    // Validate the action can be performed
    validate: (command: IFCommand, context: GameContext): boolean | string => {
      // Return true to continue
      // Return error message string to block
      return true;
    },
    
    // Execute and return events
    execute: (command: IFCommand, context: GameContext): SemanticEvent[] => {
      // Do the work
      const events: SemanticEvent[] = [];
      
      // Create events for what happened
      events.push(createEvent(
        IFEvents.SOMETHING_HAPPENED,
        { /* payload */ },
        { narrate: true }
      ));
      
      return events;
    }
  }
};
```

## Architecture Benefits

This event-sourced approach:
1. **Separates concerns** - Actions generate events, text service formats them
2. **Enables replay** - Events can be stored and replayed
3. **Supports multiple outputs** - Same event can generate different text for different audiences
4. **Testable** - Can test action logic separately from text generation
5. **Extensible** - New event types don't require action changes

The build errors should now be resolved!
