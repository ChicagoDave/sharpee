/**
 * Quit Query Handler
 * 
 * Handles responses to quit confirmation queries.
 * Works with the platform events system to emit appropriate events.
 */

import {
  IQueryHandler,
  IPendingQuery,
  IQueryResponse,
  QuerySource,
  QueryType,
  ISemanticEvent,
  createSemanticEventSource,
  createQuitRequestedEvent,
  createQuitCancelledEvent,
  IQuitContext
} from '@sharpee/core';

/**
 * Handler for quit confirmation queries
 */
export class QuitQueryHandler implements IQueryHandler {
  private eventSource = createSemanticEventSource();
  
  /**
   * Check if this handler can process the query
   */
  canHandle(query: IPendingQuery): boolean {
    return query.source === QuerySource.SYSTEM && 
           (query.type === QueryType.YES_NO || query.type === QueryType.MULTIPLE_CHOICE) && 
           (query.messageId === 'quit_confirmation' || 
            query.messageId === 'quit_confirm_query' ||
            query.messageId === 'quit_unsaved_query' ||
            query.messageId === 'quit_save_query');
  }
  
  /**
   * Process the player's response
   */
  handleResponse(response: IQueryResponse, query: IPendingQuery): void {
    const events: ISemanticEvent[] = [];
    const context = query.context;
    
    // Get the selected option
    const selectedOption = query.options?.[response.selectedIndex || 0] || 
                          response.response;
    
    // Handle boolean responses for YES_NO queries
    if (typeof selectedOption === 'boolean') {
      if (selectedOption === true) {
        // Yes response - proceed with quit
        const quitContext: IQuitContext = {
          score: context.score,
          moves: context.moves,
          hasUnsavedChanges: context.hasUnsavedProgress || false,
          force: true, // User confirmed, so treat as forced
          stats: {
            maxScore: context.maxScore,
            nearComplete: context.nearComplete
          }
        };
        
        // Emit platform quit requested event
        const quitEvent = createQuitRequestedEvent(quitContext);
        events.push(quitEvent);
        
        // Also emit a query handled event for tracking
        events.push(this.createEvent('query.handled', {
          queryId: query.id,
          action: 'quit_confirmed',
          savedBeforeQuit: false
        }));
      } else {
        // No response - cancel quit
        const cancelEvent = createQuitCancelledEvent();
        events.push(cancelEvent);
        
        // Query handled event
        events.push(this.createEvent('query.handled', {
          queryId: query.id,
          action: 'quit_cancelled'
        }));
      }
    } else {
      // Handle string responses for MULTIPLE_CHOICE queries
      switch (selectedOption as string) {
      case 'quit':
      case 'quit_without_saving':
      case 'yes':
        // Build quit context from query context
        const quitContext: IQuitContext = {
          score: context.score,
          moves: context.moves,
          hasUnsavedChanges: context.hasUnsavedProgress || false,
          force: true, // User confirmed, so treat as forced
          stats: {
            maxScore: context.maxScore,
            nearComplete: context.nearComplete
          }
        };
        
        // Emit platform quit requested event
        const quitEvent = createQuitRequestedEvent(quitContext);
        events.push(quitEvent);
        
        // Also emit a query handled event for tracking
        events.push(this.createEvent('query.handled', {
          queryId: query.id,
          action: 'quit_confirmed',
          savedBeforeQuit: false
        }));
        break;
        
      case 'save_and_quit':
        // First emit save requested event
        events.push(this.createEvent('platform.save_requested', {
          saveName: 'autosave',
          autosave: true,
          timestamp: Date.now(),
          metadata: {
            reason: 'quit',
            score: context.score,
            moves: context.moves
          }
        }));
        
        // Then emit quit requested event
        const saveAndQuitContext: IQuitContext = {
          score: context.score,
          moves: context.moves,
          hasUnsavedChanges: false, // Will be saved first
          force: true,
          stats: {
            maxScore: context.maxScore,
            savedBeforeQuit: true
          }
        };
        
        const saveAndQuitEvent = createQuitRequestedEvent(saveAndQuitContext);
        events.push(saveAndQuitEvent);
        
        // Query handled event
        events.push(this.createEvent('query.handled', {
          queryId: query.id,
          action: 'save_and_quit',
          savedBeforeQuit: true
        }));
        break;
        
      case 'cancel':
      case 'no':
      default:
        // Emit platform quit cancelled event
        const cancelEvent = createQuitCancelledEvent();
        events.push(cancelEvent);
        
        // Query handled event
        events.push(this.createEvent('query.handled', {
          queryId: query.id,
          action: 'quit_cancelled'
        }));
        break;
      }
    }
    
    // Emit all events
    for (const event of events) {
      this.eventSource.emit(event);
    }
  }
  
  /**
   * Handle query timeout
   */
  handleTimeout(query: IPendingQuery): void {
    // On timeout, treat as cancelled
    const cancelEvent = createQuitCancelledEvent();
    this.eventSource.emit(cancelEvent);
    
    this.eventSource.emit(this.createEvent('query.timeout', {
      queryId: query.id,
      action: 'quit_cancelled',
      reason: 'timeout'
    }));
  }
  
  /**
   * Handle query cancellation
   */
  handleCancel(query: IPendingQuery): void {
    const cancelEvent = createQuitCancelledEvent();
    this.eventSource.emit(cancelEvent);
    
    this.eventSource.emit(this.createEvent('query.cancelled', {
      queryId: query.id,
      action: 'quit_cancelled',
      reason: 'cancelled'
    }));
  }
  
  /**
   * Get the event source
   */
  getEventSource() {
    return this.eventSource;
  }
  
  /**
   * Create a semantic event
   */
  private createEvent(type: string, data: Record<string, any>): ISemanticEvent {
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      entities: {},
      data
    };
  }
}

/**
 * Create a quit query handler instance
 */
export function createQuitQueryHandler(): QuitQueryHandler {
  return new QuitQueryHandler();
}
