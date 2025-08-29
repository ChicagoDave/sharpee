# Three-Phase Conversion Checklist

## Quality Gate Requirements
**MUST achieve 8+ quality score before proceeding to next action**

## Critical Architecture Patterns

### 1. Behavior Pattern Requirements
**CRITICAL**: Behaviors must ONLY perform mutations, never return events!

#### ✅ Correct Behavior Pattern
```typescript
// Behaviors return result objects
static open(entity: IFEntity): IOpenResult {
  openable.isOpen = true; // Mutation
  return {
    success: true,
    stateChanged: true,
    openMessage: openable.openMessage
  }; // Returns result, NOT events
}
```

#### ❌ Incorrect Behavior Pattern
```typescript
// WRONG: Behaviors should not return events
static enter(entity: IFEntity): ISemanticEvent[] {
  return [createEvent(...)]; // VIOLATION!
}
```

### 2. Action Execute Pattern
```typescript
execute(context: ActionContext): void {
  // Use behaviors that return results
  const result: IEnterResult = EntryBehavior.enter(target, actor);
  
  // Store state for report phase (with typed interface)
  const state: EnteringExecutionState = {
    targetId: target.id,
    preposition: result.preposition
  };
  (context as any)._enteringState = state;
}
```

### 3. Test Helper Pattern
```typescript
// Tests need this helper for three-phase actions
const executeWithValidation = (action: any, context: ActionContext) => {
  const validation = action.validate(context);
  if (!validation.valid) {
    if (action.report) {
      return action.report(context, validation);
    }
    // Fallback for old-style
  }
  if (action.report) {
    action.execute(context); // void
    return action.report(context); // events
  }
  return action.execute(context); // old-style
};
```

## Conversion Checklist Template

For each action conversion:

### Pre-Conversion Review
- [ ] Read current implementation
- [ ] Document current quality score (X/10)
- [ ] Identify all validation logic
- [ ] Identify all mutations
- [ ] Identify all event generation
- [ ] Check for code duplication
- [ ] Note any bugs or issues

### Conversion Steps
- [ ] Create backup of original file
- [ ] **Check if any behaviors need refactoring** (must return results, not events)
- [ ] Create typed state interface for execute->report communication
- [ ] Extract all validation logic to `validate()` method
- [ ] Ensure validation is pure (no side effects)
- [ ] Move all mutations to `execute()` method
- [ ] Ensure execute returns `void`
- [ ] Use refactored behaviors that return result objects
- [ ] Move all event generation to `report()` method
- [ ] Handle validation errors in report (no redundant fields)
- [ ] Handle execution errors in report
- [ ] Store state using typed interface: `(context as any)._actionState`
- [ ] Remove any console.log statements
- [ ] Add proper TypeScript types
- [ ] Update JSDoc comments
- [ ] Update test helper to support three-phase pattern

### Post-Conversion Testing
- [ ] Compile without errors
- [ ] Run unit tests if they exist
- [ ] Test with a simple command
- [ ] Test validation failure cases
- [ ] Test success cases
- [ ] Verify events are generated correctly

### Quality Review (Must Score 8+)
- [ ] **Separation of Concerns** (0-2): Clean three-phase separation?
- [ ] **Validation Purity** (0-2): No side effects in validate?
- [ ] **Event Completeness** (0-2): All events in report phase?
- [ ] **Error Handling** (0-1): Proper error handling?
- [ ] **Code Clarity** (0-1): Clean, readable code?
- [ ] **Type Safety** (0-1): Proper TypeScript usage?
- [ ] **Documentation** (0-1): Updated comments/docs?

**Total Score: __/10** (Must be 8+)

### Sign-off
- [ ] Quality score ≥ 8
- [ ] All tests passing
- [ ] Ready for next action

---

## Phase 1: Core Movement & Interaction

### 1. ENTERING Action
**Current Implementation**: `packages/stdlib/src/actions/standard/entering/entering.ts`

#### Pre-Conversion Review
- [x] Read current implementation
- [x] Current quality score: **7.5/10** (per action-quality-table)
- [x] Validation logic: Lines 38-174 (mixed in execute)
- [x] Mutations: Line 206 (moveEntity)
- [x] Event generation: Lines 220-238
- [ ] Code duplication: Check against exiting
- [ ] Known issues: Validation mixed with execution

