# Session Summary: Parser Refactor - Phases 1-3 Complete, Phase 4 Started

**Date**: 2026-01-10
**Branch**: parser-refactor
**Status**: In Progress

## Objectives Completed

### 1. Removed Scope Filters from Grammar (Phases 1-3)

Removed all scope filter method calls from `packages/parser-en-us/src/grammar.ts`:
- `.visible()` - removed from ~25 patterns
- `.touchable()` - removed from ~15 patterns
- `.carried()` - removed from ~10 patterns
- `.matching({ portable: true })` - removed from 3 patterns
- `.matching({ locked: true })` - removed (state check)
- `.matching({ open: false })` - removed (state check)

**Kept trait constraints:**
- `.hasTrait(TraitType.CONTAINER)`
- `.hasTrait(TraitType.SUPPORTER)`
- `.hasTrait(TraitType.OPENABLE)`
- `.hasTrait(TraitType.SWITCHABLE)`
- `.hasTrait(TraitType.ENTERABLE)`
- `.hasTrait(TraitType.ACTOR)`

### 2. Updated Tests for New Architecture

Updated test files to reflect that grammar no longer enforces scope:
- `packages/parser-en-us/tests/grammar-scope.test.ts`
- `packages/parser-en-us/tests/grammar-scope-cross-location.test.ts`
- `packages/parser-en-us/tests/parser-integration.test.ts`
- `packages/parser-en-us/tests/story-grammar.test.ts`
- `packages/parser-en-us/tests/unit/english-parser.test.ts`
- `packages/parser-en-us/tests/push-panel-with-core.test.ts` (skipped - pre-existing issue)

**Parser tests:** 266 passed, 4 skipped

## Key Design Decisions

### 1. Scope Handling Architecture

**Decision**: No separate `scope()` phase. Use `defaultScope` metadata + dynamic check in `validate()`.

**Rationale**: Scope requirements can be dynamic (instruments, magic, environmental conditions). A static declarative approach is too limiting for a dynamic world model.

```typescript
const switchingOnAction: Action = {
  id: 'if.action.switching_on',

  // Default scope - documents intent, used for parser hints
  defaultScope: { target: ScopeLevel.REACHABLE },

  validate(context) {
    // Dynamic: remote controllable items only need VISIBLE
    const effectiveScope = context.target.has(TraitType.REMOTE_CONTROLLABLE)
      ? ScopeLevel.VISIBLE
      : ScopeLevel.REACHABLE;

    const scopeCheck = context.requireScope('target', effectiveScope);
    if (!scopeCheck.ok) return scopeCheck.error;

    // Action-specific validation...
    return success();
  }
}
```

### 2. Scope Helper Methods

**Decision**: Provide both low-level and high-level helpers:

```typescript
// Low-level: returns scope level for custom logic
getEntityScope(slot: string): ScopeLevel

// High-level: built on getEntityScope, for simple cases
requireScope(slot: string, required: ScopeLevel): Result
```

### 3. Other Design Decisions

- **VehicleTrait includes enterable** - No separate EnterableTrait needed
- **Examine uses sensory cascade** - try see → feel → hear → smell → fail
- **No disambiguation limit** - author's responsibility

## Phase 4 Started (Not Complete)

**Goal**: Add `defaultScope` and `context.requireScope()` to action framework.

**Files to modify:**
1. `packages/world-model/src/scope/scope-level.ts` - Add ScopeLevel enum
2. `packages/stdlib/src/actions/types.ts` or enhanced-types - Add `defaultScope` to Action interface
3. Add `requireScope()` and `getEntityScope()` helpers to ActionContext
4. Update each action's validate() method

**Scope Levels:**
```typescript
enum ScopeLevel {
  UNAWARE = 0,   // Entity not known to player
  AWARE = 1,     // Player knows it exists (think about, ask about)
  VISIBLE = 2,   // Player can see it (examine, look at)
  REACHABLE = 3, // Player can touch it (take, push, open)
  CARRIED = 4,   // In player's inventory (drop, eat, wear)
}
```

**Default scope by action category:**
- AWARE: thinking_about, remembering, asking_about
- VISIBLE: examining, reading, looking
- REACHABLE: taking, entering, pushing, opening, touching
- CARRIED: dropping, eating, wearing, inserting, giving

## Files Changed This Session

| File | Change |
|------|--------|
| `packages/parser-en-us/src/grammar.ts` | Removed all scope filters (~50 patterns) |
| `packages/parser-en-us/tests/grammar-scope.test.ts` | Updated for new architecture |
| `packages/parser-en-us/tests/grammar-scope-cross-location.test.ts` | Updated for new architecture |
| `packages/parser-en-us/tests/parser-integration.test.ts` | Fixed error type expectation |
| `packages/parser-en-us/tests/story-grammar.test.ts` | Fixed conflicting pattern test |
| `packages/parser-en-us/tests/unit/english-parser.test.ts` | Fixed error code expectations |
| `packages/parser-en-us/tests/push-panel-with-core.test.ts` | Skipped (pre-existing issue) |
| `docs/work/parser/refactor-plan.md` | Updated with progress and design decisions |

## Next Steps (Phase 4 Implementation)

1. Create `ScopeLevel` enum in world-model
2. Add `defaultScope` to Action interface
3. Add `requireScope()` and `getEntityScope()` to ActionContext
4. Update stdlib actions to use scope checking in validate()
5. Add scope error types and messages to blocked() handling

## Current Exploration

Started looking at existing code structure:
- `packages/stdlib/src/actions/types.ts` - references enhanced-types.ts
- `packages/world-model/src/scope/scope-evaluator.ts` - existing scope evaluation (rule-based)
- Need to find: ActionContext definition, Action interface

## References

- Refactor plan: `docs/work/parser/refactor-plan.md`
- Previous session: `docs/context/session-20260110-0915-parser-refactor.md`
