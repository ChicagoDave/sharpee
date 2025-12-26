# Plan: Fix report-helpers (Event-Driven Approach)

## Problem Statement

The `report-helpers` pattern conflates story failures with system errors. In an event-driven IF system, "the door is locked" should emit a semantic event, not an `action.error`.

**Core issue**: report() currently receives `validationResult` and `executionError` as parameters, making it responsible for error handling. This is wrong — report() should only generate success events.

## Sharpee's Event-Driven Model

Actions produce **semantic events** that describe what happened:
- `if.event.taken` — item was picked up
- `if.event.opened` — container was opened
- `if.event.moved` — player changed location

These events are consumed by:
- Event handlers (custom story logic)
- The reporting layer (narrative output)

**The pattern should be**: validate → execute → report (success events only)

**Not**: validate → execute → report (which also handles errors)

---

## Current Problems

### 1. report() has wrong responsibilities

```typescript
// Current: report handles both success AND errors
report(context, validationResult?, executionError?) {
  const errorEvents = handleReportErrors(context, validationResult, executionError);
  if (errorEvents) return errorEvents;  // ← This is wrong
  // ... success logic
}
```

report() should only generate success events. Error/blocked events should come from the coordinator.

### 2. Semantic conflation

All failures become `action.error`:
- "Door is locked" → `action.error` (should be a story event)
- Null pointer exception → `action.error` (actually an error)

### 3. sharedData is doing too many jobs

| Current Use | Should Be |
|-------------|-----------|
| Pre-mutation state capture | Keep (legitimate) |
| Behavior results | Keep (legitimate) |
| Pre-built messageId/params | Move to report() logic |
| Error flags (failed, errorMessageId) | Move to ValidationResult |

---

## Proposed Solution: Coordinator Owns Blocked Events

### New Control Flow

```
CommandExecutor.execute()
├─ action.validate(context) → ValidationResult
├─ IF valid === false
│  └─ COORDINATOR emits action.blocked event (not report!)
├─ IF valid === true
│  ├─ TRY action.execute(context)
│  │  └─ Uses sharedData for pre-mutation state
│  ├─ action.report(context) → success events only
│  └─ CATCH → COORDINATOR emits action.error event
```

### Key Changes

**1. report() signature simplifies**
```typescript
// Before
report(context, validationResult?, executionError?): ISemanticEvent[]

// After
report(context): ISemanticEvent[]
```

report() is only called on success. It only generates success events.

**2. Coordinator generates blocked events**
```typescript
// In CommandExecutor
const validation = action.validate(context);
if (!validation.valid) {
  // Coordinator creates the blocked event, not the action
  return [createBlockedEvent(context, validation)];
}

try {
  action.execute(context);
  return action.report(context);
} catch (error) {
  // Coordinator creates the error event
  return [createErrorEvent(context, error)];
}
```

**3. New semantic event types**
```typescript
// Story failures (player feedback, not bugs)
'action.blocked'     // Precondition not met: "The door is locked"
'action.refused'     // NPC/entity declined: "Bob won't give you that"
'action.impossible'  // Physical impossibility: "You can't take the sky"

// System errors (actual bugs)
'action.error'       // Exception thrown during execute
```

**4. Behavior failures move to validate()**

Currently some behaviors can fail in execute() (wrong key, already worn). These should be checked in validate():

```typescript
// Before: failure detected in execute()
execute(context) {
  const result = LockableBehavior.lock(noun, key);
  if (!result.success) {
    context.sharedData.failed = true;
    context.sharedData.errorMessageId = 'wrong_key';
  }
}

// After: failure detected in validate()
validate(context) {
  if (!LockableBehavior.canLock(noun, key)) {
    return { valid: false, error: 'wrong_key', params: { key: key.name } };
  }
  return { valid: true };
}

execute(context) {
  // Only called if validation passed - just do the mutation
  LockableBehavior.lock(noun, key);
}
```

**5. sharedData stays, but clarified**

