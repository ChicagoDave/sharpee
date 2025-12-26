# Pattern Assessment: report-helpers and Three-Phase Actions

**Date**: 2025-12-26
**Author**: Claude (architectural review)
**Status**: Critical Assessment

## Executive Summary

The `report-helpers` pattern and the current three-phase action architecture contain design issues that merit attention. While the pattern reduces boilerplate, it conflates concepts that should remain separate in an Interactive Fiction system and introduces unnecessary coupling between phases.

**Recommendation**: The pattern is acceptable as a migration aid but should be reconsidered for long-term architecture. The core issues stem from the three-phase design itself, not just the helper.

---

## The Pattern Under Review

```typescript
// report-helpers.ts - handleReportErrors
report(context, validationResult?, executionError?) {
  const errorEvents = handleReportErrors(context, validationResult, executionError);
  if (errorEvents) return errorEvents;

  // ... success logic
}
```

The pattern:
1. Report receives validation result and execution error as parameters
2. `handleReportErrors` checks if either failed
3. If so, generates standardized error events
4. If not, proceeds with success event generation

---

## Issues Identified

### 1. Phase Coupling Violates Separation of Concerns

**Problem**: Passing `validationResult` and `executionError` to `report()` means the report phase must understand and handle validation and execution concerns.

```typescript
// Current: report() receives validation result
report(context, validationResult?, executionError?): ISemanticEvent[]

// What this implies: report knows about validate's contract
// This is a leaky abstraction
```

**IF Perspective**: In a clean three-phase design, the coordinator should handle phase transitions. If validation fails, `report()` shouldn't be called at all—or it should receive a different context indicating the failure mode.

**Better Design**:
```typescript
// Option A: Coordinator handles errors
if (!validationResult.valid) {
  return generateValidationError(context, validationResult);
}
execute(context);
return report(context);  // Only called on success

// Option B: Separate report methods
reportSuccess(context): ISemanticEvent[]
reportFailure(context, failureReason): ISemanticEvent[]
```

### 2. "Error" vs "Failure" Semantic Confusion

**Problem**: The pattern treats all non-success outcomes as "errors," but in IF, many failures are narratively valid outcomes, not errors.

| Outcome | Current Treatment | IF Reality |
|---------|-------------------|------------|
| Locked door | `action.error` | Valid narrative: "The door is locked." |
| Can't take scenery | `action.error` | Valid narrative: "That's fixed in place." |
| Already holding item | `action.error` | Valid narrative: "You're already carrying that." |
| Code bug | `action.error` | Actual error needing different handling |

**IF Perspective**: Interactive Fiction has a long tradition of treating "failure" as part of the narrative. Graham Nelson's Inform 7 distinguishes between:
- **Failures**: Valid world states where an action cannot proceed ("The door is locked")
- **Parser errors**: Invalid input processing
- **Runtime errors**: Actual bugs

The current pattern conflates these, using `action.error` for all. This makes it harder for the reporting layer to distinguish "tell the player about the world" from "something went wrong in the code."

**Better Design**:
```typescript
// Semantic event types should distinguish:
'action.blocked'    // World state prevents action (locked door)
'action.refused'    // Entity refuses action (NPC says no)
'action.impossible' // Physical impossibility (can't take scenery)
'action.error'      // Actual runtime error (bug)
```

### 3. Dual Error Handling Creates Confusion

**Problem**: Some actions handle failures in two places:

```typescript
// unlocking.ts has BOTH:

// 1. Behavior-level failure handling
if (sharedData.failed) {
  return [context.event('action.error', { ... })];
}

// 2. Validation/execution error handling (from report-helpers)
const errorEvents = handleReportErrors(context, validationResult, executionError);
if (errorEvents) return errorEvents;
```

This creates questions:
- When is `sharedData.failed` used vs `validationResult.valid`?
- Why do we need both mechanisms?
- What's the priority order?

**IF Perspective**: Actions like `locking`, `unlocking`, `wearing`, `switching_on/off` all have this dual pattern. The split exists because:
1. Validation catches preconditions (entity exists, has correct traits)
2. `sharedData.failed` catches behavior-level failures (wrong key, already worn)

