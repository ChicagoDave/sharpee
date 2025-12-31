# Work Summary: Parser Alias Matching Fix

**Date**: 2025-12-29
**Duration**: ~45 minutes
**Feature/Area**: Parser ScopeEvaluator - IdentityTrait alias matching

## Objective

Fix a fundamental Sharpee parser issue where grammar slot constraints (like `.where('target', scope => scope.touchable())`) couldn't match entities by their `IdentityTrait` aliases.

This was blocking the Bank of Zork "walk through south wall" command from working, even though:
1. The "south wall" entity existed in the room with proper aliases
2. The literal pattern `walk through south wall` was defined with higher priority
3. The action itself handled raw input correctly

## Root Cause Analysis

The issue was in `packages/parser-en-us/src/scope-evaluator.ts` in the `findEntitiesByName()` method:

```typescript
// OLD CODE - only checked attributes
const exactMatches = entitiesInScope.filter(e => {
  if (!e || !e.attributes) return false;
  const entityName = (e.attributes.displayName || e.attributes.name || '') as string;
  return entityName.toLowerCase() === name.toLowerCase();
});
```

This only looked at:
- `entity.attributes.displayName`
- `entity.attributes.name`

But Sharpee entities use `IdentityTrait` with `.get('identity')` to access:
- `identity.name` - Primary name
- `identity.aliases` - Alternative names (like "south wall", "s wall")

The stdlib's `CommandValidator` correctly handled aliases (line 946-951), but the parser's grammar matching did not.

## What Was Accomplished

### Files Modified

#### packages/parser-en-us/src/scope-evaluator.ts
Added a `getEntityNames()` helper method that checks both patterns:

```typescript
private static getEntityNames(entity: IEntity): string[] {
  const names: string[] = [];

  // Check attributes (legacy pattern)
  if (entity.attributes) {
    if (entity.attributes.displayName) {
      names.push(String(entity.attributes.displayName));
    }
    if (entity.attributes.name) {
      names.push(String(entity.attributes.name));
    }
  }

  // Check IdentityTrait (via .get() method)
  if (typeof (entity as any).get === 'function') {
    const identity = (entity as any).get('identity');
    if (identity && typeof identity === 'object') {
      if (identity.name) {
        names.push(String(identity.name));
      }
      // Also check aliases
      if (Array.isArray(identity.aliases)) {
        names.push(...identity.aliases.map(String));
      }
    }
  }

  return names;
}
```

Updated `findEntitiesByName()` to use this helper for both exact and partial matching.

### Files Created

#### packages/parser-en-us/tests/walk-through-pattern.test.ts
Comprehensive unit tests for the fix:

1. **Literal pattern matching** - Verifies `walk through south wall` matches literal pattern
2. **Slot pattern with curtain** - Verifies `walk through curtain` uses slot pattern correctly
3. **Multi-word slot capture** - Verifies `take rusty key` captures full phrase
4. **Constraint failure without entity** - Verifies constraint fails when no entity in scope
5. **Match by attributes.name** - Verifies legacy pattern still works
6. **Match by IdentityTrait alias** - Verifies new alias matching works
7. **Pattern priority ordering** - Verifies higher priority patterns win

## Key Decisions

### 1. Support Both Patterns
**Decision**: Check both `entity.attributes` (legacy) and `entity.get('identity')` (IdentityTrait)
**Rationale**: Maintains backward compatibility with any code using the old pattern while supporting the proper trait system.

### 2. Check All Aliases
**Decision**: Include all aliases in matching, not just primary name
**Rationale**: This is the whole point - "south wall" should match an entity with aliases ["south wall", "s wall"].

### 3. Unit Test Before Integration
**Decision**: Created focused unit tests before running full transcript tests
**Rationale**: Faster feedback loop, easier to debug, proves the fix works in isolation.

## Test Results

### Unit Tests
All 7 new tests pass:
- `should match literal "walk through south wall" pattern` - PASS
- `should match "walk through curtain" with slot pattern` - PASS
- `should handle multi-word slot matches like "rusty key"` - PASS
- `should fail when entity not found in scope` - PASS
- `should match entity by attributes.name` - PASS
- `should match entity by IdentityTrait alias` - PASS (KEY TEST)
- `should try higher priority patterns first` - PASS

### Transcript Tests
All 256 Dungeo transcript tests pass:
- 255 passed
- 1 expected failure (intentional troll blocking test)
- Bank puzzle "walk through south wall" now works correctly

## Architecture Notes

### Parser vs CommandValidator Entity Resolution

The parser has its own `ScopeEvaluator` in `packages/parser-en-us/src/scope-evaluator.ts` that's used during grammar matching. This is separate from:
- `packages/world-model/src/scope/scope-evaluator.ts` - World model scope rules
- `packages/stdlib/src/validation/command-validator.ts` - Command validation entity resolution

Each has slightly different responsibilities:
1. **Parser ScopeEvaluator**: Used during pattern matching to validate slot constraints
2. **World Model ScopeEvaluator**: Used for scope rules (e.g., visibility through windows)
3. **CommandValidator**: Final entity resolution and validation before action execution

The fix was needed in the parser's scope evaluator because that's where the grammar matching fails when it can't find an entity for a constrained slot.

## Impact

This fix unblocks:
1. Bank of Zork puzzle - "walk through south wall" now works
2. Any future grammar patterns with slot constraints that need alias matching
3. Multi-word entity references in constrained slots

## References

- **Previous Work Summary**: `docs/work/dungeo/context/2025-12-29-bank-puzzle-implementation.md`
- **Test File**: `packages/parser-en-us/tests/walk-through-pattern.test.ts`
- **Fixed File**: `packages/parser-en-us/src/scope-evaluator.ts`
- **Related stdlib code**: `packages/stdlib/src/validation/command-validator.ts` (lines 940-959)
