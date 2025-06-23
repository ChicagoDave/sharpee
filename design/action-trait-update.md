# Action-Trait Architecture Update

## Overview

This document outlines the refined architecture for traits, behaviors, and actions in the Sharpee IF platform. The goal is to maintain clean separation of concerns while keeping the system simple and extensible.

## Core Concepts

### 1. Traits = Data
Traits are pure data containers with validation. No behavior beyond getters/setters.

```typescript
class DialogueTrait extends ValidatedTrait {
  currentNodeId?: string;
  visitedNodes: Set<string>;
  flags: Map<string, boolean>;
  // Just data, no methods like selectResponse()
}
```

### 2. Behaviors = Logic
Behaviors contain the logic that operates on trait data.

```typescript
class DialogueBehavior {
  static requiredTraits = [TraitType.DIALOGUE];
  
  startConversation(actor: IFEntity, target: IFEntity): Event[]
  selectResponse(actor: IFEntity, target: IFEntity, responseId: string): Event[]
}
```

### 3. Actions = Commands
Actions handle player commands by coordinating with behaviors.

```typescript
const talkAction = {
  execute: (cmd, ctx) => {
    const behavior = ctx.getBehavior(cmd.noun, 'dialogue');
    return behavior.startConversation(cmd.actor, cmd.noun);
  }
}
```

## File Organization

### Traits and Behaviors
Traits and behaviors are organized by feature, not complexity:

```
/world-model/traits/
  /dialogue/
    dialogueTrait.ts      # Data structure
    dialogueBehavior.ts   # Logic that operates on the data
    index.ts             # Exports both
  /openable/
    openableTrait.ts      
    openableBehavior.ts
  /container/
    containerTrait.ts
    containerBehavior.ts
  /scenery/
    sceneryTrait.ts      # Marks items as untakeable
    sceneryBehavior.ts   # Customize "can't take" messages
  ...
```

### Actions
Actions follow a similar pattern, separating command parsing from execution:

```
/actions/
  /taking/
    takingCommand.ts    # Parser rules, validation requirements
    takingAction.ts     # Execution logic
    index.ts
  /opening/
    openingCommand.ts   # Command patterns, requirements
    openingAction.ts    # The actual behavior
  /examining/
    examiningCommand.ts
    examiningAction.ts
  ...
```

## Key Design Decisions

### 1. Composition Through Dependencies
Behaviors declare their trait dependencies explicitly:

```typescript
class LockableBehavior extends Behavior {
  static requiredTraits = [TraitType.LOCKABLE, TraitType.OPENABLE];
  
  unlock(entity: IFEntity, key: IFEntity): Event[] {
    const lockable = this.require<LockableTrait>(entity, TraitType.LOCKABLE);
    const openable = this.require<OpenableTrait>(entity, TraitType.OPENABLE);
    // ...
  }
}
```

### 2. IF Conventions
Following standard IF conventions:
- Objects are **takeable by default** unless marked with `SceneryTrait`
- Scope (visibility/reachability) is part of the world model, not action configuration

### 3. Simplified Actions
Actions no longer contain parsing rules or validation configuration:

```typescript
// Before: Everything in one place
export const takingAction: ActionDefinition = {
  id: IFActions.TAKING,
  patterns: ['take', 'get'],
  requiresNoun: true,
  nounMustBeReachable: true,
  // ... lots of configuration
  phases: { validate, before, execute, after }
}

// After: Separated concerns
// takingCommand.ts - Just parsing structure
export const takingCommand: CommandDefinition = {
  verbId: 'take', // References verb in language file
  requiresNoun: true,
  mapsToAction: IFActions.TAKING
}

// takingAction.ts - Just execution
export const takingAction: ActionExecutor = {
  id: IFActions.TAKING,
  execute: (cmd, ctx) => {
    // Simple, focused logic
  }
}
```

### 4. World Model Scope Queries
Scope is a queryable aspect of the world model:

