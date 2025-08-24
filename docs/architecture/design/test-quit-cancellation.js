const { GameEngine } = require('./dist/game-engine');
const { WorldModel } = require('@sharpee/world-model');
const { createQuitQueryHandler } = require('@sharpee/stdlib');
const { MinimalTestStory } = require('./dist/tests/stories');
const { setupTestEngine } = require('./dist/tests/test-helpers/setup-test-engine');

async function test() {
  try {
    // Create a test engine with static dependencies
    const setup = setupTestEngine({ includeCapabilities: true });
    const engine = setup.engine;
    
    // Set up a minimal test story
    const story = new MinimalTestStory();
    engine.setStory(story);
    
    // Register quit handler with query manager
    const queryManager = engine.getQueryManager();
    const quitHandler = createQuitQueryHandler();
    queryManager.registerHandler('quit', quitHandler);
    
    // Connect quit handler events to engine event source
    quitHandler.getEventSource().subscribe((evt) => {
      engine['eventSource'].emit(evt);
      engine.emit('event', evt);
    });
    
    // Start the engine
    engine.start();
    
    // Track events
    const events = [];
    engine.on('event', (event) => {
      console.log('Event received:', event.type);
      events.push(event);
    });
    
    // Execute quit command
    console.log('Executing quit...');
    const quitResult = await engine.executeTurn('quit');
    console.log('Quit result:', quitResult.success);
    console.log('Quit events:', quitResult.events.map(e => e.type));
    
    // Select "cancel" (option 2)
    console.log('\nSelecting cancel (option 2)...');
    const cancelResult = await engine.executeTurn('2');
    console.log('Cancel result:', cancelResult.success);
    console.log('Cancel events:', cancelResult.events.map(e => e.type));
    
    // Check for platform.quit_cancelled event
    const cancelEvent = events.find(e => e.type === 'platform.quit_cancelled');
    console.log('\nplatform.quit_cancelled event found:', !!cancelEvent);
    
    // All events captured
    console.log('\nAll events captured:');
    events.forEach(e => console.log(' -', e.type));
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

test();