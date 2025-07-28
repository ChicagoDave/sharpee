/**
 * Query Manager - Manages pending queries and routes responses
 * 
 * This is the core component of the PC communication system (ADR-018).
 * It tracks pending queries, validates responses, and routes them to
 * appropriate handlers.
 */

import { EventEmitter } from 'events';
import {
  PendingQuery,
  QueryResponse,
  QueryState,
  QueryHandler,
  QueryValidator,
  ValidationResult,
  QueryEvents,
  StandardValidators
} from './types';

/**
 * Query Manager implementation
 */
export class QueryManager extends EventEmitter {
  private state: QueryState = {
    queryStack: [],
    history: [],
    interceptingInput: false
  };
  
  private handlers = new Map<string, QueryHandler>();
  private validators = new Map<string, QueryValidator>();
  private timeouts = new Map<string, NodeJS.Timeout>();
  
  constructor() {
    super();
    
    // Register standard validators
    this.registerValidator('yes_no', StandardValidators.yesNo);
    this.registerValidator('numeric', (response, query) => {
      const min = query.context.min;
      const max = query.context.max;
      return StandardValidators.numeric(response, min, max);
    });
    this.registerValidator('multiple_choice', (response, query) => {
      return StandardValidators.multipleChoice(response, query.options || []);
    });
  }
  
  /**
   * Register a query handler
   */
  registerHandler(id: string, handler: QueryHandler): void {
    this.handlers.set(id, handler);
  }
  
  /**
   * Register a response validator
   */
  registerValidator(name: string, validator: QueryValidator): void {
    this.validators.set(name, validator);
  }
  
  /**
   * Present a query to the player
   */
  async askQuery(query: PendingQuery): Promise<QueryResponse | null> {
    // If there's already a pending query, stack this one
    if (this.state.pendingQuery) {
      if (query.priority && query.priority > (this.state.pendingQuery.priority || 0)) {
        // Higher priority interrupts
        this.state.queryStack.unshift(this.state.pendingQuery);
        this.state.pendingQuery = query;
      } else {
        // Queue for later
        this.state.queryStack.push(query);
        return null;
      }
    } else {
      this.state.pendingQuery = query;
    }
    
    // Start intercepting input
    this.state.interceptingInput = true;
    
    // Emit the query event
    this.emit('query:pending', query);
    
    // Set timeout if specified
    if (query.timeout) {
      const timeoutId = setTimeout(() => {
        this.handleTimeout(query);
      }, query.timeout);
      this.timeouts.set(query.id, timeoutId);
    }
    
    // Return a promise that resolves when answered
    return new Promise((resolve) => {
      const answerHandler = (response: QueryResponse, answeredQuery: PendingQuery) => {
        if (answeredQuery.id === query.id) {
          this.off('query:answered', answerHandler);
          this.off('query:timeout', timeoutHandler);
          this.off('query:cancelled', cancelHandler);
          resolve(response);
        }
      };
      
      const timeoutHandler = (timedOutQuery: PendingQuery) => {
        if (timedOutQuery.id === query.id) {
          this.off('query:answered', answerHandler);
          this.off('query:timeout', timeoutHandler);
          this.off('query:cancelled', cancelHandler);
          resolve(null);
        }
      };
      
      const cancelHandler = (cancelledQuery: PendingQuery) => {
        if (cancelledQuery.id === query.id) {
          this.off('query:answered', answerHandler);
          this.off('query:timeout', timeoutHandler);
          this.off('query:cancelled', cancelHandler);
          resolve(null);
        }
      };
      
      this.on('query:answered', answerHandler);
      this.on('query:timeout', timeoutHandler);
      this.on('query:cancelled', cancelHandler);
    });
  }
  
  /**
   * Process input while a query is pending
   */
  processInput(input: string): 'handled' | 'interrupt' | 'pass' {
    if (!this.state.pendingQuery || !this.state.interceptingInput) {
      return 'pass';
    }
    
    const query = this.state.pendingQuery;
    
    // Check if this looks like a command (for interruption)
    if (this.looksLikeCommand(input) && query.allowInterruption) {
      this.interruptQuery(query, input);
      return 'interrupt';
    }
    
    // Validate the response
    let validationResult: ValidationResult = { valid: true, normalized: input };
    
    if (query.validator) {
      const validator = this.validators.get(query.validator);
      if (validator) {
        validationResult = validator(input, query);
      }
    }
    
    if (!validationResult.valid) {
      this.emit('query:invalid', input, validationResult, query);
      return 'handled';
    }
    
    // Create response object
    const response: QueryResponse = {
      queryId: query.id,
      rawInput: input,
      response: validationResult.normalized || input,
      selectedIndex: typeof validationResult.normalized === 'number' ? 
        validationResult.normalized : undefined,
      wasInterrupted: false,
      timestamp: Date.now()
    };
    
    // Clear timeout
    const timeoutId = this.timeouts.get(query.id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(query.id);
    }
    
    // Record in history
    this.state.history.push({
      query,
      response,
      result: 'answered'
    });
    
    // Clear current query
    this.state.pendingQuery = undefined;
    
    // Process next query in stack
    if (this.state.queryStack.length > 0) {
      const nextQuery = this.state.queryStack.shift()!;
      this.state.pendingQuery = nextQuery;
      this.emit('query:pending', nextQuery);
    } else {
      this.state.interceptingInput = false;
    }
    
    // Emit answer event
    this.emit('query:answered', response, query);
    
    // Route to handler if registered
    const handler = this.findHandler(query);
    if (handler) {
      handler.handleResponse(response, query);
    }
    
    return 'handled';
  }
  
