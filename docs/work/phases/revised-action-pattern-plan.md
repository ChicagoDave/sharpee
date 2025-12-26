# Revised Action Pattern Plan

## Goal

Remove `report-helpers.ts` and establish a clean three-phase action pattern with pure if-then-else coordinator logic.

## The Clean Pattern

### Coordinator (pure if-then-else)

```typescript
const result = action.validate(context);

if (result.valid) {
  action.execute(context);
  action.report(context);
} else {
  action.blocked(context, result);
}
```

No try-catch. No shared helpers. Just branching.

### Behaviors (own everything about their domain)

```typescript
// Behaviors define:
// 1. Constants (configuration)
// 2. State (current values)
// 3. Errors (what can go wrong)

Lockable = {
  // Constants (set at entity creation)
  keyId: 'brass_key',

  // State (mutated by execute)
  isLocked: true,

  // Errors (constants, not magic strings)
  errors: {
    ALREADY_UNLOCKED: 'lockable.already_unlocked',
    ALREADY_LOCKED: 'lockable.already_locked',
    NO_KEY: 'lockable.no_key',
    WRONG_KEY: 'lockable.wrong_key'
  }
}
```

### Action (four methods)

```typescript
action = {
  validate(context): ValidationResult {
    // Query behaviors for state
    // Return { valid: true } or { valid: false, error: Behavior.errors.X, params }
  },

  execute(context): void {
    // Mutate via behaviors
    // Store post-mutation state in sharedData for report()
    // NEVER fails - validate() already cleared it
  },

  report(context): ISemanticEvent[] {
    // ONLY success events
    // Read from sharedData
  },

  blocked(context, result: ValidationResult): ISemanticEvent[] {
    // Generate blocked event from ValidationResult
    // Each action owns its own blocked messages
  }
}
```

## Addressing Duplicate Logic

**Problem:** execute() often repeats logic from validate() (e.g., determining preposition, parsing direction).

**Solution:** validate() stores computed values in sharedData for execute() to use.

```typescript
validate(context): ValidationResult {
  const door = context.noun;
  const lockable = door.get(Lockable);

  if (!lockable.isLocked) {
    return { valid: false, error: Lockable.errors.ALREADY_UNLOCKED };
  }

  // Store computed values for execute()
  const sharedData = getSharedData(context);
  sharedData.targetPreposition = determinePreposition(target);
  sharedData.direction = parseDirection(context);

  return { valid: true };
}

execute(context): void {
  const sharedData = getSharedData(context);
  // Use pre-computed values
  const prep = sharedData.targetPreposition;
  // ...
}
```

This keeps each phase simple while avoiding duplication.

## ValidationResult Structure

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;      // Behavior error constant (e.g., 'lockable.no_key')
  params?: Record<string, any>;  // For message interpolation
}
```

The `error` field uses message constants from the action's `{action}-messages.ts` file.

## Message Constants

stdlib uses constants; lang-en-us uses matching string literals (stable, no compile-time dependency).

```typescript
// stdlib/src/actions/standard/putting/putting-messages.ts
export const PuttingMessages = {
  NO_TARGET: 'no_target',
  NO_DESTINATION: 'no_destination',
  CONTAINER_CLOSED: 'container_closed',
  NO_ROOM: 'no_room',
  NO_SPACE: 'no_space',
  // ...
} as const;

// Action uses constants
validate(context) {
  if (!OpenableBehavior.isOpen(target)) {
    return {
      valid: false,
      error: PuttingMessages.CONTAINER_CLOSED,
      params: { container: target.name }
    };
  }
}

// lang-en-us uses string literals (stable, rarely changes)
messages: {
  'container_closed': "{container} is closed.",
}
```

This gives stdlib type safety without creating a compile-time dependency.

## Migration Steps

### Phase 1: Add message constants to each action

Create `{action}-messages.ts` file for each action with its message ID constants.
These match the existing `requiredMessages` array and lang-en-us keys.

### Phase 2: Update coordinator

Change `command-executor.ts` to use pure if-then-else:

```typescript
const result = action.validate(context);

