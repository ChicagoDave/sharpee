/**
 * Generic event source infrastructure for the narrative engine.
 * This provides a simple pub/sub mechanism for any type of event.
 */

/**
 * Generic event source interface for pub/sub pattern
 */
export interface IGenericEventSource<T> {
  /**
   * Emit an event to all subscribers
   */
  emit(event: T): void;

  /**
   * Subscribe to events
   * @returns Unsubscribe function
   */
  subscribe(handler: (event: T) => void): () => void;
}

/**
 * Simple synchronous implementation of EventSource
 */
export class SimpleEventSource<T> implements IGenericEventSource<T> {
  private handlers: ((event: T) => void)[] = [];

  emit(event: T): void {
    // Create a copy to avoid issues if handlers modify the array
    const currentHandlers = [...this.handlers];
    currentHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        // Prevent one handler's error from affecting others
        console.error('Error in event handler:', error);
      }
    });
  }

  subscribe(handler: (event: T) => void): () => void {
    this.handlers.push(handler);
    
    // Return unsubscribe function
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index > -1) {
        this.handlers.splice(index, 1);
      }
    };
  }

  /**
   * Get the current number of subscribers
   */
  get subscriberCount(): number {
    return this.handlers.length;
  }

  /**
   * Remove all subscribers
   */
  clear(): void {
    this.handlers = [];
  }
}

/**
 * Create a new event source for a specific event type
 */
export function createEventSource<T>(): IGenericEventSource<T> {
  return new SimpleEventSource<T>();
}
