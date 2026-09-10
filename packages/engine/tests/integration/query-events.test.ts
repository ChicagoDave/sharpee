/**
 * Simple tests for query event emission
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../src/game-engine';
import { WorldModel, EntityType, ActorTrait } from '@sharpee/world-model';
import { registerStandardCapabilities } from '@sharpee/stdlib';
import { Story } from '../../src/install/story';
import { setupTestEngine } from '../test-helpers/setup-test-engine';

describe('Query Event Emission', () => {
  let engine: GameEngine;
  let world: WorldModel;
  
  beforeEach(() => {
    // Create a minimal test story
    let playerId: string | undefined;
    const story: Story = {
      config: {
        id: 'test-story',
        title: 'Test Story',
        authors: ['Test Author'],
        version: '1.0.0'
      },
      
      // The player is built and placed by `initializeWorld` and merely looked
      // up here (ADR-327 D10). It used to be built unplaced in `createPlayer`
      // while `initializeWorld` reached for `world.getEntity('you')` — an id
      // that never existed yet, since initializeWorld runs first — and the
      // `if (player)` around the move swallowed the miss silently.
      createPlayer: (world: WorldModel) => world.getEntity(playerId!)!,

      initializeWorld: (world: WorldModel) => {
        // Register standard capabilities 
        registerStandardCapabilities(world);
        
        // Create a simple test room
        const room = world.createEntity('Test Room', EntityType.ROOM);
        const player = world.createEntity('You', EntityType.ACTOR);
        player.add(new ActorTrait());
        world.moveEntity(player.id, room.id);
        playerId = player.id;
      }
    };
    
    // Create engine with static dependencies
    const setup = setupTestEngine();
    engine = setup.engine;
    world = setup.world;
    
    // Set story and start
    engine.installStory(story);
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