if (result.valid) {
  action.execute(context);
  return action.report(context);
} else {
  return action.blocked(context, result);
}
```

### Phase 3: Add blocked() to each action

Each action gets a blocked() method that generates appropriate events:

```typescript
blocked(context, result: ValidationResult): ISemanticEvent[] {
  return [context.event('action.blocked', {
    actionId: this.id,
    messageId: result.error,
    params: result.params
  })];
}
```

### Phase 4: Clean up report()

Remove handleReportErrors() calls. report() only handles success.

### Phase 5: Move computed values to sharedData in validate()

For actions with duplicate logic:
- putting: move preposition determination to validate()
- going: move direction parsing to validate()
- etc.

### Phase 6: Replace magic strings with behavior error constants

Change:
```typescript
return { valid: false, error: 'container_closed' };
```

To:
```typescript
return { valid: false, error: Openable.errors.CLOSED };
```

### Phase 7: Delete report-helpers.ts

Once all actions are migrated, remove the file.

## Example: Putting Action (Revised)

```typescript
// putting-messages.ts
export const PuttingMessages = {
  NO_TARGET: 'no_target',
  NO_DESTINATION: 'no_destination',
  NOT_CONTAINER: 'not_container',
  NOT_SURFACE: 'not_surface',
  CONTAINER_CLOSED: 'container_closed',
  NO_ROOM: 'no_room',
  NO_SPACE: 'no_space',
  PUT_IN: 'put_in',
  PUT_ON: 'put_on',
} as const;

// putting.ts
import { PuttingMessages } from './putting-messages';

