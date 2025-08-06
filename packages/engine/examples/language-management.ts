/**
 * Example: Using the simplified language management API
 * 
 * This example shows how to use the new automatic language setup
 * instead of manual parser registration.
 */

import { GameEngine, createStandardEngine } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';

// Example 1: Setting language directly
async function example1() {
  const engine = createStandardEngine();
  
  // Simply set the language - parser and language provider are loaded automatically
  await engine.setLanguage('en-US');
  
  // Now the engine is ready to use with English (US) language support
  engine.start();
  
  // You can access the parser and language provider if needed
  const parser = engine.getParser();
  const languageProvider = engine.getLanguageProvider();
  
  console.log('Language:', languageProvider?.getLanguageCode()); // 'en-US'
}

// Example 2: Language from story configuration
async function example2() {
  const story = {
    config: {
      id: 'my-story',
      title: 'My Adventure',
      author: 'Jane Doe',
      version: '1.0.0',
      language: 'es' // Spanish
    },
    
    initializeWorld(world: WorldModel) {
      // Create story world...
    },
    
    createPlayer(world: WorldModel) {
      // Create and return player entity...
      return world.createEntity('Tú', EntityType.ACTOR);
    }
  };
  
  const engine = createStandardEngine();
  
  // setStory automatically uses the language from config
  await engine.setStory(story);
  
  // Engine is now using Spanish parser and language provider
  engine.start();
}

// Example 3: Changing language at runtime
async function example3() {
  const engine = createStandardEngine();
  
  // Start with English
  await engine.setLanguage('en-US');
  engine.start();
  
  // ... later in the game ...
  
  // Switch to Spanish
  await engine.setLanguage('es');
  
  // The engine now uses Spanish parser and language provider
  // This could be useful for:
  // - Language selection in game menu
  // - Multi-language educational games
  // - Localization testing
}

// Example 4: Error handling
async function example4() {
  const engine = createStandardEngine();
  
  try {
    // Try to set an unsupported language
    await engine.setLanguage('klingon');
  } catch (error) {
    console.error('Language error:', error.message);
    // Expected: "Parser package not found for language: klingon. Expected package: @sharpee/parser-klingon"
    
    // Fall back to English
    await engine.setLanguage('en-US');
  }
  
  engine.start();
}

// Example 5: Custom parser registration (advanced use case)
async function example5() {
  // You can still use ParserFactory directly if needed
  import { ParserFactory } from '@sharpee/stdlib';
  import { MyCustomParser } from './my-custom-parser';
  
  // Register a custom parser
  ParserFactory.registerParser('my-lang', MyCustomParser);
  
  const engine = createStandardEngine();
  
  // This will use your registered parser instead of trying to load a package
  await engine.setLanguage('my-lang');
  
  engine.start();
}

// Run examples
if (require.main === module) {
  (async () => {
    console.log('Example 1: Direct language setting');
    await example1();
    
    console.log('\nExample 2: Language from story config');
    await example2();
    
    console.log('\nExample 3: Runtime language change');
    await example3();
    
    console.log('\nExample 4: Error handling');
    await example4();
  })();
}
