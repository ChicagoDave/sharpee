/**
 * Platform events for operations that require client/host intervention
 * These events are processed after turn completion but before text service
 */

import { SemanticEvent } from './types';
import { QuitContext, RestartContext } from '../types/save-data';

/**
 * Platform event types for save, restore, quit, and restart operations
 */
export const PlatformEventType = {
  // Request events - emitted by actions
  SAVE_REQUESTED: 'platform.save_requested',
  RESTORE_REQUESTED: 'platform.restore_requested',
  QUIT_REQUESTED: 'platform.quit_requested',
  RESTART_REQUESTED: 'platform.restart_requested',
  
  // Completion events - emitted by engine after processing
  SAVE_COMPLETED: 'platform.save_completed',
  RESTORE_COMPLETED: 'platform.restore_completed',
  QUIT_CONFIRMED: 'platform.quit_confirmed',
  RESTART_COMPLETED: 'platform.restart_completed',
  
  // Error events
  SAVE_FAILED: 'platform.save_failed',
  RESTORE_FAILED: 'platform.restore_failed',
  QUIT_CANCELLED: 'platform.quit_cancelled',
  RESTART_CANCELLED: 'platform.restart_cancelled'
} as const;

export type PlatformEventTypeValue = typeof PlatformEventType[keyof typeof PlatformEventType];

/**
 * Base interface for all platform events
 */
export interface PlatformEvent extends SemanticEvent {
  type: PlatformEventTypeValue;
  
  /**
   * Indicates this event requires client action and should be processed
   * after turn completion but before text service
   */
  requiresClientAction: true;
  
  /**
   * Platform-specific context for the operation
   */
  payload: {
    /**
     * Context specific to the platform operation
     */
    context?: unknown;
    
    /**
     * For completion/error events: whether the operation succeeded
     */
    success?: boolean;
    
    /**
     * For error events: error message or reason
     */
    error?: string;
    
    /**
     * Any additional data specific to the platform operation
     */
    [key: string]: unknown;
  };
}

/**
 * Context for save operations
 */
export interface SaveContext {
  /**
   * Optional name for the save
   */
  saveName?: string;
  
  /**
   * Save slot identifier
   */
  slot?: string | number;
  
  /**
   * Whether this is an autosave
   */
  autosave?: boolean;
  
  /**
   * Additional metadata to store with the save
   */
  metadata?: Record<string, unknown>;
  
  /**
   * Timestamp when save was requested
   */
  timestamp: number;
}

/**
 * Context for restore operations
 */
export interface RestoreContext {
  /**
   * Specific save slot to restore
   */
  slot?: string | number;
  
  /**
   * List of available saves (if known)
   */
  availableSaves?: Array<{
    slot: string | number;
    name?: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }>;
  
  /**
   * Information about the last save
   */
  lastSave?: {
    slot: string | number;
    timestamp: number;
  };
}

// Re-export QuitContext and RestartContext for convenience
export { QuitContext, RestartContext };

/**
 * Type guards for platform events
 */
export function isPlatformEvent(event: SemanticEvent): event is PlatformEvent {
  return 'requiresClientAction' in event && event.requiresClientAction === true;
}

export function isPlatformRequestEvent(event: SemanticEvent): boolean {
  return isPlatformEvent(event) && (
    event.type === PlatformEventType.SAVE_REQUESTED ||
    event.type === PlatformEventType.RESTORE_REQUESTED ||
    event.type === PlatformEventType.QUIT_REQUESTED ||
    event.type === PlatformEventType.RESTART_REQUESTED
  );
}

export function isPlatformCompletionEvent(event: SemanticEvent): boolean {
  return isPlatformEvent(event) && (
    event.type === PlatformEventType.SAVE_COMPLETED ||
    event.type === PlatformEventType.RESTORE_COMPLETED ||
    event.type === PlatformEventType.QUIT_CONFIRMED ||
    event.type === PlatformEventType.RESTART_COMPLETED ||
    event.type === PlatformEventType.SAVE_FAILED ||
    event.type === PlatformEventType.RESTORE_FAILED ||
    event.type === PlatformEventType.QUIT_CANCELLED ||
    event.type === PlatformEventType.RESTART_CANCELLED
  );
}

/**
 * Helper functions to create platform events
 */
export function createPlatformEvent(
  type: PlatformEventTypeValue,
  context?: unknown,
  additionalPayload?: Record<string, unknown>
): PlatformEvent {
  return {
    id: `platform-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: Date.now(),
    requiresClientAction: true,
    entities: {},
    payload: {
      context,
      ...additionalPayload
    }
  };
}

export function createSaveRequestedEvent(context: SaveContext): PlatformEvent {
  return createPlatformEvent(PlatformEventType.SAVE_REQUESTED, context);
}

export function createRestoreRequestedEvent(context: RestoreContext): PlatformEvent {
  return createPlatformEvent(PlatformEventType.RESTORE_REQUESTED, context);
}

export function createQuitRequestedEvent(context: QuitContext): PlatformEvent {
  return createPlatformEvent(PlatformEventType.QUIT_REQUESTED, context);
}

export function createRestartRequestedEvent(context: RestartContext): PlatformEvent {
  return createPlatformEvent(PlatformEventType.RESTART_REQUESTED, context);
}

/**
 * Helper functions for completion events
 */
export function createSaveCompletedEvent(success: boolean, error?: string): PlatformEvent {
  return createPlatformEvent(
    success ? PlatformEventType.SAVE_COMPLETED : PlatformEventType.SAVE_FAILED,
    undefined,
    { success, error }
  );
}

export function createRestoreCompletedEvent(success: boolean, error?: string): PlatformEvent {
  return createPlatformEvent(
    success ? PlatformEventType.RESTORE_COMPLETED : PlatformEventType.RESTORE_FAILED,
    undefined,
    { success, error }
  );
}

export function createQuitConfirmedEvent(): PlatformEvent {
  return createPlatformEvent(PlatformEventType.QUIT_CONFIRMED, undefined, { success: true });
}

export function createQuitCancelledEvent(): PlatformEvent {
  return createPlatformEvent(PlatformEventType.QUIT_CANCELLED, undefined, { success: false });
}

export function createRestartCompletedEvent(success: boolean): PlatformEvent {
  return createPlatformEvent(
    success ? PlatformEventType.RESTART_COMPLETED : PlatformEventType.RESTART_CANCELLED,
    undefined,
    { success }
  );
}
