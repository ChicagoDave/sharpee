# Extended Sub-Actions Pattern Implementation Plan

## Overview
Extension of the original sub-actions implementation plan to cover ALL action pairs/groups that would benefit from the pattern. Each phase includes examining and simplifying the associated behaviors to remove extraneous properties that belong in stories or extensions.

## Core Principle: Thin Actions & Behaviors
- **Actions**: Only validate and coordinate, no business logic
- **Behaviors**: Only essential state mutations, no complex systems
- **Remove**: Sounds, timers, nutrition, physics, auto-behaviors
- **Keep**: Basic state changes (open/closed, on/off, worn/not worn)

## Completed Phases
- ✅ Phase 1: Switching Actions (switching_on/off)
- ✅ Phase 2: Locking Actions (locking/unlocking)  
- ✅ Phase 3: Wearable Actions (wearing/taking_off)

## Remaining Phases

### Phase 3.1: Opening/Closing Actions
**Behavior Refactoring**: Simplify OpenableBehavior
- Remove: auto-close timers, sounds, door mechanics
- Keep: isOpen state, basic open/close

**Structure**:
```
/doorway/
  ├── doorway-base.ts
  ├── open/
  │   ├── open.ts (OPENING)
  │   └── open-events.ts
  └── close/
      ├── close.ts (CLOSING)
      └── close-events.ts
```

### Phase 3.2: Taking/Dropping Actions
**Behavior Refactoring**: Simplify PortableBehavior
- Remove: weight calculations, bulk handling, auto-take
- Keep: basic carrying/dropping

**Structure**:
```
/carrying/
  ├── carrying-base.ts
  ├── take/
  │   ├── take.ts (TAKING)
  │   └── take-events.ts
  └── drop/
      ├── drop.ts (DROPPING)
      └── drop-events.ts
```

### Phase 3.3: Container Manipulation Actions
**Behavior Refactoring**: Simplify ContainerBehavior
- Remove: capacity calculations, liquid handling, mixing
- Keep: basic containment

**Structure**:
```
/container/
  ├── container-base.ts
  ├── insert/
  │   ├── insert.ts (INSERTING)
  │   └── insert-events.ts
  ├── remove/
  │   ├── remove.ts (REMOVING)
  │   └── remove-events.ts
  └── put/
      ├── put.ts (PUTTING)
      └── put-events.ts
```

### Phase 3.4: Entering/Exiting Actions
**Behavior Refactoring**: Simplify EntryBehavior
- Remove: vehicle mechanics, mounting, size restrictions
- Keep: basic enter/exit

**Structure**:
```
/movement/
  ├── movement-base.ts
  ├── enter/
  │   ├── enter.ts (ENTERING)
  │   └── enter-events.ts
  └── exit/
      ├── exit.ts (EXITING)
      └── exit-events.ts
```

### Phase 3.5: Pushing/Pulling Actions
**Behavior Refactoring**: Simplify MovableBehavior
- Remove: physics, resistance, breaking
- Keep: basic push/pull state

**Structure**:
```
/manipulation/
  ├── manipulation-base.ts
  ├── push/
  │   ├── push.ts (PUSHING)
  │   └── push-events.ts
  └── pull/
      ├── pull.ts (PULLING)
      └── pull-events.ts
```

### Phase 3.6: Eating/Drinking Actions
**Behavior Refactoring**: Simplify EdibleBehavior
- Remove: nutrition, hunger, poisoning, taste
- Keep: basic consumption (item disappears)

**Structure**:
```
/consumption/
  ├── consumption-base.ts
  ├── eat/
  │   ├── eat.ts (EATING)
  │   └── eat-events.ts
  └── drink/
      ├── drink.ts (DRINKING)
      └── drink-events.ts
```

### Phase 3.7: Giving/Throwing Actions
**Behavior Refactoring**: Simplify TransferBehavior
- Remove: throwing physics, catching, rejection
- Keep: basic transfer between actors

**Structure**:
```
/transfer/
  ├── transfer-base.ts
  ├── give/
  │   ├── give.ts (GIVING)
  │   └── give-events.ts
  └── throw/
      ├── throw.ts (THROWING)
      └── throw-events.ts
```

### Phase 3.8: Saving/Restoring Actions
**Behavior Refactoring**: Simplify GameStateBehavior
- Remove: save slots, auto-saves, cloud sync
- Keep: basic save/load to local storage

**Structure**:
```
/game-state/
  ├── game-state-base.ts
  ├── save/
  │   ├── save.ts (SAVING)
  │   └── save-events.ts
  └── restore/
      ├── restore.ts (RESTORING)
      └── restore-events.ts
```

## Quality Metrics
Each refactored action family should achieve:
- **Code Quality**: 9+ rating (up from current 5-7)
- **Test Coverage**: 100% for validation and execution
- **Complexity**: Cyclomatic complexity < 5
- **Duplication**: Zero between sub-actions
- **Behaviors**: Simplified to essential state only

## Migration Strategy
1. Start with Phase 3.1 (Opening/Closing) as next easiest
2. Each phase:
   - First simplify the behavior
   - Then refactor the actions
   - Update tests to match
   - Document removed features for extension guide
3. Create extension guide showing how to add back complex features

## Extension Points
Document how stories can add back complexity:
- Custom event handlers for sounds
- Story-specific timers and auto-behaviors  
- Game-specific physics and calculations
- Domain-specific validations

This keeps the core engine lean while allowing rich story experiences.