# Work Summary: GrammarVocabularyProvider Implementation

**Date:** 2026-01-01 18:00
**Branch:** vocabulary-slots
**Status:** In progress - fixing naming conflicts

## What Was Accomplished

### 1. Created GrammarVocabularyProvider Interface (if-domain)

File: `packages/if-domain/src/grammar/vocabulary-provider.ts`

```typescript
interface IGrammarVocabularyProvider {
  define(category: string, config: GrammarVocabularyConfig): void;
  extend(category: string, words: string[]): void;
  match(category: string, word: string, ctx: GrammarContext): boolean;
  getWords(category: string): Set<string>;
  isActive(category: string, ctx: GrammarContext): boolean;
  hasCategory(category: string): boolean;
  getCategories(): string[];
  removeCategory(category: string): boolean;
  clear(): void;
}

interface GrammarVocabularyConfig {
  words: string[];
  when?: (ctx: GrammarContext) => boolean;  // Context predicate
}
```

### 2. Updated SlotType Enum

Added to `packages/if-domain/src/grammar/grammar-builder.ts`:
- `VOCABULARY` - for category-based vocabulary slots
- `MANNER` - for manner adverbs (feeds intention.manner)
- Deprecated `ADJECTIVE` and `NOUN` in favor of `VOCABULARY`

### 3. Updated PatternBuilder Interface

Added methods:
- `.manner(slot)` - built-in manner adverbs
- `.fromVocabulary(slot, category)` - category-based vocabulary matching

### 4. Added vocabularyCategory to SlotConstraint and PatternToken

```typescript
interface SlotConstraint {
  // ... existing fields
  vocabularyCategory?: string;  // For VOCABULARY slots
}

interface PatternToken {
  // ... existing fields
  vocabularyCategory?: string;  // For VOCABULARY slots
}
```

### 5. Updated WorldModel

- Added `grammarVocabularyProvider` private field
- Added `getGrammarVocabularyProvider()` method to IWorldModel interface
- Updated `clear()` to also clear vocabulary

### 6. Created Tests

File: `packages/if-domain/tests/vocabulary-provider.test.ts`
- 25 tests covering all functionality
- All tests pass

## Naming Conflict Issue

There's an existing `VocabularyProvider` interface in `vocabulary-contracts/vocabulary-types.ts` that's for a different purpose (providing vocabulary entries to VocabularyRegistry).

Renamed our new types to avoid conflict:
- `VocabularyProvider` → `GrammarVocabularyProvider`
- `IVocabularyProvider` → `IGrammarVocabularyProvider`
- `VocabularyConfig` → `GrammarVocabularyConfig`
- `VocabularyMatch` → `GrammarVocabularyMatch`

## Files Modified

### if-domain
- `src/grammar/vocabulary-provider.ts` - NEW (interface + implementation)
- `src/grammar/index.ts` - Added export
- `src/grammar/grammar-builder.ts` - Added SlotType.VOCABULARY, MANNER, TypedSlotValue updates, PatternBuilder methods
- `src/grammar/grammar-engine.ts` - Added manner() and fromVocabulary() builder implementations
- `tests/vocabulary-provider.test.ts` - NEW (25 tests)

### world-model
- `src/world/WorldModel.ts` - Added grammarVocabularyProvider field and getter
- `src/world/index.ts` - Added re-exports (needs update for new names)

## Remaining Work

1. **Update world-model exports** - Change to use new names:
   ```typescript
   export {
     IGrammarVocabularyProvider,
     GrammarVocabularyProvider,
     GrammarVocabularyConfig,
     GrammarVocabularyMatch
   } from '@sharpee/if-domain';
   ```

2. **Update WorldModel getter method** - Implementation needs to use new method name and return type

3. **Update test file** - Use new interface/class names

4. **Build and verify** - Run `pnpm build` to ensure compilation

5. **Commit and push**

## Key Design Decisions

1. **Named categories over global pools** - Stories define vocabulary in named categories
2. **Context predicates** - Vocabulary can be scoped to locations/states
3. **Separate from VocabularyRegistry** - This is for grammar pattern matching, not entity vocabulary
4. **Parser evaluates context** - Action doesn't need to check location if pattern matched

## Usage Example (After Implementation)

```typescript
// Story initialization
const vocab = world.getGrammarVocabularyProvider();

vocab.define('panel-colors', {
  words: ['red', 'yellow', 'mahogany', 'pine'],
  when: (ctx) => ctx.currentLocation === insideMirrorId
});

// Grammar pattern
grammar
  .define('push :color panel')
  .fromVocabulary('color', 'panel-colors')
  .mapsTo('dungeo.action.push_panel')
  .build();
```
