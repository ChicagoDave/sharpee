/**
 * Tests for the reaction system in EventProcessor
 */

import { describe, it, beforeEach, expect, vi } from 'vitest';
import { EventProcessor } from '../../src/processor';
import { createMockWorld, MockWorldModel } from '../fixtures/mock-world';
import { createTestEvent } from '../fixtures/test-events';
import { SemanticEvent } from '@sharpee/core';

describe('EventProcessor - Reaction System', () => {
  let mockWorld: MockWorldModel;
  let processor: EventProcessor;
  
  beforeEach(() => {
    mockWorld = createMockWorld();
    processor = new EventProcessor(mockWorld as any);
  });
  
  describe('reaction processing', () => {
    it('should process simple reactions', () => {
      const triggerEvent = createTestEvent('trigger', 'player', { action: 'pull_lever' });
      const reactionEvent = createTestEvent('state_change', 'door', { open: true });
      
      // Mock the processor to return reactions
      const originalProcessSingle = (processor as any).processSingleEvent;
      (processor as any).processSingleEvent = vi.fn().mockImplementation((event: SemanticEvent) => {
        if (event.type === 'trigger') {
          return {
            success: true,
            changes: [],
            reactions: [reactionEvent]
          };
        }
        return originalProcessSingle.call(processor, event);
      });
      
      const result = processor.processEvents([triggerEvent]);
      
      expect(result.applied).toContain(triggerEvent);
      expect(result.applied).toContain(reactionEvent);
      expect(result.reactions).toContain(reactionEvent);
    });
    
    it('should handle nested reactions', () => {
      const event1 = createTestEvent('action1', 'player', {});
      const event2 = createTestEvent('action2', 'system', {});
      const event3 = createTestEvent('action3', 'world', {});
      
      // Set up chain: event1 -> event2 -> event3
      const originalProcessSingle = (processor as any).processSingleEvent;
      (processor as any).processSingleEvent = vi.fn().mockImplementation((event: SemanticEvent) => {
        if (event.type === 'action1') {
          return { success: true, changes: [], reactions: [event2] };
        } else if (event.type === 'action2') {
          return { success: true, changes: [], reactions: [event3] };
        }
        return originalProcessSingle.call(processor, event);
      });
      
      const result = processor.processEvents([event1]);
      
      expect(result.applied).toHaveLength(3);
      expect(result.reactions).toContain(event2);
      expect(result.reactions).toContain(event3);
    });
    
    it('should respect maxReactionDepth', () => {
      const depthProcessor = new EventProcessor(mockWorld as any, {
        maxReactionDepth: 2
      });
      
      // Create a chain of reactions
      const events: SemanticEvent[] = [];
      for (let i = 0; i < 5; i++) {
        events.push(createTestEvent(`action${i}`, 'system', { level: i }));
      }
      
      // Mock to create infinite reaction chain
      const originalProcessSingle = (depthProcessor as any).processSingleEvent;
      (depthProcessor as any).processSingleEvent = vi.fn().mockImplementation((event: SemanticEvent) => {
        const match = event.type.match(/action(\d+)/);
        if (match) {
          const level = parseInt(match[1]);
          if (level < 4) {
            return { 
              success: true, 
              changes: [], 
              reactions: [events[level + 1]] 
            };
          }
        }
        return originalProcessSingle.call(depthProcessor, event);
      });
      
      // Spy on console.warn
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = depthProcessor.processEvents([events[0]]);
      
      // Should only process up to depth 2 (3 events total: 0, 1, 2)
      expect(result.applied).toHaveLength(3);
      expect(warnSpy).toHaveBeenCalledWith('Maximum reaction depth reached, stopping processing');
      
      warnSpy.mockRestore();
    });
    
    it('should handle failed reactions', () => {
      const triggerEvent = createTestEvent('trigger', 'player', {});
      const successReaction = createTestEvent('success_reaction', 'system', {});
      const failReaction = createTestEvent('fail_reaction', 'system', {});
      
      // Set up validation to fail for failReaction
      mockWorld.setCanApplyResult(failReaction, false);
      
      // Mock reactions
      const originalProcessSingle = (processor as any).processSingleEvent;
      (processor as any).processSingleEvent = vi.fn().mockImplementation((event: SemanticEvent) => {
        if (event.type === 'trigger') {
          return {
            success: true,
            changes: [],
            reactions: [successReaction, failReaction]
          };
        }
        return originalProcessSingle.call(processor, event);
      });
      
      const result = processor.processEvents([triggerEvent]);
      
      expect(result.applied).toContain(triggerEvent);
      expect(result.applied).toContain(successReaction);
      expect(result.applied).not.toContain(failReaction);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].event).toBe(failReaction);
    });
    
    it('should not process reactions if initial event fails', () => {
      const failEvent = createTestEvent('fail_trigger', 'player', {});
      const reactionEvent = createTestEvent('reaction', 'system', {});
      
      // Make the initial event fail validation
      mockWorld.setCanApplyResult(failEvent, false);
      
      const result = processor.processEvents([failEvent]);
      
      expect(result.applied).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.reactions).toHaveLength(0);
    });
  });
});
