# Parser Grammar Rules Engine Implementation Plan

## Overview

This document outlines the implementation plan for the Grammar Rules Engine as decided in ADR-044. The engine will replace hardcoded pattern matching with a declarative, extensible system.

## Goals

1. Fix immediate parsing issues (prepositions, VERB_PREP_NOUN)
2. Create extensible grammar system for story authors
3. Integrate with scope management (ADR-045)
4. Maintain backward compatibility
5. Improve debugging and error messages

## Architecture Overview

```
┌─────────────────┐
│ Grammar Builder │ (Author-facing API)
└────────┬────────┘
         │ compiles to
┌────────▼────────┐
│ Grammar Rules   │ (Internal representation)
└────────┬────────┘
         │ used by
┌────────▼────────┐
│ Pattern Matcher │ (Runtime engine)
└────────┬────────┘
         │ produces
┌────────▼────────┐
│ ParsedCommand   │ (Output structure)
└─────────────────┘
```

### Language Separation

```
@sharpee/if-domain          @sharpee/parser-en-us       @sharpee/lang-en-us
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│ GrammarBuilder  │◄───────│ EnglishGrammar   │───────►│ EnglishWords    │
│ (interface)     │        │ Engine           │        │ - prepositions  │
├─────────────────┤        ├──────────────────┤        │ - articles      │
│ PatternCompiler │◄───────│ EnglishPattern   │        │ - determiners   │
│ (interface)     │        │ Compiler         │        │ - pronouns      │
├─────────────────┤        ├──────────────────┤        └─────────────────┘
│ GrammarEngine   │◄───────│ EnglishParser    │
│ (abstract)      │        │ (uses grammar)   │
└─────────────────┘        └──────────────────┘
```

Key principles:
- `if-domain` defines language-agnostic interfaces
- `parser-en-us` implements English-specific grammar rules and syntax
- `lang-en-us` provides all English vocabulary and text
- Other languages would implement their own parser packages

## Phase 1: Core Grammar Engine

### Milestone 1.1: Grammar Definition System ✅

- [x] Create grammar builder interfaces in `@sharpee/if-domain`
  - [x] `GrammarBuilder` interface
  - [x] `PatternBuilder` interface
  - [x] `GrammarRule` interface
  - [x] `CompiledPattern` interface
  
- [x] Implement pattern syntax parser
  - [x] Parse pattern strings like `'put :item in|into :container'`
  - [x] Extract slots (`:item`, `:container`)
  - [x] Handle alternates (`in|into`)
  - [ ] Support optional elements (future enhancement)

- [x] Create constraint system
  - [x] Property constraints (`{ portable: true }`)
  - [x] Function constraints (`entity => boolean`)
  - [x] Scope constraints (integration point for ADR-045)

### Milestone 1.2: Vocabulary Registration ✅

- [x] Extend VocabularyRegistry
  - [x] Add `registerPrepositions(words: string[])`
  - [x] Add `registerDeterminers(words: string[])`
  - [x] Add `registerConjunctions(words: string[])`
  - [x] Add `registerNumbers(words: string[])`
  
- [x] Update vocabulary initialization
  - [x] Register all word types from language provider
  - [x] Ensure proper part-of-speech tagging
  - [x] Add to `english-parser.ts` initialization

### Milestone 1.3: Pattern Matching Engine ✅

- [x] Create `GrammarEngine` class
  - [x] Pattern compilation method
  - [x] Token matching algorithm
  - [x] Slot extraction logic
  - [x] Priority-based selection

- [x] Implement pattern matching
  - [x] Match tokens against compiled patterns
  - [x] Extract slot values
  - [ ] Apply constraints (basic implementation, full scope integration pending)
  - [x] Score matches by confidence

### Milestone 1.4: Parser Integration ✅

- [x] Update `EnglishParser`
  - [x] Add `GrammarEngine` instance
  - [x] Replace `tryStandardPatterns()` with grammar engine
  - [x] Maintain backward compatibility
  - [x] Add grammar registration methods

- [x] Define core grammar rules
  - [x] VERB: `'look'`, `'inventory'`
  - [x] VERB_NOUN: `'take :item'`, `'examine :object'`
  - [x] VERB_PREP_NOUN: `'look at :target'`
  - [x] VERB_NOUN_PREP_NOUN: `'put :item in|into|on :container'`, `'hang :item on :hook'`
  - [x] DIRECTION: `'go :direction'`, bare directions

### Milestone 1.5: Testing & Validation ✅

- [x] Basic grammar engine testing
- [x] Unit tests for grammar builder
- [x] Unit tests for pattern matching
- [x] Integration tests with parser
- [x] Verify Cloak "hang cloak on hook" works ✅
- [x] Performance benchmarks