This distinction is valid but the implementation is confusing. The behavior-level failures should probably be validation failures, caught in `validate()`.

### 4. sharedData is a Code Smell

**Problem**: `context.sharedData` exists to pass information between `execute()` and `report()`. This is a symptom of the phases not being well-designed.

```typescript
execute(context) {
  // Do mutations
  context.sharedData.previousLocation = oldLocation;
  context.sharedData.wasWorn = wasWorn;
  context.sharedData.implicitTake = true;
}

report(context) {
  // Read from sharedData to build events
  const { previousLocation, wasWorn } = context.sharedData;
}
```

**IF Perspective**: The need for `sharedData` reveals that `execute()` is doing two things:
1. Performing world mutations
2. Capturing context for narrative generation

These concerns should be separated. The "capture context for narrative" step should happen before mutations, and that context should flow cleanly to reporting.

**Better Design**:
```typescript
// Option: execute returns a result that report uses
interface ExecutionResult {
  mutations: Mutation[];
  narrativeContext: NarrativeContext;
}

execute(context): ExecutionResult {
  return {
    mutations: [MoveTo(item, actor)],
    narrativeContext: { previousLocation, wasWorn, ... }
  };
}

report(context, executionResult: ExecutionResult): ISemanticEvent[] {
  const { narrativeContext } = executionResult;
  // ...
}
```

### 5. The "Always Call Report" Contract is Unusual

**Problem**: The current design says report is ALWAYS called, even on validation failure:

```typescript
// From test patterns:
if (!validationResult.valid) {
  return action.report(context, validationResult);  // Still called!
}
```

**IF Perspective**: This is unusual. Most command patterns either:
- Don't call the action at all if validation fails
- Call a different method for failure reporting

The "always call report" approach works, but requires every action to have error-handling boilerplate (hence the helper). It would be cleaner for the coordinator to handle this.

---

## What the Pattern Gets Right

### 1. Consistency
All 43 actions now handle errors the same way. This is valuable for maintenance.

### 2. Reduced Boilerplate
Three lines replace repeated error-checking logic across actions.

### 3. Entity Snapshots
The helper can capture entity snapshots for richer error messages—useful for debugging.

### 4. Migration Path
The pattern allowed incremental migration from two-phase to three-phase without breaking existing functionality.

---

## Recommendations

### Short Term (Accept)
Keep `report-helpers` as-is. The migration is complete, tests pass, and changing the architecture now would be disruptive.

### Medium Term (Refactor)
1. **Rename event types**: `action.blocked`, `action.refused`, `action.impossible` instead of `action.error` for world-state failures
2. **Move behavior failures to validation**: If `WearableBehavior.wear()` can fail with "already worn," that should be caught in `validate()`, not detected in `execute()` and handled in `report()`
3. **Eliminate dual error handling**: Each action should have ONE place where failure is detected

### Long Term (Redesign)
Consider whether the three-phase pattern is the right abstraction for IF:

**Alternative: Command + Effects Pattern**
```typescript
// Actions return intended effects, not events
interface ActionResult {
  effects: Effect[];        // World mutations to apply
  narrative: Narrative;     // Story output to generate
  success: boolean;
  failureReason?: string;
}

// Coordinator applies effects and generates events
const result = action.attempt(context);
if (result.success) {
  applyEffects(world, result.effects);
}
return generateEvents(result.narrative);
```

This separates:
- What changes to make (effects)
- What to tell the player (narrative)
- Whether it worked (success)

---

## Conclusion

The `report-helpers` pattern is **acceptable but architecturally impure**. It papers over issues in the three-phase design rather than addressing them. For an IF platform specifically:

1. **Failures are narrative, not errors** — The current pattern treats all non-success as errors
2. **Phase coupling is unnecessary** — Report shouldn't need to know about validation
3. **sharedData is a workaround** — Better phase design would eliminate it

The pattern is fine for the current milestone. Future architectural work should address the underlying design issues.

---

## References

- ADR-051: Three-phase action pattern
- ADR-052: Event handlers
- `/packages/stdlib/src/actions/base/report-helpers.ts`
- `/packages/stdlib/src/actions/enhanced-types.ts`
