# Sharpee Architecture Decisions - Batch 22

## File: 2025-04-21-01-11-03.json
**Topic**: Refactoring Language System and Parser

### Decision: Parser Refactoring Architecture

**Context**: After successfully implementing the `@sharpee/lang-en-us` package and removing redundant language files from the core package, the next phase involves refactoring the parser to be language-agnostic.

**Decision**: 
- Create a language-agnostic parser system that can work with any language implementation
- Define clear boundaries between parsing logic and language-specific components
- Move parser-specific language components from `core/parser/languages/en-US` to `@sharpee/lang-en-us`

**Rationale**:
- Separation of concerns: Language-specific code is isolated from core functionality
- Extensibility: Authors can easily customize language without touching the base implementation
- Modularity: Makes it possible to add more languages in the future
- Consistency: All text responses come from the same source

### Decision: Parser Interface Design

**Context**: Need to define interfaces that all language implementations must satisfy for parsing.

**Decision**: Create the following core parser interfaces in `@sharpee/core`:
1. `Token` - Represents a token in the input text
2. `TaggedWord` - A word with its assigned POS tag
3. `Phrase` - Phrase structure in a sentence
4. `ParsedCommand` - A parsed command with structured components
5. `Tokenizer` - Language-specific tokenizer interface
6. `POSTagger` - Language-specific part-of-speech tagger
7. `PhraseIdentifier` - Language-specific phrase identifier
8. `GrammarAnalyzer` - Language-specific grammar analyzer
9. `Parser` - Main parser interface (language agnostic)

**Rationale**: Clean interface design allows for easy addition of new languages or language features while maintaining backwards compatibility.

### Decision: Language Parser Provider Pattern

**Context**: Need a way to connect language implementations with parser components.

**Decision**: Create a `LanguageParserProvider` interface that provides:
- `getTokenizer()` - Get the tokenizer for this language
- `getPOSTagger()` - Get the POS tagger for this language
- `getPhraseIdentifier()` - Get the phrase identifier for this language
- `getGrammarAnalyzer()` - Get the grammar analyzer for this language
- `lemmatize()` - Lemmatize a word (convert to base form)
- `preprocessInput()` - Preprocess input text before parsing
- `postprocessCommand()` - Post-process a parsed command for language-specific adjustments

**Rationale**: This provides a pluggable component system that works seamlessly with the language provider system, making Sharpee more flexible and extensible.

### Decision: Base Parser Implementation

**Context**: Need a language-agnostic parser that can work with any language provider.

**Decision**: Implement `BaseParser` class that:
- Takes a `LanguageParserProvider` in constructor (or gets from active language)
- Implements the parsing pipeline: preprocess → tokenize → tag → identify phrases → analyze grammar → postprocess
- Returns a `ParserResult` with success status, commands, and errors

**Rationale**: This creates a consistent parsing pipeline that all languages follow while allowing customization at each step.

### Decision: Enhanced Language Provider

**Context**: Need to connect the existing language provider system with the new parser system.

**Decision**: Extend the `LanguageProvider` interface to include:
```typescript
getParserProvider(): LanguageParserProvider;
```

**Rationale**: This maintains the existing language provider architecture while adding parser capabilities.

### Decision: Migration Strategy for Parser Components

**Context**: Existing English parser components are in `core/parser/languages/en-US`.

**Decision**: Migrate in phases:
1. Phase 1: Define interfaces (Days 1-2)
2. Phase 2: Implement base parser (Days 3-4)
3. Phase 3: Migrate English parser components (Days 5-8)
4. Phase 4: Implement English parser provider (Days 9-10)
5. Phase 5: Integrate with command handlers (Days 11-13)
6. Phase 6: Documentation and examples (Days 14-15)

**Rationale**: Phased approach ensures functionality is maintained while gradually improving the architecture.

### Decision: Component Migration Pattern

**Context**: Need to move language-specific parser components to the language package.

**Decision**: For each component:
1. Create class implementing the core interface (e.g., `EnglishTokenizer implements Tokenizer`)
2. Move logic from `core/parser/languages/en-US` to `@sharpee/lang-en-us/src/parser`
3. Maintain the same functionality while adapting to new interfaces

Components to migrate:
- Tokenizer
- POS Tagger and dictionaries
- Phrase Identifier
- Grammar Analyzer
- Lemmatizer

**Rationale**: This maintains existing functionality while creating a clean separation between core and language-specific code.

## Implementation Status

As of the chat date (April 21, 2025):
- Successfully implemented `@sharpee/lang-en-us` package
- Removed redundant language files from core
- Parser-specific language components still remain in core
- Next focus: Update command handlers to use language provider for verb lists
- Then: Redesign parser interface to be language-agnostic

## Key Principles Reinforced

1. **Language Agnosticism**: Parser system works with any language implementation
2. **Clean Interfaces**: Clear boundaries between parsing logic and language specifics
3. **Extensibility**: Easy addition of new languages or language features
4. **Author Flexibility**: Fluent API for authors to customize language behavior
5. **Backwards Compatibility**: Ensure existing stories continue to work

## Next Review File
- [ ] 2025-05-22-15-00-17.json
