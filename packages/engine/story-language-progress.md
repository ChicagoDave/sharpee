# Engine Build Progress - Story & Language Support

## What We've Implemented:

1. **Story Configuration**
   - Created `Story` interface with language configuration
   - Story has `config.language` property (e.g., "en-us")
   - Language code maps to package name: `@sharpee/lang-{language}`

2. **Language Provider Integration**
   - Engine now requires a LanguageProvider for the parser
   - CommandExecutor accepts languageProvider in options
   - GameEngine can load language provider from story

3. **Story-Aware Engine**
   - `setStory()` method to configure engine with a story
   - `createEngineWithStory()` factory for story-based engines
   - Story initializes world, creates player, registers custom actions

4. **Fixed API Issues**
   - Changed `player.addTrait()` to `player.add()`
   - Fixed trait property access with proper type casting
   - Updated TurnPhase to use enum consistently

## Usage Pattern:

```typescript
// Define a story
const myStory: Story = {
  config: {
    title: "My Adventure",
    author: "Author Name",
    version: "1.0.0",
    language: "en-us"  // This loads @sharpee/lang-en-us
  },
  
  initializeWorld(world: WorldModel) {
    // Create rooms, items, etc.
  },
  
  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('player', 'You');
    // Add traits...
    return player;
  }
};

// Create engine with story
const engine = await createEngineWithStory(myStory);
engine.start();

// Or set story on existing engine
const engine = createStandardEngine();
await engine.setStory(myStory);
engine.start();
```

## Remaining Issues:
- Missing @sharpee/event-processor module (needs to be built)
- Text service event handling issues
