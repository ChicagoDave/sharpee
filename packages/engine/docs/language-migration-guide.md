# Language Management Migration Guide

This guide helps you migrate from manual parser registration to the new automatic language management system.

## Overview

The new system simplifies language setup by automatically loading language providers and parsers based on convention.

### What Changed

- No more manual parser registration
- No more direct parser package imports
- Automatic loading based on language code
- Simplified API: just `setLanguage()`

## Migration Steps

### 1. Remove Parser Imports

**Before:**
```typescript
import { ParserFactory } from '@sharpee/stdlib';
import { EnglishParser } from '@sharpee/parser-en-us';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
```

**After:**
```typescript
// No parser or language provider imports needed!
```

### 2. Remove Manual Registration

**Before:**
```typescript
// Register parser
ParserFactory.registerParser('en-US', EnglishParser);

// Create language provider
const languageProvider = new EnglishLanguageProvider();

// Create parser
const parser = ParserFactory.createParser('en-US', languageProvider);
```

**After:**
```typescript
// Just set the language on the engine
await engine.setLanguage('en-US');
```

### 3. Update Engine Creation

**Before:**
```typescript
const engine = new GameEngine(world, player, config, languageProvider);
```

**After:**
```typescript
const engine = new GameEngine(world, player, config);
// Language provider is no longer passed to constructor
```

### 4. Update Story Usage

**Before:**
```typescript
// Complex setup with manual parser management
const story = createStory();
const languageProvider = new EnglishLanguageProvider();
ParserFactory.registerParser('en-US', EnglishParser);

const engine = new GameEngine(world, player, config, languageProvider);
// ... more setup ...
```

**After:**
```typescript
const story = {
  config: {
    language: 'en-US',
    // ... other config
  },
  // ... story methods
};

const engine = new GameEngine(world, player, config);
await engine.setStory(story); // Automatically handles language
```

## Complete Example Migration

### Before (Old Pattern)

```typescript
import { GameEngine } from '@sharpee/engine';
import { WorldModel } from '@sharpee/world-model';
import { ParserFactory } from '@sharpee/stdlib';
import { EnglishParser } from '@sharpee/parser-en-us';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';

function initializeGame() {
  // Create world and player
  const world = new WorldModel();
  const player = createPlayer(world);
  
  // Manual language setup
  ParserFactory.registerParser('en-US', EnglishParser);
  const languageProvider = new EnglishLanguageProvider();
  
  // Create engine with language provider
  const engine = new GameEngine(world, player, {}, languageProvider);
  
  // Create story
  const story = {
    config: {
      id: 'my-story',
      title: 'My Story',
      author: 'Me',
      version: '1.0.0',
      language: 'en-US'
    },
    initializeWorld,
    createPlayer
  };
  
  // Set story (language already configured)
  engine.setStory(story);
  engine.start();
  
  return engine;
}
```

### After (New Pattern)

```typescript
import { GameEngine } from '@sharpee/engine';
import { WorldModel } from '@sharpee/world-model';

async function initializeGame() {
  // Create world and player
  const world = new WorldModel();
  const player = createPlayer(world);
  
  // Create engine (no language provider parameter)
  const engine = new GameEngine(world, player, {});
  
  // Create story with language in config
  const story = {
    config: {
      id: 'my-story',
      title: 'My Story',
      author: 'Me',
      version: '1.0.0',
      language: 'en-US'  // Language specified here
    },
    initializeWorld,
    createPlayer
  };
  
  // Set story - automatically configures language
  await engine.setStory(story);
  engine.start();
  
  return engine;
}
```

## API Reference

### New Methods

```typescript
class GameEngine {
  // Set language (loads parser and language provider automatically)
  async setLanguage(languageCode: string): Promise<void>
  
  // Get current parser
  getParser(): Parser | undefined
  
  // Get current language provider
  getLanguageProvider(): LanguageProvider | undefined
}
```

### Package Naming Convention

Languages must follow the naming convention:
- Language Provider: `@sharpee/lang-{language-code}`
- Parser: `@sharpee/parser-{language-code}`

Examples:
- English (US): `@sharpee/lang-en-us`, `@sharpee/parser-en-us`
- Spanish: `@sharpee/lang-es`, `@sharpee/parser-es`
- Japanese: `@sharpee/lang-ja`, `@sharpee/parser-ja`

## Error Handling

The new system provides clear error messages:

```typescript
try {
  await engine.setLanguage('xyz');
} catch (error) {
  // Error: Parser package not found for language: xyz. 
  // Expected package: @sharpee/parser-xyz
}
```

## Advanced Usage

### Custom Parser Registration

You can still use manual registration for custom parsers:

```typescript
import { ParserFactory } from '@sharpee/stdlib';
import { MyCustomParser } from './my-parser';

// Register custom parser
ParserFactory.registerParser('custom', MyCustomParser);

// Use it
await engine.setLanguage('custom');
```

### Runtime Language Changes

```typescript
// Start with English
await engine.setLanguage('en-US');

// Switch to Spanish
await engine.setLanguage('es');

// Switch back
await engine.setLanguage('en-US');
```

## Benefits

1. **Simpler**: Less code, fewer imports
2. **Cleaner**: No manual registration boilerplate
3. **Flexible**: Change languages at runtime
4. **Convention-based**: Predictable package names
5. **Backward Compatible**: Old ParserFactory API still works

## Questions?

- Check ADR-028 for design rationale
- See `examples/language-management.ts` for usage examples
- File issues for migration problems
