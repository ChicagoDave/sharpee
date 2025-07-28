/**
 * Event type definitions for the restarting action
 */

/**
 * Event data for when restart is requested
 */
export interface RestartRequestedEventData {
  /** Timestamp of the restart request */
  timestamp: number;
  
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  
  /** Whether this is a force restart */
  force: boolean;
  
  /** Current game progress */
  currentProgress: {
    score: number;
    moves: number;
    location: string;
  };
}

/**
 * Complete event map for restarting action
 */
export interface RestartingEventMap {
  'if.event.restart_requested': RestartRequestedEventData;
  'platform.restart_requested': any; // Platform event (from core)
  'action.success': {
    actionId: string;
    messageId: string;
    params?: Record<string, any>;
  };
}
