/**
 * Query Manager - Manages pending queries and routes responses
 * 
 * This is the core component of the PC communication system (ADR-018).
 * It tracks pending queries, validates responses, and routes them to
 * appropriate handlers.
 */

import { EventEmitter } from 'events';
import {
  IPendingQuery,
  IQueryResponse,
  IQueryState,
  IQueryHandler,
  QueryValidator,
  IValidationResult,
  IQueryEvents,
  StandardValidators
} from './types';
import { ISemanticEvent, ISemanticEventSource, createSemanticEventSource } from '../events';

/**
 * Query Manager implementation
 */
export class QueryManager extends EventEmitter {
  private state: IQueryState = {
    queryStack: [],
    history: [],
    interceptingInput: false
  };
  
  private handlers = new Map<string, IQueryHandler>();
  private validators = new Map<string, QueryValidator>();
  private timeouts = new Map<string, NodeJS.Timeout>();
  private eventSource: ISemanticEventSource = createSemanticEventSource();
  
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
  registerHandler(id: string, handler: IQueryHandler): void {
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
  async askQuery(query: IPendingQuery): Promise<IQueryResponse | null> {
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
      const answerHandler = (response: IQueryResponse, answeredQuery: IPendingQuery) => {
        if (answeredQuery.id === query.id) {
          this.off('query:answered', answerHandler);
          this.off('query:timeout', timeoutHandler);
          this.off('query:cancelled', cancelHandler);
          resolve(response);
        }
      };
      
      const timeoutHandler = (timedOutQuery: IPendingQuery) => {
        if (timedOutQuery.id === query.id) {
          this.off('query:answered', answerHandler);
          this.off('query:timeout', timeoutHandler);
          this.off('query:cancelled', cancelHandler);
          resolve(null);
        }
      };
      
      const cancelHandler = (cancelledQuery: IPendingQuery) => {
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
    let validationResult: IValidationResult = { valid: true, normalized: input };
    
    if (query.validator) {
      const validator = this.validators.get(query.validator);
      if (validator) {
        validationResult = validator(input, query);
      }
    } else if (query.type === 'multiple_choice' && query.options) {
      // Default validation for multiple choice queries
      const trimmed = input.trim().toLowerCase();
      const optionIndex = parseInt(trimmed, 10) - 1;
      
      if (!isNaN(optionIndex) && optionIndex >= 0 && optionIndex < query.options.length) {
        // Numeric selection
        validationResult = { valid: true, normalized: optionIndex };
      } else if (query.options.some(opt => opt.toLowerCase() === trimmed)) {
        // Text match
        validationResult = { valid: true, normalized: trimmed };
      } else {
        // Invalid response
        validationResult = { 
          valid: false, 
          message: `Please select one of the available options: ${query.options.join(', ')}`,
          hint: 'You can enter the option number or text'
        };
      }
    }
    
    if (!validationResult.valid) {
      this.emit('query:invalid', input, validationResult, query);
      
      // Also emit as a semantic event
      const invalidEventData = {
        queryId: query.id,
        input,
        message: validationResult.message || 'Invalid response',
        hint: validationResult.hint
      };
      const invalidEvent: ISemanticEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'query.invalid',
        timestamp: Date.now(),
        entities: {},
        data: invalidEventData
      };
      this.eventSource.emit(invalidEvent);
      
      return 'handled';
    }
    
    // Create response object
    const response: IQueryResponse = {
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
  getState(): Readonly<IQueryState> {
    return { ...this.state };
  }
  
  /**
   * Get event source for connecting to engine
   */
  getEventSource(): ISemanticEventSource {
    return this.eventSource;
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
  getCurrentQuery(): IPendingQuery | undefined {
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
  private handleTimeout(query: IPendingQuery): void {
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
  private interruptQuery(query: IPendingQuery, command: string): void {
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
  private findHandler(query: IPendingQuery): IQueryHandler | undefined {
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
export function isQueryEvent<K extends keyof IQueryEvents>(
  event: string | symbol,
  key: K
): event is K {
  return event === key;
}
