# Work Summary: Grammar Normalization

**Date**: 2026-01-03 19:30
**Branch**: vehicle-trait
**Status**: Complete - ready for PR

## Problem

The parser had 3 grammar rule files but only 1 was used:
- `core-grammar.ts` - USED (production)
- `semantic-core-grammar.ts` - UNUSED
- `semantic-grammar-rules.ts` - UNUSED

The `enter :portal` pattern with `.matching({ enterable: true })` only existed in dead code, causing "enter bucket" to fail with INVALID_SYNTAX.

## Solution

Normalized the grammar implementation:

### if-domain cleanup
- Deleted `semantic-grammar.ts` (redundant SemanticGrammarBuilder - PatternBuilder already has these methods)
- Deleted `semantic-rules/` directory (dead code)
- Updated `index.ts` exports

### parser-en-us cleanup
- Renamed `core-grammar.ts` → `grammar.ts`
- Renamed `defineCoreGrammar()` → `defineGrammar()`
- Merged useful patterns from semantic files into `grammar.ts`
- Deleted `semantic-core-grammar.ts`, `semantic-grammar-rules.ts`
- Deleted `semantic-parser-engine.ts`, `semantic-parsing.test.ts`
- Updated `english-parser.ts` import

### New patterns added to grammar.ts

**Entering (with `.matching({ enterable: true })` constraint):**
- `enter :portal`
- `get in :portal`, `get into :portal`
- `climb in :portal`, `climb into :portal`
- `go in :portal`, `go into :portal`
- `board :vehicle`, `get on :vehicle`

**Exiting:**
- `exit` (bare - exits current container/location)
- `exit :container` (exits specific thing)
- `get out`, `climb out`, `leave`
- `disembark`, `disembark :vehicle`
- `get off :vehicle`, `alight`

### Priority ordering
- Semantic rules (with constraints) get priority 100+
- Simple fallbacks get priority 90-95
- This ensures constrained patterns match before generic ones

## Test Results

```
Total: 656 tests in 37 transcripts
647 passed, 4 failed, 5 expected failures
```

- **"enter bucket" now works!**
- The 4 failures are bucket-well puzzle logic issues (pour/fill mechanics), not grammar

## Files Changed

```
Deleted:
  packages/if-domain/src/grammar/semantic-grammar.ts
  packages/if-domain/src/grammar/semantic-rules/inserting.ts
  packages/parser-en-us/src/semantic-core-grammar.ts
  packages/parser-en-us/src/semantic-grammar-rules.ts
  packages/parser-en-us/src/semantic-parser-engine.ts
  packages/parser-en-us/tests/semantic-parsing.test.ts

Modified:
  packages/if-domain/src/grammar/index.ts
  packages/parser-en-us/src/english-parser.ts

Renamed:
  packages/parser-en-us/src/core-grammar.ts → grammar.ts
```

## Architecture After Normalization

**if-domain/src/grammar/** (interfaces):
- `grammar-builder.ts` - GrammarBuilder, PatternBuilder, GrammarRule, etc.
- `grammar-engine.ts` - Base GrammarEngine class
- `scope-builder.ts` - ScopeBuilderImpl
- `pattern-compiler.ts` - PatternCompiler interface
- `vocabulary-provider.ts` - GrammarVocabularyProvider

**parser-en-us/src/** (English implementation):
- `grammar.ts` - All English grammar rules
- `english-parser.ts` - Main parser
- `english-grammar-engine.ts` - English grammar engine
- `english-pattern-compiler.ts` - English pattern compiler
- `scope-evaluator.ts` - English scope evaluation
