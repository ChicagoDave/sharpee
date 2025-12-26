# Three-Phase Conversion Review Template

## Action: [ACTION_NAME]
**File**: `packages/stdlib/src/actions/standard/[action]/[action].ts`
**Reviewer**: Assistant
**Date**: [DATE]
**Commit**: [COMMIT_HASH]

## Executive Summary
- **Pre-Conversion Score**: X/10
- **Post-Conversion Score**: X/10
- **Status**: ✅ APPROVED / ❌ NEEDS WORK
- **Blocking Issues**: None / [List issues]

## Three-Phase Implementation Review

### 1. Validate Method
```typescript
validate(context: ActionContext): ValidationResult
```

#### Checklist
- [ ] Returns ValidationResult type
- [ ] No side effects (pure function)
- [ ] No mutations to world state
- [ ] No event generation
- [ ] All validation logic extracted from execute
- [ ] Clear error messages with proper params
- [ ] Checks all preconditions

#### Issues Found
- None / [List issues]

### 2. Execute Method
```typescript
execute(context: ActionContext): void
```

#### Checklist
- [ ] Returns void
- [ ] No validation logic (trusts validate)
- [ ] Only performs mutations
- [ ] No event generation
- [ ] Stores necessary state for report phase
- [ ] Delegates to behaviors when appropriate
- [ ] No console.log statements

#### Issues Found
- None / [List issues]

### 3. Report Method
```typescript
report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[]
```

#### Checklist
- [ ] Returns ISemanticEvent[]
- [ ] Handles validation errors
- [ ] Handles execution errors
- [ ] Generates all events
- [ ] Uses stored state from execute
- [ ] Captures entity snapshots when needed
- [ ] Includes proper event data

#### Issues Found
- None / [List issues]

## Quality Scoring

### Separation of Concerns (0-2 points)
- **Score**: X/2
- **Rationale**: [Explain score]

### Validation Purity (0-2 points)
- **Score**: X/2
- **Rationale**: [Explain score]

### Event Completeness (0-2 points)
- **Score**: X/2
- **Rationale**: [Explain score]

### Error Handling (0-1 point)
- **Score**: X/1
- **Rationale**: [Explain score]

### Code Clarity (0-1 point)
- **Score**: X/1
- **Rationale**: [Explain score]

### Type Safety (0-1 point)
- **Score**: X/1
- **Rationale**: [Explain score]

### Documentation (0-1 point)
- **Score**: X/1
- **Rationale**: [Explain score]

## Final Score: X/10

## Code Smells Detected
- None / [List code smells]

## Improvements Made
1. [List improvement]
2. [List improvement]

## Remaining Technical Debt
- None / [List debt items]

## Testing Results
- [ ] Compiles without errors
- [ ] Unit tests pass
- [ ] Manual testing successful
- [ ] Events generated correctly

### Test Commands Used
```
enter box
enter closed-container
exit
```

### Test Results
- [Document results]

## Recommendations
- None / [List recommendations]

## Comparison with Other Actions
- Similar to: [List similar actions]
- Pattern consistency: [Good/Issues]
- Could share code with: [List actions]

## Sign-off

### Quality Gate Check
- [ ] Score ≥ 8/10
- [ ] No blocking issues
- [ ] Tests passing
- [ ] Ready for production

### Approval Status
**APPROVED** / **NEEDS REVISION**

### Next Steps
- Proceed to next action / [List required fixes]

---

## Code Snippets

### Before (Old Pattern)
```typescript
execute(context: ActionContext): ISemanticEvent[] {
  // Mixed validation, mutation, and events
}
```

### After (Three-Phase)
```typescript
validate(context: ActionContext): ValidationResult {
  // Pure validation
}

execute(context: ActionContext): void {
  // Mutations only
}

report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
  // Event generation
}
```

## Metrics
- Lines of code: Before X → After Y
- Cyclomatic complexity: Before X → After Y
- Test coverage: X%