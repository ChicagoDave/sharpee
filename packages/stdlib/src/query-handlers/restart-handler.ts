/**
 * Restart Query Handler
 * 
 * Handles responses to restart confirmation queries.
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
  createRestartRequestedEvent,
  createRestartCompletedEvent,
  IRestartContext
} from '@sharpee/core';

/**
 * Handler for restart confirmation queries
 */
export class RestartQueryHandler implements IQueryHandler {
  private eventSource = createSemanticEventSource();
  
  /**
   * Check if this handler can process the query
   */
  canHandle(query: IPendingQuery): boolean {
    return query.source === QuerySource.SYSTEM && 
           (query.type === QueryType.YES_NO || query.type === QueryType.MULTIPLE_CHOICE) && 
           (query.messageId === 'restart_confirmation' || 
            query.messageId === 'restart_confirm' ||
            query.messageId === 'restart_unsaved' ||
            query.messageId === 'restart_progress');
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
        // Yes response - proceed with restart
        const restartContext: IRestartContext = {
          currentProgress: {
            score: context.score,
            moves: context.moves,
            location: context.location
          },
          confirmationRequired: false, // Already confirmed
          hasUnsavedChanges: context.hasUnsavedProgress || false,
          force: true // User confirmed, so treat as forced
        };
        
        // Emit platform restart requested event
        const restartEvent = createRestartRequestedEvent(restartContext);
        events.push(restartEvent);
        
        // Also emit a query handled event for tracking
        events.push(this.createEvent('query.handled', {
          queryId: query.id,
          action: 'restart_confirmed',
          savedBeforeRestart: false
        }));
      } else {
        // No response - cancel restart
        const cancelEvent = createRestartCompletedEvent(false);
        events.push(cancelEvent);
        
        // Query handled event
        events.push(this.createEvent('query.handled', {
          queryId: query.id,
          action: 'restart_cancelled'
        }));
      }
    } else {
      // Handle string responses for MULTIPLE_CHOICE queries
      switch (selectedOption as string) {
      case 'restart':
      case 'restart_without_saving':
      case 'yes':
        // Build restart context from query context
        const restartContext: IRestartContext = {
          currentProgress: {
            score: context.score,
            moves: context.moves,
            location: context.location
          },
          confirmationRequired: false, // Already confirmed
          hasUnsavedChanges: context.hasUnsavedProgress || false,
          force: true // User confirmed, so treat as forced
        };
        
        // Emit platform restart requested event
        const restartEvent = createRestartRequestedEvent(restartContext);
        events.push(restartEvent);
        
        // Also emit a query handled event for tracking
        events.push(this.createEvent('query.handled', {
          queryId: query.id,
          action: 'restart_confirmed',
          savedBeforeRestart: false
        }));
        break;
        
      case 'save_and_restart':
        // First emit save requested event
        events.push(this.createEvent('platform.save_requested', {
          saveName: 'before_restart',
          autosave: true,
          timestamp: Date.now(),
          metadata: {
            reason: 'restart',
            score: context.score,
            moves: context.moves,
            location: context.location
          }
        }));
        
        // Then emit restart requested event
        const saveAndRestartContext: IRestartContext = {
          currentProgress: {
            score: context.score,
            moves: context.moves,
            location: context.location
          },
          confirmationRequired: false,
          hasUnsavedChanges: false, // Will be saved first
          force: true
        };
        
        const saveAndRestartEvent = createRestartRequestedEvent(saveAndRestartContext);
        events.push(saveAndRestartEvent);
        
        // Query handled event
        events.push(this.createEvent('query.handled', {
          queryId: query.id,
          action: 'save_and_restart',
          savedBeforeRestart: true
        }));
        break;
        
      case 'cancel':
      case 'no':
      default:
        // Emit platform restart cancelled event
        const cancelEvent = createRestartCompletedEvent(false);
        events.push(cancelEvent);
        
        // Query handled event
        events.push(this.createEvent('query.handled', {
          queryId: query.id,
          action: 'restart_cancelled'
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
    const cancelEvent = createRestartCompletedEvent(false);
    this.eventSource.emit(cancelEvent);
    
    this.eventSource.emit(this.createEvent('query.timeout', {
      queryId: query.id,
      action: 'restart_cancelled',
      reason: 'timeout'
    }));
  }
  
  /**
   * Handle query cancellation
   */
  handleCancel(query: IPendingQuery): void {
    const cancelEvent = createRestartCompletedEvent(false);
    this.eventSource.emit(cancelEvent);
    
    this.eventSource.emit(this.createEvent('query.cancelled', {
      queryId: query.id,
      action: 'restart_cancelled',
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
 * Create a restart query handler instance
 */
export function createRestartQueryHandler(): RestartQueryHandler {
  return new RestartQueryHandler();
}
