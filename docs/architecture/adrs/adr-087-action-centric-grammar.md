# ADR-087: Action-Centric Grammar with Verb Aliases

## Status
PROPOSED

## Context

The current grammar system is **pattern-centric**: each grammar rule defines a single pattern that maps to an action. This leads to repetitive, error-prone definitions when an action has multiple verb synonyms:

```typescript
// Current: 4 separate definitions for one action
grammar.define('push :target').mapsTo('if.action.pushing').build();
grammar.define('shove :target').mapsTo('if.action.pushing').build();
grammar.define('move :target').mapsTo('if.action.pushing').build();
// Oops - forgot 'press :target'! (actual bug discovered in testing)
```

This design has several problems:

1. **Duplication** - Same constraints repeated across synonymous patterns
2. **Error-prone** - Easy to forget synonyms (we discovered `press` was missing)
3. **Scattered** - Verb synonyms defined in multiple places (lang-en-us declares them, grammar.ts must duplicate)
4. **Mental model mismatch** - We think "pushing can be done with push/press/shove" but code says "push maps to pushing, press maps to pushing..."

Similarly, direction commands have redundant definitions:
```typescript
grammar.define('north').mapsTo('if.action.going').build();
grammar.define('n').mapsTo('if.action.going').build();
// Repeated 12+ times for all directions and abbreviations
```

## Decision

Refactor the grammar builder to be **action-centric** with verb alias support. Actions become the primary concept; verb patterns are derived from alias lists.

### Core API Design

```typescript
// NEW: Action-centric with verb aliases
grammar
  .forAction('if.action.pushing')
  .verbs(['push', 'press', 'shove', 'move'])
  .pattern(':target')
  .where('target', scope => scope.touchable())
  .withPriority(100)
  .build();

// Generates 4 patterns automatically:
// - push :target
// - press :target
// - shove :target
// - move :target
```

### Direction-Specific API

```typescript
grammar
  .forAction('if.action.going')
  .directions({
    [Direction.NORTH]: ['north', 'n'],
    [Direction.SOUTH]: ['south', 's'],
    [Direction.EAST]: ['east', 'e'],
    [Direction.WEST]: ['west', 'w'],
    [Direction.NORTHEAST]: ['northeast', 'ne'],
    [Direction.NORTHWEST]: ['northwest', 'nw'],
    [Direction.SOUTHEAST]: ['southeast', 'se'],
    [Direction.SOUTHWEST]: ['southwest', 'sw'],
    [Direction.UP]: ['up', 'u'],
    [Direction.DOWN]: ['down', 'd'],
    [Direction.IN]: ['in', 'enter'],
    [Direction.OUT]: ['out', 'exit'],
  })
  .build();

// Generates 24 patterns with direction semantics attached
```

### Complex Patterns with Verb Substitution

```typescript
grammar
  .forAction('if.action.inserting')
  .verbs(['put', 'place', 'insert', 'drop'])
  .patterns([
    ':target in|into|inside :container',
    ':target in :container',
  ])
  .where('target', scope => scope.carried())
  .where('container', scope => scope.touchable().matching({ container: true }))
  .build();

// Generates: put :target in :container, place :target in :container, etc.
```

## Options for Verb Source

### Option A: Self-Contained Grammar (Recommended)

Verbs defined directly in grammar.ts:

```typescript
grammar
  .forAction('if.action.pushing')
  .verbs(['push', 'press', 'shove', 'move'])
  .pattern(':target')
  .where('target', scope => scope.touchable())
  .build();
```

**Pros:**
- Grammar is self-contained, no external dependencies
- Easy to understand - all parsing rules in one place
- Parser package doesn't depend on lang-en-us
- Different languages could have completely different grammar structures
- Explicit - what you see is what gets parsed

