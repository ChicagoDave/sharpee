// Quick test to understand command history tracking
import { setupTestEngine } from './tests/test-helpers/setup-test-engine.js';
import { StandardCapabilities } from '@sharpee/world-model';

async function test() {
  const setup = setupTestEngine({ 
    includeCapabilities: true,
    includeObjects: true 
  });
  
  const { engine, world } = setup;
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