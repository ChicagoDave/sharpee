/**
 * Event type definitions for the restoring action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when a restore is requested
 */
export interface RestoreRequestedEventData {
  /** Name/slot of the save to restore */
  saveName: string;
  
  /** Timestamp of the restore request */
  timestamp: number;
  
  /** Number of available saves */
  availableSaves: number;
}

/**
 * Error data for restoring failures
 */
export interface RestoringErrorData {
  reason: 'restore_not_allowed' | 'no_saves' | 'save_not_found' | 
          'corrupt_save' | 'incompatible_save';
  saveName?: string;
}

/**
 * Complete event map for restoring action
 */
export interface RestoringEventMap {
  'if.event.restore_requested': RestoreRequestedEventData;
  'platform.restore_requested': any; // Platform event (from core)
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
