/**
 * Simple tests for query event emission
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../src/game-engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { registerStandardCapabilities } from '@sharpee/stdlib';
import { Story } from '../../src/story';
import { setupTestEngine } from '../test-helpers/setup-test-engine';

describe('Query Event Emission', () => {
  let engine: GameEngine;
  let world: WorldModel;
  
  beforeEach(() => {
    // Create a minimal test story
    const story: Story = {
      config: {
        id: 'test-story',
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0'
      },
      
      createPlayer: (world: WorldModel) => {
        return world.createEntity('You', EntityType.ACTOR);
      },
      
      initializeWorld: (world: WorldModel) => {
        // Register standard capabilities 
        registerStandardCapabilities(world);
        
        // Create a simple test room
        const room = world.createEntity('Test Room', EntityType.ROOM);
        const player = world.getEntity('you');
        if (player) {
          world.moveEntity(player.id, room.id);
        }
      }
    };
    
    // Create engine with static dependencies
    const setup = setupTestEngine();
    engine = setup.engine;
    world = setup.world;
    
    // Set story and start
    engine.setStory(story);
    engine.start();
  });
  
  it('should emit client.query event when quit is executed', async () => {
    const events: any[] = [];
    
    // Listen for query events
    engine.on('event', (event: any) => {
      if (event.type === 'client.query') {
        events.push(event);
      }
    });
    
    // Execute quit command
    await engine.executeTurn('quit');
    
    // Check that query event was emitted
    const queryEvents = events.filter(e => e.type === 'client.query');
    expect(queryEvents.length).toBeGreaterThan(0);
    
    const queryEvent = queryEvents[0];
    expect(queryEvent.data).toBeDefined();
    expect(queryEvent.data.queryId).toBeDefined();
    expect(queryEvent.data.prompt).toContain('quit');
  });
  
  it('should emit platform.quit_requested event', async () => {
    const events: any[] = [];
    
    // Listen for platform events
    engine.on('event', (event: any) => {
      events.push(event);
    });
    
    // Execute quit command
    await engine.executeTurn('quit');
    
    // Check for platform.quit_requested event
    const quitEvents = events.filter(e => e.type === 'platform.quit_requested');
    expect(quitEvents.length).toBeGreaterThan(0);
  });
  
  it('should emit if.event.quit_requested event', async () => {
    const events: any[] = [];
    
    // Listen for all events
    engine.on('event', (event: any) => {
      events.push(event);
    });
    
    // Execute quit command  
    await engine.executeTurn('quit');
    
    // Check for if.event.quit_requested
    const ifEvents = events.filter(e => e.type === 'if.event.quit_requested');
    expect(ifEvents.length).toBeGreaterThan(0);
  });
});