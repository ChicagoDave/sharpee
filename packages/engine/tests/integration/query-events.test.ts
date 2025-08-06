/**
 * Simple tests for query event emission
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createStandardEngine } from '../../src/game-engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { registerStandardCapabilities } from '@sharpee/stdlib';
import { createMockTextService } from '../../src/test-helpers/mock-text-service';
import { Story } from '../../src/story';

describe('Query Event Emission', () => {
  let engine: any;
  let world: WorldModel;
  
  beforeEach(async () => {
    // Create a minimal test story
    const story: Story = {
      config: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        language: 'en-us'
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
    
    // Create engine 
    engine = createStandardEngine();
    world = engine.getWorld();
    
    // Set text service and language BEFORE story to avoid hanging
    const textService = createMockTextService();
    engine.setTextService(textService);
    await engine.setLanguage('en-us');
    
    // Set up the story
    await engine.setStory(story);
    
    // Start the engine
    engine.start();
  });

  it('should emit client.query event when quit is executed', async () => {
    // Track events
    const events: any[] = [];
    
    // Execute quit command
    const result = await engine.executeTurn('quit');
    
    expect(result.success).toBe(true);
    
    // Check that client.query event is in the result
    const queryEvent = result.events.find((e: any) => e.type === 'client.query');
    expect(queryEvent).toBeDefined();
    expect(queryEvent.data.type).toBe('quit_confirmation');
    expect(queryEvent.data.messageId).toBe('quit_confirm_query');
  });

  it('should emit platform.quit_requested event', async () => {
    // Execute quit command
    const result = await engine.executeTurn('quit');
    
    expect(result.success).toBe(true);
    
    // Check for platform.quit_requested event
    const quitEvent = result.events.find((e: any) => e.type === 'platform.quit_requested');
    expect(quitEvent).toBeDefined();
  });

  it('should emit if.event.quit_requested event', async () => {
    // Execute quit command
    const result = await engine.executeTurn('quit');
    
    expect(result.success).toBe(true);
    
    // Check for if.event.quit_requested event
    const ifEvent = result.events.find((e: any) => e.type === 'if.event.quit_requested');
    expect(ifEvent).toBeDefined();
  });
});