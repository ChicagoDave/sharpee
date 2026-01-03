# Grammar Normalization Plan

**Date**: 2026-01-03 19:00
**Branch**: vehicle-trait (will create new branch)
**Status**: Planning

## Current State Analysis

### if-domain package (language-agnostic abstractions)

| File | Purpose | Status |
|------|---------|--------|
| `grammar-builder.ts` | Core interfaces: GrammarBuilder, PatternBuilder, GrammarRule, SlotType, etc. | **KEEP** - this IS the "grammar-core" |
| `grammar-engine.ts` | Base GrammarEngine class + GrammarMatchOptions | **KEEP** |
| `scope-builder.ts` | ScopeBuilderImpl class | **KEEP** |
| `pattern-compiler.ts` | PatternCompiler interface | **KEEP** |
| `vocabulary-provider.ts` | GrammarVocabularyProvider class | **KEEP** |
| `semantic-grammar.ts` | SemanticGrammarBuilder class | **DELETE** - redundant with PatternBuilder |
| `semantic-rules/inserting.ts` | Example rules | **DELETE** - dead code |
| `index.ts` | Exports | **UPDATE** - remove deleted exports |

**Key Insight**: `grammar-builder.ts` already IS the "grammar-core" - it contains all the interfaces. No rename needed.

### parser-en-us package (English implementation)

| File | Purpose | Status |
|------|---------|--------|
| `english-parser.ts` | Main parser, calls `defineCoreGrammar()` | **UPDATE** |
| `english-grammar-engine.ts` | EnglishGrammarEngine extends GrammarEngine | **KEEP** |
| `english-pattern-compiler.ts` | English pattern compilation | **KEEP** |
| `scope-evaluator.ts` | English scope evaluation | **KEEP** |
| `core-grammar.ts` | **ACTUAL PRODUCTION RULES** | **RENAME** to `grammar.ts`, **MERGE** missing patterns |
| `semantic-core-grammar.ts` | Unused rules with semantic features | **DELETE** after merge |
| `semantic-grammar-rules.ts` | Unused duplicate rules | **DELETE** |

## Problems Being Solved

1. **Dead code**: `semantic-core-grammar.ts` and `semantic-grammar-rules.ts` are never called
2. **Missing patterns**: `enter :portal` with `.matching({ enterable: true })` only exists in dead code
3. **Confusing naming**: "semantic" prefix is now misleading since semantics are built-in
4. **Redundant builder**: `SemanticGrammarBuilder` duplicates `PatternBuilder` functionality
5. **Organizational clarity**: Files don't follow clear naming convention

## Detailed Plan

### Phase 1: Clean up if-domain (language-agnostic layer)

**1.1 Delete semantic-grammar.ts**
- `SemanticGrammarBuilder` is redundant - `PatternBuilder` in `grammar-builder.ts` already has:
  - `.withSemanticVerbs()`
  - `.withSemanticPrepositions()`
  - `.withSemanticDirections()`
  - `.withDefaultSemantics()`
- `applySemantics()` function may need to move or be verified as unused

**1.2 Delete semantic-rules/ directory**
- `semantic-rules/inserting.ts` is dead code (never imported)

**1.3 Update index.ts**
```typescript
// Remove:
export * from './semantic-grammar';
```

### Phase 2: Normalize parser-en-us grammar files

**2.1 Audit patterns in all three files**

Patterns ONLY in `semantic-core-grammar.ts` (need to merge):
- `enter :portal` with `.matching({ enterable: true })` ← **CRITICAL FOR VEHICLE**
- `exit` with default semantics
- Various semantic verb mappings

Patterns ONLY in `semantic-grammar-rules.ts` (need to evaluate):
- `put :item under|beneath|below :object` → spatial relation 'under'
- `gently place :item` → manner 'careful'
- `throw down :item` → manner 'forceful'

**2.2 Merge useful patterns into core-grammar.ts**

