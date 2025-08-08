/**
 * Integration test for query system with quit action
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../src/game-engine';
import { WorldModel } from '@sharpee/world-model';
import { createQuitQueryHandler } from '@sharpee/stdlib';
import { MinimalTestStory } from '../stories';
import { setupTestEngine } from '../test-helpers/setup-test-engine';

describe('Query System Integration', () => {
  let engine: any;
  let world: WorldModel;
  let story: MinimalTestStory;

  beforeEach(() => {
    // Create a test engine with static dependencies
    const setup = setupTestEngine({ includeCapabilities: true });
    engine = setup.engine;
    world = setup.world;
    
    // Set up a minimal test story
    story = new MinimalTestStory();
    engine.setStory(story);
    
    // Register quit handler with query manager
    const queryManager = engine.getQueryManager();
    const quitHandler = createQuitQueryHandler();
    queryManager.registerHandler('quit', quitHandler);
    
    // Connect quit handler events to engine event source (like the engine does)
    quitHandler.getEventSource().subscribe((evt) => {
      engine['eventSource'].emit(evt);
      // Also emit through engine's event emitter for tests
      engine.emit('event', evt as any);
    });
  });

  it('should emit client.query event when quit action executes', async () => {
    // Start the engine
    engine.start();
    
    // Track events
    const events: any[] = [];
    engine.on('event', (event: any) => {
      events.push(event);
    });
    
    // Execute quit command
    const result = await engine.executeTurn('quit');
    
    expect(result.success).toBe(true);
    
    // Find the client.query event
    const queryEvent = events.find(e => e.type === 'client.query');
    expect(queryEvent).toBeDefined();
    expect(queryEvent.data.source).toBe('system');
    expect(queryEvent.data.type).toBe('multiple_choice');
    expect(queryEvent.data.messageId).toBe('quit_confirm_query');
    expect(queryEvent.data.options).toEqual(['quit', 'cancel']);
  });

  it('should intercept input when query is pending', async () => {
    engine.start();
    
    // Execute quit to trigger query
    await engine.executeTurn('quit');
    
    // Check that query manager has pending query
    const queryManager = engine.getQueryManager();
    expect(queryManager.hasPendingQuery()).toBe(true);
    
    const query = queryManager.getCurrentQuery();
    expect(query?.type).toBe('multiple_choice');
    
    // Try to respond
    const response = await engine.executeTurn('1');
    expect(response.success).toBe(true);
    expect(response.events.some(e => e.type === 'query.response')).toBe(true);
  });

  it('should handle quit cancellation', async () => {
    engine.start();
    
    const events: any[] = [];
    engine.on('event', (event: any) => {
      events.push(event);
    });
    
    // Execute quit
    await engine.executeTurn('quit');
    
    // Select "cancel" (option 2)
    await engine.executeTurn('2');
    
    // Should emit platform.quit_cancelled event
    const cancelEvent = events.find(e => e.type === 'platform.quit_cancelled');
    expect(cancelEvent).toBeDefined();
    
    // Query should be cleared
    const queryManager = engine.getQueryManager();
    expect(queryManager.hasPendingQuery()).toBe(false);
  });

  it('should handle invalid query responses', async () => {
    engine.start();
    
    const events: any[] = [];
    engine.on('event', (event: any) => {
      events.push(event);
    });
    
    // Execute quit
    await engine.executeTurn('quit');
    
    // Send invalid response
    await engine.executeTurn('maybe');
    
    // Should emit query.invalid event
    const invalidEvent = events.find(e => e.type === 'query.invalid');
    expect(invalidEvent).toBeDefined();
    expect(invalidEvent.data?.message || invalidEvent.payload?.message).toBeDefined();
    
    // Query should still be pending
    const queryManager = engine.getQueryManager();
    expect(queryManager.hasPendingQuery()).toBe(true);
  });

  it('should allow command interruption when configured', async () => {
    engine.start();
    
    // Create a query that allows interruption
    const queryManager = engine.getQueryManager();
    const { QuerySource, QueryType } = await import('@sharpee/core');
    
    // Don't await the query - it returns a promise that resolves when answered
    queryManager.askQuery({
      id: 'test_query',
      source: QuerySource.SYSTEM,
      type: QueryType.YES_NO,
      messageId: 'test_query',
      context: {},
      allowInterruption: true,
      created: Date.now()
    });
    
    // Try to execute a command
    const result = await engine.executeTurn('look');
    
    // Should process as interrupt
    expect(result.events.some(e => 
      e.type === 'query.response' && e.data.wasInterruption
    )).toBe(true);
    
    // Query should be cleared
    expect(queryManager.hasPendingQuery()).toBe(false);
  });
});