export const puttingAction: Action = {
  id: IFActions.PUTTING,

  validate(context): ValidationResult {
    const item = context.command.directObject?.entity;
    const target = context.command.indirectObject?.entity;
    const preposition = context.command.parsed.structure.preposition?.text;

    if (!item) {
      return { valid: false, error: PuttingMessages.NO_TARGET };
    }

    if (!target) {
      return { valid: false, error: PuttingMessages.NO_DESTINATION, params: { item: item.name } };
    }

    // Determine target type and preposition
    const isContainer = target.has(TraitType.CONTAINER);
    const isSupporter = target.has(TraitType.SUPPORTER);
    let targetPreposition: 'in' | 'on';

    if (preposition === 'in' || preposition === 'into') {
      if (!isContainer) {
        return { valid: false, error: PuttingMessages.NOT_CONTAINER, params: { target: target.name } };
      }
      targetPreposition = 'in';
    } else if (preposition === 'on' || preposition === 'onto') {
      if (!isSupporter) {
        return { valid: false, error: PuttingMessages.NOT_SURFACE, params: { target: target.name } };
      }
      targetPreposition = 'on';
    } else {
      targetPreposition = isContainer ? 'in' : 'on';
    }

    // Container checks
    if (targetPreposition === 'in') {
      if (target.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(target)) {
        return { valid: false, error: PuttingMessages.CONTAINER_CLOSED, params: { container: target.name } };
      }
      if (!ContainerBehavior.canAccept(target, item, context.world)) {
        return { valid: false, error: PuttingMessages.NO_ROOM, params: { container: target.name } };
      }
    }

    // Supporter checks
    if (targetPreposition === 'on') {
      if (!SupporterBehavior.canAccept(target, item, context.world)) {
        return { valid: false, error: PuttingMessages.NO_SPACE, params: { surface: target.name } };
      }
    }

    // Store computed values for execute()
    const sharedData = getPuttingSharedData(context);
    sharedData.targetPreposition = targetPreposition;

    return { valid: true };
  },

  execute(context): void {
    const item = context.command.directObject!.entity!;
    const target = context.command.indirectObject!.entity!;
    const sharedData = getPuttingSharedData(context);

    // Use pre-computed preposition
    if (sharedData.targetPreposition === 'in') {
      ContainerBehavior.addItem(target, item, context.world);
    } else {
      SupporterBehavior.addItem(target, item, context.world);
    }
  },

  report(context): ISemanticEvent[] {
    const item = context.command.directObject!.entity!;
    const target = context.command.indirectObject!.entity!;
    const sharedData = getPuttingSharedData(context);

    const eventType = sharedData.targetPreposition === 'in' ? 'if.event.put_in' : 'if.event.put_on';
    const messageId = sharedData.targetPreposition === 'in' ? PuttingMessages.PUT_IN : PuttingMessages.PUT_ON;

    return [
      context.event(eventType, {
        itemId: item.id,
        targetId: target.id,
        preposition: sharedData.targetPreposition,
        itemSnapshot: captureEntitySnapshot(item, context.world, true),
        targetSnapshot: captureEntitySnapshot(target, context.world, true)
      }),
      context.event('action.success', {
        actionId: this.id,
        messageId,
        params: { item: item.name, [sharedData.targetPreposition === 'in' ? 'container' : 'surface']: target.name }
      })
    ];
  },

  blocked(context, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: this.id,
      messageId: result.error,
      params: result.params
    })];
  }
};
```

## Decision Points

1. **blocked() location**: Each action has its own, or shared default implementation?
   - Recommendation: Default implementation on base, actions can override for special cases

2. **Message constant file location**: Separate file or in main action file?
   - Recommendation: `{action}-messages.ts` alongside `{action}.ts` for clarity

## Files to Modify

1. **Coordinator**:
   - `packages/engine/src/command-executor.ts`

2. **Actions** (all 43):
   - Add `{action}-messages.ts` with message constants
   - Add blocked() method
   - Remove handleReportErrors() from report()
   - Move computed values to validate() → sharedData
   - Replace magic strings with message constants

4. **Delete**:
   - `packages/stdlib/src/actions/base/report-helpers.ts`

## Order of Work

1. Add default blocked() to action base type (or Action interface)
2. Update coordinator to pure if-then-else (call blocked() on invalid)
3. Migrate actions one at a time (see checklist below)
4. Delete report-helpers.ts

## Action Migration Checklist

For each action:
- [ ] Create `{action}-messages.ts` with constants
- [ ] Replace magic strings with message constants in validate()
- [ ] Add blocked() method
- [ ] Remove handleReportErrors() from report()
- [ ] Move computed values from execute() to validate() → sharedData
- [ ] Tests pass

### Infrastructure
- [ ] Add blocked() to Action interface
- [ ] Update coordinator to pure if-then-else
- [ ] Delete report-helpers.ts (after all actions migrated)

### Core Actions
- [ ] taking
- [ ] dropping
- [ ] looking
- [ ] examining
- [ ] inventory

### Container Actions
- [ ] opening
- [ ] closing
- [ ] putting
- [ ] inserting
- [ ] removing

### Movement Actions
- [ ] going
- [ ] entering
- [ ] exiting
- [ ] climbing

### Lock Actions
- [ ] locking
- [ ] unlocking

### Wearable Actions
- [ ] wearing
- [ ] taking_off

### Device Actions
- [ ] switching_on
- [ ] switching_off
- [ ] pushing
- [ ] pulling

### Sensory Actions
- [ ] touching
- [ ] smelling
- [ ] listening
- [ ] searching

### Social Actions
- [ ] giving
- [ ] showing
- [ ] talking
- [ ] throwing

### Consumable Actions
- [ ] eating
- [ ] drinking

### Combat Actions
- [ ] attacking

### Meta Actions
- [ ] waiting
- [ ] sleeping
- [ ] reading
- [ ] help
- [ ] about
- [ ] scoring
- [ ] saving
- [ ] restoring
- [ ] restarting
- [ ] quitting
