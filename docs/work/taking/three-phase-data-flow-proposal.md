# Three-Phase Data Flow Proposal

## Problem
The three-phase pattern (validate → execute → report) needs to pass data between phases:
- `validate()` can capture initial state
- `execute()` discovers more state during mutation
- `report()` needs all this data to build rich events

Currently, actions use context pollution (`context._previousLocation`) to pass data.

## Current Flow (in command-executor)
```typescript
const actionValidation = action.validate(actionContext);

if (actionValidation.valid) {
  const executeResult = await action.execute(actionContext);
  
  if (executeResult === undefined) {
    // New pattern: execute returns void
    events = action.report(actionContext, actionValidation);
  } else {
    // Old pattern: execute returns events
    events = executeResult;
  }
}
```

## Proposed Solution: ExecutionResult

### Option 1: Change execute() to return ExecutionResult
```typescript
interface ExecutionResult {
  success: boolean;
  data?: Record<string, any>;  // Execution-specific data
}

// In action:
execute(context: ActionContext): ExecutionResult {
  const previousLocation = context.world.getLocation(item.id);
  const wasWorn = item.has(TraitType.WEARABLE) && item.wearable.worn;
  
  // Perform mutations...
  const moved = context.world.moveEntity(item.id, actor.id);
  
  return {
    success: moved,
    data: { previousLocation, wasWorn }
  };
}

// In command-executor:
const executionResult = await action.execute(actionContext);
events = action.report(actionContext, actionValidation, executionResult);

// In report:
report(context, validation, execution?: ExecutionResult): ISemanticEvent[] {
  const { previousLocation, wasWorn } = execution?.data || {};
  // Build rich events with this data
}
```

### Option 2: Allow execute() to mutate ValidationResult
```typescript
// In execute:
execute(context: ActionContext, validation: ValidationResult): void {
  const previousLocation = context.world.getLocation(item.id);
  
  // Add execution data to validation result
  validation.executionData = {
    previousLocation,
    wasWorn
  };
  
  // Perform mutations...
}

// Report can access it from validation
report(context, validation): ISemanticEvent[] {
  const { previousLocation } = validation.executionData || {};
}
```

### Option 3: Create ActionState object that flows through phases
```typescript
interface ActionState {
  validation: ValidationResult;
  execution?: {
    data: Record<string, any>;
    error?: Error;
  };
}

// Each phase updates the state
validate(context): ActionState
execute(context, state): ActionState  
report(context, state): ISemanticEvent[]
```

## Recommendation

**Option 1 (ExecutionResult)** is cleanest because:
- Clear separation of concerns
- Immutable data flow
- Easy to type and test
- Minimal change to existing pattern
- Can be adopted gradually (undefined = old pattern)

## Migration Path

1. Update command-executor to pass ExecutionResult to report()
2. Update Action interface to include ExecutionResult type
3. Migrate actions one by one:
   - First: taking action (remove context pollution)
   - Then: other actions with similar needs
4. Eventually deprecate returning events from execute()

## Benefits

- No more context pollution
- Type-safe data passing
- Clear data flow
- Actions can capture exactly what they need
- Rich events without hacks