## Phase 2: Advanced Patterns

### Milestone 2.1: Complex Patterns ✅

- [x] VERB_NOUN_NOUN: `'give :item to :recipient'` ✅
- [x] Multiple prepositions: `'take :item from :container with :tool'` ✅
- [x] Optional elements: `'look [carefully] at :target'` ✅
- [x] Quoted strings: `'say "hello"'`, `'write :text on :surface'` ✅

### Milestone 2.2: Scope Integration ✅

- [x] Implement scope constraints in grammar
- [x] Add scope builder methods
- [x] Connect to scope registry (ADR-045)
- [x] Test cross-location visibility

### Milestone 2.3: Story Grammar Registration ✅

- [x] Add story-specific grammar API
- [x] Grammar priority system
- [x] Override/extend core patterns
- [x] Grammar debugging tools

## Phase 3: Advanced Features

### Milestone 3.1: Disambiguation

- [ ] Multi-match handling
- [ ] Disambiguation questions
- [ ] Context-aware selection
- [ ] Pronoun resolution

### Milestone 3.2: Developer Tools

- [ ] Grammar visualization
- [ ] Pattern match debugging
- [ ] Performance profiling
- [ ] Grammar conflict detection

## Implementation Order

1. **Week 1**: Milestones 1.1-1.2 (Grammar definition & vocabulary)
2. **Week 2**: Milestone 1.3 (Pattern matching engine)
3. **Week 3**: Milestone 1.4 (Parser integration)
4. **Week 4**: Milestone 1.5 (Testing & validation)
5. **Week 5-6**: Phase 2 (Advanced patterns & scope)
6. **Week 7-8**: Phase 3 (Advanced features)

## Success Criteria

1. ✓ Cloak of Darkness "hang cloak on hook" parses correctly
2. ✓ All existing parser tests pass
3. ✓ Performance within 10% of current parser
4. ✓ Stories can register custom grammar
5. ✓ Clear error messages for parse failures
6. ✓ Platform events for debugging

## Example Usage

```typescript
// Core grammar registration
grammar
  .define('put :item in|into|inside :container')
  .where('item', { takeable: true })
  .where('container', scope => scope
    .touchable()
    .matching({ open: true, container: true })
  )
  .mapsTo('putting')
  .withPriority(100);

// Story-specific grammar
story.grammar
  .define('hang :garment on :hook')
  .where('garment', { wearable: true })
  .where('hook', { kind: 'supporter' })
  .mapsTo('putting')
  .withPriority(150); // Higher than generic 'put'

// Complex pattern
grammar
  .define('unlock :door with :key')
  .where('door', scope => scope
    .nearby()
    .matching({ locked: true, kind: 'door' })
  )
  .where('key', scope => scope
    .carried()
    .matching(key => key.unlocks === ':door')
  )
  .mapsTo('unlocking');
```

## Language Architecture Alignment

The grammar engine respects the language-based architecture:

1. **Language-agnostic interfaces** in `@sharpee/if-domain`:
   - `GrammarBuilder` - Abstract grammar definition
   - `GrammarEngine` - Language-independent matching engine
   - `PatternCompiler` - Abstract pattern compilation

2. **English-specific implementation** in `@sharpee/parser-en-us`:
   - English pattern syntax (`'put :item in|into :container'`)
   - English word order rules
   - English-specific core grammar rules

3. **English vocabulary** from `@sharpee/lang-en-us`:
   - All vocabulary words (prepositions, articles, etc.)
   - English-specific text templates
   - Language provider supplies all text

## Files to Modify

### New Files
- `/packages/if-domain/src/grammar/grammar-builder.ts` (interfaces only)
- `/packages/if-domain/src/grammar/pattern-compiler.ts` (interfaces only)
- `/packages/if-domain/src/grammar/grammar-engine.ts` (abstract base)
- `/packages/parser-en-us/src/english-grammar-engine.ts` (English implementation)
- `/packages/parser-en-us/src/core-grammar.ts` (English patterns)
- `/packages/parser-en-us/src/english-pattern-compiler.ts` (English syntax)

### Modified Files
- `/packages/if-domain/src/vocabulary-contracts/vocabulary-registry.ts`
- `/packages/parser-en-us/src/english-parser.ts`
- `/packages/lang-en-us/src/language-provider.ts`
- `/packages/lang-en-us/src/data/words.ts` (ensure all word types exported)

## Risk Mitigation

1. **Performance**: Use pattern indexing and caching
2. **Compatibility**: Keep old parser methods during transition
3. **Complexity**: Extensive testing and documentation
4. **Debugging**: Rich platform events at each stage

## Next Steps

1. Review and approve this plan
2. Create feature branch `feature/grammar-engine`
3. Start with Milestone 1.1
4. Weekly progress reviews