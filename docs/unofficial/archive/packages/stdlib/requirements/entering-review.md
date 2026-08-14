# Professional Review: Entering Action

**Action**: `entering.ts`  
**Package**: `@sharpee/stdlib`  
**Review Date**: 2025-08-26  
**Reviewer**: Senior Architecture Team

## Score: 6/10 - Needs Improvement

## Executive Summary
The entering action shows mixed quality with proper validation logic but critical architectural violations. Missing the three-phase pattern and containing state reconstruction issues, it represents a transition between old and new patterns. The complex validation logic for multiple enterable types is well-handled, but execution phase violations and direct state mutations significantly impact the score.

## Critical Issues

### 1. Missing Three-Phase Pattern (CRITICAL)
```typescript
// Has validate() and execute() but NO report() method
validate(context: ActionContext): ValidationResult
execute(context: ActionContext): ISemanticEvent[]  // Wrong: returns events
// report() is missing entirely
```
**Impact**: Violates core architectural pattern  
**Severity**: CRITICAL - Mixed responsibilities

### 2. Direct State Mutation (HIGH)
```typescript
// Lines 194-197: Direct trait mutation
entryTrait.occupants = entryTrait.occupants || [];
if (!entryTrait.occupants.includes(actor.id)) {
  entryTrait.occupants.push(actor.id);
}
```
**Impact**: Bypasses behavior layer, creates consistency risks  
**Fix**: Should use EntryBehavior.enter()

### 3. Execute Returns Events (HIGH)
```typescript
execute(context: ActionContext): ISemanticEvent[]
```
**Impact**: Violates pattern - execute should only change state  
**Fix**: Move event generation to report()

### 4. Behavior Misuse (MEDIUM)
```typescript
// Line 193: Comment shows awareness but wrong approach
// Note: EntryBehavior.enter() returns events but we'll generate our own
// So we just update the occupants directly
```
**Impact**: Acknowledges behavior exists but bypasses it

## Architectural Violations

### Pattern Violations
1. **Three-Phase Pattern**: Missing report() phase
2. **State Management**: Direct mutations instead of behaviors
3. **Event Generation**: In execute() instead of report()
4. **Separation of Concerns**: Execute doing multiple jobs

### Positive Aspects
1. **Complex Validation**: Well-structured for multiple entry types
2. **Trait Awareness**: Handles ENTRY, CONTAINER, SUPPORTER traits
3. **Error Messages**: Rich, contextual error information
4. **Capacity Checking**: Proper occupancy validation

## Quality Metrics

### Complexity Analysis
- **Cyclomatic Complexity**: ~20 (validation), ~10 (execute)
- **Lines of Code**: 246 (reasonable but could be cleaner)
- **Nesting Depth**: 4 levels in validation (acceptable)
- **Direct Mutations**: 2 critical instances

### Code Organization
1. **Validation**: Good - comprehensive checks
2. **Execute**: Poor - doing too much
3. **Report**: Missing - critical omission
4. **Overall**: Mixed quality

## IF-Specific Considerations

### Good IF Design
1. **Posture Support**: Standing, sitting, lying positions
2. **Preposition Awareness**: "in" vs "on" handling
3. **Container Logic**: Open/closed checking
4. **Supporter Logic**: Capacity awareness

### Missing IF Features
1. **Exit Blocking**: No check if current location blocks exit
2. **Size Constraints**: No validation for actor size vs entry
3. **Multiple Actors**: Limited multi-actor support

## Detailed Analysis

### Validation Logic (GOOD)
```typescript
// Lines 62-104: Excellent EntryBehavior usage
if (target.has(TraitType.ENTRY)) {
  if (!EntryBehavior.canEnter(target, actor)) {
    const reason = EntryBehavior.getBlockedReason(target, actor);
    // Rich error handling based on reason
  }
}
```
**This part is excellent** - proper behavior delegation for validation

### Execution Logic (POOR)
```typescript
// Lines 194-197: BAD - Direct mutation
entryTrait.occupants.push(actor.id);

// Line 205: GOOD - Using world API
context.world.moveEntity(actor.id, target.id);
```
**Mixed approach** - some proper API use, some bypassing

## Comparison to Templates

### vs. Closing Action (9/10)
- Closing: Complete three-phase pattern
- Entering: Missing report phase
- Closing: Pure behavior delegation
- Entering: Partial behavior use

### vs. Dropping Action (8.5/10)
- Dropping: Clean three-phase
- Entering: Two-phase only
- Both: Good validation logic
- Entering: Worse execution phase

## Required Refactoring

### 1. Implement Report Phase
```typescript
report(context: ActionContext, validationResult?, executionError?): ISemanticEvent[] {
  // Move all event generation here
  // Lines 207-236 should be in report, not execute
}
```

### 2. Fix Execute Phase
```typescript
execute(context: ActionContext): void {
  const actor = context.player;
  const target = context.command.directObject?.entity!;
  
  // Use behaviors properly
  if (target.has(TraitType.ENTRY)) {
    EntryBehavior.enter(target, actor, context.world);
  } else {
    context.world.moveEntity(actor.id, target.id);
  }
  
  // NO event generation here
  // NO direct returns
}
```

### 3. Remove Direct Mutations
```typescript
// Instead of: entryTrait.occupants.push(actor.id)
// Use: EntryBehavior.addOccupant(target, actor.id)
```

## Testing Recommendations

### Unit Tests Needed
1. Entry trait occupancy
2. Container entry with capacity
3. Supporter entry
4. Closed container rejection
5. Full location rejection

### Integration Tests
1. Multi-actor entry blocking
2. Posture changes on entry
3. Exit/entry sequences

## Security & Performance

### Security Issues
- Direct state mutations bypass validation
- No atomicity guarantees
- Potential race conditions with occupancy

### Performance
- Reasonable complexity
- Good early returns in validation
- No unnecessary iterations

## Team Recommendations

### For Developers
1. **Always implement all three phases**
2. **Never mutate state directly**
3. **Use behaviors for state changes**
4. **Generate events only in report**

### For Architects
1. Enforce three-phase pattern in code reviews
2. Add linting rules for direct mutations
3. Create behavior method for occupancy

### For Product
1. Entry mechanics work well from user perspective
2. Consider additional features (size, blocking)

## Conclusion

The entering action is a "middle child" - better than the consumption actions but not reaching the excellence of closing or dropping. Its validation logic is strong, but architectural violations in execution prevent higher scoring. With proper three-phase implementation and behavior usage, this could be a 8+/10 action.

### Priority: HIGH
**Recommendation**: Refactor to three-phase pattern, fix state mutations

### Estimated Effort
- Refactoring: 4-6 hours
- Testing: 2-3 hours
- Total: 6-9 hours

### Risk Assessment
- **Current Risk**: Medium - State inconsistency possible
- **Post-Refactor Risk**: Low - Proper patterns ensure safety

## Action Items

1. **Immediate**: Add report() phase
2. **Immediate**: Remove direct state mutations  
3. **Next Sprint**: Enhance with size/blocking features
4. **Documentation**: Update as three-phase example