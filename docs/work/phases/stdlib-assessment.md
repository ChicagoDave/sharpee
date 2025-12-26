# Stdlib Action Implementation Assessment

**Date**: December 2025
**Reviewer**: Senior Software Engineer / IF Authoring Expert
**Scope**: 43 stdlib actions in `packages/stdlib/src/actions/standard/`
**Branch**: `refactor/three-phase-complete`

---

## Executive Summary

The stdlib action implementation represents a **well-architected, production-quality** codebase that successfully implements the three-phase action pattern (validate/execute/report) across all 43 standard Interactive Fiction actions. The refactoring effort has achieved its primary goals of clean separation of concerns, proper behavior delegation, and atomic event generation.

**Overall Grade: A-**

The implementation demonstrates strong software engineering principles, domain expertise in IF authoring, and thoughtful architectural decisions. Minor issues remain around code duplication and a few legacy patterns, but these do not materially impact functionality or maintainability.

---

## 1. Architectural Assessment

### 1.1 Three-Phase Pattern Compliance

**Rating: Excellent**

All 43 actions now implement the three-phase pattern as specified in ADR-051 and ADR-058:

| Phase | Responsibility | Compliance |
|-------|---------------|------------|
| `validate()` | Precondition checking, returns `ValidationResult` | 100% |
| `execute()` | World mutations only, stores data in `sharedData` | 100% |
| `report()` | Event generation, receives validation/error context | 100% |

**Strengths:**
- Clean separation between validation, mutation, and reporting
- `report()` method receives `validationResult` and `executionError` parameters for complete error handling
- Consistent `ValidationResult` structure with `valid`, `error`, and `params` fields

**Example of proper implementation** (`opening.ts:42-85`):
```typescript
validate(context: ActionContext): ValidationResult {
  const noun = context.command.directObject?.entity;

  if (!noun) {
    return { valid: false, error: 'no_target' };
  }

  if (!noun.has(TraitType.OPENABLE)) {
    return { valid: false, error: 'not_openable', params: { item: noun.name } };
  }

  if (!OpenableBehavior.canOpen(noun)) {
    return { valid: false, error: 'already_open', params: { item: noun.name } };
  }

  // Use behavior for lock checking
  if (noun.has(TraitType.LOCKABLE) && LockableBehavior.isLocked(noun)) {
    return { valid: false, error: 'locked', params: { item: noun.name } };
  }

  return { valid: true };
}
```

### 1.2 Behavior Delegation

**Rating: Very Good**

Actions properly delegate to world-model behaviors rather than directly manipulating entities:

- `OpenableBehavior.open()`, `OpenableBehavior.canOpen()`
- `LockableBehavior.lock()`, `LockableBehavior.isLocked()`
- `RoomBehavior.getExit()`, `RoomBehavior.markVisited()`
- `ActorBehavior.canTakeItem()`, `ActorBehavior.getCustomProperty()`
- `IdentityBehavior.getWeight()`

This separation ensures:
- Actions coordinate, behaviors own state changes
- Testable game logic independent of command handling
- Reusable behavior logic across multiple actions

**Minor Issue**: Some actions still contain inline logic that could be extracted to behaviors (e.g., fragility checking in `throwing.ts:213-218`).

### 1.3 SharedData Usage

**Rating: Good**

The codebase properly uses `context.sharedData` for passing data between phases:

```typescript
// In execute() - store data
const sharedData = getGivingSharedData(context);
sharedData.itemId = item.id;
sharedData.acceptanceType = acceptanceType;

// In report() - retrieve data
const sharedData = getGivingSharedData(context);
const eventData = { item: sharedData.itemId, ... };
```

**Typed accessor pattern** is used consistently:
```typescript
interface GivingSharedData {
  itemId: string;
  itemName: string;
  recipientId: string;
  // ...
}

function getGivingSharedData(context: ActionContext): GivingSharedData {
  return context.sharedData as GivingSharedData;
}
```

