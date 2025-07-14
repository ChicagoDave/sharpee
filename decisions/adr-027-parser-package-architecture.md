# ADR-027: Parser Package Architecture

Date: 2025-07-12

## Status

Accepted - Updated 2025-07-13 (see ADR-028 for simplified usage)

## Context

Following ADR-026 (Language-Specific Parser Architecture), we needed to decide where language-specific parser implementations should live. Initially, the English parser was in the stdlib package, but this approach has issues:

1. **Bundle Size**: All language parsers would be loaded even if only one is needed
2. **Coupling**: Language-specific code is coupled to core stdlib
3. **Maintenance**: Different language experts can't easily maintain their parsers
4. **Versioning**: Can't update one language parser without affecting others

## Decision

Each language parser will be its own package:
- `@sharpee/parser-en-us` - English (US) parser
- `@sharpee/parser-es` - Spanish parser
- `@sharpee/parser-ja` - Japanese parser
- etc.

The stdlib package provides:
- Parser interfaces and types
- Parser factory with registration system
- Common vocabulary types and registry

## Implementation

### Parser Registration

**Note**: With ADR-028, manual registration is typically not needed. The GameEngine handles this automatically.

For advanced use cases, parsers can still be manually registered:

```typescript
// Manual registration (rarely needed)
import { EnglishParser } from '@sharpee/parser-en-us';
import { ParserFactory } from '@sharpee/stdlib';

ParserFactory.registerParser('en-US', EnglishParser);
```

### Factory Pattern

The ParserFactory maintains a registry:

```typescript
class ParserFactory {
  static registerParser(languageCode: string, parserClass: ParserConstructor): void;
  static createParser(languageCode: string, languageProvider: LanguageProvider): Parser;
  static isLanguageRegistered(languageCode: string): boolean;
  static getRegisteredLanguages(): string[];
}
```

### Package Structure

```
packages/
  stdlib/
    src/
      parser/
        parser-types.ts       # Interfaces
        parser-factory.ts     # Registration system
        vocabulary-types.ts   # Shared types
        
  parser-en-us/
    src/
      english-parser.ts      # Implementation
      index.ts              # Exports
    tests/
      english-parser.test.ts
    package.json
    
  parser-es/
    src/
      spanish-parser.ts
      index.ts
    tests/
      spanish-parser.test.ts
    package.json
```

## Consequences

### Positive
- **Modular**: Only load parsers you need
- **Independent**: Each parser can be versioned independently
- **Maintainable**: Language experts can own their parser packages
- **No Circular Dependencies**: Clean dependency graph
- **Tree-shaking**: Unused parsers are not included in bundles

### Negative
- **More Packages**: Additional packages to manage
- **Registration Required**: Parsers must be explicitly registered
- **Migration Effort**: Existing code must be updated

### Neutral
- Stories must explicitly choose their parser
- Parser packages depend on stdlib for interfaces
- Language packages and parser packages are separate

## Migration

1. Move `BasicParser` users to import from `@sharpee/parser-en-us`
2. Add parser registration in story initialization
3. Update tests to register parsers before use

## Example Story Setup

### Simple Setup (Recommended - Post ADR-028)

```typescript
// Story just specifies language in config
const story = {
  config: {
    language: 'en-US',
    // ... other config
  },
  // ... story implementation
};

// Engine handles parser loading automatically
const engine = new GameEngine(world, player);
await engine.setStory(story); // Parser loaded automatically!
```

### Manual Setup (Advanced Use Cases)

```typescript
// For custom parsers or testing
import { ParserFactory } from '@sharpee/stdlib';
import { EnglishParser } from '@sharpee/parser-en-us';
import { loadLanguageProvider } from '@sharpee/engine';

export async function manualSetup(language: string = 'en-US') {
  // Load language provider
  const languageProvider = await loadLanguageProvider(language);
  
  // Register parser
  ParserFactory.registerParser('en-US', EnglishParser);
  
  // Create parser
  const parser = ParserFactory.createParser(language, languageProvider);
  
  return { parser, languageProvider };
}
```

## Related

- ADR-026: Language-Specific Parser Architecture
- ADR-025: Parser Information Preservation
- ADR-028: Simplified Story Language Management (simplifies usage)
- Language provider packages
