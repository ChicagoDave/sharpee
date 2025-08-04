import { SimpleEventSource, createEventSource } from '../../src/events';
import { vi } from 'vitest';

describe('SimpleEventSource', () => {
  describe('Basic Functionality', () => {
    it('should emit events to subscribers', () => {
      const source = new SimpleEventSource<{ type: string; data: any }>();
      const events: Array<{ type: string; data: any }> = [];
      
      source.subscribe(event => events.push(event));
      
      source.emit({ type: 'test.event', data: { value: 1 } });
      source.emit({ type: 'test.event', data: { value: 2 } });
      
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ type: 'test.event', data: { value: 1 } });
      expect(events[1]).toEqual({ type: 'test.event', data: { value: 2 } });
    });

    it('should support multiple subscribers', () => {
      const source = new SimpleEventSource<string>();
      const results1: string[] = [];
      const results2: string[] = [];
      
      source.subscribe(event => results1.push(event));
      source.subscribe(event => results2.push(event));
      
      source.emit('event1');
      source.emit('event2');
      
      expect(results1).toEqual(['event1', 'event2']);
      expect(results2).toEqual(['event1', 'event2']);
    });

    it('should return working unsubscribe function', () => {
      const source = new SimpleEventSource<string>();
      const results: string[] = [];
      
      const unsubscribe = source.subscribe(event => results.push(event));
      
      source.emit('before');
      expect(results).toEqual(['before']);
      
      unsubscribe();
      
      source.emit('after');
      expect(results).toEqual(['before']); // Should not receive 'after'
    });
  });

  describe('Error Handling', () => {
    // Mock console.error for this test
    const originalConsoleError = console.error;
    let consoleErrorMock: any;
    
    beforeEach(() => {
      consoleErrorMock = vi.fn();
      console.error = consoleErrorMock;
    });
    
    afterEach(() => {
      console.error = originalConsoleError;
    });

    it('should handle errors in subscribers gracefully', () => {
      const source = new SimpleEventSource<string>();
      const results: string[] = [];
      
      // First handler throws
      source.subscribe(() => {
        throw new Error('Handler error');
      });
      
      // Second handler should still run
      source.subscribe(event => results.push(event));
      
      // Should not throw
      expect(() => source.emit('test')).not.toThrow();
      
      // Second handler should have received the event
      expect(results).toEqual(['test']);
      
      // Error should have been logged
      expect(consoleErrorMock).toHaveBeenCalledWith(
        'Error in event handler:',
        expect.any(Error)
      );
    });
  });

  describe('Subscriber Management', () => {
    it('should track subscriber count', () => {
      const source = new SimpleEventSource<string>();
      
      expect(source.subscriberCount).toBe(0);
      
      const unsub1 = source.subscribe(() => {});
      expect(source.subscriberCount).toBe(1);
      
      const unsub2 = source.subscribe(() => {});
      expect(source.subscriberCount).toBe(2);
      
      unsub1();
      expect(source.subscriberCount).toBe(1);
      
      unsub2();
      expect(source.subscriberCount).toBe(0);
    });

    it('should clear all subscribers', () => {
      const source = new SimpleEventSource<string>();
      const results1: string[] = [];
      const results2: string[] = [];
      
      source.subscribe(event => results1.push(event));
      source.subscribe(event => results2.push(event));
      
      expect(source.subscriberCount).toBe(2);
      
      source.clear();
      
      expect(source.subscriberCount).toBe(0);
      
      source.emit('after-clear');
      
      expect(results1).toEqual([]);
      expect(results2).toEqual([]);
    });
  });

  describe('Factory Function', () => {
    it('should create event source via factory', () => {
      const source = createEventSource<{ id: number; name: string }>();
      const results: Array<{ id: number; name: string }> = [];
      
      source.subscribe(event => results.push(event));
      
      source.emit({ id: 1, name: 'test1' });
      source.emit({ id: 2, name: 'test2' });
      
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ id: 1, name: 'test1' });
      expect(results[1]).toEqual({ id: 2, name: 'test2' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle unsubscribe called multiple times', () => {
      const source = new SimpleEventSource<string>();
      const results: string[] = [];
      
      const unsubscribe = source.subscribe(event => results.push(event));
      
      unsubscribe();
      unsubscribe(); // Second call should not error
      
      source.emit('test');
      expect(results).toEqual([]);
    });

    it('should handle subscriber that modifies handler list during emit', () => {
      const source = new SimpleEventSource<string>();
      const results: string[] = [];
      let lateSubscriber: (() => void) | null = null;
      
      source.subscribe(event => {
        results.push(`first: ${event}`);
        // Subscribe another handler during emit
        if (!lateSubscriber) {
          lateSubscriber = source.subscribe(e => results.push(`late: ${e}`));
        }
      });
      
      source.subscribe(event => results.push(`second: ${event}`));
      
      source.emit('test1');
      
      // The late subscriber should not have received test1
      expect(results).toEqual(['first: test1', 'second: test1']);
      
      // But should receive future events
      source.emit('test2');
      expect(results).toContain('late: test2');
    });
  });
});
