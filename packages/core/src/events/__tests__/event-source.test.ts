import { 
  createEventSource, 
  SimpleEventSource, 
  GenericEventSource 
} from '../event-source';

describe('GenericEventSource', () => {
  let eventSource: GenericEventSource<string>;

  beforeEach(() => {
    eventSource = new SimpleEventSource<string>();
  });

  test('should emit events to subscribers', () => {
    const handler = jest.fn();
    eventSource.subscribe(handler);
    
    eventSource.emit('test-event');
    
    expect(handler).toHaveBeenCalledWith('test-event');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('should support multiple subscribers', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    
    eventSource.subscribe(handler1);
    eventSource.subscribe(handler2);
    
    eventSource.emit('test-event');
    
    expect(handler1).toHaveBeenCalledWith('test-event');
    expect(handler2).toHaveBeenCalledWith('test-event');
  });

  test('should return unsubscribe function', () => {
    const handler = jest.fn();
    const unsubscribe = eventSource.subscribe(handler);
    
    eventSource.emit('event-1');
    expect(handler).toHaveBeenCalledTimes(1);
    
    unsubscribe();
    
    eventSource.emit('event-2');
    expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
  });

  test('should handle errors in handlers gracefully', () => {
    const errorHandler = jest.fn(() => {
      throw new Error('Handler error');
    });
    const normalHandler = jest.fn();
    
    eventSource.subscribe(errorHandler);
    eventSource.subscribe(normalHandler);
    
    // Should not throw
    expect(() => eventSource.emit('test-event')).not.toThrow();
    
    // Normal handler should still be called
    expect(normalHandler).toHaveBeenCalledWith('test-event');
  });

  test('should track subscriber count', () => {
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

  test('should clear all subscribers', () => {
    const source = new SimpleEventSource<string>();
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    
    source.subscribe(handler1);
    source.subscribe(handler2);
    expect(source.subscriberCount).toBe(2);
    
    source.clear();
    expect(source.subscriberCount).toBe(0);
    
    source.emit('test');
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  test('createEventSource factory should work', () => {
    const source = createEventSource<number>();
    const handler = jest.fn();
    
    source.subscribe(handler);
    source.emit(42);
    
    expect(handler).toHaveBeenCalledWith(42);
  });
});

describe('GenericEventSource with complex types', () => {
  interface TestEvent {
    type: string;
    data: any;
  }

  test('should work with object events', () => {
    const source = createEventSource<TestEvent>();
    const handler = jest.fn();
    
    source.subscribe(handler);
    
    const event: TestEvent = { type: 'test', data: { value: 123 } };
    source.emit(event);
    
    expect(handler).toHaveBeenCalledWith(event);
  });
});
