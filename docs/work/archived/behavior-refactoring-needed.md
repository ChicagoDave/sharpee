# Behavior Refactoring Required

## Issue: EntryBehavior violates three-phase pattern

**Date Identified**: 2025-08-29

## Problem

`EntryBehavior.enter()` and `EntryBehavior.exit()` methods return `ISemanticEvent[]`, which violates the three-phase pattern where behaviors should only perform mutations, not generate events.

## Current Implementation (INCORRECT)

```typescript
// EntryBehavior.enter() - WRONG
static enter(entity: IFEntity, actor: IFEntity): ISemanticEvent[] {
  // ... validation ...
  
  // Mutates state
  trait.occupants.push(actor.id);
  
  // WRONG: Returns events
  return [
    createEvent(IFEvents.ACTION_SUCCESS, { ... })
  ];
}
```

## Correct Pattern (from OpenableBehavior)

```typescript
// OpenableBehavior.open() - CORRECT
static open(entity: IFEntity): IOpenResult {
  // ... validation ...
  
  // Mutates state
  openable.isOpen = true;
  
  // Returns result object, NOT events
  return {
    success: true,
    stateChanged: true,
    openMessage: openable.openMessage,
    revealsContents: openable.revealsContents
  };
}
```

## Required Changes

### 1. Create IEnterResult interface

```typescript
export interface IEnterResult {
  success: boolean;
  alreadyInside?: boolean;
  stateChanged?: boolean;
  enterMessage?: string;
  posture?: string;
  preposition?: 'in' | 'on';
}
```

### 2. Refactor EntryBehavior.enter()

- Return `IEnterResult` instead of `ISemanticEvent[]`
- Remove all event creation logic
- Return only mutation results

### 3. Refactor EntryBehavior.exit()

- Return `IExitResult` instead of `ISemanticEvent[]`
- Remove all event creation logic
- Return only mutation results

## Impact

### Actions that use EntryBehavior
- entering.ts - Currently works around this by directly manipulating trait
- exiting.ts - Will need similar workaround or wait for fix

### Why This Matters
1. **Separation of Concerns**: Behaviors should only handle state mutations
2. **Three-Phase Pattern**: Events should only be created in the report phase
3. **Consistency**: All behaviors should follow the same pattern as OpenableBehavior
4. **Testing**: Easier to test pure mutation functions without event dependencies

## Temporary Workaround

The entering action currently directly manipulates the occupants array with a comment explaining why:

```typescript
// Update occupants in Entry trait
// Note: We directly manipulate the array here rather than using EntryBehavior.enter()
// because that method returns events, which doesn't fit the three-phase pattern.
// This matches how EntryBehavior itself manipulates the array internally.
entryTrait.occupants = entryTrait.occupants || [];
if (!entryTrait.occupants.includes(actor.id)) {
  entryTrait.occupants.push(actor.id);
}
```

## Priority

**HIGH** - This is a fundamental architectural issue that affects the consistency of the three-phase pattern implementation.