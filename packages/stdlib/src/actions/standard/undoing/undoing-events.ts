/**
 * Undoing action event types
 */

export interface UndoRequestedEventData {
  timestamp: number;
}

export interface UndoCompletedEventData {
  success: boolean;
  restoredToTurn?: number;
  error?: string;
}
