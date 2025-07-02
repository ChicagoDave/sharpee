/**
 * Basic engine example
 * 
 * Demonstrates creating and running a simple game
 */

import { createStandardEngine, TurnResult } from '../src';
import { WorldModel } from '@sharpee/world-model';
import { registerStandardActions } from '@sharpee/actions';

// Register all standard actions
registerStandardActions();

// Create engine
const engine = createStandardEngine({
  collectTiming: true,
  onEvent: (event) => {
    console.log(`  [${event.sequence.turn}.${event.sequence.order}] ${event.type}`);
  }
});

// Get world and create a simple game
const world = engine.getWorld();

// Create a simple room
const kitchen = world.createEntity({
  id: 'kitchen',
  traits: {
    ROOM: {
      visited: false
    },
    IDENTITY: {
      name: 'Kitchen',
      nouns: ['kitchen', 'room'],
      adjectives: [],
      description: 'A small but functional kitchen.'
    }
  }
});

// Create some objects
const sword = world.createEntity({
  id: 'sword',
  traits: {
    IDENTITY: {
      name: 'sword',
      nouns: ['sword', 'blade'],
      adjectives: ['sharp', 'steel'],
      description: 'A sharp steel sword.'
    },
    PORTABLE: {
      weight: 5
    }
  }
});

const ball = world.createEntity({
  id: 'ball',
  traits: {
    IDENTITY: {
      name: 'red ball',
      nouns: ['ball'],
      adjectives: ['red', 'rubber'],
      description: 'A red rubber ball.'
    },
    PORTABLE: {
      weight: 1
    }
  }
});

// Place entities
world.setLocation(engine.getContext().player.id, kitchen.id);
world.setLocation(sword.id, kitchen.id);
world.setLocation(ball.id, kitchen.id);

// Update vocabulary for all entities
engine.updateScopeVocabulary();

// Start the engine
console.log('Starting Sharpee Engine Demo\n');
engine.start();

// Helper to display turn results
function displayResult(result: TurnResult) {
  console.log(`\nTurn ${result.turn}: "${result.command.originalInput}"`);
  
  if (result.success) {
    console.log('✓ Success');
    console.log(`  Events: ${result.events.length}`);
    console.log(`  World changes: ${result.worldChanges.length}`);
    
    if (result.timing) {
      console.log(`  Time: ${result.timing.duration}ms`);
    }
  } else {
    console.log('✗ Failed:', result.error?.message);
  }
}

// Run some example commands
async function runDemo() {
  try {
    // Look around
    console.log('\n--- Looking Around ---');
    let result = await engine.executeTurn('look');
    displayResult(result);

    // Take the sword
    console.log('\n--- Taking Items ---');
    result = await engine.executeTurn('take sword');
    displayResult(result);

    // Try taking it again
    result = await engine.executeTurn('take sword');
    displayResult(result);

    // Take the ball
    result = await engine.executeTurn('take red ball');
    displayResult(result);

    // Check inventory
    console.log('\n--- Inventory ---');
    result = await engine.executeTurn('inventory');
    displayResult(result);

    // Drop something
    console.log('\n--- Dropping Items ---');
    result = await engine.executeTurn('drop ball');
    displayResult(result);

    // Try an unknown command
    console.log('\n--- Error Handling ---');
    result = await engine.executeTurn('fly north');
    displayResult(result);

    // Show final state
    console.log('\n--- Final State ---');
    const context = engine.getContext();
    console.log(`Total turns: ${context.currentTurn - 1}`);
    console.log(`Items in history: ${context.history.length}`);
    
    const playerContents = world.getContents(context.player.id);
    console.log(`Player carrying: ${playerContents.map(e => e.id).join(', ')}`);

  } catch (error) {
    console.error('Demo error:', error);
  }
}

// Run the demo
runDemo().then(() => {
  console.log('\nDemo complete!');
  engine.stop();
});
