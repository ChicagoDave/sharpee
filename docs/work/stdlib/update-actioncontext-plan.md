# ActionContext SharedData Implementation Plan

## Overview
Add a `sharedData` property to ActionContext to enable clean data passing between action phases (validate → execute → report) without context pollution.

## Problem Statement
- Actions currently use context pollution (`context._previousLocation`) to pass data between phases
- No clean mechanism for execute() to pass discovered state to report()
- ValidationResult can carry data from validate(), but execute() can't contribute

## Solution
Add a `sharedData: Record<string, any>` property to ActionContext that all three phases can read and write.

## Benefits
- **Clean**: Eliminates context pollution
- **Simple**: Single property addition to existing interface
- **Flexible**: Each action uses what it needs
- **Discoverable**: Part of the documented interface
- **No breaking changes**: Command-executor needs no modifications

## Implementation Phases

### Phase 1: Core Infrastructure
1. Update ActionContext interface in `enhanced-types.ts`
2. Update createActionContext in `action-context-factory.ts`
3. Run tests to ensure no breakage

### Phase 2: Migrate Taking Action (Proof of Concept)
1. Update taking action to use sharedData
2. Remove context pollution (_previousLocation, _implicitlyRemoved)
3. Verify tests still pass
4. Document pattern in action

### Phase 3: Identify Other Actions with Context Pollution
1. Search for `(context as any)` patterns
2. List actions that need migration
3. Prioritize by complexity

### Phase 4: Systematic Migration
1. Migrate remaining actions one by one
2. Remove all context pollution
3. Update tests as needed

### Phase 5: Documentation
1. Update action development guide
2. Add examples of sharedData usage
3. Document best practices

## Technical Details

### Interface Update
```typescript
// In packages/stdlib/src/actions/enhanced-types.ts
export interface ActionContext {
  // ... existing properties ...
  
  /**
   * Shared data store for passing information between action phases.
   * - validate() can store initial state
   * - execute() can add discovered state
   * - report() can read all stored data
   * 
   * @example
   * // In execute:
   * context.sharedData.previousLocation = context.world.getLocation(item.id);
   * 
   * // In report:
   * const { previousLocation } = context.sharedData;
   */
  sharedData: Record<string, any>;
}
```

### Factory Update
```typescript
// In packages/engine/src/action-context-factory.ts
export function createActionContext(...): ActionContext {
  return {
    // ... existing properties ...
    sharedData: {},  // Initialize as empty object
    // ... rest ...
  };
}
```

### Usage Pattern
```typescript
// Example: taking action
validate(context: ActionContext): ValidationResult {
  // Can store validation-time data if needed
  context.sharedData.initialInventoryCount = context.player.inventory.length;
  return { valid: true };
}

execute(context: ActionContext): void {
  // Store execution-time discoveries
  context.sharedData.previousLocation = context.world.getLocation(item.id);
  context.sharedData.wasWorn = item.has(TraitType.WEARABLE) && item.wearable.worn;
  
  // Perform mutations
  context.world.moveEntity(item.id, actor.id);
}

report(context: ActionContext): ISemanticEvent[] {
  // Access shared data
  const { previousLocation, wasWorn } = context.sharedData;
  
  // Build events based on what happened
  // ...
}
```

## Type Safety Considerations

### Current Approach (Phase 1)
- Use `Record<string, any>` for flexibility
- Actions can cast if they want type safety:
  ```typescript
  interface TakingData {
    previousLocation?: string;
    wasWorn?: boolean;
  }
  const data = context.sharedData as TakingData;
  ```

### Future Enhancement (Optional)
- Could make ActionContext generic: `ActionContext<T>`
- Actions could specify their data type
- More complex but provides compile-time safety

## Success Criteria
1. ✅ ActionContext has sharedData property
2. ✅ No breaking changes to existing code
3. ✅ Taking action migrated successfully
4. ✅ All tests pass
5. ✅ No more context pollution in migrated actions

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Naming conflicts between actions | Each action instance gets fresh context |
| Type safety | Document clear patterns, consider future typing |
| Overuse of sharedData | Guidelines on what belongs there |
| Backward compatibility | sharedData starts empty, doesn't affect existing code |

## Timeline
- Phase 1: 30 minutes (simple interface change)
- Phase 2: 1 hour (taking action migration)
- Phase 3: 30 minutes (discovery)
- Phase 4: 2-4 hours (depends on action count)
- Phase 5: 1 hour (documentation)

**Total: 5-7 hours**

## Open Questions
1. Should we namespace data per phase? (e.g., `sharedData.execute.previousLocation`)
2. Should we add helper methods? (e.g., `context.setShared()`, `context.getShared()`)
3. Should we log/debug sharedData in development mode?

## Next Steps
1. Review and approve plan
2. Implement Phase 1 (core infrastructure)
3. Test with taking action (Phase 2)
4. Assess results before full rollout