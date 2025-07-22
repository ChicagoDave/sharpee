# ADR 036: Parser Contracts in if-domain

**Status:** Accepted

**Date:** 2025-01-20

**Context:** The parser types, vocabulary contracts, and parser factory were originally placed in the `@sharpee/stdlib` package. This created a circular dependency issue where:
- `parser-en-us` needed parser types from `stdlib`
- `stdlib` needed to be built after `parser-en-us` for other reasons

Additionally, this violated the principle that foundational contracts should be at lower dependency levels.

**Decision:** Move all parser-related contracts and interfaces to `@sharpee/if-domain`:
- Parser types and interfaces (`Token`, `TokenCandidate`, `Parser`, etc.)
- Vocabulary contracts (`VocabularyEntry`, `PartOfSpeech`, etc.)
- Vocabulary registry and adapters
- Parser factory for language registration

The `stdlib` package now only re-exports these from `if-domain` for backward compatibility.

**Consequences:**

Positive:
- Eliminates circular dependencies
- Cleaner dependency hierarchy
- Parser implementations can be built independently
- Language-specific parsers don't need to depend on the entire stdlib
- Follows Interface Segregation Principle
- More logical organization - domain contracts belong in if-domain

Negative:
- Breaking change for any code importing directly from stdlib parser modules
- Need to maintain re-exports in stdlib for backward compatibility

**Implementation:**
1. Created `parser-contracts/` and `vocabulary-contracts/` directories in if-domain
2. Moved all parser types, vocabulary types, registry, and factory to if-domain
3. Updated parser-en-us to import from if-domain instead of stdlib
4. Updated build order: parser-en-us now builds before stdlib
5. Stdlib parser module now just re-exports from if-domain

**Notes:**
- The stdlib doesn't have a compile-time dependency on any specific parser
- Parsers are registered and retrieved at runtime through the ParserFactory
- This aligns with our principle of keeping language-agnostic contracts separate from implementations

**Update (2025-01-21):** 

During unit testing of `parser-en-us`, we discovered that the `EnglishParser` was using methods on its language provider that aren't part of the base `LanguageProvider` interface. The parser needs vocabulary-specific methods like:
- `getVerbs()` - verb vocabulary and patterns
- `getDirections()` - directional vocabulary
- `getSpecialVocabulary()` - articles, pronouns, etc.
- `getPrepositions()` - preposition list
- `getGrammarPatterns()` - language-specific grammar rules
- `lemmatize()` - word stemming
- `expandAbbreviation()` - abbreviation expansion
- Grammar helper methods

**Additional Decision:** Create a `ParserLanguageProvider` interface that extends `LanguageProvider` with these parser-specific methods. This:
- Makes the contract explicit for what parsers need from language providers
- Ensures type safety
- Provides clear guidance for implementing future languages
- Maintains separation between text/messaging concerns and parsing concerns

Each language implementation will need to implement both interfaces:
- `LanguageProvider` - for messages and text formatting
- `ParserLanguageProvider` - for parser vocabulary and grammar rules

This properly codifies what was already an implicit requirement and was revealed through testing.