```typescript
interface WorldModel {
  // Natural scope calculation
  getVisible(actor: IFEntity): IFEntity[]
  getReachable(actor: IFEntity): IFEntity[]
  
  // Author overrides for special cases
  addToScope(actor: IFEntity, target: IFEntity): void
  removeFromScope(actor: IFEntity, target: IFEntity): void
  
  // Combined queries
  canSee(actor: IFEntity, target: IFEntity): boolean
  canReach(actor: IFEntity, target: IFEntity): boolean
}
```

### 5. Language Separation
All user-facing text comes from language packages:

```typescript
// In stdlib/constants.ts
export enum ActionFailureReason {
  NOT_REACHABLE = 'NOT_REACHABLE',
  FIXED_IN_PLACE = 'FIXED_IN_PLACE',
  ALREADY_OPEN = 'ALREADY_OPEN',
  NOT_OPENABLE = 'NOT_OPENABLE',
  LOCKED = 'LOCKED',
  WORN_BY_OTHER = 'WORN_BY_OTHER',
  TOO_HEAVY = 'TOO_HEAVY',
  CONTAINER_FULL = 'CONTAINER_FULL',
  // ...
}

// In lang-en-us/verbs.ts
export const verbs = {
  take: ['take', 'get', 'pick up'],
  open: ['open'],
  close: ['close', 'shut'],
  examine: ['examine', 'x', 'look at', 'l at'],
  // ...
}

// In lang-en-us/messages.ts
export const messages = {
  [ActionFailureReason.NOT_REACHABLE]: "You can't reach that.",
  [ActionFailureReason.FIXED_IN_PLACE]: "That's fixed in place.",
  [ActionFailureReason.ALREADY_OPEN]: "It's already open.",
  [ActionFailureReason.NOT_OPENABLE]: "That's not something you can open.",
  [ActionFailureReason.LOCKED]: "It's locked.",
  // ...
}
```

## Migration Steps

1. **Extract all strings** from actions into language files
2. **Refactor existing traits** to remove behavior methods
3. **Create behavior classes** for traits that need logic
4. **Reorganize files** into the trait/behavior folder structure
5. **Split action definitions** into command and executor files
6. **Implement world model scope** queries
7. **Update action executors** to use behaviors and scope queries

## Benefits

- **Clear separation** of data, logic, and commands
- **Consistent organization** across the codebase
- **Simpler traits** that are easier to understand and compose
- **Focused actions** that don't mix parsing with execution
- **Flexible scope system** that authors can customize
- **IF conventions** respected (takeable by default)
- **Full internationalization** support from the start

## Example: Complete Taking Flow

```typescript
// 1. Player types "take lamp"

// 2. Parser uses language file to match
// lang-en-us verbs: take: ['take', 'get', 'pick up']
// Matches to takingCommand which maps to IFActions.TAKING

// 3. Executor runs takingAction.ts
execute: (cmd, ctx) => {
  const item = cmd.noun!;
  
  // Check scope via world model
  if (!ctx.world.canReach(cmd.actor, item)) {
    return [createEvent(IFEvents.ACTION_FAILED, { 
      reason: ActionFailureReason.NOT_REACHABLE
    })];
  }
  
  // Check traits for special cases
  if (item.has(TraitType.SCENERY)) {
    return [createEvent(IFEvents.ACTION_FAILED, { 
      reason: ActionFailureReason.FIXED_IN_PLACE
    })];
  }
  
  // Execute the action
  ctx.moveEntity(item, cmd.actor);
  return [createEvent(IFEvents.TAKEN, { 
    item, 
    actor: cmd.actor
  })];
}

// 4. Text service converts reason to message
// ActionFailureReason.NOT_REACHABLE -> "You can't reach that."
// IFEvents.TAKEN -> "Taken."
```

This architecture maintains the power of the trait system while keeping each part focused and simple, with full support for multiple languages.
