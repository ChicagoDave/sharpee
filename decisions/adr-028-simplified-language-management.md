# ADR-028: Simplified Story Language Management

Date: 2025-07-13

## Status

Accepted

## Context

Following ADR-027 (Parser Package Architecture), stories needed to manually register parsers:

```typescript
import { ParserFactory } from '@sharpee/stdlib';
import { EnglishParser } from '@sharpee/parser-en-us';
ParserFactory.registerParser('en-US', EnglishParser);
```

This approach has issues:
1. **Complex for Authors**: Story authors need to understand parser registration
2. **Error Prone**: Easy to forget registration or mismatch language codes
3. **Boilerplate**: Repetitive code in every story
4. **Coupling**: Stories need direct dependencies on parser packages

## Decision

The GameEngine will handle language setup automatically:

```typescript
// Simple API for stories
story.setLanguage('en-US');

// Or via story config
const story = {
  config: {
    language: 'en-US',
    // ... other config
  }
};
await engine.setStory(story); // Automatically sets language
```

The engine will:
1. Dynamically import language provider packages (`@sharpee/lang-{code}`)
2. Dynamically import parser packages (`@sharpee/parser-{code}`)
3. Register parsers with ParserFactory automatically
4. Provide getters for parser and language provider

## Implementation

### GameEngine Changes

```typescript
class GameEngine {
  private parser?: Parser;
  private languageProvider?: LanguageProvider;
  
  async setLanguage(languageCode: string): Promise<void> {
    // Load language provider
    this.languageProvider = await loadLanguageProvider(languageCode);
    
    // Dynamically import parser package
    const parserPackageName = `@sharpee/parser-${languageCode.toLowerCase()}`;
    const parserModule = await import(parserPackageName);
    
    // Extract parser class (handle various export patterns)
    const ParserClass = parserModule.Parser || 
                       parserModule.default || 
                       parserModule.EnglishParser || 
                       // ... other patterns
    
    // Register and create parser
    ParserFactory.registerParser(languageCode, ParserClass);
    this.parser = ParserFactory.createParser(languageCode, this.languageProvider);
    
    // Update command executor
    this.commandExecutor = createCommandExecutor(/* ... */);
  }
  
  getParser(): Parser | undefined {
    return this.parser;
  }
  
  getLanguageProvider(): LanguageProvider | undefined {
    return this.languageProvider;
  }
}
```

### Convention-Based Package Names

- Language providers: `@sharpee/lang-{language-code}`
- Parsers: `@sharpee/parser-{language-code}`

Examples:
- `@sharpee/lang-en-us` and `@sharpee/parser-en-us`
- `@sharpee/lang-es` and `@sharpee/parser-es`
- `@sharpee/lang-ja` and `@sharpee/parser-ja`

### Parser Export Patterns

Parser packages can export in various ways:
```typescript
// Named export
export { EnglishParser as Parser };

// Default export
export default EnglishParser;

// Specific name export
export { EnglishParser };
```

The engine handles all patterns automatically.

## Consequences

### Positive
- **Simple API**: Just `setLanguage('en-US')` 
- **Automatic Setup**: No manual registration needed
- **Convention over Configuration**: Predictable package names
- **Backwards Compatible**: ParserFactory still works for advanced use
- **Better Encapsulation**: Engine manages language complexity

### Negative
- **Dynamic Imports**: Requires runtime module resolution
- **Convention Required**: Packages must follow naming convention
- **Hidden Complexity**: Less obvious what's happening under the hood

### Neutral
- Parser packages are loaded on demand
- Language changes require async operations
- ParserFactory becomes mostly internal

## Usage Examples

### Basic Story Setup
```typescript
const engine = new GameEngine(world, player);
await engine.setLanguage('en-US');
```

### Story with Config
```typescript
const story = {
  config: {
    id: 'my-story',
    title: 'My Story',
    language: 'es',
    // ...
  },
  // ...
};

const engine = new GameEngine(world, player);
await engine.setStory(story); // Automatically sets Spanish
```

### Accessing Parser and Language Provider
```typescript
await engine.setLanguage('en-US');

const parser = engine.getParser();
const languageProvider = engine.getLanguageProvider();

// Use parser directly if needed
const result = parser.parse("take the key");
```

### Multi-Language Story
```typescript
// Change language mid-game
await engine.setLanguage('es');
// Now using Spanish parser and language provider

await engine.setLanguage('en-US');
// Back to English
```

## Migration Guide

### Before (Manual Registration)
```typescript
import { ParserFactory } from '@sharpee/stdlib';
import { EnglishParser } from '@sharpee/parser-en-us';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';

// Register parser
ParserFactory.registerParser('en-US', EnglishParser);

// Create providers
const languageProvider = new EnglishLanguageProvider();
const parser = ParserFactory.createParser('en-US', languageProvider);

// Create engine
const engine = new GameEngine(world, player, config, languageProvider);
```

### After (Automatic)
```typescript
// Create engine
const engine = new GameEngine(world, player, config);

// Set language - everything else is automatic
await engine.setLanguage('en-US');

// Or use story config
await engine.setStory(story); // Uses story.config.language
```

## Error Handling

The engine provides clear error messages:
- Missing language code: "Language code is required"
- Missing parser package: "Parser package not found for language: {code}. Expected package: @sharpee/parser-{code}"
- Invalid parser package: "No parser class found in {package}"
- Language provider errors: "Failed to load language package {package}: {error}"

## Related

- ADR-027: Parser Package Architecture
- ADR-026: Language-Specific Parser Architecture
- ADR-025: Parser Information Preservation
