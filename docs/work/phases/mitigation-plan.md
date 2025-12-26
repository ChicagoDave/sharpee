# Mitigation Plan: High-Priority Assessment Issues

**Date**: December 2025
**Reference**: `docs/work/phases/stdlib-assessment.md`

---

## Issue 1: Context Pollution in going.ts

### Problem

In `packages/stdlib/src/actions/standard/going/going.ts:212`, the action stores data using context pollution instead of the approved `sharedData` pattern:

```typescript
// Current (problematic)
(context as any)._isFirstVisit = isFirstVisit;
```

This violates the design principle established in the three-phase refactoring where `context.sharedData` is the designated mechanism for passing data between phases.

### Impact

- **Maintainability**: Inconsistent patterns make code harder to understand
- **Type Safety**: `as any` bypasses TypeScript checking
- **Future Risk**: Could lead to naming collisions or accidental overwrites

### Fix

**Location**: `packages/stdlib/src/actions/standard/going/going.ts`

**Step 1**: Add typed sharedData interface (if not already present in going-data.ts):

```typescript
interface GoingSharedData {
  isFirstVisit?: boolean;
  fromRoomId?: string;
  toRoomId?: string;
  direction?: DirectionType;
}

function getGoingSharedData(context: ActionContext): GoingSharedData {
  return context.sharedData as GoingSharedData;
}
```

**Step 2**: Update execute() at line 212:

```typescript
// Before
(context as any)._isFirstVisit = isFirstVisit;

// After
const sharedData = getGoingSharedData(context);
sharedData.isFirstVisit = isFirstVisit;
```

**Step 3**: Update any usage in report() phase (if accessing this value).

### Effort

- **Estimate**: 10 minutes
- **Risk**: Low (simple refactor with existing pattern)
- **Testing**: Run `pnpm --filter '@sharpee/stdlib' test going`

---

## Issue 2: Error Handling Duplication

### Problem

13+ actions contain duplicate error handling boilerplate in their `report()` methods:

```typescript
report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
  // Handle validation errors - DUPLICATED IN EVERY ACTION
  if (validationResult && !validationResult.valid) {
    const errorParams = { ...(validationResult.params || {}) };

    if (context.command.directObject?.entity) {
      errorParams.targetSnapshot = captureEntitySnapshot(
        context.command.directObject.entity,
        context.world,
        false
      );
    }
    if (context.command.indirectObject?.entity) {
      errorParams.indirectTargetSnapshot = captureEntitySnapshot(
        context.command.indirectObject.entity,
        context.world,
        false
      );
    }

    return [
      context.event('action.error', {
        actionId: context.action.id,
        error: validationResult.error || 'validation_failed',
        reason: validationResult.error || 'validation_failed',
        messageId: validationResult.messageId || validationResult.error || 'action_failed',
        params: errorParams
      })
    ];
  }

  // Handle execution errors - ALSO DUPLICATED
  if (executionError) {
    return [
      context.event('action.error', {
        actionId: context.action.id,
        error: 'execution_failed',
        messageId: 'action_failed',
        params: { error: executionError.message }
      })
    ];
  }

  // ... rest of report logic
}
```

### Affected Files

1. `attacking/attacking.ts`
2. `closing/closing.ts`
3. `dropping/dropping.ts`
4. `entering/entering.ts`
5. `examining/examining.ts`
6. `exiting/exiting.ts`
7. `going/going.ts`
8. `inserting/inserting.ts`
9. `looking/looking.ts`
10. `opening/opening.ts`
11. `putting/putting.ts`
12. `removing/removing.ts`
13. `taking/taking.ts`

### Impact

- **Maintainability**: 200+ lines of duplicated code
- **Consistency**: Risk of divergent error handling across actions
- **Future Changes**: Any improvement requires 13+ file edits

### Solution Design

**Create**: `packages/stdlib/src/actions/base/report-helpers.ts`

