/**
 * Test runner for Cloak of Darkness
 * 
 * This demonstrates how to run the story with the Sharpee engine
 */

import { createEngineWithStory, TurnResult } from '@sharpee/engine';
import { story } from './index.js';

async function runStory() {
  console.log('=== Cloak of Darkness ===');
  console.log('A Sharpee IF demonstration');
  console.log('');
  
  try {
    // Create engine with the story
    const engine = await createEngineWithStory(story);
    
    // Start the engine
    engine.start();
    console.log('Engine started, running:', (engine as any).running);
    
    // Listen for turn completion to display output
    engine.on('turn:complete', (result: TurnResult) => {
      console.log(`\nTurn ${result.turn}: ${result.command.rawInput}`);
      console.log('---');
      console.log('Engine still running after turn:', (engine as any).running);
    });
    
    // Listen for errors
    engine.on('turn:failed', (error: Error, turn: number) => {
      console.error(`Turn ${turn} failed:`, error.message);
    });
    
    // Listen for game over
    engine.on('game:over', (context) => {
      console.log('Game over event fired!');
    });
    
    // Execute some test commands
    const commands = [
      'look',
      'examine cloak',
      'west',
      'look',
      'hang cloak on hook',
      'east',
      'south',
      'examine message',
      'read message'
    ];
    
    for (const command of commands) {
      console.log(`\n> ${command}`);
      try {
        await engine.executeTurn(command);
      } catch (error) {
        console.error(`Error executing command '${command}':`, error);
        // Continue with next command instead of crashing
      }
    }
    
    console.log('\n=== Story Complete ===');
    
  } catch (error) {
    console.error('Error running story:', error);
  }
}

// Run the story if this is the main module
runStory().catch(console.error);

export { runStory };
