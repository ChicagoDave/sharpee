/**
 * Debug runner to test what's happening with the player
 */

import { GameEngine } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
// @ts-ignore - lang-en-us types not available yet
import { LanguageProvider } from '@sharpee/lang-en-us';
// @ts-ignore - text-services types not available yet
import { TextService } from '@sharpee/text-services';
import { story } from './index.js';

async function debugRun() {
  console.log('=== Debug Cloak of Darkness ===\n');
  
  try {
    // Create world and player using static architecture
    const world = new WorldModel();
    const createdPlayer = world.createEntity('player', EntityType.ACTOR);
    
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
      player: createdPlayer,
      parser,
      language,
      textService
    });
    
    // Set the story
    engine.setStory(story);
    
    // Start the engine to ensure initialization
    engine.start();
    
    // World is already available from above
    
    // Check player location
    const player = world.getPlayer();
    console.log('Player ID:', player?.id);
    console.log('Player name:', player?.name);
    
    const playerLoc = player ? world.getLocation(player.id) : undefined;
    console.log('Player location:', playerLoc);
    
    // Check if foyer exists by finding it
    const foyer = world.getAllEntities().find((e: any) => e.name === 'foyer');
    console.log('Foyer exists:', !!foyer);
    console.log('Foyer ID:', foyer?.id);
    
    // Check rooms
    // Check all entities
    const allEntities = world.getAllEntities();
    console.log('\nAll entities:', allEntities.length);
    allEntities.forEach((e: any) => {
      console.log(`- ${e.name} (${e.id}) - traits: ${Array.from(e.traits.keys()).join(', ')}`);
    });
    
    const rooms = world.getAllEntities().filter((e: any) => e.has('room'));
    console.log('\nRooms (with room trait):');
    rooms.forEach((room: any) => {
      console.log(`- ${room.name} (${room.id})`);
    });
    
    // Check player inventory
    if (player) {
      const contents = world.getContents(player.id);
      console.log('\nPlayer inventory:');
      contents.forEach((item: any) => {
        console.log(`- ${item.name} (${item.id})`);
      });
    }
    
    // Try executing a command to see if that initializes things
    console.log('\n=== After executing LOOK command ===');
    await engine.executeTurn('look');
    
    // Check again
    const playerLoc2 = player ? world.getLocation(player.id) : undefined;
    console.log('Player location after command:', playerLoc2);
    
    const rooms2 = world.getAllEntities().filter((e: any) => e.has('ROOM'));
    console.log('\nRooms after command:');
    rooms2.forEach((room: any) => {
      console.log(`- ${room.name} (${room.id})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugRun().catch(console.error);