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
    world.setPlayer(player.id); // Register as the player so getPlayer() works
    
    // Create parser, language, and text service
    const language = new LanguageProvider();
    const parser = new Parser(language);
    const textService = new TextService();
    textService.setLanguageProvider(language);
    
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
      'debug:location',  // Debug command to check state
      'look',
      'examine message',
      'read message'
    ];

    // Add debug command handler
    const originalExecuteTurn = engine.executeTurn.bind(engine);
    (engine as any).executeTurn = async (command: string) => {
      if (command === 'debug:location') {
        const player = world.getPlayer();
        const loc = player ? world.getLocation(player.id) : null;
        const locEntity = loc ? world.getEntity(loc) : null;
        const inventory = player ? world.getContents(player.id) : [];
        console.log('\n=== DEBUG ===');
        console.log('Player ID:', player?.id);
        console.log('Location ID:', loc);
        console.log('Location Name:', locEntity?.name);
        console.log('Location Contents:', world.getContents(loc || '').map((e: any) => e.name));
        console.log('Player Inventory:', inventory.map((e: any) => e.name));
        // Check cloak location
        const cloak = world.getAllEntities().find((e: any) => e.name === 'velvet cloak');
        if (cloak) {
          console.log('Cloak Location:', world.getLocation(cloak.id));
        }
        console.log('=============\n');
        return { events: [], success: true, turn: 0, input: command } as TurnResult;
      }
      return originalExecuteTurn(command);
    };
    
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
