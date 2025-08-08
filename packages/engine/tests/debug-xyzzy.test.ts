import { describe, it, expect } from 'vitest';
import { setupTestEngine } from './test-helpers/setup-test-engine';
import { StandardCapabilities } from '@sharpee/world-model';
import { CommandHistoryData } from '@sharpee/stdlib';

describe('Debug XYZZY Test', () => {
  it('should not track xyzzy in command history but should emit events', async () => {
    const setup = setupTestEngine({ 
      includeCapabilities: true,
      includeObjects: true 
    });
    
    const { engine, world } = setup;
    engine.start();
    
    // Track emitted events
    const emittedEvents: any[] = [];
    engine.on('event', (event) => {
      emittedEvents.push(event);
    });
    
    // Execute xyzzy command (which should fail)
    console.log('Executing xyzzy...');
    const result = await engine.executeTurn('xyzzy');
    console.log('Result:', {
      success: result.success,
      error: result.error,
      actionId: result.actionId,
      events: result.events.map(e => ({ type: e.type, data: e.data }))
    });
    
    // Check command history - should be empty for failed commands
    const historyData = world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData;
    console.log('History entries:', historyData?.entries || []);
    
    // Check that events were emitted even though command failed
    console.log('Emitted events:', emittedEvents.map(e => ({ type: e.type, data: e.data })));
    
    // The test expectations
    expect(result.success).toBe(false);
    expect(historyData.entries).toHaveLength(0); // No history for failed commands
    expect(result.events.length).toBeGreaterThan(0); // But events should exist
    expect(result.events.some(e => e.type === 'command.failed')).toBe(true);
    expect(emittedEvents.length).toBeGreaterThan(0); // Events should be emitted
  });
  
  it('should track successful commands in history and emit events', async () => {
    const setup = setupTestEngine({ 
      includeCapabilities: true,
      includeObjects: true 
    });
    
    const { engine, world } = setup;
    engine.start();
    
    // Track emitted events
    const emittedEvents: any[] = [];
    engine.on('event', (event) => {
      emittedEvents.push(event);
    });
    
    // Execute a successful command
    const result = await engine.executeTurn('look');
    
    // Check command history - should have the successful command
    const historyData = world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData;
    
    // The test expectations
    expect(result.success).toBe(true);
    expect(historyData.entries).toHaveLength(1); // History for successful commands
    expect(historyData.entries[0].originalText).toBe('look');
    expect(result.events.length).toBeGreaterThan(0); // Events should exist
    expect(emittedEvents.length).toBeGreaterThan(0); // Events should be emitted
  });
});