**Issue Found**: One instance of context pollution remains in `going.ts:212`:
```typescript
(context as any)._isFirstVisit = isFirstVisit;  // Should use sharedData
```

### 1.4 Event Architecture

**Rating: Excellent**

Events follow a consistent dual-event pattern:

1. **Domain Event** (e.g., `if.event.taken`, `if.event.opened`) - semantic fact about what happened
2. **Action Event** (`action.success` or `action.error`) - for text rendering via report service

```typescript
return [
  context.event('if.event.taken', takenData),      // Domain event
  context.event('action.success', {                 // Display event
    actionId: context.action.id,
    messageId: 'taken',
    params: takenData
  })
];
```

**Key Benefits:**
- Separation of semantic facts from display concerns
- Enables internationalization (messageId lookup)
- Supports historical replay with self-contained event data
- Story handlers can intercept domain events

---

## 2. Action Categorization Analysis

### 2.1 World-Mutating Actions (24 actions)

Actions that modify game state through behavior delegation:

| Action | Complexity | Behavior Usage | Quality |
|--------|------------|----------------|---------|
| taking | High | ActorBehavior, WearableBehavior | Excellent |
| dropping | Medium | ContainerBehavior | Very Good |
| opening | Medium | OpenableBehavior, LockableBehavior | Excellent |
| closing | Medium | OpenableBehavior | Very Good |
| going | High | RoomBehavior, LightSourceBehavior | Very Good |
| entering | Medium | ContainerBehavior | Good |
| exiting | Medium | ContainerBehavior | Good |
| putting | Medium | ContainerBehavior | Very Good |
| inserting | Medium | ContainerBehavior | Very Good |
| removing | Medium | ContainerBehavior | Very Good |
| locking | Medium | LockableBehavior | Excellent |
| unlocking | Medium | LockableBehavior | Very Good |
| switching_on | Low | SwitchableBehavior | Very Good |
| switching_off | Low | SwitchableBehavior | Very Good |
| wearing | Medium | WearableBehavior | Very Good |
| taking_off | Medium | WearableBehavior | Very Good |
| giving | High | ActorBehavior, IdentityBehavior | Excellent |
| throwing | High | Multiple behaviors | Very Good |
| eating | Low | EdibleBehavior | Good |
| drinking | Low | DrinkableBehavior | Good |
| pushing | Low | PushableBehavior | Good |
| pulling | Low | PullableBehavior | Good |
| attacking | Medium | CombatBehavior | Good |
| climbing | Low | ClimbableBehavior | Good |

**Observations:**
- High-complexity actions (taking, going, giving, throwing) are well-structured with clear phase separation
- Behavior delegation is consistent across all world-mutating actions
- Error handling is thorough with specific error codes

### 2.2 Query Actions (4 actions)

Read-only actions that don't modify state:

| Action | Purpose | Quality |
|--------|---------|---------|
| looking | Describe current location | Excellent |
| examining | Describe specific object | Excellent |
| searching | Look inside/under objects | Very Good |
| inventory | List carried items | Very Good |

**Pattern Excellence:**
```typescript
// examining.ts - read-only action pattern
execute(context: ActionContext): void {
  // No mutations - examining is a read-only action
}
```

Query actions correctly have empty `execute()` phases while building rich response data in `report()`.

### 2.3 Meta/Signal Actions (15 actions)

Actions that emit signals without world interaction:

| Action | Signal Type | Quality |
|--------|-------------|---------|
| about | Platform signal | Excellent |
| help | Platform signal | Excellent |
| saving | Platform event | Excellent |
| restoring | Platform event | Excellent |
| restarting | Platform event | Excellent |
| quitting | Platform signal | Very Good |
| scoring | Game state query | Very Good |
| waiting | Turn signal | Excellent |
| sleeping | Turn signal | Good |
| talking | NPC signal | Good |
| touching | Sensory signal | Good |
| smelling | Sensory signal | Good |
| listening | Sensory signal | Good |
| reading | Content signal | Good |
| showing | NPC signal | Good |

