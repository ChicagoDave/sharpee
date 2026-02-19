/**
 * Test script for parser events debug command
 */

const runStory = async () => {
  try {
    console.log('=== Testing Parser Events Debug Command ===\n');
    
    // Load the story
    const { story } = require('./dist/index.js');
    
    // Initialize the game engine 
    const { GameEngine } = require('@sharpee/engine');
    const { renderToString } = require('@sharpee/text-service');
    const { EnglishParser } = require('@sharpee/parser-en-us');
    const { EnglishLanguageProvider } = require('@sharpee/lang-en-us');
    const { TextService } = require('../../packages/text-services/dist/index.js');
    
    // Create language and parser instances
    const language = new EnglishLanguageProvider();
    const parser = new EnglishParser(language, story.vocabulary);
    const textService = new TextService();
    
    // Create the engine
    const engine = new GameEngine({
      world: story.world,
      actionRegistry: story.actions,
      eventProcessor: story.eventProcessor,
      parser,
      language,
      textService
    });
    
    // Set the story
    engine.setStory(story);
    
    // Start the engine
    engine.start();
    console.log('Engine started successfully\n');
    
    // Listen for text output
    engine.on('text:output', (blocks, turn) => {
      console.log(renderToString(blocks));
    });
    
    // Listen for turn completion
    engine.on('turn:complete', (result) => {
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      
      // Check for system events in the result
      const systemEvents = result.events.filter(e => 
        e.type.startsWith('system.parser') || 
        e.type.startsWith('system.validation')
      );
      
      if (systemEvents.length > 0) {
        console.log('\n[SYSTEM EVENTS DETECTED]:');
        systemEvents.forEach(event => {
          console.log(`  - ${event.type}: ${JSON.stringify(event.data)}`);
        });
      }
    });
    
    // Execute test commands
    const commands = [
      'look',                    // Normal command
      'parser events on',        // Turn on parser events
      'examine cloak',          // Should show parser events
      'validation events on',   // Turn on validation events  
      'west',                   // Should show parser and validation events
      'parser events off',      // Turn off parser events
      'east',                   // Should only show validation events
      'validation events off',  // Turn off validation events
      'south'                   // Should show no system events
    ];
    
    for (const command of commands) {
      console.log(`\n> ${command}`);
      try {
        await engine.executeTurn(command);
      } catch (error) {
        console.error(`Error executing command '${command}':`, error.message);
      }
    }
    
    console.log('\n=== Test Complete ===');
    process.exit(0);
    
  } catch (error) {
    console.error('Error running test:', error);
    process.exit(1);
  }
}

// Run the story
runStory();