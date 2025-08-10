/**
 * Test runner for Cloak of Darkness
 * 
 * This demonstrates how to run the story with the Sharpee engine using static loading
 */

import { GameEngine, TurnResult } from '@sharpee/engine';
import { WorldModel, IFEntity, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
// @ts-ignore - lang-en-us types not available yet
import { LanguageProvider } from '@sharpee/lang-en-us';
// @ts-ignore - text-services types not available yet
import { TextService } from '@sharpee/text-services';
import { story } from './index.js';

async function runStory() {
  console.log('=== Cloak of Darkness ===');
  console.log('A Sharpee IF demonstration');
  console.log('');
  
  try {
    // Create world and player
    const world = new WorldModel();
    const player = world.createEntity('player', EntityType.ACTOR);
    
    // Create parser, language, and text service
    const language = new LanguageProvider();
    const parser = new Parser(language);
    const textService = new TextService(language);
    
    // Extend parser and language with story-specific vocabulary/messages
    if (story.extendParser) {
      story.extendParser(parser);
    }
    if (story.extendLanguage) {
      story.extendLanguage(language);
    }
    
    // Create engine with static dependencies
    const engine = new GameEngine({
      world,
      player,
      parser,
      language,
      textService
    });
    
    // Set the story and start the engine
    engine.setStory(story);
    engine.start();
    console.log('Engine started, running:', (engine as any).running);
    
    // Listen for text output
    engine.on('text:output', (text: string, turn: number) => {
      console.log(text);
    });
    
    // Listen for turn completion
    engine.on('turn:complete', (result: TurnResult) => {
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
    });
    
    // Listen for errors
    engine.on('turn:failed', (error: Error, turn: number) => {
      console.error(`Turn ${turn} failed:`, error.message);
    });
    
    // Listen for game over
    engine.on('game:over', (context: any) => {
      console.log('\n=== Game Over ===');
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
