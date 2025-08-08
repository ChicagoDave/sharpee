# Sharpee Architecture Decisions - Batch 32

## File: 2025-05-25-13-40-51.json
**Topic**: Sharpee Language System Redesign Implementation

### Decision: Complete Language System Redesign

**Context**: The `if-parser.test.ts` was failing due to dependencies on external language packages with overengineered provider patterns.

**Decision**: 
Replace the complex language provider system with a simple, built-in language system where authors can write `story.languageSet(US_EN)` and everything works.

**Architecture Implemented**:
1. **New Directory Structure**:
   ```
   packages/core/src/languages/
   ├── constants.ts       # US_EN, FR_FR, etc. language codes
   ├── types.ts          # LanguageDefinition interface
   ├── registry.ts       # Built-in language lookup
   └── definitions/
       └── english.ts    # Complete English definition
   ```

2. **Key Components**:
   - `LanguageDefinition` interface containing parser config, grammar patterns, messages, and verbs
   - `LanguageRegistry` for built-in language management
   - `LanguageInstance` for applying custom options
   - Auto-registration of core languages on import

3. **Story Class Integration**:
   ```typescript
   story.languageSet(US_EN, {
     customMessages: {
       "cant-take": "That's way too heavy!"
     }
   });
   ```

**Rationale**: 
- Simplifies author experience - no complex imports needed
- All core languages built into the package
- Easy testing without external dependencies
- Maintains extensibility through custom options

### Decision: Parser Provider Factory Pattern

**Context**: Need to create parser providers from language definitions.

**Decision**: 
Implemented `createEnglishParserProvider()` function that creates a parser provider from the English language definition.

**Implementation**:
- Wraps language definition to implement `LanguageParserProvider` interface
- Provides `getParserConfig()`, `getGrammarPatterns()`, and `getSynonyms()`
- Maintains compatibility with existing parser infrastructure

**Rationale**: Bridge between new language system and existing parser expectations.

## File: 2025-05-25-14-39-40.json
**Topic**: Sharpee Language System Redesign Complete - Ready for Forge Layer

### Decision: Forge Layer API Design

**Context**: With language system complete, ready to implement the fluent author API layer.

**Decision**: 
Design the Forge layer as a fluent, chainable API that sits on top of the core systems:

```typescript
const story = forge()
  .languageSet(US_EN)
  .title("The Mysterious Key")
  .startIn("library")
  .room("library")
    .description("A dusty old library")
    .item("brass-key").takeable()
    .exit("north", "hallway")
  .start();
```

**Key Requirements Identified**:
1. Fluent Author API - Natural, readable syntax
2. Built on Story Class - Leverage `story.languageSet(US_EN)`
3. IF-Agnostic World Model - Use existing core as foundation
4. TypeScript Implementation - Type safety with fluent interface
5. Non-Programming Friendly - Focus on content, not code

**Rationale**: Authors should be able to create IF stories using natural syntax that hides complexity.

### Decision: Language System Success Criteria Met

**Context**: Validation of completed language redesign.

**Confirmed Working**:
- ✅ `story.languageSet(US_EN)` API implemented
- ✅ Built-in English language (no external dependencies)
- ✅ Story class with parser integration
- ✅ Updated parser tests using new system
- ✅ Clean architecture in `packages/core/src/languages/`

**Files Created**:
- `packages/core/src/languages/` - Complete language system
- `packages/core/src/story/` - Story class with languageSet()
- Updated `if-parser.test.ts` to use built-in language
- Updated core exports

**Rationale**: All goals of the language redesign were achieved, ready for next phase.

## File: 2025-05-25-15-50-29.json
**Topic**: Reviewing Parser and Archiving Older Code

### Decision: Parser System is Production-Ready

**Context**: Review of parser implementation to assess quality and identify cleanup needs.

**Assessment**: 
The parser system is **well-implemented and functionally complete** with:
- Excellent TypeScript type system
- Solid core components (Tokenizer, IF Parser)
- Clean language system integration
- Good test coverage
- Extensible grammar pattern system

**Architecture Strengths**:
1. Pattern-based grammar system (not linguistic analysis)
2. Robust disambiguation support
3. Scoring system for entity matching
4. Clean separation of concerns
5. Integration with `story.languageSet(US_EN)` API

**Rationale**: The parser is ready for production use and integration with other systems.

### Decision: Archive Obsolete Parser Files

**Context**: Found backup files, disabled tests, and corrupted documentation during review.

**Files to Archive**:
1. **Backup files** (.bak extension) - Old implementations
2. **Disabled test files** (.txt extension) - Obsolete tests
3. **Corrupted files** - TODO-NEW-PARSER.md with encoding issues

**Archive Structure**:
```
archive/parser-cleanup-2025-05-25/
├── backup-files/
├── disabled-tests/
├── obsolete-docs/
└── README.md
```

**Rationale**: Clean up codebase while preserving history in archive.

## File: 2025-05-25-16-07-44.json
**Topic**: Parser Implementation Review - Test Failures

### Decision: Parser Tests Need Minor Fixes

**Context**: Running parser tests revealed several failures due to implementation details.

**Issues Identified**:
1. **Entity matching returning multiple results** - Parser returns all matches instead of just best match
2. **Missing disambiguation logic** - Not properly filtering to single best match
3. **Regex error in grammar patterns** - Special characters in "help|?|hint" pattern
4. **Pronoun resolution** - Match type not properly set
5. **Error handling** - Not properly rejecting unknown objects

**Test Results**:
- 10 failures initially
- Reduced to 9 after fixing base-parser stub
- Most failures relate to disambiguation and match filtering

**Rationale**: Tests are well-written; implementation needs minor adjustments to match expected behavior.

### Decision: Keep Pattern-Based Parser Design

**Context**: Tests reference old linguistic components (POSTagger, PhraseIdentifier) that don't exist in new design.

**Decision**: 
The new pattern-based parser is the correct approach for IF. Old linguistic analysis components should not be reimplemented.

**Key Differences**:
- Old: Complex linguistic analysis (POS tagging, phrase identification)
- New: Pattern matching with grammar rules (simpler, more direct)
- Result: More maintainable and author-friendly

**Rationale**: IF commands follow predictable patterns; linguistic analysis is overkill.

## Next Review Files
- [ ] 2025-05-27-16-05-09.json
- [ ] 2025-05-27-16-47-28.json
- [ ] 2025-05-27-17-10-29.json
- [ ] 2025-05-27-20-24-13.json