**Pattern Excellence** (`about.ts` - minimal signal action):
```typescript
validate(context: ActionContext): ValidationResult {
  return { valid: true };  // Always succeeds
}

execute(context: ActionContext): void {
  // No state mutations needed for this meta action
}

report(context: ActionContext): ISemanticEvent[] {
  return [context.event('if.action.about', {})];
}
```

---

## 3. Code Quality Assessment

### 3.1 TypeScript Usage

**Rating: Very Good**

- Strong typing throughout with explicit interfaces
- `ActionContext`, `ValidationResult`, `ISemanticEvent` properly used
- Typed sharedData accessor patterns

**Minor Issues:**
- Some `as any` casts for accessing trait data (e.g., `giving.ts:106`)
- Could benefit from stricter trait typing

### 3.2 Documentation

**Rating: Excellent**

Every action includes:
- Header comment explaining purpose
- Phase documentation
- JSDoc comments on methods

```typescript
/**
 * Opening action - opens containers and doors
 *
 * This action properly delegates to OpenableBehavior and LockableBehavior
 * for validation and execution. It follows the validate/execute pattern.
 *
 * MIGRATED: To three-phase pattern (validate/execute/report) for atomic events
 */
```

### 3.3 Error Handling

**Rating: Very Good**

Consistent error handling pattern:
```typescript
// In report() - handle all error cases
if (validationResult && !validationResult.valid) {
  return [context.event('action.error', {
    actionId: context.action.id,
    error: validationResult.error || 'validation_failed',
    messageId: validationResult.messageId || validationResult.error,
    params: validationResult.params || {}
  })];
}

if (executionError) {
  return [context.event('action.error', {
    actionId: context.action.id,
    error: 'execution_failed',
    messageId: 'action_failed',
    params: { error: executionError.message }
  })];
}
```

**Issue**: Significant duplication of this error handling boilerplate across actions. Could benefit from a shared helper.

### 3.4 Testing Patterns

**Rating: Very Good**

Golden tests demonstrate proper three-phase testing:
```typescript
function executeAction(action: any, context: ActionContext): ISemanticEvent[] {
  const validationResult = action.validate(context);

  if (!validationResult.valid) {
    return action.report(context, validationResult);
  }

  action.execute(context);
  return action.report(context, validationResult);
}
```

Tests cover:
- Metadata verification (ID, required messages, group)
- Precondition checks
- Success scenarios
- Error scenarios
- Event structure validation

---

## 4. IF-Specific Assessment

### 4.1 Standard Library Completeness

**Rating: Excellent**

The 43 actions cover the complete standard IF verb set:

- **Manipulation**: take, drop, put, insert, remove, give, throw
- **Container Ops**: open, close, lock, unlock
- **Movement**: go, enter, exit
- **Observation**: look, examine, search, inventory
- **Sensory**: listen, smell, touch
- **Device Control**: switch on/off
- **Clothing**: wear, remove
- **Consumption**: eat, drink
- **Combat**: attack
- **Physical**: push, pull, climb
- **Meta**: help, about, save, restore, restart, quit, score, wait

This covers approximately 95% of verbs found in classic IF works (Infocom, Inform, TADS).

### 4.2 IF Design Patterns

**Rating: Excellent**

The implementation correctly handles IF-specific concerns:

1. **Implicit Actions**: Taking handles implicit removal of worn items
2. **Container Semantics**: Proper open/closed/locked state machines
3. **Room Darkness**: Going action checks light source requirements
4. **NPC Interactions**: Giving handles acceptance preferences
5. **Object Fragility**: Throwing calculates breakage probabilities
6. **Direction Parsing**: Going handles all 12 standard directions

### 4.3 Extensibility for Story Authors

**Rating: Very Good**

The architecture supports story customization through:

1. **Event Handlers**: Domain events allow story-level interception
2. **Behavior Customization**: Stories can extend behaviors
3. **Message Overrides**: All text goes through messageId lookup
4. **Preferences**: NPCs can have likes/dislikes for giving

