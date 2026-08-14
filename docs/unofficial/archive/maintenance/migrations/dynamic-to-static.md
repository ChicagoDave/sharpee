# Migration Guide: Dynamic to Static Loading

## Overview

This guide covers the migration from dynamic module loading to static imports for language providers, parsers, and text services in the Sharpee framework.

## Background

Previously, the engine used dynamic imports to load language-specific modules at runtime:
- Language providers were loaded via `loadLanguageProvider()`
- Parsers were loaded via `loadParser()`
- Text services were configured dynamically

This has been replaced with a static, dependency-injection based approach for better performance, type safety, and testing.

## Breaking Changes

### Removed Functions

The following functions have been removed:

```typescript
// ❌ No longer available
import { createStandardEngine, createEngineWithStory, loadLanguageProvider } from '@sharpee/engine';
```

### Removed Story Config Fields

```typescript
// ❌ Old story config
const story: Story = {
  config: {
    id: 'my-story',
    language: 'en-us',      // ❌ Removed
    textService: 'default',  // ❌ Removed
    // ... other fields
  }
};

// ✅ New story config
const story: Story = {
  config: {
    id: 'my-story',
    // ... other fields (no language or textService)
  }
};
```

### Removed Methods

```typescript
// ❌ Old engine methods
engine.setLanguage('en-us');  // Removed
await engine.setStory(story);  // Now synchronous

// ✅ New approach
engine.setStory(story);  // Synchronous
```

## Migration Steps

### 1. Update Engine Creation

#### Old Approach
```typescript
import { createStandardEngine } from '@sharpee/engine';

const engine = createStandardEngine();
await engine.setLanguage('en-us');
await engine.setStory(story);
engine.start();
```

#### New Approach
```typescript
import { GameEngine } from '@sharpee/engine';
import { WorldModel } from '@sharpee/world-model';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { TextService } from '@sharpee/text-services';

// Create dependencies
const world = new WorldModel();
const player = world.createEntity('Player', EntityType.ACTOR);
const language = new EnglishLanguageProvider();
const parser = new EnglishParser(language, { world });
const textService = new TextService();

// Create engine with dependencies
const engine = new GameEngine({
  world,
  player,
  parser,
  language,
  textService
});

engine.setStory(story);  // Note: now synchronous
engine.start();
```

### 2. Update Test Code

#### Old Test Setup
```typescript
import { createStandardEngine } from '@sharpee/engine';

describe('MyTest', () => {
  let engine;
  
  beforeEach(async () => {
    engine = createStandardEngine();
    await engine.setLanguage('en-us');
    await engine.setStory(testStory);
  });
});
```

#### New Test Setup
```typescript
import { setupTestEngine } from '@sharpee/engine/test-helpers';

describe('MyTest', () => {
  let engine, world, player;
  
  beforeEach(() => {
    const setup = setupTestEngine();
    engine = setup.engine;
    world = setup.world;
    player = setup.player;
    engine.setStory(testStory);  // Synchronous
  });
});
```

### 3. Update Story Definitions

#### Old Story
```typescript
export class MyStory implements Story {
  config: StoryConfig = {
    id: 'my-story',
    title: 'My Story',
    author: 'Author',
    version: '1.0.0',
    language: 'en-us'  // Remove this
  };
  
  // ... rest of story
}
```

#### New Story
```typescript
export class MyStory implements Story {
  config: StoryConfig = {
    id: 'my-story',
    title: 'My Story',
    author: 'Author',
    version: '1.0.0'
    // No language field
  };
  
  // Optional: extend parser/language
  extendParser?(parser: Parser): void {
    // Add custom vocabulary
  }
  
  extendLanguage?(language: LanguageProvider): void {
    // Add custom messages
  }
  
  // ... rest of story
}
```

### 4. Create Platform-Specific Entry Points

Instead of dynamic loading, create platform-specific entry points:

```typescript
// packages/platforms/cli-en-us/src/index.ts
import { GameEngine } from '@sharpee/engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { TextService } from '@sharpee/text-services';
import { CLIPlatform } from './cli-platform';

export function createCLIEngine(story: Story): GameEngine {
  const world = new WorldModel();
  const player = story.createPlayer(world);
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser(language, { world });
  const textService = new TextService();
  
  const engine = new GameEngine({
    world,
    player,
    parser,
    language,
    textService
  });
  
  engine.setStory(story);
  
  // Set up platform-specific handlers
  const platform = new CLIPlatform(engine);
  platform.initialize();
  
  return engine;
}
```

## Benefits of Static Loading

### Performance
- No runtime module resolution
- Faster startup times
- Better tree-shaking
- Smaller bundles

### Type Safety
- Full TypeScript support
- Compile-time checking
- Better IDE support
- No runtime type errors

### Testing
- No async setup required
- No test timeouts from dynamic imports
- Easier mocking
- Faster test execution

### Debugging
- Clear dependency graph
- Better stack traces
- Easier to trace issues
- No module resolution errors

## Common Issues and Solutions

### Issue: Tests timing out
**Cause**: Dynamic imports in test environment  
**Solution**: Use static imports and setupTestEngine helper

### Issue: "createStandardEngine is not a function"
**Cause**: Using removed factory function  
**Solution**: Use GameEngine constructor with dependencies

### Issue: "setLanguage is not a function"
**Cause**: Using removed method  
**Solution**: Pass language provider to constructor

### Issue: "Cannot find module" errors
**Cause**: Dynamic import paths  
**Solution**: Use static imports at top of file

## Platform Support

Different platforms can have different language/parser combinations:

```typescript
// English CLI platform
import { EnglishParser } from '@sharpee/parser-en-us';

// Spanish CLI platform (future)
import { SpanishParser } from '@sharpee/parser-es';

// Web platform with multiple languages
import { EnglishParser } from '@sharpee/parser-en-us';
import { SpanishParser } from '@sharpee/parser-es';
import { FrenchParser } from '@sharpee/parser-fr';
```

## Rollback Plan

If you need to temporarily maintain backward compatibility:

1. Create a compatibility layer that mimics old API
2. Mark as deprecated
3. Plan migration timeline
4. Remove in next major version

## Resources

- [ADR-048: Static Architecture](../../../architecture/adrs/adr-048-static-architecture.md)
- [Platform Documentation](../../packages/platforms/)
- [Test Helper Documentation](../../packages/engine/test-helpers.md)
- [Engine API Reference](../../api/engine/)

## Questions?

If you encounter issues not covered in this guide:
1. Check the [troubleshooting guide](../../development/guides/troubleshooting.md)
2. Search existing issues
3. Ask in discussions
4. Contact maintainers