  /**
   * Cancel the current query
   */
  cancelCurrentQuery(): void {
    if (!this.state.pendingQuery) return;
    
    const query = this.state.pendingQuery;
    
    // Clear timeout
    const timeoutId = this.timeouts.get(query.id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(query.id);
    }
    
    // Record in history
    this.state.history.push({
      query,
      result: 'cancelled'
    });
    
    // Clear current query
    this.state.pendingQuery = undefined;
    
    // Process next query
    if (this.state.queryStack.length > 0) {
      const nextQuery = this.state.queryStack.shift()!;
      this.state.pendingQuery = nextQuery;
      this.emit('query:pending', nextQuery);
    } else {
      this.state.interceptingInput = false;
    }
    
    // Emit cancel event
    this.emit('query:cancelled', query);
    
    // Notify handler
    const handler = this.findHandler(query);
    if (handler && handler.handleCancel) {
      handler.handleCancel(query);
    }
  }
  
  /**
   * Get current state
   */
  getState(): Readonly<QueryState> {
    return { ...this.state };
  }
  
  /**
   * Check if there's a pending query
   */
  hasPendingQuery(): boolean {
    return !!this.state.pendingQuery;
  }
  
  /**
   * Get the current pending query
   */
  getCurrentQuery(): PendingQuery | undefined {
    return this.state.pendingQuery;
  }
  
  /**
   * Clear all queries
   */
  clearAll(): void {
    // Cancel current query
    if (this.state.pendingQuery) {
      this.cancelCurrentQuery();
    }
    
    // Clear stack
    this.state.queryStack = [];
    this.state.interceptingInput = false;
    
    // Clear all timeouts
    for (const [, timeoutId] of this.timeouts) {
      clearTimeout(timeoutId);
    }
    this.timeouts.clear();
  }
  
  /**
   * Handle query timeout
   */
  private handleTimeout(query: PendingQuery): void {
    if (this.state.pendingQuery?.id !== query.id) return;
    
    // Record in history
    this.state.history.push({
      query,
      result: 'timeout'
    });
    
    // Clear current query
    this.state.pendingQuery = undefined;
    this.timeouts.delete(query.id);
    
    // Process next query
    if (this.state.queryStack.length > 0) {
      const nextQuery = this.state.queryStack.shift()!;
      this.state.pendingQuery = nextQuery;
      this.emit('query:pending', nextQuery);
    } else {
      this.state.interceptingInput = false;
    }
    
    // Emit timeout event
    this.emit('query:timeout', query);
    
    // Notify handler
    const handler = this.findHandler(query);
    if (handler && handler.handleTimeout) {
      handler.handleTimeout(query);
    }
  }
  
  /**
   * Interrupt a query with a command
   */
  private interruptQuery(query: PendingQuery, command: string): void {
    // Clear timeout
    const timeoutId = this.timeouts.get(query.id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(query.id);
    }
    
    // Record in history
    this.state.history.push({
      query,
      result: 'cancelled'
    });
    
    // Clear current query
    this.state.pendingQuery = undefined;
    
    // Don't process next query - let the command execute
    this.state.interceptingInput = false;
    
    // Emit interrupt event
    this.emit('query:interrupted', query, command);
  }
  
  /**
   * Find handler for a query
   */
  private findHandler(query: PendingQuery): QueryHandler | undefined {
    for (const [, handler] of this.handlers) {
      if (handler.canHandle(query)) {
        return handler;
      }
    }
    return undefined;
  }
  
  /**
   * Check if input looks like a command
   */
  private looksLikeCommand(input: string): boolean {
    const commandPatterns = [
      /^(look|take|drop|go|examine|inventory|save|load|help)/i,
      /^(n|s|e|w|ne|nw|se|sw|up|down|in|out)$/i,
      /^x\s+/i,  // "x thing" for examine
      /^g\s+/i,  // "g place" for go
      /^l$/i     // "l" for look
    ];
    
    return commandPatterns.some(pattern => pattern.test(input.trim()));
  }
}

/**
 * Create a new query manager instance
 */
export function createQueryManager(): QueryManager {
  return new QueryManager();
}

/**
 * Type guard for query events
 */
export function isQueryEvent<K extends keyof QueryEvents>(
  event: string | symbol,
  key: K
): event is K {
  return event === key;
}
