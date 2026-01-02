# Work Summary: ADR-084 Remove StoryGrammarImpl Wrapper

**Date**: 2026-01-02
**Time**: ~09:30 AM CST
**Duration**: ~45 minutes
**Branch**: story-grammar
**Feature/Area**: Parser Architecture / Story Grammar Simplification

## Objective

Remove the `StoryGrammarImpl` wrapper entirely and give stories direct access to `GrammarBuilder`, enabling use of `.direction()`, `.vocabulary()`, `.manner()` and other PatternBuilder methods.

## What Was Accomplished

### Removed StoryGrammarImpl Wrapper (789 lines deleted)

**Files Removed:**
- `packages/parser-en-us/src/story-grammar-impl.ts` (326 lines)
- `packages/if-domain/src/grammar/story-grammar.ts` (140 lines)
- `packages/parser-en-us/examples/story-grammar-example.ts` (74 lines)

**Interfaces Removed:**
- `StoryGrammar`
- `StoryPatternBuilder`
- `StoryExtensionBuilder`
- `GrammarRegistrationOptions`
- `GrammarDebugEvent`
- `GrammarStats`

**Unused Methods Removed:**
- `override()`, `extend()`, `getRules()`, `clear()`
- `setDebugMode()`, `setDebugCallback()`, `getStats()`
- `experimental()`, `describe()`, `withErrorMessage()`

None of these features were used by any actual stories - only in tests/examples.

### Updated EnglishParser

`getStoryGrammar()` now returns `GrammarBuilder` directly:

```typescript
// Before (StoryGrammarImpl wrapper)
getStoryGrammar(): StoryGrammar {
  return this.storyGrammar;  // Limited wrapper
}

// After (direct access)
getStoryGrammar(): GrammarBuilder {
  return this.grammarEngine.createBuilder();  // Full access
}
```

### Fixed Direction Slot Handling

Added `SlotType.DIRECTION` handling in `convertGrammarMatch()`:

```typescript
// ADR-084: Handle direction slots - put in extras.direction
if (slotType === SlotType.DIRECTION) {
  const directionText = slotData.text.toLowerCase();
  const directionConstant = parseDirection(directionText);
  extras.direction = directionConstant || directionText;
  continue;
}
```

This allows actions to receive direction via `context.command.parsed?.extras?.direction`.

### Simplified Royal Puzzle Grammar

**Before (12+ explicit patterns):**
```typescript
grammar.define('push north wall').mapsTo(ACTION_ID).withPriority(175).build();
grammar.define('push south wall').mapsTo(ACTION_ID).withPriority(175).build();
grammar.define('push east wall').mapsTo(ACTION_ID).withPriority(175).build();
grammar.define('push west wall').mapsTo(ACTION_ID).withPriority(175).build();
grammar.define('push the north wall').mapsTo(ACTION_ID).withPriority(175).build();
// ... 7 more patterns
```

**After (2 parameterized patterns):**
```typescript
grammar
  .define('push :direction wall')
  .direction('direction')
  .mapsTo(PUSH_WALL_ACTION_ID)
  .withPriority(160)
  .build();

grammar
  .define('push the :direction wall')
  .direction('direction')
  .mapsTo(PUSH_WALL_ACTION_ID)
  .withPriority(160)
  .build();
```

### Commits

1. `d0144e1` - Initial transparent proxy approach (superseded)
2. `d902003` - Remove StoryGrammarImpl entirely (+82 -789 lines)
3. `7b44483` - Direction slot handling + Royal Puzzle fix (+48 -140 lines)

## Test Results

- **Before**: 461 passed, 7 failed, 5 expected failures
- **After**: 468 passed, 5 expected failures
- **Fixed**: 7 Royal Puzzle failures (push wall commands)

## Architecture Impact

### Benefits
- Stories have full access to all PatternBuilder methods
- No maintenance burden when new slot types are added
- Simpler architecture (one less abstraction layer)
- ~930 lines of code removed

### API Change
```typescript
// Story code unchanged - just gets more capabilities
extendParser(parser: Parser): void {
  const grammar = parser.getStoryGrammar();
  grammar
    .define('push :direction wall')
    .direction('direction')  // Now works!
    .mapsTo(ACTION_ID)
    .build();
}
```

## Files Modified

| File | Change |
|------|--------|
| `packages/parser-en-us/src/english-parser.ts` | Remove wrapper, add direction slot handling |
| `packages/if-domain/src/grammar/index.ts` | Remove story-grammar export |
| `packages/parser-en-us/tests/story-grammar.test.ts` | Rewrite for GrammarBuilder API |
| `packages/parser-en-us/tests/push-panel-*.test.ts` | Update types |
| `stories/dungeo/src/index.ts` | Simplify Royal Puzzle grammar |
| `stories/dungeo/src/actions/push-wall/push-wall-action.ts` | Already used extras.direction |
| `docs/architecture/adrs/adr-084-*.md` | Update decision to Option A |

## Next Steps

- [ ] Merge story-grammar branch to main
- [ ] Merge main to dungeo branch
- [ ] Consider similar simplification for other wrapper layers

## Related

- **ADR-084**: `docs/architecture/adrs/adr-084-remove-story-grammar-wrapper.md`
- **Previous session**: `2026-01-02-0130-story-grammar-wrapper-investigation.md`
- **ADR-082**: Vocabulary Constrained Slots (`.direction()`, `.vocabulary()`, `.manner()`)
