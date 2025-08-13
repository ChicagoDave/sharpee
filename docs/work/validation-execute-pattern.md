# Validation and Execute Pattern Design

## Problem Statement

Actions in the stdlib have a `validate()` method that checks if an action can proceed, and an `execute()` method that performs the action. Previously, validate() was returning state data that execute() would use, but this violates the separation of concerns and the current interface design where ValidationResult is simply `{ valid: boolean, error?: string }`.

## Current Pattern (Incorrect)

```typescript
validate(context: ActionContext): ValidationResult {
  // Complex logic building state...
  const eventData = { ... };
  const messageId = 'some_message';
  const params = { ... };
  
  return {
    valid: true,
    state: {  // This doesn't exist in ValidationResult!
      eventData,
      messageId,
      params
    }
  };
}

execute(context: ActionContext): SemanticEvent[] {
  // References undefined 'state'
  return [
    context.event('if.event.pulled', state.eventData),
    context.event('action.success', {
      messageId: state.messageId,
      params: state.params
    })
  ];
}
```

## Correct Pattern

Both `validate()` and `execute()` must independently derive the needed data from the ActionContext.

```typescript
validate(context: ActionContext): ValidationResult {
  // Validation logic only - check if action can proceed
  const target = context.command.directObject?.entity;
  
  if (!target) {
    return { valid: false, error: 'no_target' };
  }
  
  if (!target.has(TraitType.PULLABLE)) {
    return { valid: false, error: 'not_pullable' };
  }
  
  // Only validate, don't build state
  return { valid: true };
}

execute(context: ActionContext): SemanticEvent[] {
  // Rebuild all necessary data from context
  const target = context.command.directObject?.entity;
  
  if (!target) {
    return [];  // Shouldn't happen if validate passed
  }
  
  // Rebuild the same logic from validate to determine what happens
  const pullableTrait = target.get(TraitType.PULLABLE);
  const eventData = { ... };
  const messageId = determineMessage(pullableTrait);
  const params = { ... };
  
  return [
    context.event('if.event.pulled', eventData),
    context.event('action.success', {
      messageId: messageId,
      params: params
    })
  ];
}
```

## Key Principles

1. **No State Sharing**: validate() and execute() don't share state
2. **Duplicate Logic**: Both methods independently derive needed data from context
3. **Validation is Read-Only**: validate() only checks conditions, doesn't prepare execution data
4. **Execute Rebuilds**: execute() rebuilds all necessary data from scratch

## Complex Example: Pulling Action

The pulling action is complex with multiple pull types (lever, cord, attached, heavy) and various traits to check.

### Validation Focus
- Check if target exists
- Check if target is pullable
- Check strength requirements
- Check pull count limits
- Return simple valid/invalid result

### Execute Focus
- Rebuild all the trait checks
- Determine the pull type
- Calculate event data based on traits
- Generate appropriate events

### Data Flow

```
validate():
  context -> checks -> { valid: boolean, error?: string }

execute():
  context -> rebuild logic -> eventData, messageId, params -> SemanticEvent[]
```

## Migration Strategy

For each action that has `state` references in execute():

1. **Identify Data Needs**: List all data that execute() expects from state
2. **Locate Source Logic**: Find where in validate() this data is calculated
3. **Extract/Duplicate Logic**: Copy or extract the logic into helper functions if complex
4. **Rebuild in Execute**: Reconstruct all needed data in execute()
5. **Test Thoroughly**: Ensure behavior is identical

## Helper Function Pattern

For complex actions, extract shared logic into helper functions:

```typescript
// Helper to determine message based on pull type
function determinePullMessage(pullableTrait: PullableTrait, target: IFEntity): string {
  switch (pullableTrait.pullType) {
    case 'lever':
      if (target.has(TraitType.LEVER)) {
        const leverTrait = target.get(TraitType.LEVER);
        if (leverTrait.springLoaded) {
          return 'lever_springs_back';
        }
        // ... more logic
      }
      return 'lever_pulled';
    // ... more cases
  }
}

// Helper to build event data
function buildPullEventData(
  target: IFEntity, 
  pullableTrait: PullableTrait,
  direction?: string
): PulledEventData {
  return {
    target: target.id,
    targetName: target.name,
    direction: direction,
    pullType: pullableTrait.pullType,
    pullCount: pullableTrait.pullCount + 1
  };
}
```

## Benefits

1. **Clean Interfaces**: ValidationResult stays simple
2. **Stateless Design**: No hidden state between methods
3. **Testability**: Each method can be tested independently
4. **Maintainability**: Logic is explicit in each method

## Drawbacks

1. **Code Duplication**: Logic may be duplicated between validate and execute
2. **Performance**: Some calculations done twice
3. **Maintenance**: Changes need to be made in multiple places

The duplication is acceptable because:
- It maintains clean architectural boundaries
- The performance impact is negligible for text game actions
- Helper functions can minimize actual duplication