**Cons:**
- Verb lists duplicated between grammar.ts and lang-en-us action defs
- Could drift out of sync (grammar says 'press' but lang-en-us doesn't document it)

### Option B: Import from Language Provider

Grammar consumes verb lists from lang-en-us:

```typescript
import { pushingLanguage } from '@sharpee/lang-en-us';

grammar
  .forAction('if.action.pushing')
  .verbs(pushingLanguage.verbs)  // ['push', 'press', 'shove']
  .pattern(':target')
  .where('target', scope => scope.touchable())
  .build();
```

**Pros:**
- Single source of truth for verb synonyms
- Lang-en-us already declares these (`verbs: ['push', 'press', 'shove']`)
- Documentation and parsing guaranteed to match

**Cons:**
- Creates dependency: parser-en-us → lang-en-us (currently parser is independent)
- Lang-en-us patterns use different syntax (`'push [something]'` vs `:target`)
- Tight coupling makes it harder to support other languages
- Lang-en-us verb lists are for help text, not necessarily complete for parsing

### Option C: Shared Vocabulary Package

Create a new `@sharpee/vocabulary-en-us` package:

```typescript
// @sharpee/vocabulary-en-us
export const pushingVerbs = ['push', 'press', 'shove', 'move'];
export const directionAliases = {
  [Direction.NORTH]: ['north', 'n'],
  // ...
};

// Used by both parser-en-us and lang-en-us
```

**Pros:**
- True single source of truth
- Clean separation of concerns
- Both packages import from vocabulary

**Cons:**
- Another package to maintain
- Adds complexity to dependency graph
- Vocabulary is inherently tied to language anyway

## Recommendation

**Option A (Self-Contained Grammar)** with a lint rule or test to verify grammar verbs match lang-en-us declarations.

Rationale:
1. Parser should be independent - it's the "machine" that doesn't need language baggage
2. Different languages may have fundamentally different grammar structures
3. The current bug (missing `press`) is a one-time fix; once added, it's stable
4. A simple test can verify sync: "all verbs in grammar.ts should appear in corresponding lang-en-us action"

## Implementation

### Phase 1: Add Verb Alias Support

```typescript
// New GrammarBuilder methods
class GrammarBuilder {
  forAction(actionId: string): ActionGrammarBuilder;
}

class ActionGrammarBuilder {
  verbs(verbs: string[]): this;
  pattern(pattern: string): this;
  patterns(patterns: string[]): this;
  directions(map: Record<Direction, string[]>): this;
  where(slot: string, constraint: ScopeConstraintBuilder): this;
  withPriority(priority: number): this;
  withSemantics(fn: SemanticsFn): this;
  build(): void;
}
```

### Phase 2: Migrate Existing Definitions

Convert current pattern-by-pattern definitions to action-centric:

```typescript
// Before (grammar.ts lines 408-428)
grammar.define('push :target').where(...).mapsTo('if.action.pushing').build();
grammar.define('shove :target').where(...).mapsTo('if.action.pushing').build();
grammar.define('move :target').where(...).mapsTo('if.action.pushing').build();

// After
grammar
  .forAction('if.action.pushing')
  .verbs(['push', 'press', 'shove', 'move'])
  .pattern(':target')
  .where('target', scope => scope.touchable())
  .build();
```

### Phase 3: Add Sync Verification Test

```typescript
// Test: grammar verbs should match lang-en-us declarations
it('grammar verbs match language provider', () => {
  const grammarVerbs = getGrammarVerbsForAction('if.action.pushing');
  const langVerbs = pushingLanguage.verbs;

  expect(grammarVerbs).toEqual(expect.arrayContaining(langVerbs));
});
```

## Backward Compatibility

The existing `.define()` API remains for:
- Story-specific custom patterns
- Complex one-off patterns that don't fit the verb-alias model
- Gradual migration (both APIs coexist)

## Consequences

### Positive
- Reduced duplication in grammar definitions
- Harder to forget verb synonyms
- Clearer mental model (action-centric)
- Direction definitions shrink from 24 lines to 1

### Negative
- New API to learn
- Migration effort for existing definitions
- Slightly more complex GrammarBuilder implementation

### Neutral
- Grammar file size stays similar (fewer definitions but each is larger)
- No runtime performance impact (patterns still compiled same way)

## References

- Current grammar.ts: `packages/parser-en-us/src/grammar.ts`
- Lang-en-us action defs: `packages/lang-en-us/src/actions/*.ts`
- Bug that prompted this: `press :target` missing from grammar (ADR-087 context)
