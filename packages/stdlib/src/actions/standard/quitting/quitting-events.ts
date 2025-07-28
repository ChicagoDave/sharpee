/**
 * Event type definitions for the quitting action
 */

/**
 * Event data for when quit is requested
 */
export interface QuitRequestedEventData {
  /** Timestamp of the quit request */
  timestamp: number;
  
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  
  /** Whether this is a force quit */
  force: boolean;
  
  /** Current score */
  score: number;
  
  /** Current moves */
  moves: number;
}

/**
 * Complete event map for quitting action
 */
export interface QuittingEventMap {
  'if.event.quit_requested': QuitRequestedEventData;
  'platform.quit_requested': any; // Platform event (from core)
  'action.success': {
    actionId: string;
    messageId: string;
    params?: Record<string, any>;
  };
}
