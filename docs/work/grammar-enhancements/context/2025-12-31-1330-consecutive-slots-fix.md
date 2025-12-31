# Work Summary: Consecutive Slots Fix for Multi-Object Parsing

**Date**: 2025-12-31 13:30
**Duration**: ~30 minutes
**Feature/Area**: Parser Enhancement - Consecutive Slot Handling
**Branch**: `adr-080-grammar-enhancements`

## Objective

Fix a regression introduced by Phase 2 multi-object parsing where consecutive entity slots (like `give :recipient :item`) failed to parse correctly.

## Problem

After implementing multi-object parsing, the test for "give recipient item" commands started failing:

```
FAIL  packages/parser-en-us/tests/parser-integration.test.ts > Parser Grammar Engine Integration > VERB_NOUN_NOUN Patterns > should parse "give recipient item" commands
AssertionError: expected false to be true // Object.is equality
```

**Root cause**: The `consumeEntityWithListDetection` function was greedily consuming all tokens when there was no literal delimiter between slots.

For the pattern `give :recipient :item`:
1. First slot (`:recipient`) starts consuming at "guard"
2. `nextPatternToken` is `:item` (a slot type, not a literal like "to")
3. The inner while loop only checks for literal/alternates delimiters
4. No delimiter triggers, so both "guard" and "sword" get consumed into `:recipient`
5. Nothing left for `:item` slot → parse fails

## Solution

Added constraint-aware consumption for consecutive slots in `consumeEntityWithListDetection`:

```typescript
// When next pattern token is a slot (consecutive slots like "give :recipient :item"),
// we need to be conservative and find entity boundaries via constraint matching
const nextIsSlot = nextPatternToken?.type === 'slot';

// For consecutive slots, use constraint-aware consumption
if (nextIsSlot && items.length === 0) {
  // Try to find the shortest match that satisfies constraints
  const slotConstraints = rule.slots.get(slotName);

  // Try progressively longer phrases until we find a match
  for (let tryLength = 1; tryLength <= tokens.length - currentIndex; tryLength++) {
    // Build candidate phrase
    // Check against constraints
    // If match found, use it and break
  }

  // If no constraints, take first word only (safe default)
}
```

**Key behaviors**:
1. When next pattern token is a slot (not literal/alternates), use constraint matching
2. Try progressively longer phrases (1 word, 2 words, etc.) until one matches constraints
3. If no constraints defined, take only the first word (safe default for consecutive slots)
4. Preserves multi-word entity support when constraints can identify boundaries

## Files Modified

1. **packages/parser-en-us/src/english-grammar-engine.ts**
   - Added `nextIsSlot` check in `consumeEntityWithListDetection`
   - Added constraint-aware consumption branch for consecutive slots
   - Original greedy consumption preserved for patterns with literal delimiters

## Tests

All 155 parser tests pass (3 skipped):
- `parser-integration.test.ts`: 43 tests (including "give recipient item")
- `adr-080-grammar-enhancements.test.ts`: 20 tests
- All other parser test files pass

## Key Insight

Multi-object parsing must handle two different scenarios:

| Scenario | Example Pattern | Next Token | Consumption Strategy |
|----------|----------------|------------|---------------------|
| Literal delimiter | `put :item in :container` | `in` (literal) | Greedy until delimiter |
| Consecutive slots | `give :recipient :item` | `:item` (slot) | Constraint-aware, conservative |

The fix ensures both scenarios work correctly while maintaining list detection for explicit "and" conjunctions.

## Verification

```bash
npx vitest run packages/parser-en-us/tests

 Test Files  10 passed (10)
      Tests  155 passed | 3 skipped (158)
```

## Related

- **ADR-080**: Grammar Enhancements for Classic IF Patterns
- **Phase 2 Summary**: `2025-12-31-adr-080-phase-2-multi-object-parsing.md`