**Area for Improvement**: Could benefit from more hook points (before/after rules as mentioned in ADR-057).

---

## 5. Issues and Recommendations

### 5.1 Critical Issues (0)

None identified. The codebase is production-ready.

### 5.2 High Priority (2)

1. **Context Pollution in going.ts:212**
   ```typescript
   // Current (problematic)
   (context as any)._isFirstVisit = isFirstVisit;

   // Recommended
   context.sharedData.isFirstVisit = isFirstVisit;
   ```

2. **Error Handling Duplication**
   - 40+ actions duplicate the same error handling boilerplate
   - Recommendation: Extract to shared `handleValidationError()` and `handleExecutionError()` helpers

### 5.3 Medium Priority (4)

1. **Type Casting for Traits**
   - Many `as any` casts when accessing trait properties
   - Recommendation: Add typed trait accessor methods

2. **Fragility Logic in Throwing**
   - Keyword-based fragility detection should be a behavior
   - Recommendation: Create `FragilityBehavior.isFragile(entity)`

3. **Inconsistent Shared Helpers**
   - `locking/unlocking` use `lock-shared.ts`
   - Other action pairs don't have shared helpers
   - Recommendation: Create shared helpers for related action pairs

4. **Report Phase Complexity**
   - Some `report()` methods are very long (opening, going, looking)
   - Recommendation: Extract event builders for complex reports

### 5.4 Low Priority (3)

1. **Data Builder Inconsistency**
   - Some actions use `buildEventData()`, others build manually
   - Recommendation: Standardize on data builder pattern

2. **Group Naming**
   - Mix of naming styles: `object_manipulation`, `container_manipulation`, `meta`
   - Recommendation: Standardize on snake_case or camelCase

3. **Required Messages Coverage**
   - Some actions declare more messages than they use
   - Recommendation: Audit and clean up unused message declarations

---

## 6. Performance Considerations

### 6.1 Event Size

The atomic event pattern embeds entity snapshots, which increases event size. For most IF scenarios this is negligible, but:

- Recommendation: Consider lazy snapshot capture for memory-constrained environments
- Current implementation is appropriate for desktop/web platforms

### 6.2 Behavior Lookups

Each action calls multiple behavior methods. The current synchronous approach is appropriate because:

- Behaviors are pure functions with no I/O
- Trait access is O(1) map lookup
- No async overhead

---

## 7. Comparison to Other IF Systems

| Aspect | Sharpee | Inform 7 | TADS 3 | Twine |
|--------|---------|----------|--------|-------|
| Action Structure | Three-phase | Rulebooks | Action classes | N/A |
| Validation | Explicit method | Check rules | Verify method | N/A |
| Behavior Separation | Behaviors | Activities | Macros | N/A |
| Event Model | Semantic events | Implicit | Action notifications | N/A |
| Type Safety | Full TypeScript | Limited | Strong | Limited |

**Assessment**: Sharpee's architecture is comparable to TADS 3 in sophistication while providing better developer ergonomics through TypeScript and explicit phase separation. The event-driven approach provides more flexibility than Inform 7's rulebook system.

---

## 8. Conclusion

The stdlib action implementation is a **high-quality, well-architected** codebase that successfully achieves its design goals:

1. **Clean separation of concerns** through the three-phase pattern
2. **Proper delegation** to world-model behaviors
3. **Atomic events** suitable for replay and undo
4. **Comprehensive coverage** of standard IF verbs
5. **Strong TypeScript typing** throughout
6. **Excellent documentation** and consistent patterns

The minor issues identified are opportunities for further polish rather than fundamental problems. The codebase is ready for production use and provides a solid foundation for story authors.

**Recommended Next Steps:**
1. Fix the context pollution in `going.ts`
2. Extract error handling helpers to reduce duplication
3. Consider before/after rule hooks (ADR-057) for story customization
4. Add typed trait accessors to reduce `as any` casts

---

*Assessment completed December 2025*
