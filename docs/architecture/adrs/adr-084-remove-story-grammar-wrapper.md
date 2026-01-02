# ADR-084: Remove StoryGrammarImpl Wrapper

## Status

Accepted (2026-01-02)

## Context

Stories extend the parser grammar via `extendParser(parser)` which provides a `StoryGrammar` interface. This interface is implemented by `StoryGrammarImpl` in `parser-en-us`, which wraps the base `PatternBuilder`.

The problem: `StoryGrammarImpl` manually proxies methods from `PatternBuilder`, but **doesn't expose all of them**:

| Method | Base PatternBuilder | StoryGrammarImpl |
|--------|---------------------|------------------|
| `.where()` | ✅ | ✅ |
| `.text()` | ✅ | ✅ |
| `.instrument()` | ✅ | ✅ |
| `.direction()` | ✅ | ❌ Missing |
| `.vocabulary()` | ✅ | ❌ Missing |
| `.manner()` | ✅ | ❌ Missing |
| `.mapsTo()` | ✅ | ✅ |
| `.withPriority()` | ✅ | ✅ |

This creates a two-tier system where:
- **Core grammar** (stdlib) has full access to pattern builder features
- **Story grammar** has restricted access, requiring manual updates for each new feature

The immediate symptom: Stories can't use `.direction('slot')` for patterns like `push :direction wall`, forcing them to define 12+ explicit patterns instead of one parameterized pattern.

## What StoryGrammarImpl Currently Does

1. **Tracks rule provenance** - Maintains `storyRules` Map to know which rules came from stories vs core
2. **Debug events** - Emits `pattern_registered` events when stories add patterns
3. **Stats collection** - Counts rules by source for diagnostics
4. **Override convenience** - Provides `override()` method to replace core patterns with higher priority

## Consequences of Removing It

### Benefits

1. **Feature parity** - Stories get same capabilities as core grammar automatically
2. **No maintenance burden** - New PatternBuilder methods (like `.direction()`, `.vocabulary()`) work immediately in stories without code changes
3. **Simpler architecture** - One less abstraction layer to understand
4. **Localization-ready** - Stories can use direction/vocabulary slots that work across language implementations

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Lose rule provenance tracking | Add optional `source` tag to PatternBuilder that rules carry |
| Lose debug events | Add event emission to base PatternBuilder or via hooks |
| Lose stats | Stats can query rules by source tag |
| `override()` method lost | Move to PatternBuilder or keep as utility function |

### Breaking Changes

- `StoryGrammar` interface would change (or be removed)
- Stories using `grammar.define()` would get `PatternBuilder` directly
- No functional breaks - just different return type

## Implementation Options

### Option A: Remove wrapper entirely

```typescript
// Before
extendParser(parser: Parser): void {
  const grammar = parser.getStoryGrammar(); // Returns StoryGrammar
  grammar.define('push :direction wall')
    .direction('direction')  // ERROR: method doesn't exist
    .mapsTo(ACTION_ID)
    .build();
}

// After
extendParser(parser: Parser): void {
  const grammar = parser.getGrammarBuilder(); // Returns PatternBuilder directly
  grammar.define('push :direction wall')
    .direction('direction')  // Works!
    .mapsTo(ACTION_ID)
    .build();
}
```

### Option B: Make wrapper a transparent proxy

Use JavaScript Proxy to forward all methods automatically:

```typescript
class StoryGrammarImpl implements StoryGrammar {
  define(pattern: string): PatternBuilder {
    const baseBuilder = this.engine.getBuilder().define(pattern);

    // Track for stats
    const rule = baseBuilder.build;
    baseBuilder.build = () => {
      const r = rule.call(baseBuilder);
      this.storyRules.set(r.id, r);
      this.emitDebugEvent({ type: 'pattern_registered', ... });
      return r;
    };

    return baseBuilder; // Return actual PatternBuilder, not a limited wrapper
  }
}
```

### Option C: Quick fix - just add missing methods

Add `.direction()`, `.vocabulary()`, `.manner()` to `StoryGrammarImpl`. This is the smallest change but perpetuates the maintenance burden.

## Recommendation

**Option B** (transparent proxy) gives us:
- Full feature parity immediately
- Preserved tracking/debug capabilities
- Minimal breaking changes
- No ongoing maintenance burden

## Decision

**Option A implemented**: Removed `StoryGrammarImpl` entirely.

`EnglishParser.getStoryGrammar()` now returns `GrammarBuilder` directly. Stories get:
- Full access to all `PatternBuilder` methods (`.direction()`, `.vocabulary()`, `.manner()`, etc.)
- Zero wrapper overhead
- No tracking/debug features (these weren't used by any stories)

Also removed:
- `StoryGrammarImpl` class (`packages/parser-en-us/src/story-grammar-impl.ts`)
- `StoryGrammar`, `StoryPatternBuilder`, `StoryExtensionBuilder` interfaces (`packages/if-domain/src/grammar/story-grammar.ts`)
- Unused methods: `override()`, `extend()`, `getRules()`, `clear()`, `setDebugMode()`, `experimental()`, `describe()`, `withErrorMessage()`

## Related

- ADR-080: Raw Text Grammar Slots (added `.text()`)
- ADR-082: Vocabulary Constrained Slots (added `.vocabulary()`, `.manner()`)
- `packages/parser-en-us/src/story-grammar-impl.ts`
- `packages/if-domain/src/grammar/grammar-builder.ts`