Add to `core-grammar.ts`:
```typescript
// ENTERING AND EXITING
grammar
  .define('enter :portal')
  .where('portal', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
  .mapsTo('if.action.entering')
  .withPriority(100)
  .build();

grammar
  .define('get in :portal')
  .where('portal', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
  .mapsTo('if.action.entering')
  .withPriority(100)
  .build();

grammar
  .define('get into :portal')
  .where('portal', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
  .mapsTo('if.action.entering')
  .withPriority(100)
  .build();

grammar
  .define('climb in :portal')
  .where('portal', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
  .mapsTo('if.action.entering')
  .withPriority(100)
  .build();

grammar
  .define('exit')
  .mapsTo('if.action.exiting')
  .withPriority(100)
  .build();

grammar
  .define('get out')
  .mapsTo('if.action.exiting')
  .withPriority(100)
  .build();

grammar
  .define('leave')
  .mapsTo('if.action.exiting')
  .withPriority(95)
  .build();
```

**2.3 Rename core-grammar.ts → grammar.ts**

Update import in `english-parser.ts`:
```typescript
// Change from:
import { defineCoreGrammar } from './core-grammar';
// To:
import { defineGrammar } from './grammar';
```

**2.4 Delete obsolete files**
- Delete `semantic-core-grammar.ts`
- Delete `semantic-grammar-rules.ts`

### Phase 3: Fix ScopeEvaluator for trait property access

The `.matching({ enterable: true })` constraint needs `ScopeEvaluator` to check trait properties. Current `getPropertyValue()` checks:
1. Direct entity property
2. Trait properties via `traitPropertyMap`

Verify the trait property map includes:
```typescript
const traitPropertyMap = {
  'enterable': ['container', 'supporter', 'room'],
  'portable': ['physical'],
  'openable': ['container', 'door'],
  'container': ['container'],
  'supporter': ['supporter'],
  // ... etc
};
```

### Phase 4: Test and verify

**4.1 Run existing tests**
```bash
pnpm --filter '@sharpee/parser-en-us' test
pnpm --filter '@sharpee/if-domain' test
```

**4.2 Test enter command specifically**
```bash
# Create test transcript for bucket-well
./scripts/fast-transcript-test.sh stories/dungeo stories/dungeo/tests/transcripts/bucket-well.transcript
```

**4.3 Verify no regressions**
```bash
./scripts/fast-transcript-test.sh stories/dungeo --all
```

## File Structure After Normalization

### if-domain/src/grammar/
```
grammar-builder.ts     # Interfaces (GrammarBuilder, PatternBuilder, etc.)
grammar-engine.ts      # Base GrammarEngine class
scope-builder.ts       # ScopeBuilderImpl
pattern-compiler.ts    # PatternCompiler interface
vocabulary-provider.ts # GrammarVocabularyProvider
index.ts               # Exports (updated)
```

### parser-en-us/src/
```
english-parser.ts           # Main parser
english-grammar-engine.ts   # English grammar engine
english-pattern-compiler.ts # English pattern compiler
scope-evaluator.ts          # English scope evaluation
grammar.ts                  # All English grammar rules (renamed from core-grammar.ts)
direction-mappings.ts       # Direction constants
index.ts                    # Package exports
```

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Breaking existing patterns | Run full test suite before/after |
| Missing pattern from semantic files | Audit all patterns before deletion |
| ScopeEvaluator not finding traits | Add debug logging, verify trait map |
| Import path changes breaking builds | Update all imports systematically |

## Estimated Changes

- **if-domain**: ~3 files modified, 2 deleted
- **parser-en-us**: ~3 files modified, 2 deleted, 1 renamed
- **Tests**: May need minor updates for import changes

## Design Decisions (Confirmed)

1. **Priority ordering**: Semantic rules (with `.matching()` constraints) come FIRST with higher priority, simple fallback rules come AFTER with lower priority. This ensures specific patterns match before generic ones.

2. **Vehicle-specific grammar**: VehicleTrait/VehicleBehavior registers vehicle patterns at story time:
   - `board :vehicle`
   - `exit :vehicle` / `disembark :vehicle`
   - `alight` / `get off :vehicle`

3. **Core grammar**: Only has standard patterns:
   - `exit` (bare) → generic "leave current location/container"
   - `enter :portal` → enter enterable things (with constraint)

This keeps core grammar clean while allowing VehicleTrait to extend it dynamically.
