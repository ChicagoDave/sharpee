# Prompt: Implement Missing Standard Actions for Sharpee IF Engine

## Context
I'm working on the Sharpee Interactive Fiction Engine. We've discovered that only 7 out of 44 standard IF actions are implemented, causing many test failures. The parser recognizes verbs from the language provider, but the corresponding actions don't exist in the standard library.

## Current State
- Location: `/packages/stdlib/src/actions/standard/`
- Implemented actions: looking, inventory, taking, dropping, examining, opening, going
- Language provider: `/packages/lang-en-us/` defines 44 standard verbs
- Action IDs follow pattern: `if.action.{name}` (e.g., `if.action.waiting`)

## Architecture Requirements
Each action must:
1. Implement the `ActionExecutor` interface
2. Return semantic events (not modify world state directly)
3. Use the action ID that matches the language provider
4. Be a pure function that validates conditions
5. Be added to the `standardActions` export array

## ActionExecutor Interface
```typescript
export interface ActionExecutor {
  id: string;  // Must match language provider (e.g., 'if.action.waiting')
  aliases: string[];  // Verb patterns (e.g., ['wait', 'z'])
  
  execute(
    command: ValidatedCommand,
    context: ActionContext
  ): SemanticEvent[];
  
  canExecute?(
    command: ValidatedCommand,
    context: ActionContext
  ): boolean;
}
```

## ActionContext Interface
```typescript
interface ActionContext {
  world: ReadOnlyWorldModel;
  player: IFEntity;
  currentLocation: IFEntity;
  canSee: (entity: IFEntity) => boolean;
  canReach: (entity: IFEntity) => boolean;
  canTake: (entity: IFEntity) => boolean;
  isInScope: (entity: IFEntity) => boolean;
  getVisible: () => IFEntity[];
  getInScope: () => IFEntity[];
}
```

## Priority Actions to Implement

### 1. **waiting** (`if.action.waiting`)
- Verbs: "wait", "z"
- Events: `time.passed`, `turn.waited`
- Simple action, just advances time

### 2. **closing** (`if.action.closing`)
- Verbs: "close", "shut", "cover"
- Events: `container.closed`, `action.failed` (if already closed)
- Pair to existing opening action

### 3. **putting** (`if.action.putting`)
- Verbs: "put", "place", "put in", "put on"
- Events: `entity.moved`, `container.received`
- Requires direct object (what) and indirect object (where)

### 4. **help** (`if.action.help`)
- Verbs: "help", "?", "commands"
- Events: `help.displayed`, `commands.listed`
- Meta command, lists available commands

### 5. **scoring** (`if.action.scoring`)
- Verbs: "score", "points"
- Events: `score.displayed`, `achievements.listed`
- Shows current score/progress

### 6. **about** (`if.action.about`)
- Verbs: "about", "info", "credits"
- Events: `about.displayed`, `credits.shown`
- Shows game information

## Example Implementation Pattern
Follow the pattern from existing actions:

```typescript
// File: /packages/stdlib/src/actions/standard/waiting.ts
import { createEvent } from '@sharpee/core';
import { ValidatedCommand } from '@sharpee/world-model';
import { ActionExecutor, ActionContext } from '../types';
import { IFActions } from '../constants';

export const waitingAction: ActionExecutor = {
  id: IFActions.WAITING,  // 'if.action.waiting'
  aliases: ['wait', 'z'],
  
  execute(command: ValidatedCommand, context: ActionContext) {
    const events = [];
    
    // Generate events
    events.push(createEvent('time.passed', {
      actorId: context.player.id,
      locationId: context.currentLocation.id,
      timestamp: Date.now()
    }));
    
    events.push(createEvent('turn.waited', {
      actorId: context.player.id,
      timestamp: Date.now()
    }));
    
    return events;
  }
};
```

## Complete List of Missing Actions
Here are all 37 unimplemented actions that need to be created:

### Movement (3)
- entering, exiting, climbing

### Observation (4)
- searching, listening, smelling, touching

### Object Manipulation (5)
- putting, inserting, closing, locking, unlocking

### Device Actions (6)
- switching_on, switching_off, pushing, pulling, turning, using

### Social Actions (8)
- giving, showing, throwing, attacking, talking, asking, telling, answering

### Wearables (2)
- wearing, taking_off

### Consumption (2)
- eating, drinking

### Meta Commands (7)
- waiting, saving, restoring, quitting, help, about, scoring

## Success Criteria
1. All 37 missing actions implemented
2. Each action properly validates preconditions
3. Actions generate appropriate semantic events
4. Test coverage remains above 80%
5. Integration tests pass with language provider

## Notes
- Start with the priority actions listed above
- Use existing actions as templates
- Ensure action IDs match exactly with language provider
- Don't modify world state directly, only return events
- Consider edge cases (e.g., closing already closed door)
- Add unit tests for each new action