```typescript
import { ActionContext, ValidationResult } from '../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { captureEntitySnapshot } from './snapshot-utils';

/**
 * Options for error event generation
 */
export interface ErrorEventOptions {
  includeTargetSnapshot?: boolean;
  includeIndirectSnapshot?: boolean;
}

/**
 * Handle validation errors in report phase
 * Returns error events if validation failed, null otherwise
 */
export function handleValidationError(
  context: ActionContext,
  validationResult?: ValidationResult,
  options: ErrorEventOptions = {}
): ISemanticEvent[] | null {
  if (!validationResult || validationResult.valid) {
    return null;
  }

  const errorParams = { ...(validationResult.params || {}) };

  // Optionally capture entity snapshots
  if (options.includeTargetSnapshot !== false && context.command.directObject?.entity) {
    errorParams.targetSnapshot = captureEntitySnapshot(
      context.command.directObject.entity,
      context.world,
      false
    );
  }

  if (options.includeIndirectSnapshot !== false && context.command.indirectObject?.entity) {
    errorParams.indirectTargetSnapshot = captureEntitySnapshot(
      context.command.indirectObject.entity,
      context.world,
      false
    );
  }

  return [
    context.event('action.error', {
      actionId: context.action.id,
      error: validationResult.error || 'validation_failed',
      reason: validationResult.error || 'validation_failed',
      messageId: validationResult.messageId || validationResult.error || 'action_failed',
      params: errorParams
    })
  ];
}

/**
 * Handle execution errors in report phase
 * Returns error events if execution failed, null otherwise
 */
export function handleExecutionError(
  context: ActionContext,
  executionError?: Error
): ISemanticEvent[] | null {
  if (!executionError) {
    return null;
  }

  return [
    context.event('action.error', {
      actionId: context.action.id,
      error: 'execution_failed',
      messageId: 'action_failed',
      params: { error: executionError.message }
    })
  ];
}

/**
 * Combined helper - handles both validation and execution errors
 * Returns error events if any error occurred, null otherwise
 */
export function handleReportErrors(
  context: ActionContext,
  validationResult?: ValidationResult,
  executionError?: Error,
  options: ErrorEventOptions = {}
): ISemanticEvent[] | null {
  const validationEvents = handleValidationError(context, validationResult, options);
  if (validationEvents) return validationEvents;

  const executionEvents = handleExecutionError(context, executionError);
  if (executionEvents) return executionEvents;

  return null;
}
```

### Migration Pattern

**Before** (current pattern in each action):
```typescript
report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
  if (validationResult && !validationResult.valid) {
    // 15 lines of error handling
  }

  if (executionError) {
    // 10 lines of error handling
  }

  // ... actual report logic
}
```

**After** (with helper):
```typescript
import { handleReportErrors } from '../../base/report-helpers';

report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
  const errorEvents = handleReportErrors(context, validationResult, executionError);
  if (errorEvents) return errorEvents;

  // ... actual report logic (now more prominent)
}
```

### Implementation Plan

| Step | Task | Files | Effort |
|------|------|-------|--------|
| 1 | Create `report-helpers.ts` | 1 new file | 15 min |
| 2 | Add unit tests for helpers | 1 new test file | 20 min |
| 3 | Migrate `taking.ts` as pilot | 1 file | 10 min |
| 4 | Verify tests pass | - | 5 min |
| 5 | Migrate remaining 12 actions | 12 files | 30 min |
| 6 | Final test run | - | 5 min |

**Total Estimate**: ~1.5 hours

### Risk Mitigation

- **Pilot First**: Migrate `taking.ts` first, run full test suite
- **Incremental**: Commit after each batch of 3-4 actions
- **Preserve Behavior**: Helpers produce identical events to current code

### Testing Strategy

1. Run individual action tests after each migration
2. Run full stdlib test suite after all migrations
3. Compare event output before/after for representative actions

---

## Priority Order

1. **Issue 1** (context pollution) - Quick fix, do first
2. **Issue 2** (error handling) - Larger refactor, do second

## Success Criteria

- [ ] No `(context as any)._` patterns in stdlib actions
- [ ] All actions using `handleReportErrors()` helper
- [ ] All existing tests pass
- [ ] Code review confirms consistency
