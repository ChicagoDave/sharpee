/**
 * Tests for the reaction system in EventProcessor
 *
 * Uses the public API: registerHandler() + processEvents().
 * Handlers return EmitEffect to produce reaction events that flow
 * through the processor's reaction pipeline.
 *
 * Note: The EffectProcessor's emit callback processes reactions
 * immediately via recursive processEvents() calls. For single-level
 * reactions, results flow back to the caller. For nested reactions,
 * events are applied to the world via the callback — we verify those
 * via mockWorld.getAppliedEvents().
 */

import { describe, it, beforeEach, expect, vi } from 'vitest';
import { EventProcessor } from '../../src/processor';
import { WorldModel } from '@sharpee/world-model';
import { createMockWorld, MockWorldModel } from '../fixtures/mock-world';
import { createTestEvent } from '../fixtures/test-events';
import type { Effect } from '../../src/effects';

describe('EventProcessor - Reaction System', () => {
  let mockWorld: MockWorldModel;
  let processor: EventProcessor;

  beforeEach(() => {
    mockWorld = createMockWorld();
    processor = new EventProcessor(mockWorld as unknown as WorldModel);
  });

  describe('reaction processing via registerHandler', () => {
    it('should process reactions emitted by story handlers', () => {
      const reactionEvent = createTestEvent('state_change', 'door', { open: true });

      processor.registerHandler('trigger', () => {
        return [{ type: 'emit', event: reactionEvent } as Effect];
      });

      const triggerEvent = createTestEvent('trigger', 'player', { action: 'pull_lever' });
      const result = processor.processEvents([triggerEvent]);

      expect(result.applied).toContain(triggerEvent);
      expect(result.reactions).toContain(reactionEvent);
    });

    it('should process nested reactions through the world', () => {
      const event2 = createTestEvent('level2', 'system', { depth: 2 });
      const event3 = createTestEvent('level3', 'world', { depth: 3 });

      processor.registerHandler('level1', () => {
        return [{ type: 'emit', event: event2 } as Effect];
      });
      processor.registerHandler('level2', () => {
        return [{ type: 'emit', event: event3 } as Effect];
      });

      const event1 = createTestEvent('level1', 'player', { depth: 1 });
      processor.processEvents([event1]);

      // All three events are applied to the world (via recursive callback)
      const appliedTypes = mockWorld.getAppliedEvents().map(e => e.type);
      expect(appliedTypes).toContain('level1');
      expect(appliedTypes).toContain('level2');
      expect(appliedTypes).toContain('level3');
    });

    it('should report failed reactions when validation rejects them', () => {
      const failEvent = createTestEvent('fail_reaction', 'system', {});
      mockWorld.setCanApplyResult(failEvent, false);

      processor.registerHandler('trigger', () => {
        return [{ type: 'emit', event: failEvent } as Effect];
      });

      const triggerEvent = createTestEvent('trigger', 'player', {});
      const result = processor.processEvents([triggerEvent]);

      expect(result.applied).toContain(triggerEvent);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].event).toBe(failEvent);
    });

    it('should not invoke handlers if initial event fails validation', () => {
      const failEvent = createTestEvent('bad_trigger', 'player', {});
      mockWorld.setCanApplyResult(failEvent, false);

      const handlerSpy = vi.fn().mockReturnValue([]);
      processor.registerHandler('bad_trigger', handlerSpy);

      const result = processor.processEvents([failEvent]);

      expect(result.applied).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.reactions).toHaveLength(0);
      expect(handlerSpy).not.toHaveBeenCalled();
    });
  });
});
