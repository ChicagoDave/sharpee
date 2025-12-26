# ActionContext Shared Data Proposal

## Problem
Actions need to pass data between their three phases (validate → execute → report) without context pollution.

## Current State
- Actions use context pollution: `(context as any)._previousLocation`
- No clean way to pass data discovered during execution to report phase
- ValidationResult can carry data from validate, but execute can't add to it

## Proposed Solution: Add sharedData to ActionContext

### 1. Update ActionContext Interface
```typescript
export interface ActionContext {
  // ... existing properties ...
  
  /**
   * Shared data that can be read/written by all action phases.
   * Validate and execute can store data here for report to use.
   */
  sharedData: Record<string, any>;
}
```

### 2. Initialize in Factory
```typescript
// In action-context-factory.ts
export function createActionContext(...): ActionContext {
  return {
    // ... existing properties ...
    
    // Initialize empty shared data
    sharedData: {},
    
    // ... methods ...
  };
}
```

### 3. Usage in Actions
```typescript
// taking.ts
export const taking: Action = {
  validate(context: ActionContext): ValidationResult {
    // Can store initial state if needed
    context.sharedData.initialLocation = context.world.getLocation(item.id);
    
    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    const item = context.command.directObject!.entity!;
    
    // Capture context before mutation
    context.sharedData.previousLocation = context.world.getLocation(item.id);
    context.sharedData.wasWorn = item.has(TraitType.WEARABLE) && item.wearable.worn;
    
    // Perform mutations
    if (context.sharedData.wasWorn) {
      WearableBehavior.remove(item, wearer);
    }
    context.world.moveEntity(item.id, actor.id);
  },
  
  report(context: ActionContext, validation?: ValidationResult): ISemanticEvent[] {
    // Access shared data
    const { previousLocation, wasWorn } = context.sharedData;
    
    // Build rich events
    const events: ISemanticEvent[] = [];
    
    if (wasWorn) {
      events.push(context.event('if.event.removed', {
        item: context.command.directObject!.entity!,
        wearer: context.world.getEntity(previousLocation)
      }));
    }
    
    // ... more events
    return events;
  }
};
```

## Type Safety Options

### Option A: Loose Typing (Simple)
```typescript
sharedData: Record<string, any>;
```
- Pro: Easy to implement, flexible
- Con: No type safety

### Option B: Action-Specific Types
```typescript
// Each action defines its shared data type
interface TakingSharedData {
  previousLocation?: string;
  wasWorn?: boolean;
}

// In action
const sharedData = context.sharedData as TakingSharedData;
```
- Pro: Type safety per action
- Con: Requires casting

### Option C: Generic ActionContext
```typescript
export interface ActionContext<TShared = Record<string, any>> {
  sharedData: TShared;
}

// Action specifies its type
export const taking: Action<TakingSharedData> = {
  // ...
};
```
- Pro: Full type safety
- Con: More complex, requires updating Action interface

## Recommendation

Start with **Option A (loose typing)** for simplicity:
1. Add `sharedData: Record<string, any>` to ActionContext
2. Initialize as empty object in factory
3. Actions can use it immediately
4. Can add type safety later if needed

## Benefits

- **Clean**: No more context pollution
- **Simple**: Just add one property to existing interface
- **Flexible**: Each action uses what it needs
- **Discoverable**: Part of the interface, not hidden
- **Testable**: Easy to mock and assert

## Implementation Steps

1. Add `sharedData` to ActionContext interface
2. Initialize in createActionContext()
3. Update taking action to use sharedData
4. Remove context pollution (_previousLocation, etc.)
5. Update other actions as needed

## Example: Complete Flow

```typescript
// Command Executor (no changes needed!)
const actionValidation = action.validate(actionContext);

if (actionValidation.valid) {
  await action.execute(actionContext);  // Updates sharedData
  events = action.report(actionContext, actionValidation);  // Reads sharedData
}
```

The command-executor doesn't need to know about sharedData - it's internal to the ActionContext that flows through all phases naturally.