sharedData is legitimate for capturing pre-mutation state:
```typescript
execute(context) {
  // Capture BEFORE mutation (for narrative)
  context.sharedData.previousLocation = context.world.getLocation(noun.id);

  // Mutation
  context.world.moveEntity(noun.id, actor.id);
}

report(context) {
  // Use captured state for rich events
  const { previousLocation } = context.sharedData;
  return [context.event('if.event.taken', {
    item: noun.name,
    from: previousLocation
  })];
}
```

No more `failed`, `errorMessageId` in sharedData — that's validation's job.

---

## What Gets Deleted

1. `packages/stdlib/src/actions/base/report-helpers.ts` — entirely
2. All `handleReportErrors` calls in 43 actions
3. All `validationResult?` and `executionError?` parameters from report()
4. All `sharedData.failed` / `sharedData.errorMessageId` patterns

---

## What Gets Added

1. `createBlockedEvent()` helper in coordinator
2. `createErrorEvent()` helper in coordinator
3. New event types: `action.blocked`, `action.refused`, `action.impossible`
4. Behavior `canX()` methods where missing (so validate() can check)

---

## Migration Pattern (per action)

```typescript
// BEFORE
report(context, validationResult?, executionError?) {
  const errorEvents = handleReportErrors(context, validationResult, executionError);
  if (errorEvents) return errorEvents;

  if (context.sharedData.failed) {
    return [context.event('action.error', { ... })];
  }

  // Success logic
  return [context.event('if.event.taken', { ... })];
}

// AFTER
report(context) {
  // Only success logic — errors handled by coordinator
  return [context.event('if.event.taken', { ... })];
}
```

For actions with behavior failures in execute():
1. Add `canX()` check to validate()
2. Remove failure handling from execute()
3. Remove failure handling from report()

---

## Scope

**Effort**: ~3-4 days

**Files changed**:
- `packages/engine/src/command-executor.ts` (coordinator changes)
- `packages/stdlib/src/actions/base/report-helpers.ts` (delete)
- `packages/stdlib/src/actions/enhanced-types.ts` (update report signature)
- All 43 action files (remove error handling from report)
- ~10 actions with behavior failures (move checks to validate)

---

---

## Analysis: Four-Phase Model (validate → execute OR error → report)

Examining real actions to understand consequences.

### Case 1: locking.ts (behavior can "fail" in execute)

**Current flow:**
```typescript
validate() {
  if (!LockableBehavior.canLock(noun)) return { valid: false, error: 'already_locked' };
  // ... more checks
  return { valid: true };
}

execute() {
  const result = LockableBehavior.lock(noun, withKey);
  if (!result.success) {
    sharedData.failed = true;  // ← Behavior failure!
    sharedData.errorMessageId = 'wrong_key';
  }
}

report() {
  if (sharedData.failed) {
    return [context.event('action.error', ...)];  // ← Error in report
  }
  return [context.event('if.event.locked', ...)];
}
```

**Problem:** validate() already checks `canLock()` but execute() still checks again via `lock()` result. This is redundant.

**Root cause:** Behaviors return `ILockResult` with BOTH:
- Success/failure info (redundant with canLock)
- Narrative context (lockSound) - actually needed

**With four-phase:**
```typescript
validate() {
  if (!LockableBehavior.canLock(noun, withKey)) {
    return { valid: false, error: 'wrong_key' };
  }
  return { valid: true };
}

error(context, validation) {
  // Prepare sharedData for blocked event
  sharedData.blockedReason = validation.error;
  sharedData.targetName = noun.name;
}

execute() {
  // Trust validation - just do mutation
  const result = LockableBehavior.lock(noun, withKey);
  sharedData.sound = result.lockSound;  // Still need narrative context
}

report() {
  if (sharedData.blockedReason) {
    return [context.event('action.blocked', { reason: sharedData.blockedReason })];
  }
  return [context.event('if.event.locked', { sound: sharedData.sound })];
}
```

