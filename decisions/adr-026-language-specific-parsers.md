# ADR-026: Language-Specific Parser Architecture

Date: 2025-07-12

## Status

Accepted - Implemented 2025-07-12

## Context

During the parser refactor (ADR-025), it became apparent that the current `BasicParser` implementation contains many English-specific assumptions:

1. **Word Order**: Assumes Subject-Verb-Object ordering typical of English
2. **Compound Verbs**: Hardcoded patterns like "look at", "pick up" that are English-specific
3. **Articles**: "the", "a", "an" handling is specific to English
4. **Prepositions**: Spatial relationships are expressed differently across languages
5. **Grammar Patterns**: The patterns like VERB_NOUN_PREP_NOUN assume English structure

Current issues:
- Parser logic is mixed with English grammar rules
- No clear separation between parsing framework and language rules
- Difficult to add support for other languages
- Language-specific logic scattered throughout the parser

## Decision

Separate language-specific parsing logic from the core parsing framework:

1. **Parser Interface**: Keep the generic `Parser` interface in world-model
2. **Language-Specific Implementations**: Create language-specific parser classes
3. **Parser Factory**: Use a factory pattern to instantiate the correct parser
4. **Shared Infrastructure**: Extract common parsing utilities

Implemented structure:
```
packages/
  stdlib/
    src/
      parser/
        parser-types.ts      // Parser interface
        parser-factory.ts    // Factory with registration
        vocabulary-types.ts  // Shared vocabulary types
  
  parser-en-us/              // Separate package per language
    src/
      english-parser.ts
      index.ts
    tests/
    package.json
  
  parser-es/                 // Future Spanish parser
  parser-ja/                 // Future Japanese parser
```

## Language-Specific Considerations

### English Parser
- SVO word order
- Compound verbs ("look at", "pick up")
- Articles (a, an, the)
- Prepositions for spatial relationships
- Relatively fixed word order

### Spanish Parser
- More flexible word order (SVO, VSO, VOS possible)
- Gender agreement between articles/adjectives/nouns
- Different verb conjugations
- Reflexive pronouns
- Articles: el, la, los, las, un, una

### Japanese Parser
- SOV word order
- Particles instead of prepositions (を, に, で, へ)
- No articles
- Verb conjugations encode politeness
- Different tokenization (no spaces)

### German Parser
- V2 word order (verb second)
- Case system affects word forms
- Separable verbs
- Compound nouns
- Articles change with case

## Implementation

### Parser Factory with Registration (Implemented)

```typescript
// stdlib/src/parser/parser-factory.ts
export class ParserFactory {
  private static registry = new Map<string, ParserConstructor>();
  
  static registerParser(languageCode: string, parserClass: ParserConstructor): void {
    const normalized = languageCode.toLowerCase();
    this.registry.set(normalized, parserClass);
    
    // Also register without region code
    const langOnly = normalized.split('-')[0];
    if (langOnly !== normalized && !this.registry.has(langOnly)) {
      this.registry.set(langOnly, parserClass);
    }
  }
  
  static createParser(languageCode: string, languageProvider: LanguageProvider): Parser {
    const ParserClass = this.registry.get(languageCode.toLowerCase());
    if (!ParserClass) {
      throw new Error(`No parser registered for language: ${languageCode}`);
    }
    return new ParserClass(languageProvider);
  }
}
```

### English Parser (Implemented in @sharpee/parser-en-us)

```typescript
export class EnglishParser implements Parser {
  constructor(private languageProvider: LanguageProvider) {}
  
  parse(input: string): ParseResult {
    // Rich parsing with full information preservation
    // Handles compound verbs, articles, prepositions
    // Returns structured ParsedCommand with confidence scores
  }
}
```

### Automatic Loading (via ADR-028)

```typescript
// GameEngine now handles parser loading automatically
const engine = new GameEngine(world, player);
await engine.setLanguage('en-US'); // Loads both language provider and parser
```

## Consequences

### Positive
- Clear separation of concerns
- Easier to add new languages
- Language-specific optimizations possible
- Better testability per language
- Can have language experts work on specific parsers

### Negative
- More complex architecture
- Code duplication between similar languages
- Need to maintain multiple parser implementations
- Increased testing burden

### Neutral
- Breaking change to parser instantiation
- Need to update documentation per language
- Vocabulary management becomes more complex

## Migration Path (Completed)

1. ✅ Moved `BasicParser` to `@sharpee/parser-en-us` as `EnglishParser`
2. ✅ Created `ParserFactory` with registration system
3. ✅ Parser packages follow naming convention: `@sharpee/parser-{language-code}`
4. ✅ Updated GameEngine to automatically load parsers (ADR-028)
5. ✅ Deprecated `BasicParser` in stdlib with clear error message
6. Future: Add parsers for other languages following same pattern

## Related

- ADR-025: Parser information preservation
- ADR-003: Internal parser types
- ADR-027: Parser Package Architecture (implementation details)
- ADR-028: Simplified Story Language Management (usage simplification)
- Language Provider interface

## Notes

This architecture allows for language-specific features:
- Chinese/Japanese: Handle lack of spaces
- Arabic/Hebrew: Right-to-left text
- Turkish: Agglutinative morphology
- Russian: Complex case system

The parser should work closely with the LanguageProvider to understand language-specific vocabulary and patterns.
