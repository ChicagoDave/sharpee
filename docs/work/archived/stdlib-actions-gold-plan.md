# Stdlib Actions Gold Plan
*Getting all stdlib actions to compile with the correct patterns*

## Current Situation
- **153 TypeScript compilation errors** preventing build
- **Behavior delegation pattern is correct** (validate methods + execute methods returning results)
- **Interface updates complete** (enhanced-types.ts has correct ValidationResult and Action interfaces)
- **Problem**: Actions not systematically updated to match new interfaces

## The Correct Pattern

### Behaviors (world-model)
```typescript
// Validation methods - return boolean
static canOpen(entity: IFEntity): boolean
static isLocked(entity: IFEntity): boolean

// Execute methods - return result objects
static open(entity: IFEntity): OpenResult
static addItem(container: IFEntity, item: IFEntity, world: IWorldQuery): AddItemResult
```

### Actions (stdlib)
```typescript
// Non-generic Action interface
export const someAction: Action = {
  id: IFActions.SOME_ACTION,
  
  // Validate using behavior validation methods
  validate(context: ActionContext): ValidationResult {
    if (!item) {
      return { 
        valid: false,     // NOT isValid
        error: 'no_item' // Simple string, NOT object
      };
    }
    
    if (!SomeBehavior.canDoThing(item)) {
      return { 
        valid: false, 
        error: 'cannot_do',
        params: { item: item.name } // Optional params
      };
    }
    
    return { valid: true };
  },
  
  // Execute using behavior execute methods
  execute(context: ActionContext): SemanticEvent[] {
    const result = SomeBehavior.doThing(item);
    
    if (!result.success) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: result.errorReason || 'failed',
        params: { item: item.name }
      })];
    }
    
    return [
      context.event('if.event.thing_done', eventData),
      context.event('action.success', successData)
    ];
  }
}
```

## Error Categories to Fix

### Category 1: ValidationResult Format (9 files)
**Issue**: Using `isValid` instead of `valid`, error objects instead of strings
**Files**: entering, exiting, giving, going, inserting, looking, searching, talking, throwing

### Category 2: Generic Type Removal (18 files)
**Issue**: Using `Action<State>` and `ValidationResult<State>` 
**Files**: about, again, examining, help, inserting, inventory, pulling, pushing, quitting, restarting, restoring, saving, scoring, showing, sleeping, smelling, touching, turning

### Category 3: Import Corrections (8 files)
**Issue**: Importing `Entity` instead of `IFEntity`
**Files**: inventory, pulling, pushing, showing, sleeping, smelling, touching, turning

### Category 4: Error Object Format (overlaps with Category 1)
**Issue**: Returning `{ messageId, reason, params }` instead of simple string for error
**Pattern**: Error should be string, params separate

### Category 5: Special Cases (2 files)
- **trace.ts**: validate() returns boolean instead of ValidationResult
- **context.ts**: Missing validate property in action definition

## Implementation Strategy

### Phase 1: Fix Type Signatures (Quick Wins)
1. Fix all `Entity` → `IFEntity` imports (8 files)
2. Remove all generic type parameters `<State>` (18 files)
3. These are simple find/replace operations

### Phase 2: Fix ValidationResult Format
1. Change `isValid` → `valid` property name
2. Convert error objects to strings:
   - Old: `error: { messageId: 'x', reason: 'x', params: {...} }`
   - New: `error: 'x', params: {...}`
3. Update validation checks in execute()

### Phase 3: Verify Behavior Delegation
1. Ensure actions using behavior delegation are correct
2. Check that business logic is in behaviors, not actions
3. Verify event creation patterns

### Phase 4: Special Cases
1. Fix trace.ts validation signature
2. Fix context.ts missing validate property

## Success Criteria
- [ ] All TypeScript compilation errors resolved
- [ ] `pnpm --filter '@sharpee/stdlib' build` succeeds
- [ ] All tests pass
- [ ] Actions follow consistent pattern
- [ ] No business logic duplication

## Already Completed
- ✅ drinking.ts - Fixed ValidationResult format
- ✅ eating.ts - Fixed ValidationResult format
- ✅ opening.ts - Properly uses behavior delegation
- ✅ putting.ts - Refactored to use behavior delegation
- ✅ removing.ts - Refactored to use behavior delegation
- ✅ taking.ts - Uses ActorBehavior.takeItem()
- ✅ dropping.ts - Uses ActorBehavior.dropItem()

## Notes
- The behavior delegation pattern is **correct and working**
- We're NOT changing the architecture, just fixing type mismatches
- Actions should be thin orchestrators (~30-50 lines typical)
- Business logic belongs in behaviors, not actions