#### Conversion Steps
- [ ] Create backup of original file
- [ ] Extract validation logic to `validate()` method
- [ ] Ensure validation is pure
- [ ] Move mutations to `execute()` method
- [ ] Ensure execute returns `void`
- [ ] Move event generation to `report()` method
- [ ] Handle validation errors in report
- [ ] Handle execution errors in report
- [ ] Store state in context if needed
- [ ] Remove console.log statements
- [ ] Add proper TypeScript types
- [ ] Update JSDoc comments

#### Post-Conversion Testing
- [ ] Compile without errors
- [ ] Run unit tests
- [ ] Test: `enter box`
- [ ] Test: `enter non-enterable`
- [ ] Test: `enter closed-container`
- [ ] Verify events generated

#### Quality Review
- [ ] **Separation of Concerns** (0-2): ___
- [ ] **Validation Purity** (0-2): ___
- [ ] **Event Completeness** (0-2): ___
- [ ] **Error Handling** (0-1): ___
- [ ] **Code Clarity** (0-1): ___
- [ ] **Type Safety** (0-1): ___
- [ ] **Documentation** (0-1): ___

**Total Score: __/10**

#### Sign-off
- [ ] Quality score ≥ 8
- [ ] All tests passing
- [ ] Ready for next action

---

### 2. EXITING Action
**Current Implementation**: `packages/stdlib/src/actions/standard/exiting/exiting.ts`

#### Pre-Conversion Review
- [x] Read current implementation
- [x] Current quality score: **4.5/10** → **9.0/10** (claimed improvement)
- [ ] Validation logic location: ___
- [ ] Mutations location: ___
- [ ] Event generation location: ___
- [ ] Code duplication: ___
- [ ] Known issues: ___

#### Conversion Steps
[Same checklist as above]

#### Post-Conversion Testing
[Same checklist as above]

#### Quality Review
[Same scoring as above]

**Total Score: __/10**

---

### 3. EATING Action
**Current Implementation**: `packages/stdlib/src/actions/standard/eating/eating.ts`

#### Pre-Conversion Review
- [ ] Read current implementation
- [ ] Current quality score: **3.5/10** → **8.0/10** (claimed improvement)
- [ ] Validation logic location: ___
- [ ] Mutations location: ___
- [ ] Event generation location: ___
- [ ] Code duplication: ___
- [ ] Known issues: ___

[Continue pattern for all 26 actions...]

---

## Progress Tracking

| Action | Pre-Score | Post-Score | Status | Reviewer | Date |
|--------|-----------|------------|--------|----------|------|
| entering | 7.5 | ___ | ⬜ Not Started | | |
| exiting | 4.5 | ___ | ⬜ Not Started | | |
| eating | 3.5 | ___ | ⬜ Not Started | | |
| drinking | 3.5 | ___ | ⬜ Not Started | | |
| attacking | 2.0 | ___ | ⬜ Not Started | | |
| pushing | 3.0 | ___ | ⬜ Not Started | | |
| pulling | 1.0 | ___ | ⬜ Not Started | | |
| saving | 7.5 | ___ | ⬜ Not Started | | |
| restoring | 7.5 | ___ | ⬜ Not Started | | |
| quitting | 7.5 | ___ | ⬜ Not Started | | |
| restarting | 7.5 | ___ | ⬜ Not Started | | |
| scoring | 7.0 | ___ | ⬜ Not Started | | |
| about | 7.0 | ___ | ⬜ Not Started | | |
| again | 7.0 | ___ | ⬜ Not Started | | |
| listening | 2.0 | ___ | ⬜ Not Started | | |
| smelling | 5.5 | ___ | ⬜ Not Started | | |
| touching | 6.5 | ___ | ⬜ Not Started | | |
| searching | 6.5 | ___ | ⬜ Not Started | | |
| reading | 6.5 | ___ | ⬜ Not Started | | |
| showing | 6.5 | ___ | ⬜ Not Started | | |
| talking | 6.0 | ___ | ⬜ Not Started | | |
| throwing | 6.0 | ___ | ⬜ Not Started | | |
| sleeping | 5.0 | ___ | ⬜ Not Started | | |
| waiting | 6.0 | ___ | ⬜ Not Started | | |
| climbing | 7.0 | ___ | ⬜ Not Started | | |
| help | 4.0 | ___ | ⬜ Not Started | | |

## Success Criteria
- All 26 actions converted to three-phase pattern
- All actions score 8+ on quality review
- All tests passing
- No regressions in functionality
- Clean git history with one commit per action