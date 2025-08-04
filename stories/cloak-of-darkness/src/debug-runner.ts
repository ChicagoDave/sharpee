/**
 * Debug runner to test what's happening with the player
 */

import { createEngineWithStory } from '@sharpee/engine';
import { story } from './index.js';

async function debugRun() {
  console.log('=== Debug Cloak of Darkness ===\n');
  
  try {
    const engine = await createEngineWithStory(story);
    
    // Start the engine to ensure initialization
    engine.start();
    
    // Get the world
    const world = (engine as any).world;
    
    // Check player location
    const player = world.getPlayer();
    console.log('Player ID:', player?.id);
    console.log('Player name:', player?.name);
    
    const playerLoc = world.getLocation(player?.id);
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
    const contents = world.getContents(player?.id);
    console.log('\nPlayer inventory:');
    contents.forEach((item: any) => {
      console.log(`- ${item.name} (${item.id})`);
    });
    
    // Try executing a command to see if that initializes things
    console.log('\n=== After executing LOOK command ===');
    await engine.executeTurn('look');
    
    // Check again
    const playerLoc2 = world.getLocation(player?.id);
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