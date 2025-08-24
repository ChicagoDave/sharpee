/**
 * Historical Accuracy Tests
 * 
 * Verify that events contain complete snapshots allowing accurate
 * replay of past game states without querying the world model
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestEngine, createMinimalStory } from './test-helpers/setup-test-engine';
import { GameEngine } from '../src/game-engine';
import { ISemanticEvent } from '@sharpee/core';
import { MinimalTestStory } from './stories/minimal-test-story';

describe('Historical Accuracy - Atomic Events', () => {
  let engine: GameEngine;
  let events: ISemanticEvent[] = [];

  beforeEach(async () => {
    const setup = setupTestEngine({ includeObjects: true });
    engine = setup.engine;
    
    // Set a minimal story
    const story = new MinimalTestStory();
    engine.setStory(story);
    
    // Capture all events
    engine.on('event', (event) => {
      events.push(event as any);
    });
    
    events = [];
    await engine.start();
  });

  describe('Event Data Completeness', () => {
    it('should include complete entity snapshots in action events', async () => {
      // Take an item
      await engine.executeTurn('take lamp');
      
      // Find the success event
      const takeEvent = events.find(e => e.type === 'action.success' || e.type === 'if.event.taken');
      expect(takeEvent).toBeDefined();
      expect(takeEvent?.data).toBeDefined();
      
      const eventData = takeEvent?.data as any;
      
      // Should have complete item snapshot
      if (eventData.item) {
        expect(eventData.item).toHaveProperty('id');
        expect(eventData.item).toHaveProperty('name');
        expect(eventData.item).toHaveProperty('description');
        expect(eventData.item).toHaveProperty('traits');
      }
      
      // Should have actor snapshot
      if (eventData.actor) {
        expect(eventData.actor).toHaveProperty('id');
        expect(eventData.actor).toHaveProperty('name');
      }
    });

    it('should include room snapshots in movement events', async () => {
      // Move to another room
      await engine.executeTurn('go north');
      
      // Find movement event
      const moveEvent = events.find(e => 
        e.type === 'if.event.actor_moved' || 
        e.type === 'action.success'
      );
      
      expect(moveEvent).toBeDefined();
      const eventData = moveEvent?.data as any;
      
      // Should have source and destination room data
      if (eventData.fromRoom) {
        expect(eventData.fromRoom).toHaveProperty('id');
        expect(eventData.fromRoom).toHaveProperty('name');
      }
      
      if (eventData.toRoom) {
        expect(eventData.toRoom).toHaveProperty('id');
        expect(eventData.toRoom).toHaveProperty('name');
        expect(eventData.toRoom).toHaveProperty('description');
      }
    });

    it('should include container contents in opening events', async () => {
      // Try to open something
      await engine.executeTurn('open chest');
      
      const openEvent = events.find(e => 
        e.type === 'if.event.opened' || 
        e.type === 'action.success'
      );
      
      if (openEvent) {
        const eventData = openEvent.data as any;
        
        // Should have target snapshot
        if (eventData.target) {
          expect(eventData.target).toHaveProperty('id');
          expect(eventData.target).toHaveProperty('name');
          
          // If it's a container, should have contents
          if (eventData.target.traits?.container) {
            expect(eventData.contents).toBeDefined();
            expect(Array.isArray(eventData.contents)).toBe(true);
          }
        }
      }
    });
  });

  describe('Event Replay Without World Model', () => {
    it('should be able to reconstruct game state from events alone', async () => {
      // Execute several turns
      await engine.executeTurn('look');
      await engine.executeTurn('take lamp');
      await engine.executeTurn('go north');
      await engine.executeTurn('drop lamp');
      
      // Collect all success events
      const successEvents = events.filter(e => 
        e.type === 'action.success' || 
        e.type.startsWith('if.event.')
      );
      
      // Each event should be self-contained
      for (const event of successEvents) {
        expect(event.data).toBeDefined();
        
        // Event should not need world model queries
        const eventData = event.data as any;
        
        // Check for common patterns that would require world queries
        expect(eventData).not.toContain('$ref'); // No references
        expect(eventData).not.toContain('entityId'); // Has full entity data
        
        // Should have actual data, not just IDs
        if (eventData.actor) {
          expect(typeof eventData.actor).toBe('object');
          expect(eventData.actor.id).toBeDefined();
          expect(eventData.actor.name).toBeDefined();
        }
        
        if (eventData.target) {
          expect(typeof eventData.target).toBe('object');
          expect(eventData.target.id).toBeDefined();
          expect(eventData.target.name).toBeDefined();
        }
      }
    });

    it('should preserve entity state at time of event', async () => {
      // Take lamp
      await engine.executeTurn('take lamp');
      const takeEvent = events.find(e => e.type === 'if.event.taken');
      const lampAtTake = (takeEvent?.data as any)?.item;
      
      // Modify lamp somehow (if there was a way to change its state)
      // For now, just move with it
      await engine.executeTurn('go north');
      
      // Drop lamp
      await engine.executeTurn('drop lamp');
      const dropEvent = events.find(e => e.type === 'if.event.dropped');
      const lampAtDrop = (dropEvent?.data as any)?.item;
      
      // Both snapshots should exist and be complete
      expect(lampAtTake).toBeDefined();
      expect(lampAtDrop).toBeDefined();
      
      // They should have the same base properties
      if (lampAtTake && lampAtDrop) {
        expect(lampAtTake.id).toBe(lampAtDrop.id);
        expect(lampAtTake.name).toBe(lampAtDrop.name);
      }
    });
  });

  describe('Event Enrichment', () => {
    it('should include turn number in event data', async () => {
      await engine.executeTurn('look');
      
      const lookEvent = events.find(e => e.type === 'action.success');
      expect(lookEvent).toBeDefined();
      
      const eventData = lookEvent?.data as any;
      expect(eventData.turn).toBeDefined();
      expect(typeof eventData.turn).toBe('number');
    });

    it('should include actor and location in enriched events', async () => {
      await engine.executeTurn('look');
      
      const lookEvent = events.find(e => e.type === 'action.success');
      expect(lookEvent).toBeDefined();
      expect(lookEvent?.entities).toBeDefined();
      
      // After enrichment, should have actor and location
      expect(lookEvent?.entities.actor).toBeDefined();
      expect(lookEvent?.entities.location).toBeDefined();
    });

    it('should normalize event types to lowercase with dots', async () => {
      await engine.executeTurn('look');
      
      // All events should have normalized types
      for (const event of events) {
        expect(event.type).toBe(event.type.toLowerCase());
        expect(event.type).not.toContain('_'); // Should use dots, not underscores
      }
    });
  });

  describe('Function Serialization', () => {
    it('should handle functions in event data during save/load', async () => {
      // Create an event with a function provider
      const eventWithFunction: ISemanticEvent = {
        id: 'test-event',
        type: 'test.event',
        timestamp: Date.now(),
        entities: {},
        data: {
          staticValue: 'test',
          dynamicValue: () => 'dynamic result',
          nested: {
            anotherFunction: () => 42
          }
        }
      };
      
      // Emit the event
      (engine as any).eventSource.emit(eventWithFunction);
      
      // Get save data
      const saveData = (engine as any).createSaveData();
      
      // Check serialized events
      const serializedEvents = saveData.engineState.eventSource;
      const serializedEvent = serializedEvents.find((e: any) => e.id === 'test-event');
      
      expect(serializedEvent).toBeDefined();
      expect(serializedEvent?.data.dynamicValue).toEqual({
        __type: 'function',
        __marker: '[Function]'
      });
      
      // Load the save data
      (engine as any).loadSaveData(saveData);
      
      // After loading, functions should be placeholder functions
      const loadedEvents = (engine as any).eventSource.getAllEvents();
      const loadedEvent = loadedEvents.find((e: any) => e.id === 'test-event');
      
      expect(loadedEvent).toBeDefined();
      expect(typeof loadedEvent?.data.dynamicValue).toBe('function');
      expect(loadedEvent?.data.dynamicValue()).toBe('[Serialized Function]');
    });
  });
});