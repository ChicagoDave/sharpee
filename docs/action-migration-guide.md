# Action Files Migration Guide

## Build Errors Fixed

The main build errors in `asking.ts` have been fixed:

1. ✅ `ActionDefinition` now imports from local `./types`
2. ✅ `IFCommand` imports from `../parser/if-parser-types`  
3. ✅ `GameContext` imports from `../world-model/types`
4. ✅ Constants import from local `../constants/` files
5. ✅ Updated to use `validate`/`execute` pattern (not check/carry/report)
6. ✅ Events are emitted, not returned as messages

## Action Pattern (Event-Sourced)

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
    // Optional validation phase
    validate: (command: IFCommand, context: GameContext): boolean | string => {
      // Return true to continue
      // Return string message to block with explanation
      return true;
    },
    
    // Required execution phase
    execute: (command: IFCommand, context: GameContext): void => {
      // Make state changes
      // Emit events for anything that happened
      const event = createEvent(
        IFEvents.SOMETHING_HAPPENED,
        { /* event data */ },
        { narrate: true }
      );
      context.world.emit('action:performed', event);
    }
  }
};
```

## Import Structure

```typescript
// Action types (local)
import { ActionDefinition } from './types';

// Parser types (local)
import { IFCommand } from '../parser/if-parser-types';

// World model types (local)
import { GameContext } from '../world-model/types';

// Core infrastructure (through boundary)
import { createEvent } from '../core-imports';

// IF constants (local)
import { IFActions } from '../constants/if-actions';
import { IFEvents } from '../constants/if-events';
import { IFEntityType } from '../constants/if-entity-types';
import { IFAttributes } from '../constants/if-attributes';
```

## Key Changes from Old Pattern

1. **No PhaseResult** - validate returns `boolean | string`, execute returns `void`
2. **No report phase** - text comes from events via text service
3. **Events not messages** - emit events, don't return text
4. **Local imports** - IF concepts come from StdLib, not Core
5. **Controlled Core access** - only through `core-imports.ts`

## Migration Steps for Other Actions

1. Run `./fix-action-file.sh <filename>` to fix imports automatically
2. Manually update the action structure:
   - Change `check` → `validate`
   - Change `carry` → `execute`
   - Remove `report` phase
   - Remove PhaseResult usage
3. Change from returning messages to emitting events
4. Test the action compiles and works

## Architecture Alignment

This aligns with the refactor plan (2025-06-15):
- Core contains basic types and infrastructure
- StdLib contains all IF-specific concepts
- Actions are IF-specific, so they live entirely in StdLib
- Only infrastructure (events, channels) comes from Core
