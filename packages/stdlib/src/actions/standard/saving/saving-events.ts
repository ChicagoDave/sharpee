/**
 * Event type definitions for the saving action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when a save is requested
 */
export interface SaveRequestedEventData {
  /** Name of the save */
  saveName: string;
  
  /** Timestamp of the save request */
  timestamp: number;
  
  /** Metadata about the game state */
  metadata: {
    score: number;
    moves: number;
    turnCount: number;
    quickSave?: boolean;
  };
}

/**
 * Error data for saving failures
 */
export interface SavingErrorData {
  reason: 'save_not_allowed' | 'save_in_progress' | 'invalid_save_name' | 
          'no_save_slots';
  saveName?: string;
}

/**
 * Complete event map for saving action
 */
export interface SavingEventMap {
  'if.event.save_requested': SaveRequestedEventData;
  'platform.save_requested': any; // Platform event (from core)
  'action.success': {
    actionId: string;
    messageId: string;
    params?: Record<string, any>;
  };
  'action.error': {
    actionId: string;
    messageId: string;
    params?: Record<string, any>;
  };
}