**Observation:** The `error()` phase just populates sharedData. Could the coordinator do this automatically from ValidationResult?

---

### Case 2: going.ts (clean action, no behavior failures)

**Current flow:**
```typescript
validate() {
  if (!exit) return { valid: false, error: 'no_exit_that_way' };
  if (doorLocked) return { valid: false, error: 'door_locked' };
  return { valid: true };
}

execute() {
  sharedData.isFirstVisit = !RoomBehavior.hasBeenVisited(destination);
  context.world.moveEntity(actor.id, destination.id);
}

report() {
  // handleReportErrors boilerplate
  return [
    context.event('if.event.actor_exited', ...),
    context.event('if.event.actor_moved', ...),
    context.event('if.event.actor_entered', ...)
  ];
}
```

**Observation:** No behavior failures in execute(). sharedData only captures pre-mutation state (legitimate).

**With four-phase:** error() would just copy validation info to sharedData. Is that worth a new method?

---

### Case 3: dropping.ts (behavior failure duplicates validation)

**Current flow:**
```typescript
validate() {
  if (!ActorBehavior.isHolding(actor, noun.id)) {
    return { valid: false, error: 'not_held' };
  }
  if (WearableBehavior.isWorn(noun)) {
    return { valid: false, error: 'still_worn' };
  }
  return { valid: true };
}

execute() {
  const result = ActorBehavior.dropItem(actor, noun);
  sharedData.dropResult = result;  // Includes success/failure!
}

report() {
  if (!result.success) {
    if (result.notHeld) return [context.event('action.error', ...)];  // ← Already validated!
    if (result.stillWorn) return [context.event('action.error', ...)]; // ← Already validated!
  }
  return [context.event('if.event.dropped', ...)];
}
```

**Problem:** Same as locking. Behavior returns failure for conditions already checked in validate().

**Fix:** If validate() passes, execute() should never see `result.success === false`. The behavior failure checks in report() are dead code.

---

## Key Insight: Behavior Failures Are Redundant

Looking at all three actions:

| Action | validate() checks | execute() behavior can fail with |
|--------|-------------------|----------------------------------|
| locking | canLock, key valid | wrongKey, noKey, alreadyLocked |
| dropping | isHolding, isWorn | notHeld, stillWorn |
| going | exit exists, door open | (none - clean) |

**The behavior failures duplicate validation.** If we trust validate(), behaviors should never fail.

**Implication:** We don't need error() as a phase for behavior failures. We need:
1. Validation to be complete
2. Behaviors to trust validation passed
3. Coordinator to handle validation failures

---

## Revised Question: What is error() actually for?

Three possibilities:

### A) error() prepares sharedData for blocked events
```typescript
error(context, validation) {
  sharedData.blockedReason = validation.error;
  sharedData.blockedParams = validation.params;
}
```
But the coordinator could do this automatically.

### B) error() allows action-specific blocked event customization
```typescript
error(context, validation) {
  // Custom logic per action
  if (validation.error === 'door_locked') {
    sharedData.door = context.world.getEntity(exitConfig.via);
    sharedData.hint = "Maybe there's a key nearby?";
  }
}
```
This keeps narrative control with the action.

### C) error() handles cases where execute() discovers failure
For outcomes only discoverable during execution:
- Random: throwing → hit or miss
- NPC decisions: giving → accepted or refused
- Complex state: putting → container became full between validate and execute (race condition?)

But wait - these aren't "errors," they're **outcomes**. Throwing and missing is still a successful throw. NPC refusing is still a successful giving attempt.

---

## Proposed Distinction

| Term | Meaning | Who handles |
|------|---------|-------------|
| **Blocked** | Preconditions not met | Validation catches, coordinator/error() emits |
| **Outcome** | Action happened, result varies | execute() determines, report() emits |
| **Error** | Bug/exception | Coordinator catches and emits |

With this framing:
- **error()** handles blocked actions (gives action narrative control)
- **report()** handles all outcomes (success, miss, refused, etc.)
- Coordinator handles exceptions

