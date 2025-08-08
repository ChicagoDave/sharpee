// Quick test to understand command history tracking
import { GameEngine } from './dist/game-engine.js';
import { WorldModel, EntityType, StandardCapabilities } from '@sharpee/world-model';
import { registerStandardCapabilities, registerStandardActions } from '@sharpee/stdlib';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { createMockTextService } from './dist/test-helpers/mock-text-service.js';

async function test() {
  const world = new WorldModel();
  
  // Register capabilities
  registerStandardCapabilities(world);
  
  // Create basic entities
  const player = world.createEntity('You', EntityType.ACTOR);
  const room = world.createEntity('Test Room', EntityType.ROOM);
  world.moveEntity(player.id, room.id);
  
  // Set up engine
  const engine = new GameEngine(world, player);
  
  // Set up language and parser
  const langProvider = new EnglishLanguageProvider();
  const parser = new EnglishParser(world, langProvider);
  
  // Set dependencies
  engine.setTextService(createMockTextService());
  engine.languageProvider = langProvider;
  engine.parser = parser;
  engine.initialized = true;
  
  // Register actions
  registerStandardActions(engine.actionRegistry);
  
  engine.start();
  
  console.log('Testing successful command...');
  const result1 = await engine.executeTurn('look');
  console.log('Result:', { success: result1.success, actionId: result1.actionId });
  
  const historyData1 = world.getCapability(StandardCapabilities.COMMAND_HISTORY);
  console.log('History after look:', historyData1?.entries?.length || 0, 'entries');
  if (historyData1?.entries?.length > 0) {
    console.log('First entry:', historyData1.entries[0]);
  }
  
  console.log('\nTesting failed command...');
  const result2 = await engine.executeTurn('xyzzy');
  console.log('Result:', { success: result2.success, actionId: result2.actionId, error: result2.error });
  
  const historyData2 = world.getCapability(StandardCapabilities.COMMAND_HISTORY);
  console.log('History after xyzzy:', historyData2?.entries?.length || 0, 'entries');
  
  console.log('\nTesting inventory command...');
  const result3 = await engine.executeTurn('inventory');
  console.log('Result:', { success: result3.success, actionId: result3.actionId });
  
  const historyData3 = world.getCapability(StandardCapabilities.COMMAND_HISTORY);
  console.log('History after inventory:', historyData3?.entries?.length || 0, 'entries');
  if (historyData3?.entries?.length > 1) {
    console.log('Second entry:', historyData3.entries[1]);
  }
  
  process.exit(0);
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});