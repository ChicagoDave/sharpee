/**
 * Unit tests for EventProcessor class
 */

import { EventProcessor } from '../../src/processor';
import { createMockWorld, MockWorldModel } from '../fixtures/mock-world';
import {
  moveEvent,
  invalidMoveEvent,
  stateChangeEvent,
  lookEvent,
  eventBatch,
  createTestEvent
} from '../fixtures/test-events';
import { WorldChange } from '@sharpee/world-model';

describe('EventProcessor', () => {
  let mockWorld: MockWorldModel;
  let processor: EventProcessor;
  
  beforeEach(() => {
    mockWorld = createMockWorld();
    processor = new EventProcessor(mockWorld as any);
  });
  
  describe('constructor', () => {
    it('should create processor with default options', () => {
      expect(processor).toBeDefined();
      expect(processor.getWorld()).toBe(mockWorld);
    });
    
    it('should create processor with custom options', () => {
      const customProcessor = new EventProcessor(mockWorld as any, {
        validate: false,
        preview: true,
        maxReactionDepth: 5
      });
      expect(customProcessor).toBeDefined();
    });
    
    it('should register standard handlers on creation', () => {
      // Check that handlers were registered
      expect(mockWorld.registeredHandlers.length).toBeGreaterThan(0);
      // Check for actual IF event types that are registered
      expect(mockWorld.registeredHandlers).toContain('taken');
      expect(mockWorld.registeredHandlers).toContain('dropped');
      expect(mockWorld.registeredHandlers).toContain('opened');
      expect(mockWorld.registeredHandlers).toContain('closed');
    });
  });
  
  describe('processEvents', () => {
    it('should process a single valid event', () => {
      const result = processor.processEvents([moveEvent]);
      
      expect(result.applied).toHaveLength(1);
      expect(result.applied[0]).toBe(moveEvent);
      expect(result.failed).toHaveLength(0);
      expect(mockWorld.getAppliedEvents()).toContainEqual(moveEvent);
    });
    
    it('should process multiple events', () => {
      const result = processor.processEvents(eventBatch);
      
      expect(result.applied).toHaveLength(eventBatch.length);
      expect(result.failed).toHaveLength(0);
      expect(mockWorld.getAppliedEvents()).toHaveLength(eventBatch.length);
    });
    
    it('should handle validation failures', () => {
      // Set up validation to fail for this event
      mockWorld.setCanApplyResult(invalidMoveEvent, false);
      
      const result = processor.processEvents([invalidMoveEvent]);
      
      expect(result.applied).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].event).toBe(invalidMoveEvent);
      expect(result.failed[0].reason).toContain('validation failed');
    });
    
    it('should skip validation when validate option is false', () => {
      const noValidateProcessor = new EventProcessor(mockWorld as any, {
        validate: false
      });
      
      // Set validation to fail
      mockWorld.setCanApplyResult(moveEvent, false);
      
      const result = noValidateProcessor.processEvents([moveEvent]);
      
      // Should still apply because validation is skipped
      expect(result.applied).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
    });
    
    it('should capture preview changes when preview option is true', () => {
      const previewProcessor = new EventProcessor(mockWorld as any, {
        preview: true
      });
      
      const expectedChanges: WorldChange[] = [
        {
          type: 'move',
          entityId: 'player',
          oldValue: 'room1',
          newValue: 'room2',
          details: { direction: 'north' }
        }
      ];
      
      mockWorld.setPreviewResult(moveEvent, expectedChanges);
      
      const result = previewProcessor.processEvents([moveEvent]);
      
      expect(result.changes).toEqual(expectedChanges);
    });
    
    it('should handle events that throw errors', () => {
      const errorEvent = createTestEvent('error_event', 'player', {});
      
      // Make applyEvent throw an error
      mockWorld.applyEvent = jest.fn().mockImplementation((event) => {
        if (event.type === 'error_event') {
          throw new Error('Test error');
        }
      });
      
      const result = processor.processEvents([errorEvent]);
      
      expect(result.applied).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].reason).toBe('Test error');
    });
  });
  
  describe('setOptions', () => {
    it('should update processor options', () => {
      const event = createTestEvent('test', 'player', {});
      
      // Initially validation should pass
      const result1 = processor.processEvents([event]);
      expect(result1.applied).toHaveLength(1);
      
      // Update options to disable validation
      mockWorld.setCanApplyResult(event, false);
      processor.setOptions({ validate: false });
      
      // Now should pass despite validation failure
      mockWorld.clearAppliedEvents();
      const result2 = processor.processEvents([event]);
      expect(result2.applied).toHaveLength(1);
    });
  });
  
  describe('getWorld', () => {
    it('should return the world model', () => {
      expect(processor.getWorld()).toBe(mockWorld);
    });
  });
});
