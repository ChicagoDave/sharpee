/**
 * Tests for EventSequencer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventSequencer, EventSequenceUtils } from '../src/event-sequencer';
import { GameEvent, SequencedEvent } from '../src/types';
import { createTestEvent } from './fixtures';

describe('EventSequencer', () => {
  beforeEach(() => {
    // Reset sequencer state if needed
    vi.clearAllMocks();
  });

  describe('sequence generation', () => {
    it('should generate unique sequence numbers', () => {
      const seq1 = eventSequencer.next();
      const seq2 = eventSequencer.next();
      const seq3 = eventSequencer.next();
      
      expect(seq2).toBeGreaterThan(seq1);
      expect(seq3).toBeGreaterThan(seq2);
    });

    it('should generate monotonically increasing sequences', () => {
      const sequences: number[] = [];
      for (let i = 0; i < 100; i++) {
        sequences.push(eventSequencer.next());
      }
      
      for (let i = 1; i < sequences.length; i++) {
        expect(sequences[i]).toBeGreaterThan(sequences[i - 1]);
      }
    });

    it('should handle rapid sequence generation', () => {
      const sequences = new Set<number>();
      
      // Generate many sequences rapidly
      for (let i = 0; i < 1000; i++) {
        sequences.add(eventSequencer.next());
      }
      
      // All should be unique
      expect(sequences.size).toBe(1000);
    });
  });

  describe('event sequencing', () => {
    it('should sequence a single event', () => {
      const event: GameEvent = {
        type: 'test.event',
        data: { value: 42 }
      };
      
      const sequenced = eventSequencer.sequence(event, 1);
      
      expect(sequenced.type).toBe(event.type);
      expect(sequenced.data).toEqual(event.data);
      expect(sequenced.sequence).toBeGreaterThan(0);
      expect(sequenced.turn).toBe(1);
      expect(sequenced.timestamp).toBeInstanceOf(Date);
      expect(sequenced.scope).toBe('turn');
    });

    it('should sequence multiple events', () => {
      const events: GameEvent[] = [
        { type: 'event1', data: {} },
        { type: 'event2', data: {} },
        { type: 'event3', data: {} }
      ];
      
      const sequenced = eventSequencer.sequenceAll(events, 1);
      
      expect(sequenced).toHaveLength(3);
      
      // Check sequences are increasing
      for (let i = 1; i < sequenced.length; i++) {
        expect(sequenced[i].sequence).toBeGreaterThan(sequenced[i - 1].sequence);
      }
      
      // Check all have same turn
      sequenced.forEach(event => {
        expect(event.turn).toBe(1);
      });
    });

    it('should add default metadata', () => {
      const event: GameEvent = { type: 'test', data: {} };
      const sequenced = eventSequencer.sequence(event, 5);
      
      expect(sequenced.scope).toBe('turn');
      expect(sequenced.source).toBeUndefined(); // Only added if present
    });

    it('should preserve optional metadata', () => {
      const event: GameEvent = {
        type: 'test',
        data: {},
        metadata: {
          source: 'player',
          priority: 'high'
        }
      };
      
      const sequenced = eventSequencer.sequence(event, 1);
      
      expect(sequenced.metadata).toEqual({ source: 'player', priority: 'high' });
    });

    it('should handle empty event arrays', () => {
      const sequenced = eventSequencer.sequenceAll([], 1);
      expect(sequenced).toEqual([]);
    });
  });

  describe('EventSequenceUtils', () => {
    describe('sorting', () => {
      it('should sort events by sequence number', () => {
        const events: SequencedEvent[] = [
          createTestEvent('event1', {}, 300),
          createTestEvent('event2', {}, 100),
          createTestEvent('event3', {}, 200)
        ];
        
        const sorted = EventSequenceUtils.sort(events);
        
        expect(sorted[0].sequence).toBe(100);
        expect(sorted[1].sequence).toBe(200);
        expect(sorted[2].sequence).toBe(300);
      });

      it('should not modify original array', () => {
        const events: SequencedEvent[] = [
          createTestEvent('event1', {}, 300),
          createTestEvent('event2', {}, 100)
        ];
        
        const original = [...events];
        const sorted = EventSequenceUtils.sort(events);
        
        expect(events).toEqual(original);
        expect(sorted).not.toBe(events);
      });

      it('should handle empty arrays', () => {
        const sorted = EventSequenceUtils.sort([]);
        expect(sorted).toEqual([]);
      });

      it('should handle single element arrays', () => {
        const event = createTestEvent('test', {}, 100);
        const sorted = EventSequenceUtils.sort([event]);
        expect(sorted).toEqual([event]);
      });
    });

    describe('filtering', () => {
      it('should filter events by type', () => {
        const events: SequencedEvent[] = [
          createTestEvent('type.a', {}),
          createTestEvent('type.b', {}),
          createTestEvent('type.a', {}),
          createTestEvent('other', {})
        ];
        
        const filtered = EventSequenceUtils.filterByType(events, 'type.a');
        
        expect(filtered).toHaveLength(2);
        filtered.forEach(event => {
          expect(event.type).toBe('type.a');
        });
      });

      it('should filter events by turn', () => {
        const events: SequencedEvent[] = [
          { ...createTestEvent('event1', {}), turn: 1 },
          { ...createTestEvent('event2', {}), turn: 2 },
          { ...createTestEvent('event3', {}), turn: 1 },
          { ...createTestEvent('event4', {}), turn: 3 }
        ];
        
        const filtered = EventSequenceUtils.filterByTurn(events, 1);
        
        expect(filtered).toHaveLength(2);
        filtered.forEach(event => {
          expect(event.turn).toBe(1);
        });
      });

      it('should filter events by scope', () => {
        const events: SequencedEvent[] = [
          { ...createTestEvent('event1', {}), scope: 'turn' },
          { ...createTestEvent('event2', {}), scope: 'global' },
          { ...createTestEvent('event3', {}), scope: 'turn' },
          { ...createTestEvent('event4', {}), scope: 'system' }
        ];
        
        const filtered = EventSequenceUtils.filterByScope(events, 'turn');
        
        expect(filtered).toHaveLength(2);
        filtered.forEach(event => {
          expect(event.scope).toBe('turn');
        });
      });

      it('should handle filtering with no matches', () => {
        const events = [
          createTestEvent('type.a', {}),
          createTestEvent('type.b', {})
        ];
        
        const filtered = EventSequenceUtils.filterByType(events, 'type.c');
        expect(filtered).toEqual([]);
      });
    });

    describe('grouping', () => {
      it('should group events by type', () => {
        const events: SequencedEvent[] = [
          createTestEvent('type.a', { value: 1 }),
          createTestEvent('type.b', { value: 2 }),
          createTestEvent('type.a', { value: 3 }),
          createTestEvent('type.c', { value: 4 })
        ];
        
        const grouped = EventSequenceUtils.groupByType(events);
        
        expect(Object.keys(grouped)).toHaveLength(3);
        expect(grouped['type.a']).toHaveLength(2);
        expect(grouped['type.b']).toHaveLength(1);
        expect(grouped['type.c']).toHaveLength(1);
      });

      it('should group events by turn', () => {
        const events: SequencedEvent[] = [
          { ...createTestEvent('event1', {}), turn: 1 },
          { ...createTestEvent('event2', {}), turn: 2 },
          { ...createTestEvent('event3', {}), turn: 1 },
          { ...createTestEvent('event4', {}), turn: 2 },
          { ...createTestEvent('event5', {}), turn: 3 }
        ];
        
        const grouped = EventSequenceUtils.groupByTurn(events);
        
        expect(Object.keys(grouped)).toHaveLength(3);
        expect(grouped[1]).toHaveLength(2);
        expect(grouped[2]).toHaveLength(2);
        expect(grouped[3]).toHaveLength(1);
      });

      it('should handle empty arrays when grouping', () => {
        const byType = EventSequenceUtils.groupByType([]);
        const byTurn = EventSequenceUtils.groupByTurn([]);
        
        expect(byType).toEqual({});
        expect(byTurn).toEqual({});
      });
    });

    describe('utility functions', () => {
      it('should get latest event by type', () => {
        const events: SequencedEvent[] = [
          createTestEvent('type.a', { value: 1 }, 100),
          createTestEvent('type.b', { value: 2 }, 200),
          createTestEvent('type.a', { value: 3 }, 300),
          createTestEvent('type.a', { value: 4 }, 150)
        ];
        
        const latest = EventSequenceUtils.getLatestByType(events, 'type.a');
        
        expect(latest).toBeDefined();
        expect(latest?.data.value).toBe(3); // Sequence 300 is latest
      });

      it('should return undefined for non-existent type', () => {
        const events = [
          createTestEvent('type.a', {}),
          createTestEvent('type.b', {})
        ];
        
        const latest = EventSequenceUtils.getLatestByType(events, 'type.c');
        expect(latest).toBeUndefined();
      });

      it('should count events by type', () => {
        const events: SequencedEvent[] = [
          createTestEvent('type.a', {}),
          createTestEvent('type.b', {}),
          createTestEvent('type.a', {}),
          createTestEvent('type.c', {}),
          createTestEvent('type.a', {})
        ];
        
        const counts = EventSequenceUtils.countByType(events);
        
        expect(counts).toEqual({
          'type.a': 3,
          'type.b': 1,
          'type.c': 1
        });
      });

      it('should handle empty arrays in utility functions', () => {
        const latest = EventSequenceUtils.getLatestByType([], 'any');
        const counts = EventSequenceUtils.countByType([]);
        
        expect(latest).toBeUndefined();
        expect(counts).toEqual({});
      });
    });

    describe('event range queries', () => {
      it('should get events in sequence range', () => {
        const events: SequencedEvent[] = [
          createTestEvent('event1', {}, 100),
          createTestEvent('event2', {}, 200),
          createTestEvent('event3', {}, 300),
          createTestEvent('event4', {}, 400),
          createTestEvent('event5', {}, 500)
        ];
        
        const range = EventSequenceUtils.getInRange(events, 200, 400);
        
        expect(range).toHaveLength(3);
        expect(range[0].sequence).toBe(200);
        expect(range[2].sequence).toBe(400);
      });

      it('should handle exclusive ranges', () => {
        const events: SequencedEvent[] = [
          createTestEvent('event1', {}, 100),
          createTestEvent('event2', {}, 200),
          createTestEvent('event3', {}, 300)
        ];
        
        const range = EventSequenceUtils.getInRange(events, 100, 300, false);
        
        expect(range).toHaveLength(1);
        expect(range[0].sequence).toBe(200);
      });

      it('should handle ranges with no events', () => {
        const events: SequencedEvent[] = [
          createTestEvent('event1', {}, 100),
          createTestEvent('event2', {}, 200)
        ];
        
        const range = EventSequenceUtils.getInRange(events, 300, 400);
        expect(range).toEqual([]);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle events with same timestamp but different sequences', () => {
      const now = new Date();
      const events: SequencedEvent[] = [
        { ...createTestEvent('event1', {}), timestamp: now, sequence: 100 },
        { ...createTestEvent('event2', {}), timestamp: now, sequence: 200 },
        { ...createTestEvent('event3', {}), timestamp: now, sequence: 150 }
      ];
      
      const sorted = EventSequenceUtils.sort(events);
      
      expect(sorted[0].sequence).toBe(100);
      expect(sorted[1].sequence).toBe(150);
      expect(sorted[2].sequence).toBe(200);
    });

    it('should handle very large sequence numbers', () => {
      const bigSequence = Number.MAX_SAFE_INTEGER - 1000;
      const event = createTestEvent('test', {}, bigSequence);
      
      expect(event.sequence).toBe(bigSequence);
      
      // Should still be able to generate new sequences
      const nextSeq = eventSequencer.next();
      expect(nextSeq).toBeGreaterThan(0);
    });
  });
});