---

## The Four-Phase Model Refined

```
validate() → ValidationResult
    ↓
valid?  → YES → execute() → report() → success/outcome events
        → NO  → error()   → report() → blocked event
```

Both paths call report(), but:
- After execute(): sharedData has mutation context
- After error(): sharedData has blocked context

report() checks which path ran and emits appropriate events.

**Or alternatively:**

```
validate() → ValidationResult
    ↓
valid?  → YES → execute() → report()
        → NO  → error()            (error emits blocked event directly)
```

Where error() is terminal and doesn't flow to report().

---

## Critical Constraint: Action Independence

**Actions must be independent of each other.** A change to `taking` should never affect `dropping`.

This means:
- **Core patterns OK**: Interfaces, types, base behaviors (Action, ValidationResult, TraitType)
- **Shared logic NOT OK**: Helper functions that couple actions together

**report-helpers.ts violates this.** All 43 actions import and depend on it. If we change handleReportErrors(), we risk breaking all of them.

**Implication for the fix:**
- Don't replace report-helpers with another shared helper
- Each action should be self-contained
- The coordinator can have shared logic (it's infrastructure, not action logic)
- Actions should not import from each other or from shared action helpers

---

## Refined Solution: Coordinator Handles Phases, Actions Own Events

```
Coordinator (shared infrastructure):
├─ Calls validate()
├─ Decides: execute path or blocked path
├─ Handles exceptions
└─ Returns events to engine

Action (self-contained):
├─ validate(): Check preconditions
├─ execute(): Mutate world, capture context
└─ report(): Generate success events ONLY
```

**For blocked actions:**
- Coordinator generates the blocked event from ValidationResult
- Action's report() is never called
- No shared helper needed — coordinator logic is infrastructure

**For successful actions:**
- execute() runs, captures state in sharedData
- report() generates success events
- Each action's report() is completely independent

---

## Final Proposed Pattern

```typescript
// COORDINATOR (command-executor.ts)
const validation = action.validate(context);

if (!validation.valid) {
  // Coordinator owns blocked event generation
  return [{
    type: 'action.blocked',
    data: {
      actionId: action.id,
      reason: validation.error,
      messageId: validation.messageId || validation.error,
      params: validation.params
    }
  }];
}

try {
  action.execute(context);
  return action.report(context);  // Only success events
} catch (error) {
  // Coordinator owns error event generation
  return [{
    type: 'action.error',
    data: { actionId: action.id, error: error.message }
  }];
}
```

```typescript
// ACTION (each action is self-contained)
validate(context): ValidationResult {
  // All precondition checks - return rich ValidationResult
  if (locked) return { valid: false, error: 'door_locked', params: { door: door.name } };
  return { valid: true };
}

execute(context): void {
  // Capture pre-state, perform mutations
  context.sharedData.previousLocation = ...;
  context.world.moveEntity(...);
}

report(context): ISemanticEvent[] {
  // ONLY success events - no error handling
  return [
    context.event('if.event.taken', { ... }),
    context.event('action.success', { ... })
  ];
}
```

**No shared helpers. No coupling. Each action stands alone.**

---

## What This Means for Migration

1. **Delete** `report-helpers.ts`
2. **Update coordinator** to generate blocked/error events
3. **Simplify each action's report()** — remove all error handling
4. **Move behavior failures to validate()** — so execute() can't fail
5. **Keep sharedData** for pre-mutation state capture (legitimate use)

Each action migration is independent. We can do them one at a time without risk.

---

## Open Question

**ValidationResult richness**: Should it carry enough data for the coordinator to build good blocked events?

Current:
```typescript
{ valid: false, error: 'door_locked', params: { door: 'oak door' } }
```

Might need:
```typescript
{
  valid: false,
  error: 'door_locked',
  messageId: 'door_locked',  // For message lookup
  params: { door: 'oak door', direction: 'north' },
  // Entity snapshots for rich events?
}
```

The coordinator can enrich this with action context (actionId, command info).
